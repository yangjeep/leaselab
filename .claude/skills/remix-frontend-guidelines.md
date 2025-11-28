# Remix Frontend Development Guidelines

**Type:** Domain Skill
**Priority:** High - Follow these patterns for Remix + Cloudflare Pages frontend

## Architecture Overview

LeaseLab frontend uses:
- **Remix** - Full-stack React framework
- **Cloudflare Pages** - Edge hosting platform
- **TailwindCSS** - Utility-first CSS framework
- **Worker API** - All data access via HTTP (NO direct DB)

## Project Structure

```
apps/ops/                    # Admin dashboard
├─ app/
│  ├─ routes/               # Remix routes (pages + API)
│  │  ├─ _index.tsx         # Dashboard
│  │  ├─ properties/        # Property management
│  │  ├─ units/             # Unit management
│  │  ├─ leads/             # Lead management
│  │  ├─ tenants/           # Tenant management
│  │  ├─ leases/            # Lease management
│  │  ├─ work-orders/       # Work order management
│  │  └─ api/               # Resource routes (proxy to worker)
│  ├─ components/           # Reusable UI components
│  └─ lib/                  # Utilities
│     └─ worker-client.ts   # HTTP client for worker API
├─ public/                  # Static assets
└─ wrangler.toml            # Cloudflare Pages config

apps/site/                   # Public storefront (planned)
└─ Similar structure to ops/
```

## Core Principles

### 1. Data Access (MANDATORY)

**NEVER access D1 database directly from Remix apps**

```typescript
// ❌ WRONG - Direct database access
import { getProperties } from '../../worker/lib/db/properties';
const properties = await getProperties(env.DB, siteId);

// ✅ CORRECT - HTTP API call to worker
const response = await fetch(`${WORKER_URL}/api/ops/properties`, {
  headers: {
    'Authorization': `Bearer ${siteToken}`,
    'X-Site-Id': siteId,
  },
});
const { properties } = await response.json();
```

### 2. App Isolation

```
┌─────────┐     HTTP/Bearer      ┌─────────────┐
│ Remix   │ ─────────────────>   │   Worker    │
│ (ops)   │                       │   (Hono)    │
└─────────┘                       └──────┬──────┘
                                         │
┌─────────┐     HTTP/Bearer             │
│ Remix   │ ─────────────────>          │
│ (site)  │                              │
└─────────┘                              ▼
                                  ┌─────────────┐
                                  │ D1 Database │
                                  │ R2 Storage  │
                                  └─────────────┘
```

## Remix Route Patterns

### 1. Page Routes (Loaders)

```typescript
// apps/ops/app/routes/properties._index.tsx
import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';

// Server-side data loading
export async function loader({ request, context }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const siteId = session.user.siteId;
  const siteToken = session.siteToken;

  // Call worker API
  const response = await fetch(`${WORKER_URL}/api/ops/properties`, {
    headers: {
      'Authorization': `Bearer ${siteToken}`,
      'X-Site-Id': siteId,
      'X-User-Id': session.user.id,
    },
  });

  if (!response.ok) {
    throw new Response('Failed to load properties', { status: response.status });
  }

  const { properties } = await response.json();

  return json({ properties });
}

// Client-side component
export default function PropertiesIndex() {
  const { properties } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Properties</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </div>
  );
}
```

### 2. Form Actions

```typescript
// apps/ops/app/routes/properties.new.tsx
import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { redirect } from '@remix-run/cloudflare';
import { Form } from '@remix-run/react';

// Server-side form handling
export async function action({ request, context }: ActionFunctionArgs) {
  const session = await getSession(request);
  const formData = await request.formData();

  const propertyData = {
    name: formData.get('name'),
    address: formData.get('address'),
    // ... other fields
  };

  // Submit to worker API
  const response = await fetch(`${WORKER_URL}/api/ops/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.siteToken}`,
      'X-Site-Id': session.user.siteId,
    },
    body: JSON.stringify(propertyData),
  });

  if (!response.ok) {
    return json({ error: 'Failed to create property' }, { status: 400 });
  }

  const { property } = await response.json();

  return redirect(`/properties/${property.id}`);
}

// Client-side form
export default function NewProperty() {
  return (
    <Form method="post" className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Property Name
        </label>
        <input
          type="text"
          name="name"
          id="name"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium">
          Address
        </label>
        <input
          type="text"
          name="address"
          id="address"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
      >
        Create Property
      </button>
    </Form>
  );
}
```

### 3. Resource Routes (API Proxy)

```typescript
// apps/ops/app/routes/api.properties.$id.ts
import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';

// Proxy API requests to worker
export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const session = await getSession(request);
  const propertyId = params.id;

  const response = await fetch(
    `${WORKER_URL}/api/ops/properties/${propertyId}`,
    {
      headers: {
        'Authorization': `Bearer ${session.siteToken}`,
        'X-Site-Id': session.user.siteId,
      },
    }
  );

  if (!response.ok) {
    throw new Response('Property not found', { status: 404 });
  }

  return json(await response.json());
}
```

## Session Management

### 1. Session Storage

```typescript
// apps/ops/app/lib/session.ts
import { createCookieSessionStorage } from '@remix-run/cloudflare';

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secrets: [SESSION_SECRET],
    secure: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
});

export async function getSession(request: Request) {
  const cookie = request.headers.get('Cookie');
  const session = await sessionStorage.getSession(cookie);

  if (!session.has('user')) {
    throw redirect('/login');
  }

  return {
    user: session.get('user'),
    siteToken: session.get('siteToken'),
  };
}
```

### 2. Protected Routes

