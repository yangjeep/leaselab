import { redirect } from '@remix-run/cloudflare';
import { generateId } from '@leaselab/shared-utils';
import { getUserById, getUserByEmail, type DatabaseInput } from './db.server';
import type { User } from '@leaselab/shared-types';
import type { ICache } from '@leaselab/storage-core';

const SESSION_COOKIE_NAME = 'rental_session';
const SESSION_EXPIRY_DAYS = 7;

// Support both raw KVNamespace and ICache interface for backward compatibility
type CacheInput = KVNamespace | ICache;

function normalizeCache(cache: CacheInput): ICache {
  // Check if it's already an ICache by looking for our interface methods
  if ('put' in cache && 'getWithMetadata' in cache) {
    return cache as ICache;
  }

  // Wrap KVNamespace in ICache interface
  const kv = cache as KVNamespace;
  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      const value = await kv.get(key, 'json');
      return value as T | null;
    },
    async getWithMetadata<T = unknown>(key: string) {
      const result = await kv.getWithMetadata<T>(key, 'json');
      if (!result.value) return null;
      return {
        value: result.value,
        metadata: result.metadata as Record<string, string> | undefined,
      };
    },
    async put(key: string, value: unknown, options?: { expirationTtl?: number; metadata?: Record<string, unknown> }): Promise<void> {
      await kv.put(key, JSON.stringify(value), {
        expirationTtl: options?.expirationTtl,
        metadata: options?.metadata,
      });
    },
    async delete(key: string): Promise<void> {
      await kv.delete(key);
    },
    async list(options?: { prefix?: string; limit?: number; cursor?: string }) {
      const result = await kv.list({
        prefix: options?.prefix,
        limit: options?.limit,
        cursor: options?.cursor,
      });
      return {
        keys: result.keys.map(k => ({
          name: k.name,
          expiration: k.expiration,
          metadata: k.metadata as Record<string, string> | undefined,
        })),
        cursor: 'cursor' in result ? (result as { cursor?: string }).cursor : undefined,
        complete: result.list_complete,
      };
    },
    async has(key: string): Promise<boolean> {
      const value = await kv.get(key);
      return value !== null;
    },
    async close(): Promise<void> {
      // KV connections are managed by the runtime
    },
  };
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
export async function createSession(cacheInput: CacheInput, userId: string): Promise<string> {
  const cache = normalizeCache(cacheInput);
  const sessionId = generateId('sess');
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await cache.put(
    `session:${sessionId}`,
    { userId, expiresAt },
    { expirationTtl: SESSION_EXPIRY_DAYS * 24 * 60 * 60 }
  );

  return sessionId;
}

export async function getSession(cacheInput: CacheInput, sessionId: string): Promise<{ userId: string; expiresAt: string } | null> {
  const cache = normalizeCache(cacheInput);
  const session = await cache.get<{ userId: string; expiresAt: string }>(`session:${sessionId}`);
  if (!session) return null;

  if (new Date(session.expiresAt) < new Date()) {
    await cache.delete(`session:${sessionId}`);
    return null;
  }

  return session;
}

export async function deleteSession(cacheInput: CacheInput, sessionId: string): Promise<void> {
  const cache = normalizeCache(cacheInput);
  await cache.delete(`session:${sessionId}`);
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
  dbInput: DatabaseInput,
  cacheInput: CacheInput
): Promise<User> {
  const sessionId = getSessionIdFromCookie(request);

  if (!sessionId) {
    throw redirect('/login');
  }

  const session = await getSession(cacheInput, sessionId);
  if (!session) {
    throw redirect('/login');
  }

  const user = await getUserById(dbInput, session.userId);
  if (!user) {
    await deleteSession(cacheInput, sessionId);
    throw redirect('/login');
  }

  return user;
}

export async function getOptionalUser(
  request: Request,
  dbInput: DatabaseInput,
  cacheInput: CacheInput
): Promise<User | null> {
  const sessionId = getSessionIdFromCookie(request);
  if (!sessionId) return null;

  const session = await getSession(cacheInput, sessionId);
  if (!session) return null;

  return getUserById(dbInput, session.userId);
}

export async function login(
  dbInput: DatabaseInput,
  cacheInput: CacheInput,
  email: string,
  password: string
): Promise<{ sessionId: string; user: User } | null> {
  const userWithPassword = await getUserByEmail(dbInput, email);
  if (!userWithPassword) return null;

  const isValid = await verifyPassword(password, userWithPassword.passwordHash);
  if (!isValid) return null;

  const sessionId = await createSession(cacheInput, userWithPassword.id);

  // Update last login using raw D1 API
  const d1 = dbInput as D1Database;
  await d1.prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), userWithPassword.id)
    .run();

  const { passwordHash: _, ...user } = userWithPassword;
  return { sessionId, user };
}

export async function logout(cacheInput: CacheInput, request: Request): Promise<void> {
  const sessionId = getSessionIdFromCookie(request);
  if (sessionId) {
    await deleteSession(cacheInput, sessionId);
  }
}
