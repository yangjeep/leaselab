import { redirect } from '@remix-run/cloudflare';
import { generateId } from '@rental/shared-utils';
import { getUserById, getUserByEmail } from './db.server';
import type { User } from '@rental/shared-types';

const SESSION_COOKIE_NAME = 'rental_session';
const SESSION_EXPIRY_DAYS = 7;

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
export async function createSession(kv: KVNamespace, userId: string): Promise<string> {
  const sessionId = generateId('sess');
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await kv.put(
    `session:${sessionId}`,
    JSON.stringify({ userId, expiresAt }),
    { expirationTtl: SESSION_EXPIRY_DAYS * 24 * 60 * 60 }
  );

  return sessionId;
}

export async function getSession(kv: KVNamespace, sessionId: string): Promise<{ userId: string; expiresAt: string } | null> {
  const data = await kv.get(`session:${sessionId}`);
  if (!data) return null;

  const session = JSON.parse(data);
  if (new Date(session.expiresAt) < new Date()) {
    await kv.delete(`session:${sessionId}`);
    return null;
  }

  return session;
}

export async function deleteSession(kv: KVNamespace, sessionId: string): Promise<void> {
  await kv.delete(`session:${sessionId}`);
}

// Cookie helpers
export function getSessionIdFromCookie(request: Request): string | null {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;

  const match = cookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export function createSessionCookie(sessionId: string): string {
  return `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_EXPIRY_DAYS * 24 * 60 * 60}`;
}

export function createLogoutCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

// Auth helpers
export async function requireAuth(
  request: Request,
  db: D1Database,
  kv: KVNamespace
): Promise<User> {
  const sessionId = getSessionIdFromCookie(request);

  if (!sessionId) {
    throw redirect('/login');
  }

  const session = await getSession(kv, sessionId);
  if (!session) {
    throw redirect('/login');
  }

  const user = await getUserById(db, session.userId);
  if (!user) {
    await deleteSession(kv, sessionId);
    throw redirect('/login');
  }

  return user;
}

export async function getOptionalUser(
  request: Request,
  db: D1Database,
  kv: KVNamespace
): Promise<User | null> {
  const sessionId = getSessionIdFromCookie(request);
  if (!sessionId) return null;

  const session = await getSession(kv, sessionId);
  if (!session) return null;

  return getUserById(db, session.userId);
}

export async function login(
  db: D1Database,
  kv: KVNamespace,
  email: string,
  password: string
): Promise<{ sessionId: string; user: User } | null> {
  const userWithPassword = await getUserByEmail(db, email);
  if (!userWithPassword) return null;

  const isValid = await verifyPassword(password, userWithPassword.passwordHash);
  if (!isValid) return null;

  const sessionId = await createSession(kv, userWithPassword.id);

  // Update last login
  await db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), userWithPassword.id)
    .run();

  const { passwordHash: _, ...user } = userWithPassword;
  return { sessionId, user };
}

export async function logout(kv: KVNamespace, request: Request): Promise<void> {
  const sessionId = getSessionIdFromCookie(request);
  if (sessionId) {
    await deleteSession(kv, sessionId);
  }
}