```typescript
// Create a higher-order function for protected loaders
export function withAuth(
  loader: (args: LoaderFunctionArgs & { session: Session }) => Promise<Response>
) {
  return async (args: LoaderFunctionArgs) => {
    const session = await getSession(args.request);
    return loader({ ...args, session });
  };
}

// Usage
export const loader = withAuth(async ({ request, context, session }) => {
  // session is available here
  const properties = await fetchProperties(session);
  return json({ properties });
});
```

## Component Patterns

### 1. Reusable UI Components

```typescript
// apps/ops/app/components/PropertyCard.tsx
import type { Property } from '../../../shared/types';

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <h3 className="text-xl font-semibold mb-2">{property.name}</h3>
      <p className="text-gray-600 mb-4">{property.address}</p>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">
          {property.totalUnits} units
        </span>
        <a
          href={`/properties/${property.id}`}
          className="text-blue-600 hover:text-blue-800"
        >
          View Details →
        </a>
      </div>
    </div>
  );
}
```

### 2. Form Components

```typescript
// apps/ops/app/components/FormField.tsx
interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  error?: string;
}

export function FormField({
  label,
  name,
  type = 'text',
  required = false,
  defaultValue,
  error,
}: FormFieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        name={name}
        id={name}
        required={required}
        defaultValue={defaultValue}
        className={`
          block w-full rounded-md shadow-sm
          ${error ? 'border-red-300' : 'border-gray-300'}
        `}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

## Error Handling

### 1. Error Boundaries

```typescript
// apps/ops/app/routes/properties._index.tsx
import { useRouteError, isRouteErrorResponse } from '@remix-run/react';

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold text-red-600">
          {error.status} {error.statusText}
        </h1>
        <p className="mt-2 text-gray-600">{error.data}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold text-red-600">Error</h1>
      <p className="mt-2 text-gray-600">
        An unexpected error occurred. Please try again.
      </p>
    </div>
  );
}
```

### 2. Form Validation

```typescript
// Client-side validation with Zod
import { LeadSubmissionSchema } from '../../../shared/config';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  // Validate with Zod
  const result = LeadSubmissionSchema.safeParse(data);

  if (!result.success) {
    return json(
      {
        errors: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // Submit valid data
  const response = await fetch(`${WORKER_URL}/api/public/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.data),
  });

  // ...
}
```

## Styling with TailwindCSS

### 1. Common Patterns

```typescript
// Container
<div className="container mx-auto px-4 py-8">

// Card
<div className="bg-white rounded-lg shadow-md p-6">

// Button (Primary)
<button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">

// Button (Secondary)
<button className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">

// Input
<input className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">

// Grid Layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Flexbox
<div className="flex justify-between items-center">
```

### 2. Responsive Design

```typescript
// Mobile-first approach
<div className="
  grid
  grid-cols-1        /* 1 column on mobile */
  md:grid-cols-2     /* 2 columns on tablet */
  lg:grid-cols-3     /* 3 columns on desktop */
  xl:grid-cols-4     /* 4 columns on large desktop */
  gap-6
">
```

## Worker API Client

### 1. Centralized HTTP Client

```typescript
// apps/ops/app/lib/worker-client.ts
const WORKER_URL = 'https://api.leaselab.io';

interface RequestOptions {
  method?: string;
  body?: any;
  siteId: string;
  siteToken: string;
}

export async function workerFetch(
  endpoint: string,
  options: RequestOptions
) {
  const { method = 'GET', body, siteId, siteToken } = options;

  const response = await fetch(`${WORKER_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${siteToken}`,
      'X-Site-Id': siteId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}
```

### 2. Usage in Loaders

```typescript
import { workerFetch } from '../lib/worker-client';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);

  const { properties } = await workerFetch('/api/ops/properties', {
    siteId: session.user.siteId,
    siteToken: session.siteToken,
  });

  return json({ properties });
}
```

## Performance Optimization

### 1. Prefetching

```typescript
import { Link } from '@remix-run/react';

// Prefetch data on hover
<Link to={`/properties/${property.id}`} prefetch="intent">
  View Property
</Link>
```

### 2. Optimistic UI

```typescript
import { useFetcher } from '@remix-run/react';

export function PropertyCard({ property }: PropertyCardProps) {
  const fetcher = useFetcher();
  const isDeleting = fetcher.state !== 'idle';

  return (
    <div className={isDeleting ? 'opacity-50' : ''}>
      <h3>{property.name}</h3>
      <fetcher.Form method="post" action={`/properties/${property.id}/delete`}>
        <button type="submit" disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </fetcher.Form>
    </div>
  );
}
```

## Common Mistakes to Avoid

### ❌ MISTAKE 1: Direct database access
```typescript
// WRONG - Never access DB directly from Remix
import { getProperties } from '../../worker/lib/db/properties';
```

✅ **USE**: HTTP API calls to worker

### ❌ MISTAKE 2: Forgetting authentication
```typescript
// WRONG - Missing auth headers
fetch(`${WORKER_URL}/api/ops/properties`)
```

✅ **USE**: Always include Bearer token and site_id

### ❌ MISTAKE 3: Client-side data fetching
```typescript
// WRONG - Fetching in component
useEffect(() => {
  fetch('/api/properties').then(...)
}, []);
```

✅ **USE**: Remix loaders for server-side fetching

## References

- Remix docs: https://remix.run/docs
- Cloudflare Pages: https://developers.cloudflare.com/pages/
- TailwindCSS: https://tailwindcss.com/docs
- Ops app: [apps/ops/](../apps/ops/)
- Site app: [apps/site/](../apps/site/)
- Project guide: [CLAUDE.md](../CLAUDE.md)
