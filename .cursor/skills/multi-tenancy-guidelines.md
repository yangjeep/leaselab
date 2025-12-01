# Multi-Tenancy Guidelines for LeaseLab

**Type:** Critical Guardrail
**Priority:** CRITICAL - MUST follow these rules for ALL database operations

## Core Principle

**EVERY database operation MUST filter by `site_id` to prevent data leaks between sites.**

## Critical Rules (MANDATORY)

### 1. Database Function Signature

```typescript
export async function getDatabaseEntity(
  dbInput: DatabaseInput,
  siteId: string,  // ← REQUIRED second parameter
  options?: FilterOptions
): Promise<Entity[]> {
  const db = normalizeDb(dbInput);
  // ...
}
```

**All DB functions MUST:**
- Accept `siteId` as the **second parameter** (after `dbInput`)
- Include it in the function name for clarity
- Use it in ALL SQL queries

### 2. SQL Query Pattern

```typescript
// ✅ CORRECT - Always filter by site_id
const results = await db.query(
  'SELECT * FROM properties WHERE site_id = ? AND is_active = 1',
  [siteId]
);

// ❌ WRONG - Missing site_id filter
const results = await db.query(
  'SELECT * FROM properties WHERE is_active = 1'
);
```

**All queries MUST:**
- Use `WHERE site_id = ?` clause
- Use parameterized queries (prevent SQL injection)
- Filter by `site_id` FIRST in WHERE clause

### 3. Multi-Tenant Tables

These tables REQUIRE `site_id` filtering:
- `properties` - Property listings
- `units` - Rental units
- `leads` - Rental applications
- `lead_files` - Application documents
- `lead_ai_evaluations` - AI screening results
- `lead_history` - Lead event tracking
- `tenants` - Current/past tenants
- `leases` - Lease agreements
- `work_orders` - Maintenance requests
- `images` - Property/unit images
- `unit_history` - Unit event tracking

### 4. Join Queries

```typescript
// ✅ CORRECT - Filter ALL tables by site_id
const results = await db.query(`
  SELECT
    l.*,
    p.address,
    u.unit_number
  FROM leads l
  JOIN properties p ON l.property_id = p.id AND p.site_id = ?
  JOIN units u ON l.unit_id = u.id AND u.site_id = ?
  WHERE l.site_id = ?
`, [siteId, siteId, siteId]);

// ❌ WRONG - Only filtering main table
const results = await db.query(`
  SELECT l.*, p.address
  FROM leads l
  JOIN properties p ON l.property_id = p.id
  WHERE l.site_id = ?
`, [siteId]);
```

### 5. INSERT Operations

```typescript
// ✅ CORRECT - Include site_id in INSERT
await db.execute(
  'INSERT INTO properties (id, site_id, name, address, ...) VALUES (?, ?, ?, ?, ...)',
  [propertyId, siteId, name, address, ...]
);

// ❌ WRONG - Missing site_id
await db.execute(
  'INSERT INTO properties (id, name, address, ...) VALUES (?, ?, ?, ...)',
  [propertyId, name, address, ...]
);
```

### 6. UPDATE Operations

```typescript
// ✅ CORRECT - Filter by both id AND site_id
await db.execute(
  'UPDATE properties SET name = ? WHERE id = ? AND site_id = ?',
  [newName, propertyId, siteId]
);

// ❌ WRONG - Only filtering by id
await db.execute(
  'UPDATE properties SET name = ? WHERE id = ?',
  [newName, propertyId]
);
```

### 7. DELETE Operations

```typescript
// ✅ CORRECT - Soft delete with site_id filter
await db.execute(
  'UPDATE properties SET is_active = 0 WHERE id = ? AND site_id = ?',
  [propertyId, siteId]
);

// ❌ WRONG - Missing site_id filter
await db.execute(
  'UPDATE properties SET is_active = 0 WHERE id = ?',
  [propertyId]
);
```

## Access Control Patterns

### 1. User Access Verification

```typescript
// Check if user has access to a site
const access = await db.queryOne(
  'SELECT * FROM user_access WHERE user_id = ? AND site_id = ?',
  [userId, siteId]
);

if (!access) {
  throw new Error('User does not have access to this site');
}
```

### 2. Super Admin Access

```typescript
// Super admins can access sites with active API tokens
if (user.isSuperAdmin) {
  const tokens = await db.query(
    'SELECT DISTINCT site_id FROM site_api_tokens WHERE is_active = 1'
  );
  // User can access any site_id in this list
}
```

## Common Mistakes to Avoid

❌ **Forgetting site_id in WHERE clause**
```typescript
// WRONG
'SELECT * FROM properties WHERE id = ?'
```

✅ **Always include site_id**
```typescript
// CORRECT
'SELECT * FROM properties WHERE id = ? AND site_id = ?'
```

❌ **Using site_id from untrusted source**
```typescript
// WRONG - Taking site_id from request body
const { siteId } = await request.json();
```

✅ **Get site_id from authenticated session**
```typescript
// CORRECT - From verified auth token
const siteId = authenticatedUser.siteId;
```

❌ **Forgetting site_id in JOINs**
```typescript
// WRONG
'JOIN properties p ON l.property_id = p.id'
```

✅ **Filter joined tables too**
```typescript
// CORRECT
'JOIN properties p ON l.property_id = p.id AND p.site_id = ?'
```

## Testing Multi-Tenancy

When testing database operations:

1. **Create test data for multiple sites**
2. **Verify queries only return data for the specified site_id**
3. **Test that users can't access other sites' data**
4. **Check all WHERE clauses include site_id**

## Review Checklist

Before committing database code:

- [ ] All DB functions accept `siteId` parameter
- [ ] All SELECT queries filter by `site_id`
- [ ] All INSERT queries include `site_id`
- [ ] All UPDATE queries filter by `site_id`
- [ ] All DELETE queries filter by `site_id`
- [ ] All JOIN clauses filter by `site_id`
- [ ] Parameterized queries used (no string concatenation)
- [ ] site_id comes from authenticated source

## References

- Full schema: [apps/worker/migrations/0000_init_from_production.sql](../apps/worker/migrations/0000_init_from_production.sql)
- Database operations: [apps/worker/lib/db/](../apps/worker/lib/db/)
- Project guide: [CLAUDE.md](../CLAUDE.md)
