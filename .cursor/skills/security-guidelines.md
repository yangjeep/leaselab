# Security Guidelines for LeaseLab

**Type:** Critical Guardrail
**Priority:** CRITICAL - MUST follow these rules for ALL authentication and security operations

## Core Principles

1. **NEVER store plaintext passwords or tokens**
2. **ALWAYS use shared crypto utilities from `shared/utils/crypto.ts`**
3. **NEVER roll your own crypto implementations**

## Password Security (MANDATORY)

### 1. Hashing Algorithm

**Use PBKDF2-SHA256 with 100,000 iterations**

```typescript
import { hashPassword, verifyPassword } from '../../shared/utils/crypto';

// ✅ CORRECT - Hash password before storing
const passwordHash = await hashPassword(plainPassword);
await db.execute(
  'INSERT INTO users (id, email, password_hash, ...) VALUES (?, ?, ?, ...)',
  [userId, email, passwordHash, ...]
);

// ❌ WRONG - Storing plaintext password
await db.execute(
  'INSERT INTO users (id, email, password, ...) VALUES (?, ?, ?, ...)',
  [userId, email, plainPassword, ...]
);
```

### 2. Password Verification

```typescript
// ✅ CORRECT - Verify using utility
const user = await getUserByEmail(db, siteId, email);
const isValid = await verifyPassword(plainPassword, user.passwordHash);

if (!isValid) {
  throw new Error('Invalid credentials');
}

// ❌ WRONG - Direct comparison
if (plainPassword === user.password) {
  // This is NEVER acceptable
}
```

### 3. Password Hash Format

```
Format: salt:hash
Example: 1a2b3c4d5e6f7890:9f8e7d6c5b4a3210...
```

- Salt: 16 bytes (32 hex characters)
- Hash: PBKDF2-SHA256 output (64 hex characters)
- Stored together with `:` separator

## API Token Security (MANDATORY)

### 1. Token Generation and Hashing

```typescript
import { generateRandomToken, hashToken } from '../../shared/utils/crypto';

// ✅ CORRECT - Generate and hash token
const rawToken = generateRandomToken(32);  // Show to user ONCE
const salt = new TextEncoder().encode(SITE_API_TOKEN_SALT);  // Shared constant
const tokenHash = await hashToken(rawToken, salt);

await db.execute(
  'INSERT INTO site_api_tokens (id, site_id, token_hash, ...) VALUES (?, ?, ?, ...)',
  [tokenId, siteId, tokenHash, ...]
);

// Return rawToken to user (they must save it - it can't be recovered)
return {
  token: rawToken,  // Show this ONCE
  tokenId,
  // NEVER return tokenHash
};
```

### 2. Token Verification

```typescript
// ✅ CORRECT - Hash incoming token and compare
const salt = new TextEncoder().encode(SITE_API_TOKEN_SALT);
const tokenHash = await hashToken(providedToken, salt);

const token = await db.queryOne(
  'SELECT * FROM site_api_tokens WHERE token_hash = ? AND is_active = 1',
  [tokenHash]
);

if (!token) {
  throw new Error('Invalid API token');
}

// ❌ WRONG - Comparing plaintext
const token = await db.queryOne(
  'SELECT * FROM site_api_tokens WHERE token = ? AND is_active = 1',
  [providedToken]
);
```

### 3. Token Salt

```typescript
// Use a shared constant for all API tokens
const SITE_API_TOKEN_SALT = 'leaselab-site-api-token-salt-v1';

// ✅ CORRECT - Deterministic hashing
const salt = new TextEncoder().encode(SITE_API_TOKEN_SALT);
const tokenHash = await hashToken(token, salt);

// ❌ WRONG - Random salt (can't verify later)
const salt = crypto.getRandomValues(new Uint8Array(16));
```

## Crypto Utility Reference

### Available Functions

```typescript
// From shared/utils/crypto.ts

/**
 * Hash a password using PBKDF2-SHA256
 * @param password - Plain text password
 * @returns Format: "salt:hash" (hex encoded)
 */
export async function hashPassword(password: string): Promise<string>

/**
 * Verify a password against a stored hash
 * @param password - Plain text password to verify
 * @param storedHash - Previously hashed password (salt:hash format)
 * @returns true if password matches
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean>

/**
 * Hash a token using PBKDF2-SHA256
 * @param token - Plain text token
 * @param salt - Salt for deterministic hashing (use shared constant)
 * @returns Hash as hex string
 */
export async function hashToken(
  token: string,
  salt: Uint8Array
): Promise<string>

/**
 * Generate a cryptographically secure random token
 * @param length - Length in bytes (default: 32)
 * @returns Hex-encoded token string
 */
export function generateRandomToken(length = 32): string
```

