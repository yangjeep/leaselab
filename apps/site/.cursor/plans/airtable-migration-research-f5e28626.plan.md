<!-- f5e28626-358c-45bf-aba3-4bffb10dcd01 e6ff3590-1e16-4ec0-afec-482691acfa84 -->
# Baserow.io Migration to Cloudflare D1

## Architecture Overview

**New Flow:**

```
Baserow.io (Data Entry UI)
  → Webhook (on record create/update/delete)
    → Cloudflare Worker (receives & transforms)
      → Cloudflare D1 (single source of truth)
        → Next.js App (reads from D1)
```

**Benefits:**

- ✅ No API rate limits (webhook-based, push notifications)
- ✅ D1 becomes single source of truth (edge-optimized reads)
- ✅ Cost-effective (Baserow free tier + D1 free tier)
- ✅ Easy UI for non-technical users (Airtable-like interface)
- ✅ Real-time sync via webhooks

## Baserow.io Overview

**Why Baserow:**

- ✅ Native webhooks (built-in, no Zapier needed)
- ✅ Free tier includes webhooks
- ✅ Unlimited webhooks (no rate limits)
- ✅ Airtable-like UI (easy for non-technical users)
- ✅ REST API for initial data import
- ✅ Linked records support (for tenant leads → properties relationship)
- ✅ Cloud hosting (no self-hosting needed)

**Pricing:**

- **Free tier**: Limited rows (sufficient for <100 rows), webhooks included
- **Cloud Paid**: €5-10/month per user (if you need more rows/features)

## Implementation Plan

### Phase 1: Baserow Setup

#### 1.1 Create Baserow Account

1. Sign up at https://baserow.io
2. Create a new workspace
3. Create a new database (e.g., "Rental Properties")

#### 1.2 Create Properties Table

Create table with the following fields matching your current Airtable structure:

| Field Name | Field Type | Notes |

|------------|------------|-------|

| ID | Text | Unique identifier |

| Title | Text | Property title |

| Slug | Text | URL-friendly identifier |

| Monthly Rent | Number | Monthly rental price |

| Bedrooms | Number | Number of bedrooms |

| Bathrooms | Number | Number of bathrooms |

| Status | Single select | Available, Rented, etc. |

| City | Text | City name |

| Address | Text | Full address |

| Description | Long text | Property description |

| Pets | Single select | Allowed, Not Allowed, Conditional |

| Parking | Text | Parking information |

| Image Folder URL | URL | Google Drive folder URL |

**Baserow Field Types:**

- Text → Text field
- Number → Number field
- Single select → Select field (with options)
- Long text → Long text field
- URL → URL field

#### 1.3 Create Tenant Leads Table

Create table with fields:

| Field Name | Field Type | Notes |

|------------|------------|-------|

| Name | Text | Tenant name |

| Email | Email | Tenant email |

| Phone Number | Phone number | Tenant phone |

| Property | Link to row | Link to Properties table (linked record) |

| Ideal Move-in Date | Date | Move-in date |

| Number of Occupants | Number | Number of occupants |

| Employment Status | Single select | Employment status |

| Message | Long text | Additional message |

**Important:** The "Property" field should be a "Link to row" field type that links to the Properties table.

#### 1.4 Test Data Entry

1. Add a few test properties
2. Add a few test tenant leads (linked to properties)
3. Verify the UI is intuitive for non-technical users

### Phase 2: Cloudflare D1 Database Setup

#### 2.1 Create D1 Database

