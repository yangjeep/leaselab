/**
 * Signed Cookie Session Management
 *
 * This implementation stores session data in signed cookies instead of KV,
 * eliminating the need for external storage and reducing costs.
 *
 * Security:
 * - Data is signed with HMAC-SHA256 to prevent tampering
 * - HttpOnly cookies prevent XSS attacks
 * - Secure flag ensures HTTPS-only transmission
 * - SameSite=Lax prevents CSRF attacks
 */

interface SessionData {
  userId: string;
  siteId: string;
  expiresAt: number;
}

/**
 * Create a signed session cookie value
 * @param data Session data to encode
 * @param secret Secret key for signing (SESSION_SECRET env var)
 * @returns Base64-encoded payload with signature
 */
export async function createSessionCookie(
  data: SessionData,
  secret: string
): Promise<string> {
  const payload = btoa(JSON.stringify(data));
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

/**
 * Verify and decode a signed session cookie
 * @param cookie Cookie value to verify
 * @param secret Secret key for verification
 * @returns Session data if valid, null if invalid or expired
 */
export async function verifySessionCookie(
  cookie: string,
  secret: string
): Promise<SessionData | null> {
  try {
    const [payload, signature] = cookie.split('.');

    if (!payload || !signature) {
      return null;
    }

    // Verify signature
    const expectedSignature = await sign(payload, secret);
    if (signature !== expectedSignature) {
      return null;
    }

    // Decode and parse data
    const data: SessionData = JSON.parse(atob(payload));

    // Check expiration
    if (data.expiresAt < Date.now()) {
      return null;
    }

    return data;
  } catch (error) {
    // Invalid format or corrupt data
    return null;
  }
}

/**
 * Create HMAC-SHA256 signature for data
 * Uses Web Crypto API (available in Cloudflare Workers)
 */
async function sign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  // Import secret as CryptoKey
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the data
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);

  // Convert to hex string
  return Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create a Set-Cookie header value for the session
 * @param sessionValue Signed cookie value from createSessionCookie()
 * @param maxAge Session duration in seconds (default: 7 days)
 * @returns Set-Cookie header value
 */
export function createSessionCookieHeader(
  sessionValue: string,
  maxAge: number = 7 * 24 * 60 * 60 // 7 days
): string {
  const attributes = [
    `session=${sessionValue}`,
    `HttpOnly`, // Prevent JavaScript access (XSS protection)
    `Secure`, // HTTPS only
    `SameSite=Lax`, // CSRF protection
    `Path=/`,
    `Max-Age=${maxAge}`,
  ];

  return attributes.join('; ');
}

/**
 * Create a Set-Cookie header to clear the session (logout)
 */
export function clearSessionCookieHeader(): string {
  return 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}

/**
 * Extract session cookie from request headers
 * @param request Request object
 * @returns Cookie value or null
 */
export function getSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith('session='));

  if (!sessionCookie) {
    return null;
  }

  return sessionCookie.substring('session='.length);
}
