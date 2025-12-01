# Shared Types Guidelines

**Type:** Domain Skill
**Priority:** Medium - Follow these patterns for shared TypeScript types and configuration

## Overview

Shared packages provide type safety and code reuse across the monorepo:
- **shared/types/** - TypeScript interfaces and types
- **shared/config/** - Zod schemas, enums, and constants
- **shared/utils/** - Utility functions (date, money, crypto, etc.)

## Import Patterns

### 1. Relative Imports (No Path Mapping)

```typescript
// In apps/worker or apps/ops
import type { Property, Unit, Lead } from '../../shared/types';
import { hashPassword, verifyPassword } from '../../shared/utils/crypto';
import { API_ROUTES, LeadSubmissionSchema } from '../../shared/config';
import { formatCurrency, formatDate } from '../../shared/utils';
```

**Benefits:**
- Works natively with TypeScript and bundlers
- Clear dependency relationships
- Better IDE support

## Shared Types Structure

### 1. Domain Models (shared/types/index.ts)

```typescript
// Property Management
export interface Property {
  id: string;
  siteId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: PropertyType;
  totalUnits: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PropertyType = 'apartment' | 'house' | 'condo' | 'townhouse';

export interface Unit {
  id: string;
  siteId: string;
  propertyId: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  rent: number;  // In cents
  status: UnitStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UnitStatus = 'available' | 'occupied' | 'maintenance' | 'reserved';
```

### 2. Naming Conventions

**Interfaces:**
- PascalCase
- Descriptive nouns (User, Property, Lead)
- Avoid "I" prefix (use `Property` not `IProperty`)

**Types:**
- PascalCase for union types
- Lowercase for literal types
- Suffix Type for type aliases (PropertyType, UnitStatus)

**Enums:**
- Avoid TS enums (use Zod enums instead)
- See shared/config for Zod enum patterns

## Shared Config Structure

### 1. Zod Enums (shared/config/index.ts)

```typescript
import { z } from 'zod';

// Define Zod enum
export const PropertyTypeEnum = z.enum([
  'apartment',
  'house',
  'condo',
  'townhouse',
]);

export const UnitStatusEnum = z.enum([
  'available',
  'occupied',
  'maintenance',
  'reserved',
]);

// Extract TypeScript type from Zod enum
export type PropertyType = z.infer<typeof PropertyTypeEnum>;
export type UnitStatus = z.infer<typeof UnitStatusEnum>;
```

**Benefits:**
- Runtime validation + compile-time types
- Single source of truth
- Auto-complete in IDE

### 2. Validation Schemas

```typescript
// Lead submission schema (used in API + frontend)
export const LeadSubmissionSchema = z.object({
  propertyId: z.string().uuid(),
  unitId: z.string().uuid().optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+?1?\d{10,15}$/),
  employmentStatus: EmploymentStatusEnum,
  monthlyIncome: z.number().positive(),
  moveInDate: z.string().datetime(),
  message: z.string().max(1000).optional(),
});

// Extract TypeScript type
export type LeadSubmission = z.infer<typeof LeadSubmissionSchema>;
```

### 3. API Routes

```typescript
// Centralized route definitions
export const API_ROUTES = {
  public: {
    leads: '/api/public/leads',
    properties: '/api/public/properties',
  },
  ops: {
    properties: '/api/ops/properties',
    units: '/api/ops/units',
    leads: '/api/ops/leads',
    tenants: '/api/ops/tenants',
    leases: '/api/ops/leases',
    workOrders: '/api/ops/work-orders',
  },
} as const;
```

### 4. Environment Types

```typescript
// Cloudflare bindings
export interface CloudflareEnv {
  DB: D1Database;
  PUBLIC_BUCKET: R2Bucket;
  PRIVATE_BUCKET: R2Bucket;
  OPENAI_API_KEY: string;
  SESSION_SECRET: string;
  SITE_API_TOKEN_SALT: string;
}
```

## Shared Utils Structure

### 1. Date Utilities (shared/utils/index.ts)

```typescript
export function formatDate(date: Date | string, format?: string): string;
export function parseDate(dateString: string): Date;
export function calculateAge(birthDate: Date): number;
export function daysBetween(start: Date, end: Date): number;
export function addDays(date: Date, days: number): Date;
export function isDateInPast(date: Date): boolean;
export function isDateInFuture(date: Date): boolean;
```

### 2. Money Utilities

```typescript
// All money stored in cents (INTEGER)
export function formatCurrency(cents: number, locale?: string): string;
export function parseCurrency(value: string): number;
export function formatNumber(value: number, decimals?: number): string;
```

### 3. Crypto Utilities (shared/utils/crypto.ts)

```typescript
export async function hashPassword(password: string): Promise<string>;
export async function verifyPassword(password: string, storedHash: string): Promise<boolean>;
export async function hashToken(token: string, salt: Uint8Array): Promise<string>;
export function generateRandomToken(length?: number): string;
```

### 4. R2 Utilities

```typescript
export async function generateSignedUrl(
  bucket: R2Bucket,
  key: string,
  expirationSeconds: number
): Promise<string>;

export function getPublicUrl(bucketDomain: string, key: string): string;
```

## Adding New Types

### 1. Process for Adding Domain Types

```typescript
// 1. Add interface to shared/types/index.ts
export interface WorkOrderComment {
  id: string;
  workOrderId: string;
  userId: string;
  comment: string;
  createdAt: Date;
}

// 2. Add Zod schema to shared/config/index.ts (if needed)
export const WorkOrderCommentSchema = z.object({
  workOrderId: z.string().uuid(),
  userId: z.string().uuid(),
  comment: z.string().min(1).max(1000),
});

// 3. Update database migration (apps/worker/migrations/)
CREATE TABLE work_order_comments (
    id TEXT PRIMARY KEY,
    work_order_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
);

// 4. Add database operations (apps/worker/lib/db/work-order-comments.ts)
export async function createWorkOrderComment(
  dbInput: DatabaseInput,
  siteId: string,
  data: Omit<WorkOrderComment, 'id' | 'createdAt'>
): Promise<WorkOrderComment> {
  // Implementation
}
```

### 2. Modifying Existing Types

```typescript
// When modifying a type:
// 1. Update the interface in shared/types/
export interface Property {
  id: string;
  siteId: string;
  name: string;
  address: string;
  // ... existing fields
  description: string;  // NEW FIELD
  createdAt: Date;
  updatedAt: Date;
}

// 2. Update the Zod schema (if exists)
export const PropertySchema = z.object({
  // ... existing fields
  description: z.string().max(1000).optional(),  // NEW FIELD
});

// 3. Create database migration
ALTER TABLE properties ADD COLUMN description TEXT;

// 4. Update database mapping functions
function mapToProperty(row: any): Property {
  return {
    // ... existing fields
    description: row.description,  // NEW FIELD
  };
}
```

## Type Safety Best Practices

### 1. Avoid `any`

```typescript
// ❌ WRONG
function processData(data: any) {
  return data.property.name;  // No type checking
}

// ✅ CORRECT
function processData(data: { property: Property }) {
  return data.property.name;  // Type-safe
}
```

### 2. Use Strict TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true
  }
}
```

### 3. Prefer `unknown` over `any`

```typescript
// When type is truly unknown
function parseJSON(json: string): unknown {
  return JSON.parse(json);
}

// Force type checking before use
const data = parseJSON(json);
if (isProperty(data)) {
  console.log(data.name);  // Type-safe
}
```

### 4. Use Type Guards

```typescript
// Type guard function
function isProperty(value: unknown): value is Property {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'siteId' in value &&
    'name' in value
  );
}

// Usage
if (isProperty(data)) {
  console.log(data.name);  // TypeScript knows it's a Property
}
```

## Common Patterns

### 1. Omit Utility Type

```typescript
// Omit fields not provided by user
type PropertyInput = Omit<Property, 'id' | 'createdAt' | 'updatedAt'>;

export async function createProperty(
  dbInput: DatabaseInput,
  siteId: string,
  data: PropertyInput
): Promise<Property> {
  // Implementation
}
```

### 2. Pick Utility Type

```typescript
// Select specific fields
type PropertySummary = Pick<Property, 'id' | 'name' | 'address'>;
```

### 3. Partial Utility Type

```typescript
// Make all fields optional (for updates)
type PropertyUpdate = Partial<Property>;

export async function updateProperty(
  dbInput: DatabaseInput,
  siteId: string,
  propertyId: string,
  updates: PropertyUpdate
): Promise<Property> {
  // Implementation
}
```

### 4. Readonly Utility Type

```typescript
// Prevent mutations
type ReadonlyProperty = Readonly<Property>;

function displayProperty(property: ReadonlyProperty) {
  // property.name = 'new name';  // Error: cannot assign to readonly
  console.log(property.name);  // OK
}
```

## Testing Types

### 1. Type Testing with Vitest

```typescript
import { describe, it, expect, expectTypeOf } from 'vitest';
import type { Property } from '../../shared/types';

describe('Property type', () => {
  it('should have correct shape', () => {
    expectTypeOf<Property>().toHaveProperty('id');
    expectTypeOf<Property>().toHaveProperty('siteId');
    expectTypeOf<Property>().toHaveProperty('name');
  });

  it('should enforce required fields', () => {
    const property: Property = {
      id: '123',
      siteId: 'site-1',
      name: 'Test Property',
      // TypeScript error if missing required fields
    };
  });
});
```

## References

- Shared types: [shared/types/](../shared/types/)
- Shared config: [shared/config/](../shared/config/)
- Shared utils: [shared/utils/](../shared/utils/)
- Zod documentation: https://zod.dev/
- TypeScript handbook: https://www.typescriptlang.org/docs/handbook/
- Project guide: [CLAUDE.md](../CLAUDE.md)