1. Go to Cloudflare Dashboard → Workers & Pages → D1
2. Click "Create database"
3. Name: `rental-manager-db`
4. Note the database ID (you'll need it for binding)

#### 2.2 Create Database Schema

Run the following SQL in D1:

```sql
-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  baserow_record_id INTEGER UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  price REAL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  status TEXT DEFAULT 'Available',
  city TEXT,
  address TEXT,
  description TEXT,
  pets TEXT,
  parking TEXT,
  image_folder_url TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Tenant leads table
CREATE TABLE IF NOT EXISTS tenant_leads (
  id TEXT PRIMARY KEY,
  baserow_record_id INTEGER UNIQUE,
  property_id TEXT,
  property_baserow_id INTEGER,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  move_in_date TEXT,
  number_of_occupants INTEGER,
  employment_status TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (property_id) REFERENCES properties(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_tenant_leads_property ON tenant_leads(property_id);
CREATE INDEX IF NOT EXISTS idx_properties_baserow_id ON properties(baserow_record_id);
CREATE INDEX IF NOT EXISTS idx_tenant_leads_baserow_id ON tenant_leads(baserow_record_id);
```

**Schema Notes:**

- `baserow_record_id`: Stores Baserow's record ID for mapping
- `id`: Your application's ID (can be slug or UUID)
- `property_baserow_id`: Links tenant leads to properties via Baserow ID

### Phase 3: Cloudflare Worker Setup

**Note:** Worker implementation details will be handled separately. The Worker needs to:

- Receive webhooks from Baserow (POST requests to Worker endpoint)
- Validate webhook secret (optional but recommended for security)
- Transform Baserow data to D1 schema (map field names, handle data types)
- Handle `row_created`, `row_updated`, and `row_deleted` events
- Write to Cloudflare D1 database:
  - Use `INSERT OR REPLACE` for create/update operations
  - Use `DELETE` for delete operations
- Handle both Properties and Tenant Leads tables (identify by `table_id`)
- Map Baserow field names to D1 column names (case-sensitive)
- Handle linked records (Property field in Tenant Leads comes as array of IDs)
- Store `baserow_record_id` for mapping between Baserow and D1

#### 3.1 Create Worker Project

```bash
# In your project root or separate directory
npm create cloudflare@latest baserow-d1-sync
cd baserow-d1-sync
```

#### 3.2 Configure wrangler.toml

```toml
name = "baserow-d1-sync"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "rental-manager-db"
database_id = "YOUR_D1_DATABASE_ID"

[env.production]
vars = { BASEROW_WEBHOOK_SECRET = "your-secret-here" }
```

#### 3.3 Implement Webhook Handler

Create `src/index.ts`:

```typescript
interface BaserowWebhook {
  event_type: 'row_created' | 'row_updated' | 'row_deleted';
  table_id: number;
  row: {
    id: number;
    [key: string]: any;
  };
  old_row?: {
    id: number;
    [key: string]: any;
  };
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Verify webhook secret (if configured)
    const secret = request.headers.get('X-Baserow-Webhook-Secret');
    const expectedSecret = env.BASEROW_WEBHOOK_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      const webhook: BaserowWebhook = await request.json();
      const { event_type, table_id, row, old_row } = webhook;

      // Determine which table based on table_id
      // You'll need to get these IDs from Baserow API after creating tables
      const PROPERTIES_TABLE_ID = env.PROPERTIES_TABLE_ID;
      const TENANT_LEADS_TABLE_ID = env.TENANT_LEADS_TABLE_ID;

      if (table_id === PROPERTIES_TABLE_ID) {
        await handlePropertyEvent(env.DB, event_type, row, old_row);
      } else if (table_id === TENANT_LEADS_TABLE_ID) {
        await handleTenantLeadEvent(env.DB, event_type, row, old_row);
      } else {
        console.warn(`Unknown table_id: ${table_id}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Webhook error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};

