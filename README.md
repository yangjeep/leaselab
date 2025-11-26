# LeaseLab

AI-First Rental Operations Platform - Monorepo with Remix + Cloudflare

## Project Structure

```
leaselab/
├── apps/
│   ├── site/          # Public storefront (Remix + Cloudflare Pages)
│   └── ops/           # Admin operations backend (Remix + Cloudflare Pages)
├── packages/
│   ├── shared-types/  # TypeScript interfaces
│   ├── shared-utils/  # Utility functions
│   └── shared-config/ # Schemas, enums, configs
└── package.json       # Workspace root
```

## Prerequisites

- Node.js 18+
- npm (Node 18+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler`)
- Cloudflare account

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
# Copy the example env file to .env.local at root
cp .env.example .env.local
```

Edit `.env.local` with your values:

```bash
# Required for both apps
D1_DATABASE_ID=your_d1_database_id

# Site app
OPS_API_URL=http://localhost:8788
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Ops app
OPENAI_API_KEY=your_openai_api_key
SESSION_SECRET=your_session_secret_min_32_chars
KV_NAMESPACE_ID=your_kv_namespace_id
```

Both apps read from this single `.env.local` file at the root.

### 3. Run Local Development

```bash
# Run both apps
npm run dev

# Or run individually
npm run dev:site   # http://localhost:5173
npm run dev:ops    # http://localhost:8788
```

## Deployment

### Step 1: Authenticate with Cloudflare

```bash
wrangler login
```

### Step 2: Create Cloudflare Resources

#### Create D1 Database

```bash
wrangler d1 create leaselab-db
```

Copy the `database_id` from the output and update both:
- `apps/site/wrangler.toml`
- `apps/ops/wrangler.toml`

```toml
[[d1_databases]]
binding = "DB"
database_name = "leaselab-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

#### Create KV Namespace (for sessions)

```bash
## Sessions
Use a signed cookie with `SESSION_SECRET`.
```

Update `apps/ops/wrangler.toml` with the namespace ID:

```toml
[[kv_namespaces]]
env = "SESSION_SECRET"
id = "YOUR_KV_NAMESPACE_ID"
```

#### Create R2 Bucket (for file storage)

```bash
wrangler r2 bucket create leaselab-files
```

### Step 3: Run Database Migrations

```bash
# Local development
cd apps/ops
npm run db:migrate

# Production
npm run db:migrate:prod
```

### Step 4: Create Cloudflare Pages Projects

#### Create Site Project

```bash
cd apps/site
wrangler pages project create leaselab-site
```

#### Create Ops Project

```bash
cd apps/ops
wrangler pages project create leaselab-ops
```

### Step 5: Set Production Secrets

#### Site App Secrets

```bash
cd apps/site
wrangler pages secret put GOOGLE_MAPS_API_KEY
```

#### Ops App Secrets

```bash
cd apps/ops
wrangler pages secret put OPENAI_API_KEY
wrangler pages secret put SESSION_SECRET
```

### Step 6: Configure Pages Bindings

In Cloudflare Dashboard, go to each Pages project's Settings > Functions:

**For leaselab-site:**
- D1 Database: `DB` → `leaselab-db`

**For leaselab-ops:**
- D1 Database: `DB` → `leaselab-db`
- Session Secret: `SESSION_SECRET` → long random string
- R2 Bucket: `FILE_BUCKET` → `leaselab-files`

### Step 7: Deploy

#### Build and Deploy Site

```bash
cd apps/site
npm run build
npm run deploy
```

#### Build and Deploy Ops

```bash
cd apps/ops
npm run build
npm run deploy
```

Or from root:

```bash
npm run build
npm run deploy:site
npm run deploy:ops
```

### Step 8: Update Production URLs

After deployment, update `apps/site/wrangler.toml` production vars:

```toml
[env.production.vars]
ENVIRONMENT = "production"
OPS_API_URL = "https://leaselab-ops.pages.dev"
```

Redeploy site for changes to take effect.

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-site:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build:site
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: apps/site
          command: pages deploy ./build/client --project-name=leaselab-site

  deploy-ops:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build:ops
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: apps/ops
          command: pages deploy ./build/client --project-name=leaselab-ops
```

Add `CLOUDFLARE_API_TOKEN` to your GitHub repository secrets.

## Custom Domains

1. Go to Cloudflare Dashboard → Pages → Your Project → Custom domains
2. Add your domain (e.g., `leaselab.com` for site, `ops.leaselab.com` for ops)
3. Update DNS records as instructed
4. Update `OPS_API_URL` in site's production vars to use the custom domain

## Troubleshooting

### Database Issues

```bash
# Check D1 database
wrangler d1 execute leaselab-db --command "SELECT name FROM sqlite_master WHERE type='table'"

# View recent leads
wrangler d1 execute leaselab-db --command "SELECT * FROM leads LIMIT 10"
```

### View Deployment Logs

```bash
wrangler pages deployment tail --project-name=leaselab-site
wrangler pages deployment tail --project-name=leaselab-ops
```

### Local D1 Reset

```bash
rm -rf apps/ops/.wrangler
npm run db:migrate
```

## Architecture

- **Site**: Public-facing property listings, lead capture forms
- **Ops**: Admin dashboard, AI tenant evaluation, lease management
- **Shared Packages**: Common types, utilities, and configuration

Both apps use:
- Remix for full-stack React
- Cloudflare Pages for hosting
- D1 (SQLite) for database
- Tailwind CSS for styling

Ops additionally uses:
- KV for session storage
- R2 for file uploads
- OpenAI for AI tenant screening
