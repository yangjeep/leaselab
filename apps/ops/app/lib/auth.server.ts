import { redirect } from '@remix-run/cloudflare';
import { getUserById, getUserByEmail, type DatabaseInput } from './db.server';
import type { User } from '~/shared/types';
import {
  createSessionCookie,
  verifySessionCookie,
  createSessionCookieHeader,
  clearSessionCookieHeader,
  getSessionCookie,
} from './session-cookie.server';

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
  dbInput: DatabaseInput,
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

  // Fetch user by ID (site_id filtering is not needed for authentication)
  const user = await getUserById(dbInput, session.siteId, session.userId);
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
  dbInput: DatabaseInput,
  sessionSecret: string,
  siteId: string
): Promise<User> {
  return requireAuth(request, dbInput, sessionSecret, siteId);
}

// ============================================================================
// SUPER ADMIN SITE SWITCHING
// ============================================================================

/**
 * Set the active site for a super admin user in their session
 */
export async function setActiveSite(
  request: Request,
  _unused: unknown,
  activeSiteId: string
): Promise<void> {
  // With signed cookies, this would require re-issuing the cookie.
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
  dbInput: DatabaseInput,
  sessionSecret: string,
  siteId: string
): Promise<User | null> {
  const cookie = getSessionCookie(request);
  if (!cookie) return null;

  const session = await verifySessionCookie(cookie, sessionSecret);
  if (!session) return null;

  return getUserById(dbInput, session.siteId, session.userId);
}

export async function login(
  dbInput: DatabaseInput,
  sessionSecret: string,
  siteId: string,
  email: string,
  password: string
): Promise<{ sessionId: string; user: User } | null> {
  const userWithPassword = await getUserByEmail(dbInput, siteId, email);
  if (!userWithPassword) return null;

  const isValid = await verifyPassword(password, userWithPassword.passwordHash);
  if (!isValid) return null;

  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  // Store the user's assigned site_id in the session, not the request's site_id
  const sessionValue = await createSessionCookie({ userId: userWithPassword.id, siteId: userWithPassword.siteId, expiresAt }, sessionSecret);

  // TODO: Re-enable last login tracking after verifying column exists
  // Update last login using raw D1 API
  // const d1 = dbInput as D1Database;
  // await d1.prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
  //   .bind(new Date().toISOString(), userWithPassword.id)
  //   .run();

  const { passwordHash: _, ...user } = userWithPassword;
  return { sessionId: sessionValue, user };
}

export async function logout(cacheInput: CacheInput, request: Request): Promise<void> {
  // Nothing to do server-side for signed cookies
}