async function handlePropertyEvent(
  db: any,
  eventType: string,
  row: any,
  oldRow?: any
) {
  if (eventType === 'row_deleted') {
    // Delete from D1
    await db.prepare(
      'DELETE FROM properties WHERE baserow_record_id = ?'
    ).bind(row.id).run();
    return;
  }

  // Transform Baserow row to D1 schema
  const transformed = {
    id: row['ID'] || `prop-${row.id}`,
    baserow_record_id: row.id,
    title: row['Title'] || '',
    slug: row['Slug'] || slugify(row['Title'] || ''),
    price: parseFloat(row['Monthly Rent'] || '0'),
    bedrooms: parseInt(row['Bedrooms'] || '0'),
    bathrooms: parseInt(row['Bathrooms'] || '0'),
    status: row['Status'] || 'Available',
    city: row['City'] || '',
    address: row['Address'] || '',
    description: row['Description'] || '',
    pets: row['Pets'] || null,
    parking: row['Parking'] || null,
    image_folder_url: row['Image Folder URL'] || null,
    updated_at: Math.floor(Date.now() / 1000),
  };

  // Insert or replace
  await db.prepare(`
    INSERT OR REPLACE INTO properties (
      id, baserow_record_id, title, slug, price, bedrooms, bathrooms,
      status, city, address, description, pets, parking, image_folder_url, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    transformed.id,
    transformed.baserow_record_id,
    transformed.title,
    transformed.slug,
    transformed.price,
    transformed.bedrooms,
    transformed.bathrooms,
    transformed.status,
    transformed.city,
    transformed.address,
    transformed.description,
    transformed.pets,
    transformed.parking,
    transformed.image_folder_url,
    transformed.updated_at
  ).run();
}

async function handleTenantLeadEvent(
  db: any,
  eventType: string,
  row: any,
  oldRow?: any
) {
  if (eventType === 'row_deleted') {
    await db.prepare(
      'DELETE FROM tenant_leads WHERE baserow_record_id = ?'
    ).bind(row.id).run();
    return;
  }

  // Get property ID from linked record
  // Baserow linked records come as array of IDs
  const propertyBaserowId = Array.isArray(row['Property'])
    ? row['Property'][0]
    : row['Property'];

  // Look up property ID in D1
  const property = await db.prepare(
    'SELECT id FROM properties WHERE baserow_record_id = ?'
  ).bind(propertyBaserowId).first();

  const transformed = {
    id: `lead-${row.id}`,
    baserow_record_id: row.id,
    property_id: property?.id || null,
    property_baserow_id: propertyBaserowId,
    name: row['Name'] || '',
    email: row['Email'] || '',
    phone: row['Phone Number'] || null,
    message: row['Message'] || null,
    move_in_date: row['Ideal Move-in Date'] || null,
    number_of_occupants: parseInt(row['Number of Occupants'] || '0'),
    employment_status: row['Employment Status'] || null,
    updated_at: Math.floor(Date.now() / 1000),
  };

  await db.prepare(`
    INSERT OR REPLACE INTO tenant_leads (
      id, baserow_record_id, property_id, property_baserow_id,
      name, email, phone, message, move_in_date,
      number_of_occupants, employment_status, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    transformed.id,
    transformed.baserow_record_id,
    transformed.property_id,
    transformed.property_baserow_id,
    transformed.name,
    transformed.email,
    transformed.phone,
    transformed.message,
    transformed.move_in_date,
    transformed.number_of_occupants,
    transformed.employment_status,
    transformed.updated_at
  ).run();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
```

#### 3.4 Deploy Worker

```bash
# Set secrets
npx wrangler secret put BASEROW_WEBHOOK_SECRET
npx wrangler secret put PROPERTIES_TABLE_ID
npx wrangler secret put TENANT_LEADS_TABLE_ID

# Deploy
npx wrangler deploy
```

**Note:** You'll get table IDs from Baserow API after creating tables.

### Phase 4: Configure Baserow Webhooks

#### 4.1 Get Baserow API Token

1. Go to Baserow → Settings → API tokens
2. Create new API token
3. Save the token (you'll need it for API calls)

#### 4.2 Get Table IDs

Use Baserow API to get table IDs:

```bash
# Get database ID from Baserow URL or API
# Then get tables
curl -H "Authorization: Token YOUR_TOKEN" \
  https://api.baserow.io/api/database/tables/
```

#### 4.3 Create Webhook in Baserow

Use Baserow API to create webhook:

```bash
curl -X POST https://api.baserow.io/api/database/webhooks/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "table_id": YOUR_PROPERTIES_TABLE_ID,
    "url": "https://your-worker.workers.dev",
    "include_all_events": true,
    "request_method": "POST",
    "headers": {
      "X-Baserow-Webhook-Secret": "your-secret-here"
    }
  }'
```

**Webhook Events:**

- `row_created`: When new record is added
- `row_updated`: When record is modified
- `row_deleted`: When record is deleted

#### 4.4 Test Webhook

1. Create a test property in Baserow
2. Check Cloudflare Worker logs: `npx wrangler tail`
3. Verify data appears in D1:
   ```bash
   npx wrangler d1 execute rental-manager-db --command "SELECT * FROM properties LIMIT 5"
   ```


### Phase 5: Initial Data Migration

#### 5.1 Export from Airtable

1. Export Properties table as CSV
2. Export Tenant Leads table as CSV

#### 5.2 Import to Baserow

1. In Baserow, use "Import data" feature
2. Upload CSV files
3. Map columns to Baserow fields
4. Verify data imported correctly

#### 5.3 Initial Sync to D1

Option A: Let webhooks sync automatically (may take time)

Option B: Use Baserow API to bulk import to D1:

```typescript
// One-time script to sync all existing records
async function initialSync() {
  // Fetch all properties from Baserow API
  const properties = await fetchBaserowRecords(PROPERTIES_TABLE_ID);
  
  // Transform and insert into D1
  for (const property of properties) {
    // Use same transformation logic as webhook handler
    await insertPropertyToD1(property);
  }
}
```

### Phase 6: Update Next.js Application

#### 6.1 Update Environment Variables

Add to `.env.local`:

```bash
# Remove Airtable vars
# AIRTABLE_TOKEN=
# AIRTABLE_BASE_ID=
# AIRTABLE_TABLE_NAME=

# Add D1 configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
D1_DATABASE_ID=your_d1_database_id
D1_DATABASE_NAME=rental-manager-db
```

#### 6.2 Update fetchListings.ts

Replace `lib/fetchListings.ts`:

```typescript
import type { Listing } from "./types";

// D1 client (you'll need to set up D1 binding in Next.js)
// Option 1: Use Cloudflare Workers API
// Option 2: Use D1 HTTP API
// Option 3: Use direct D1 binding (if using Cloudflare Pages)

export async function fetchListings(): Promise<Listing[]> {
  // Option 1: Via Cloudflare Workers API
  const response = await fetch('https://your-worker.workers.dev/api/listings');
  const data = await response.json();
  return data.listings;

  // Option 2: Direct D1 query (if using Cloudflare Pages with D1 binding)
  // const result = await env.DB.prepare("SELECT * FROM properties").all();
  // return transformD1ToListing(result.results);
}

function transformD1ToListing(rows: any[]): Listing[] {
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    price: row.price,
    city: row.city,
    address: row.address,
    status: row.status,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    parking: row.parking,
    pets: row.pets,
    description: row.description,
    imageFolderUrl: row.image_folder_url,
    imageUrl: "/placeholder1.jpg", // Will be resolved from R2
    images: undefined,
  }));
}
```

#### 6.3 Update Tenant Leads API

Update `app/api/tenant-leads/route.ts`:

```typescript
// Option 1: Write directly to D1
// Option 2: Write to Baserow (let webhook sync to D1)

