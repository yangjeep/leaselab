import { redirect } from '@remix-run/cloudflare';
import type { User } from '~/shared/types';
import {
  createSessionCookie,
  verifySessionCookie,
  createSessionCookieHeader,
  clearSessionCookieHeader,
  getSessionCookie,
} from './session-cookie.server';
import { 
  updateUserLastLoginToWorker, 
  isWorkerConfigured,
  fetchUserFromWorker,
  fetchUserByEmailFromWorker,
} from './worker-client';

// WorkerEnv interface for worker API calls
interface WorkerEnv {
  WORKER_URL: string;
  WORKER_INTERNAL_KEY?: string;
}

// Simple password hashing (in production, use bcrypt or argon2)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Session management
// Cookie helpers using signed JWT-style cookie
export function createLogoutCookie(): string {
  return clearSessionCookieHeader();
}

// Auth helpers
export async function requireAuth(
  request: Request,
  workerEnv: WorkerEnv,
  sessionSecret: string,
  siteId: string
): Promise<User> {
  const cookie = getSessionCookie(request);
  if (!cookie) {
    throw redirect('/login');
  }

  const session = await verifySessionCookie(cookie, sessionSecret);
  if (!session) {
    throw redirect('/login');
  }

  // Fetch user by ID via Worker API
  const user = await fetchUserFromWorker(workerEnv, session.siteId, session.userId);
  if (!user) {
    throw redirect('/login');
  }

  // Users can access the ops panel from any domain
  // Data access is controlled by user.siteId, not the request domain
  // Super admins can potentially access multiple sites via UI switching

  return user;
}

// Convenience wrapper matching previous API used by some routes
export async function requireUser(
  request: Request,
  workerEnv: WorkerEnv,
  sessionSecret: string,
  siteId: string
): Promise<User> {
  return requireAuth(request, workerEnv, sessionSecret, siteId);
}

// ============================================================================
// SUPER ADMIN SITE SWITCHING
// ============================================================================

/**
 * Set the active site for a super admin user in their session
 */
export async function setActiveSite(
  request: Request,
  sessionSecret: string,
  activeSiteId: string
): Promise<string> {
  const existing = getSessionCookie(request);
  if (!existing) {
    throw redirect('/login');
  }
  const session = await verifySessionCookie(existing, sessionSecret);
  if (!session) {
    throw redirect('/login');
  }
  // Preserve original expiry
  const newSessionValue = await createSessionCookie({
    userId: session.userId,
    siteId: activeSiteId,
    expiresAt: session.expiresAt,
  }, sessionSecret);
  // Compute remaining seconds for Max-Age
  const remaining = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
  return createSessionCookieHeader(newSessionValue, remaining || 60); // fallback 60s if already expired soon
}

/**
 * Get the active site from session (for super admins)
 * Returns null if not set or not a super admin
 */
export async function getActiveSiteFromSession(
  request: Request,
  _unused: unknown
): Promise<string | null> {
  // Not implemented for signed cookies; include in cookie payload if needed.
  return null;
}

/**
 * Clear the active site from session
 */
export async function clearActiveSite(
  request: Request,
  _unused: unknown
): Promise<void> {
  // Not implemented for signed cookies.
}

export async function getOptionalUser(
  request: Request,
  workerEnv: WorkerEnv,
  sessionSecret: string,
  siteId: string
): Promise<User | null> {
  const cookie = getSessionCookie(request);
  if (!cookie) return null;

  const session = await verifySessionCookie(cookie, sessionSecret);
  if (!session) return null;

  return fetchUserFromWorker(workerEnv, session.siteId, session.userId);
}

export async function login(
  workerEnv: WorkerEnv,
  sessionSecret: string,
  siteId: string,
  email: string,
  password: string
): Promise<{ sessionId: string; user: Omit<User, 'passwordHash'> } | null> {
  const userWithPassword = await fetchUserByEmailFromWorker(workerEnv, siteId, email);
  if (!userWithPassword) return null;

  const isValid = await verifyPassword(password, userWithPassword.passwordHash);
  if (!isValid) return null;

  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  // Store the user's assigned site_id in the session, not the request's site_id
  const sessionValue = await createSessionCookie({ userId: userWithPassword.id, siteId: userWithPassword.siteId, expiresAt }, sessionSecret);

  // Update last_login_at via worker API
  await updateUserLastLoginToWorker(workerEnv, userWithPassword.id);

  const { passwordHash: _, ...user } = userWithPassword;
  return { sessionId: sessionValue, user };
}

export async function logout(request: Request): Promise<void> {
  // Nothing to do server-side for signed cookies
}
