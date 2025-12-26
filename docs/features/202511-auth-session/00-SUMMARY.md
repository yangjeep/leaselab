# Authentication & Session Management - Quick Reference

**Status**: Implemented (migrated to signed cookies)
**Last Updated**: 2025-12-17

---

## 🎯 What It Does

Manages user authentication and sessions for the Ops admin dashboard using secure signed cookies.

**Key Features**:
- ✅ Signed cookies (HMAC-SHA256) - no KV storage needed
- ✅ Stateless session validation
- ✅ 7-day session expiry
- ✅ Secure, HTTP-only cookies

---

## 🏗️ Architecture (30-Second Overview)

```
User Login → Worker validates credentials → Sets signed cookie
           ↓
Every Request → Worker verifies cookie signature → Allows/Denies access
```

**Why signed cookies?**
- ✅ No KV storage costs
- ✅ Stateless (faster validation)
- ✅ Secure (HMAC prevents tampering)

---

## 📄 Documentation

See [archive/completed-migrations/](../../archive/completed-migrations/) for migration history:
- `session-cookie-migration.md` - Migration from KV to signed cookies
- `ops-migration-guide.md` - Ops dashboard migration guide

---

## 🔑 Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Session Storage** | Signed cookies (no KV) | Cost-effective, stateless |
| **Signing Algorithm** | HMAC-SHA256 | Industry standard, secure |
| **Cookie Security** | HTTP-only, Secure, SameSite=Lax | Prevents XSS/CSRF |
| **Session Duration** | 7 days | Balance security & UX |

---

## 📐 Implementation (Quick Reference)

### Cookie Structure
```typescript
{
  userId: string;
  siteId: string;
  email: string;
  expiresAt: number; // Unix timestamp
}
```

### Signing Process
```typescript
// Generate signature
const signature = HMAC-SHA256(cookieData, SECRET_KEY);

// Set cookie
setCookie('session', `${cookieData}.${signature}`, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 // 7 days
});
```

### Validation
```typescript
// Verify signature
const [data, signature] = cookie.split('.');
const expected = HMAC-SHA256(data, SECRET_KEY);
if (signature !== expected) throw new Error('Invalid session');
```

---

**Status**: ✅ Fully implemented and deployed (migrated from KV sessions)
