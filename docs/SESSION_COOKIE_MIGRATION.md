# Session Cookie Migration Guide

## Overview

Migrating from KV-based sessions to signed cookie sessions to eliminate KV dependency and costs.

## Changes Summary

| Aspect | Before (KV) | After (Signed Cookies) |
|--------|-------------|------------------------|
| Storage | KV namespace | Cookie (client-side) |
| Session ID | Random UUID | Not needed |
| Session data | Stored in KV | Encoded in cookie |
| Lookup cost | KV read on every request | Zero (just verify signature) |
| Binding needed | Yes (SESSION_KV) | No |
| Monthly cost | ~$0.50+ | $0 |

## Architecture Change

### Before (KV Sessions)
```
1. Login → Generate sessionId → Store {userId, siteId} in KV → Set cookie with sessionId
2. Request → Read cookie → Lookup sessionId in KV → Get user data
3. Logout → Delete from KV → Clear cookie
```

### After (Signed Cookies)
```
1. Login → Encode {userId, siteId, expiresAt} → Sign → Set cookie with encoded data
2. Request → Read cookie → Verify signature → Decode user data
3. Logout → Clear cookie (that's it!)
```

## Migration Steps

### Step 1: Add SESSION_SECRET Environment Variable

**Development** (.dev.vars):
```bash
# apps/ops/.dev.vars
SESSION_SECRET=your-32-character-or-longer-secret-key-here-change-in-production
```

**Production** (wrangler secret):
```bash
cd apps/ops
npx wrangler secret put SESSION_SECRET
# Enter a strong random secret (32+ characters)
```

**Generate a secure secret**:
```bash
# On macOS/Linux
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Update auth.server.ts

Replace KV-based functions with cookie-based versions:

**File**: `apps/ops/app/lib/auth.server.ts`

#### Before (KV):
```typescript
import type { User } from '@leaselab/shared-types';

// Create session in KV
export async function createSession(
  kv: KVNamespace,
  userId: string
): Promise<string> {
  const sessionId = generateId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await kv.put(
    `session:${sessionId}`,
    JSON.stringify({ userId, expiresAt: expiresAt.toISOString() }),
    { expirationTtl: 7 * 24 * 60 * 60 }
  );

  return sessionId;
}

// Get session from KV
export async function getSession(
  kv: KVNamespace,
  sessionId: string
): Promise<{ userId: string } | null> {
  const data = await kv.get(`session:${sessionId}`);
  if (!data) return null;
  return JSON.parse(data);
}

// Delete session from KV
export async function deleteSession(
  kv: KVNamespace,
  sessionId: string
): Promise<void> {
  await kv.delete(`session:${sessionId}`);
}
```

#### After (Signed Cookies):
```typescript
import type { User } from '@leaselab/shared-types';
import {
  createSessionCookie,
  verifySessionCookie,
  createSessionCookieHeader,
  clearSessionCookieHeader,
  getSessionCookie,
} from './session-cookie.server';

// Create session cookie
export async function createSession(
  userId: string,
  siteId: string,
  secret: string
): Promise<string> {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

  const cookieValue = await createSessionCookie(
    { userId, siteId, expiresAt },
    secret
  );

  return createSessionCookieHeader(cookieValue);
}

// Get session from cookie
export async function getSession(
  request: Request,
  secret: string
): Promise<{ userId: string; siteId: string } | null> {
  const cookie = getSessionCookie(request);
  if (!cookie) return null;

  return await verifySessionCookie(cookie, secret);
}