## Session Security

### 1. Session Storage

```typescript
// Sessions stored in D1 database
await db.execute(
  'INSERT INTO sessions (id, user_id, expires_at, ...) VALUES (?, ?, ?, ...)',
  [sessionId, userId, expiresAt, ...]
);
```

### 2. Session Expiration

```typescript
// ✅ CORRECT - Check expiration
const session = await db.queryOne(
  'SELECT * FROM sessions WHERE id = ? AND expires_at > ?',
  [sessionId, new Date().toISOString()]
);

if (!session) {
  throw new Error('Session expired or invalid');
}

// ❌ WRONG - Not checking expiration
const session = await db.queryOne(
  'SELECT * FROM sessions WHERE id = ?',
  [sessionId]
);
```

### 3. Cookie Security

```typescript
// ✅ CORRECT - Secure cookie settings
const cookieOptions = {
  httpOnly: true,
  secure: true,  // HTTPS only
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60,  // 7 days
};

// ❌ WRONG - Insecure settings
const cookieOptions = {
  httpOnly: false,  // Accessible via JavaScript (XSS risk)
  secure: false,    // Works on HTTP (MITM risk)
};
```

## File Storage Security

### 1. Public vs Private Buckets

```typescript
// ✅ CORRECT - Sensitive files in private bucket
// Applications, leases, ID documents → PRIVATE_BUCKET
await env.PRIVATE_BUCKET.put(key, file);

// Property images, public assets → PUBLIC_BUCKET
await env.PUBLIC_BUCKET.put(key, file);

// ❌ WRONG - Sensitive data in public bucket
await env.PUBLIC_BUCKET.put('applications/ssn.pdf', file);
```

### 2. Signed URLs for Private Files

```typescript
import { generateSignedUrl } from '../../shared/utils';

// ✅ CORRECT - Generate temporary signed URL
const signedUrl = await generateSignedUrl(
  env.PRIVATE_BUCKET,
  fileKey,
  3600  // Expires in 1 hour
);

return { url: signedUrl };

// ❌ WRONG - Direct public URL for private file
const publicUrl = `https://pub.leaselab.io/${fileKey}`;
```

## Common Security Mistakes

### ❌ MISTAKE 1: Custom password hashing
```typescript
// WRONG - Don't implement your own
function myCustomHash(password: string) {
  return crypto.createHash('md5').update(password).digest('hex');
}
```

✅ **USE**: `hashPassword()` from `shared/utils/crypto.ts`

### ❌ MISTAKE 2: Storing tokens in plaintext
```typescript
// WRONG
'INSERT INTO site_api_tokens (token) VALUES (?)', [rawToken]
```

✅ **USE**: `hashToken()` and store only the hash

### ❌ MISTAKE 3: Weak token generation
```typescript
// WRONG
const token = Math.random().toString(36);
```

✅ **USE**: `generateRandomToken()` from crypto utils

### ❌ MISTAKE 4: SQL Injection
```typescript
// WRONG - String concatenation
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

✅ **USE**: Parameterized queries
```typescript
const query = 'SELECT * FROM users WHERE email = ? AND site_id = ?';
const results = await db.query(query, [email, siteId]);
```

### ❌ MISTAKE 5: Sensitive data in logs
```typescript
// WRONG
console.log('User password:', password);
console.log('API token:', apiToken);
```

✅ **USE**: Log only non-sensitive identifiers
```typescript
console.log('User authenticated:', userId);
console.log('Token validated:', tokenId);
```

## Security Review Checklist

Before committing authentication/security code:

- [ ] Passwords hashed using `hashPassword()`
- [ ] Password verification using `verifyPassword()`
- [ ] API tokens hashed using `hashToken()` with shared salt
- [ ] Token generation using `generateRandomToken()`
- [ ] No plaintext passwords/tokens in database
- [ ] No plaintext passwords/tokens in logs
- [ ] Parameterized SQL queries (no string concatenation)
- [ ] Sensitive files in `PRIVATE_BUCKET`
- [ ] Public files in `PUBLIC_BUCKET`
- [ ] Signed URLs for private file access
- [ ] Session expiration checked
- [ ] Secure cookie settings (httpOnly, secure, sameSite)

## References

- Crypto utilities: [shared/utils/crypto.ts](../shared/utils/crypto.ts)
- User authentication: [apps/worker/lib/db/users.ts](../apps/worker/lib/db/users.ts)
- API token management: [apps/worker/lib/db/site-tokens.ts](../apps/worker/lib/db/site-tokens.ts)
- Auth middleware: [apps/worker/middleware/auth.ts](../apps/worker/middleware/auth.ts)
- Project guide: [CLAUDE.md](../CLAUDE.md)