// Option 2 is recommended to keep Baserow as source of truth
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Write to Baserow via API
  const baserowResponse = await fetch(
    `https://api.baserow.io/api/database/rows/table/${TENANT_LEADS_TABLE_ID}/`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Token ${BASEROW_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Name: body.name,
        Email: body.email,
        'Phone Number': body.phone,
        Property: [body.propertyBaserowId], // Linked record array
        'Ideal Move-in Date': body.moveInDate,
        'Number of Occupants': body.numberOfOccupants,
        'Employment Status': body.employmentStatus,
        Message: body.message,
      }),
    }
  );
  
  // Webhook will automatically sync to D1
  return NextResponse.json({ success: true });
}
```

### Phase 7: Testing & Validation

#### 7.1 Test Webhook Flow

1. Create property in Baserow → Verify appears in D1
2. Update property in Baserow → Verify updates in D1
3. Delete property in Baserow → Verify removed from D1

#### 7.2 Test Next.js App

1. Verify listings load from D1
2. Test property detail pages
3. Test tenant lead form submission
4. Verify images still load from R2

#### 7.3 Test with Non-Technical Users

1. Have users add/edit properties in Baserow
2. Verify changes appear on website
3. Collect feedback on Baserow UI

### Phase 8: Go Live

1. **Switch DNS/Environment:**

   - Update production environment variables
   - Deploy updated Next.js app
   - Deploy Cloudflare Worker

2. **Monitor:**

   - Check Cloudflare Worker logs
   - Monitor D1 database size
   - Verify webhook delivery

3. **Decommission Airtable:**

   - After confirming everything works
   - Export final backup from Airtable
   - Cancel Airtable subscription

## Key Files to Modify

1. `lib/fetchListings.ts` - Read from D1 instead of Airtable
2. `app/api/tenant-leads/route.ts` - Write to Baserow instead of Airtable
3. `lib/types.ts` - May need to update types
4. `env.example` - Update environment variables

## New Files to Create

1. `worker/src/index.ts` - Cloudflare Worker webhook handler
2. `worker/wrangler.toml` - Worker configuration
3. `worker/package.json` - Worker dependencies

## Baserow Resources

- **Documentation**: https://baserow.io/docs
- **API Docs**: https://api.baserow.io/api/redoc/
- **Webhook Docs**: https://baserow.io/docs/apis/webhooks
- **Community**: https://community.baserow.io

## Troubleshooting

### Webhooks Not Firing

- Check Baserow webhook configuration
- Verify Worker URL is accessible
- Check Worker logs: `npx wrangler tail`
- Verify webhook secret matches

### Data Not Syncing

- Check D1 database binding
- Verify SQL queries are correct
- Check field name mappings (case-sensitive)
- Review Worker error logs

### Performance Issues

- Add indexes to D1 (already in schema)
- Consider caching in Next.js
- Monitor D1 read/write limits

## Next Steps

1. ✅ Sign up for Baserow.io free account
2. ✅ Create Properties and Tenant Leads tables
3. ✅ Set up Cloudflare D1 database
4. ✅ Create and deploy Cloudflare Worker
5. ✅ Configure Baserow webhooks
6. ✅ Test webhook flow end-to-end
7. ✅ Migrate data from Airtable
8. ✅ Update Next.js application
9. ✅ Test thoroughly
10. ✅ Deploy to production