// Clear session cookie
export function deleteSession(): string {
  return clearSessionCookieHeader();
}
```

### Step 3: Update getUser() Function

**Before**:
```typescript
export async function getUser(
  request: Request,
  db: D1Database,
  kv: KVNamespace,
  siteId: string
): Promise<User | null> {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const sessionId = /* parse session_id from cookie */;
  if (!sessionId) return null;

  const session = await getSession(kv, sessionId);
  if (!session) return null;

  return await getUserById(db, session.userId, siteId);
}
```

**After**:
```typescript
export async function getUser(
  request: Request,
  db: D1Database,
  secret: string,
  siteId: string
): Promise<User | null> {
  const session = await getSession(request, secret);
  if (!session) return null;

  // Session already contains siteId, but verify it matches
  if (session.siteId !== siteId) return null;

  return await getUserById(db, session.userId, siteId);
}
```

### Step 4: Update requireUser() Function

**Before**:
```typescript
export async function requireUser(
  request: Request,
  db: D1Database,
  kv: KVNamespace,
  siteId: string
): Promise<User> {
  const user = await getUser(request, db, kv, siteId);
  if (!user) {
    throw redirect('/login');
  }
  return user;
}
```

**After**:
```typescript
export async function requireUser(
  request: Request,
  db: D1Database,
  secret: string,
  siteId: string
): Promise<User> {
  const user = await getUser(request, db, secret, siteId);
  if (!user) {
    throw redirect('/login');
  }
  return user;
}
```

### Step 5: Update Login Route

**File**: `apps/ops/app/routes/login.tsx`

**Before**:
```typescript
export async function action({ request, context }: ActionFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const kv = context.cloudflare.env.SESSION_KV;

  // ... password validation ...

  const sessionId = await createSession(kv, user.id);

  return redirect('/admin/leads', {
    headers: {
      'Set-Cookie': `session_id=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`,
    },
  });
}
```

**After**:
```typescript
export async function action({ request, context }: ActionFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const secret = context.cloudflare.env.SESSION_SECRET;

  // ... password validation ...

  const setCookieHeader = await createSession(
    user.id,
    user.siteId,
    secret
  );

  return redirect('/admin/leads', {
    headers: {
      'Set-Cookie': setCookieHeader,
    },
  });
}
```

### Step 6: Update Logout Route

**File**: `apps/ops/app/routes/logout.tsx`

**Before**:
```typescript
export async function action({ request, context }: ActionFunctionArgs) {
  const kv = context.cloudflare.env.SESSION_KV;

  const cookieHeader = request.headers.get('Cookie');
  const sessionId = /* parse session_id */;

  if (sessionId) {
    await deleteSession(kv, sessionId);
  }

  return redirect('/login', {
    headers: {
      'Set-Cookie': 'session_id=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    },
  });
}
```

**After**:
```typescript
export async function action({ request, context }: ActionFunctionArgs) {
  // No KV needed!

  return redirect('/login', {
    headers: {
      'Set-Cookie': deleteSession(),
    },
  });
}
```

### Step 7: Update All Admin Routes

**Example**: `apps/ops/app/routes/admin.tsx`

**Before**:
```typescript
export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const kv = context.cloudflare.env.SESSION_KV;
  const siteId = getSiteId(request);

  const user = await requireUser(request, db, kv, siteId);

  // ... rest of loader
}
```

**After**:
```typescript
export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const secret = context.cloudflare.env.SESSION_SECRET;
  const siteId = getSiteId(request);

  const user = await requireUser(request, db, secret, siteId);

  // ... rest of loader
}
```

**Search and replace across all routes**:
- Find: `context.cloudflare.env.SESSION_KV`
- Replace: `context.cloudflare.env.SESSION_SECRET`

### Step 8: Update Environment Types

**File**: `apps/ops/env.d.ts`

**Before**:
```typescript
interface Env {
  DB: D1Database;
  SESSION_KV: KVNamespace;
  FILE_BUCKET: R2Bucket;
  // ...
}
```

**After**:
```typescript
interface Env {
  DB: D1Database;
  SESSION_SECRET: string;  // Changed from KVNamespace to string
  FILE_BUCKET: R2Bucket;
  // ...
}
```

### Step 9: Remove KV Binding from wrangler.toml

**File**: `apps/ops/wrangler.toml`

**Before**:
```toml
[[kv_namespaces]]
binding = "SESSION_KV"
id = "a020a8412719406db3fc3066dc298981"
```

**After**:
```toml
# KV binding removed! Sessions now use signed cookies.
# SESSION_SECRET is set via:
# - .dev.vars for local dev
# - wrangler secret put SESSION_SECRET for production
```

### Step 10: Update Worker wrangler.toml

**File**: `apps/worker/wrangler.toml`

**Remove KV binding** (worker doesn't need it anymore):

**Before**:
```toml
[[kv_namespaces]]
binding = "SESSION_KV"
id = "a020a8412719406db3fc3066dc298981"
```

**After**:
```toml
# No KV binding needed!
```

## Testing the Migration

### Test Login
1. Navigate to `/login`
2. Enter credentials
3. Check browser DevTools → Application → Cookies
4. Verify `session` cookie exists with:
   - HttpOnly: true
   - Secure: true
   - SameSite: Lax
   - Max-Age: 604800 (7 days)

### Test Session Persistence
1. Login
2. Navigate to admin pages
3. Refresh browser
4. Verify still logged in

### Test Logout
1. Click logout
2. Check DevTools → Cookies
3. Verify `session` cookie is deleted (Max-Age=0)
4. Try accessing admin pages → Should redirect to login

### Test Session Expiration
1. Login
2. Manually edit cookie in DevTools:
   - Change expiration date to past
   - Or corrupt the signature
3. Refresh page → Should redirect to login

## Rollback Plan

If issues arise, you can quickly rollback:

1. Revert `auth.server.ts` to KV version (use git)
2. Re-add KV binding to `wrangler.toml`
3. Keep SESSION_SECRET (doesn't hurt to have it)
4. Redeploy

## Benefits

✅ **No KV costs** - Completely free
✅ **Faster** - No KV lookup on every request
✅ **Simpler** - No external dependency
✅ **Stateless** - Perfect for Workers
✅ **Secure** - HMAC-SHA256 signing

## Limitations

❌ **Can't revoke sessions** - Logout only clears client cookie
❌ **4KB cookie limit** - Not an issue for small session data
❌ **Can't list all sessions** - No central registry

## Security Notes

1. **Never expose SESSION_SECRET** - Keep it secret!
2. **Rotate secret carefully** - Invalidates all sessions
3. **Use HTTPS** - Secure flag requires it
4. **HttpOnly protects against XSS** - JavaScript can't access cookie
5. **SameSite protects against CSRF** - Cookie not sent on cross-site requests

## Next Steps

After migration:
- [ ] Remove KV namespace from Cloudflare dashboard (optional)
- [ ] Update monitoring/logging to not expect KV operations
- [ ] Document SESSION_SECRET in deployment guide
- [ ] Add SESSION_SECRET to CI/CD secrets
