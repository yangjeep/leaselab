# Theme Customization Guide

**Purpose**: Guide for customizing themes and making the Site app theme configurable via Ops.

**Last Updated**: 2025-12-18

---

## Overview

This document covers theme customization for both apps, including a system for making the Site (storefront) theme configurable through the Ops admin panel. This allows property managers to customize their public-facing site without code changes.

---

## Architecture: Multi-Tenant Theme System

### High-Level Flow

```
┌─────────────────┐
│   Ops Admin     │ Configure theme via UI
│   (Theme UI)    │ → Save to database
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   D1 Database   │ Store theme configurations
│   themes table  │ (colors, fonts, logos)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Site App      │ Load theme on render
│   (Storefront)  │ → Apply CSS variables
└─────────────────┘
```

### Why This Works

- **Database-driven**: Themes stored per tenant/site
- **No deploys needed**: Changes apply instantly
- **CSS variables**: Dynamic theme without JS overhead
- **Preset themes**: 2-3 professional themes to choose from
- **Custom overrides**: Advanced users can customize colors

---

## Part 1: Database Schema

### Theme Configuration Table

**Migration: `scripts/migrations/0009_theme_configuration.sql`**

```sql
-- Theme configurations for multi-tenant sites
CREATE TABLE IF NOT EXISTS theme_configurations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL,
  theme_preset TEXT NOT NULL DEFAULT 'professional', -- 'professional', 'modern', 'classic'

  -- Brand customization
  brand_name TEXT,
  brand_logo_url TEXT,
  brand_favicon_url TEXT,

  -- Custom colors (optional overrides)
  custom_primary_hsl TEXT,        -- e.g., "210 40% 56%"
  custom_secondary_hsl TEXT,
  custom_accent_hsl TEXT,

  -- Typography
  font_family TEXT DEFAULT 'Inter',

  -- Additional settings
  enable_dark_mode BOOLEAN DEFAULT TRUE,
  default_mode TEXT DEFAULT 'dark', -- 'light' or 'dark'

  -- Metadata
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(site_id)
);

-- Default theme for main site
INSERT INTO theme_configurations (site_id, theme_preset, brand_name)
VALUES ('main', 'professional', 'LeaseLab')
ON CONFLICT(site_id) DO NOTHING;
```

---

## Part 2: Theme Presets

### Preset 1: Professional (Default)

**Target**: Corporate property management, professional landlords
**Vibe**: Clean, trustworthy, corporate

```typescript
// shared/ui-components/src/themes/professional.ts
export const professionalTheme = {
  name: 'Professional',
  description: 'Clean and corporate design for professional property management',
  colors: {
    light: {
      background: '0 0% 100%',
      foreground: '222.2 84% 4.9%',
      primary: '210 40% 56%',          // Professional blue
      primaryForeground: '210 40% 98%',
      secondary: '210 40% 96.1%',
      secondaryForeground: '222.2 47.4% 11.2%',
      accent: '210 40% 96.1%',
      accentForeground: '222.2 47.4% 11.2%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '210 40% 98%',
      muted: '210 40% 96.1%',
      mutedForeground: '215.4 16.3% 46.9%',
      border: '214.3 31.8% 91.4%',
      input: '214.3 31.8% 91.4%',
      ring: '222.2 84% 4.9%',
    },
    dark: {
      background: '222.2 84% 4.9%',
      foreground: '210 40% 98%',
      primary: '210 40% 70%',
      primaryForeground: '222.2 47.4% 11.2%',
      secondary: '217.2 32.6% 17.5%',
      secondaryForeground: '210 40% 98%',
      accent: '217.2 32.6% 17.5%',
      accentForeground: '210 40% 98%',
      destructive: '0 62.8% 30.6%',
      destructiveForeground: '210 40% 98%',
      muted: '217.2 32.6% 17.5%',
      mutedForeground: '215 20.2% 65.1%',
      border: '217.2 32.6% 17.5%',
      input: '217.2 32.6% 17.5%',
      ring: '212.7 26.8% 83.9%',
    }
  },
  radius: '0.5rem',
  font: 'Inter',
}
```

### Preset 2: Modern

**Target**: Tech-forward companies, startups, modern brands
**Vibe**: Bold, colorful, energetic

```typescript
// shared/ui-components/src/themes/modern.ts
export const modernTheme = {
  name: 'Modern',
  description: 'Bold and vibrant design for modern brands',
  colors: {
    light: {
      background: '0 0% 100%',
      foreground: '240 10% 3.9%',
      primary: '262 83% 58%',           // Purple/violet
      primaryForeground: '0 0% 100%',
      secondary: '270 95% 75%',
      secondaryForeground: '240 5.9% 10%',
      accent: '340 82% 52%',            // Pink accent
      accentForeground: '0 0% 100%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '0 0% 98%',
      muted: '240 4.8% 95.9%',
      mutedForeground: '240 3.8% 46.1%',
      border: '240 5.9% 90%',
      input: '240 5.9% 90%',
      ring: '262 83% 58%',
    },
    dark: {
      background: '240 10% 3.9%',
      foreground: '0 0% 98%',
      primary: '263 70% 65%',
      primaryForeground: '0 0% 100%',
      secondary: '270 50% 30%',
      secondaryForeground: '0 0% 98%',
      accent: '340 75% 55%',
      accentForeground: '0 0% 98%',
      destructive: '0 62.8% 30.6%',
      destructiveForeground: '0 0% 98%',
      muted: '240 3.7% 15.9%',
      mutedForeground: '240 5% 64.9%',
      border: '240 3.7% 15.9%',
      input: '240 3.7% 15.9%',
      ring: '263 70% 50.2%',
    }
  },
  radius: '1rem',          // More rounded
  font: 'Inter',
}
```

### Preset 3: Classic

**Target**: Traditional real estate, established companies
**Vibe**: Elegant, timeless, sophisticated

```typescript
// shared/ui-components/src/themes/classic.ts
export const classicTheme = {
  name: 'Classic',
  description: 'Timeless and elegant design for traditional brands',
  colors: {
    light: {
      background: '36 39% 98%',         // Warm white
      foreground: '36 45% 15%',
      primary: '25 95% 53%',            // Warm orange/gold
      primaryForeground: '36 45% 11%',
      secondary: '36 33% 75%',
      secondaryForeground: '36 45% 25%',
      accent: '36 64% 57%',
      accentForeground: '36 72% 17%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '0 0% 98%',
      muted: '36 33% 90%',
      mutedForeground: '36 15% 40%',
      border: '36 25% 85%',
      input: '36 25% 85%',
      ring: '25 95% 53%',
    },
    dark: {
      background: '36 39% 8%',
      foreground: '36 45% 96%',
      primary: '25 90% 58%',
      primaryForeground: '36 45% 11%',
      secondary: '36 20% 25%',
      secondaryForeground: '36 45% 96%',
      accent: '36 64% 50%',
      accentForeground: '36 45% 96%',
      destructive: '0 62.8% 30.6%',
      destructiveForeground: '0 0% 98%',
      muted: '36 20% 20%',
      mutedForeground: '36 20% 65%',
      border: '36 20% 20%',
      input: '36 20% 20%',
      ring: '25 90% 58%',
    }
  },
  radius: '0.375rem',      // Less rounded, more traditional
  font: 'Georgia, serif',
}
```

### Theme Registry

**File: `shared/ui-components/src/themes/index.ts`**

```typescript
import { professionalTheme } from './professional'
import { modernTheme } from './modern'
import { classicTheme } from './classic'

export const themePresets = {
  professional: professionalTheme,
  modern: modernTheme,
  classic: classicTheme,
} as const

export type ThemePreset = keyof typeof themePresets

export { professionalTheme, modernTheme, classicTheme }
```

---

## Part 3: API Routes

### Get Theme Configuration

**File: `apps/site/app/routes/api.theme.ts`**

```typescript
import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare"
import type { Database } from "@leaselab/shared-types"

export async function loader({ context }: LoaderFunctionArgs) {
  const db = context.DB as Database
  const siteId = context.env.SITE_ID || 'main'

  // Fetch theme configuration
  const theme = await db
    .prepare(
      `SELECT * FROM theme_configurations
       WHERE site_id = ?
       LIMIT 1`
    )
    .bind(siteId)
    .first()

  if (!theme) {
    // Return default theme
    return json({
      theme_preset: 'professional',
      enable_dark_mode: true,
      default_mode: 'dark',
      custom_colors: null,
    })
  }

  return json({
    theme_preset: theme.theme_preset,
    brand_name: theme.brand_name,
    brand_logo_url: theme.brand_logo_url,
    enable_dark_mode: theme.enable_dark_mode,
    default_mode: theme.default_mode,
    font_family: theme.font_family,
    custom_colors: {
      primary: theme.custom_primary_hsl,
      secondary: theme.custom_secondary_hsl,
      accent: theme.custom_accent_hsl,
    },
  })
}
```

### Update Theme Configuration (Ops Admin)

**File: `apps/ops/app/routes/api.admin.theme.ts`**

```typescript
import { json, type ActionFunctionArgs } from "@remix-run/cloudflare"
import type { Database } from "@leaselab/shared-types"
import { requireAuth } from "~/lib/auth"

export async function action({ request, context }: ActionFunctionArgs) {
  // Require admin authentication
  const user = await requireAuth(request, context)
  if (user.role !== 'admin') {
    throw new Response("Unauthorized", { status: 403 })
  }

  const db = context.DB as Database
  const formData = await request.formData()
  const siteId = formData.get('site_id') as string || 'main'

  // Update theme configuration
  const result = await db
    .prepare(
      `INSERT INTO theme_configurations (
        site_id, theme_preset, brand_name, brand_logo_url,
        custom_primary_hsl, custom_secondary_hsl, custom_accent_hsl,
        font_family, enable_dark_mode, default_mode, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(site_id) DO UPDATE SET
        theme_preset = excluded.theme_preset,
        brand_name = excluded.brand_name,
        brand_logo_url = excluded.brand_logo_url,
        custom_primary_hsl = excluded.custom_primary_hsl,
        custom_secondary_hsl = excluded.custom_secondary_hsl,
        custom_accent_hsl = excluded.custom_accent_hsl,
        font_family = excluded.font_family,
        enable_dark_mode = excluded.enable_dark_mode,
        default_mode = excluded.default_mode,
        updated_at = CURRENT_TIMESTAMP`
    )
    .bind(
      siteId,
      formData.get('theme_preset'),
      formData.get('brand_name'),
      formData.get('brand_logo_url'),
      formData.get('custom_primary_hsl'),
      formData.get('custom_secondary_hsl'),
      formData.get('custom_accent_hsl'),
      formData.get('font_family'),
      formData.get('enable_dark_mode') === 'true' ? 1 : 0,
      formData.get('default_mode'),
    )
    .run()

  return json({ success: true })
}
```

---

## Part 4: Dynamic Theme Application

### Site App Root with Dynamic Theme

**File: `apps/site/app/root.tsx`**

```typescript
import { cssBundleHref } from "@remix-run/css-bundle"
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/cloudflare"
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react"
import { useEffect } from "react"

import tailwindStyles from "~/tailwind.css"

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwindStyles },
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
]

export async function loader({ context }: LoaderFunctionArgs) {
  const db = context.DB
  const siteId = context.env.SITE_ID || 'main'

  // Fetch theme
  const theme = await db
    .prepare('SELECT * FROM theme_configurations WHERE site_id = ? LIMIT 1')
    .bind(siteId)
    .first()

  return {
    theme: theme || {
      theme_preset: 'professional',
      enable_dark_mode: true,
      default_mode: 'dark',
    }
  }
}

export default function App() {
  const { theme } = useLoaderData<typeof loader>()

  return (
    <html lang="en" className={theme.default_mode}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <style dangerouslySetInnerHTML={{ __html: getThemeCSS(theme) }} />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}

function getThemeCSS(theme: any): string {
  // Import theme presets
  const { themePresets } = await import('@leaselab/ui-components/themes')
  const preset = themePresets[theme.theme_preset as keyof typeof themePresets]

  const mode = theme.default_mode === 'light' ? 'light' : 'dark'
  const colors = preset.colors[mode]

  // Apply custom color overrides if present
  if (theme.custom_primary_hsl) {
    colors.primary = theme.custom_primary_hsl
  }
  if (theme.custom_secondary_hsl) {
    colors.secondary = theme.custom_secondary_hsl
  }
  if (theme.custom_accent_hsl) {
    colors.accent = theme.custom_accent_hsl
  }

  return `
    :root {
      --radius: ${preset.radius};

      --color-background: ${colors.background};
      --color-foreground: ${colors.foreground};
      --color-primary: ${colors.primary};
      --color-primary-foreground: ${colors.primaryForeground};
      --color-secondary: ${colors.secondary};
      --color-secondary-foreground: ${colors.secondaryForeground};
      --color-accent: ${colors.accent};
      --color-accent-foreground: ${colors.accentForeground};
      --color-destructive: ${colors.destructive};
      --color-destructive-foreground: ${colors.destructiveForeground};
      --color-muted: ${colors.muted};
      --color-muted-foreground: ${colors.mutedForeground};
      --color-border: ${colors.border};
      --color-input: ${colors.input};
      --color-ring: ${colors.ring};

      --font-family-sans: ${theme.font_family || preset.font}, ui-sans-serif, system-ui, sans-serif;
    }
  `
}
```

---

## Part 5: Theme Configuration UI (Ops Admin)

### Theme Settings Page

**File: `apps/ops/app/routes/admin.theme.tsx`**

```typescript
import { useState } from "react"
import { Form, useLoaderData, useNavigation } from "@remix-run/react"
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare"
import { json, redirect } from "@remix-run/cloudflare"

import { Button } from "@leaselab/ui-components"
import { Card } from "@leaselab/ui-components"
import { Input } from "@leaselab/ui-components"
import { Label } from "@leaselab/ui-components"
import { Select } from "@leaselab/ui-components"
import { themePresets } from "@leaselab/ui-components/themes"

export async function loader({ context }: LoaderFunctionArgs) {
  const db = context.DB
  const theme = await db
    .prepare('SELECT * FROM theme_configurations WHERE site_id = ? LIMIT 1')
    .bind('main')
    .first()

  return json({ theme, presets: Object.keys(themePresets) })
}

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData()
  const db = context.DB

  await db
    .prepare(
      `INSERT INTO theme_configurations (
        site_id, theme_preset, brand_name, brand_logo_url,
        enable_dark_mode, default_mode, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(site_id) DO UPDATE SET
        theme_preset = excluded.theme_preset,
        brand_name = excluded.brand_name,
        brand_logo_url = excluded.brand_logo_url,
        enable_dark_mode = excluded.enable_dark_mode,
        default_mode = excluded.default_mode,
        updated_at = CURRENT_TIMESTAMP`
    )
    .bind(
      'main',
      formData.get('theme_preset'),
      formData.get('brand_name'),
      formData.get('brand_logo_url'),
      formData.get('enable_dark_mode') === 'on' ? 1 : 0,
      formData.get('default_mode'),
    )
    .run()

  return redirect('/admin/theme')
}

export default function ThemeSettings() {
  const { theme, presets } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const [selectedPreset, setSelectedPreset] = useState(
    theme?.theme_preset || 'professional'
  )

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Theme Configuration</h1>
      <p className="text-muted-foreground mb-8">
        Customize the appearance of your public-facing storefront
      </p>

      <Form method="post" className="space-y-8">
        {/* Theme Preset Selection */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Choose Theme Preset</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {presets.map((preset) => {
              const themeData = themePresets[preset as keyof typeof themePresets]
              return (
                <label
                  key={preset}
                  className={`
                    border-2 rounded-lg p-4 cursor-pointer transition
                    ${selectedPreset === preset
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="theme_preset"
                    value={preset}
                    checked={selectedPreset === preset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    className="sr-only"
                  />

                  <div className="font-semibold mb-2 capitalize">
                    {themeData.name}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {themeData.description}
                  </p>

                  {/* Color preview */}
                  <div className="flex gap-2 mt-4">
                    <div
                      className="w-8 h-8 rounded"
                      style={{
                        backgroundColor: `hsl(${themeData.colors.light.primary})`
                      }}
                    />
                    <div
                      className="w-8 h-8 rounded"
                      style={{
                        backgroundColor: `hsl(${themeData.colors.light.secondary})`
                      }}
                    />
                    <div
                      className="w-8 h-8 rounded"
                      style={{
                        backgroundColor: `hsl(${themeData.colors.light.accent})`
                      }}
                    />
                  </div>
                </label>
              )
            })}
          </div>
        </Card>

        {/* Brand Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Brand Settings</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="brand_name">Brand Name</Label>
              <Input
                id="brand_name"
                name="brand_name"
                defaultValue={theme?.brand_name || ''}
                placeholder="Your Company Name"
              />
            </div>

            <div>
              <Label htmlFor="brand_logo_url">Logo URL</Label>
              <Input
                id="brand_logo_url"
                name="brand_logo_url"
                defaultValue={theme?.brand_logo_url || ''}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
        </Card>

        {/* Display Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Display Settings</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enable_dark_mode"
                name="enable_dark_mode"
                defaultChecked={theme?.enable_dark_mode}
              />
              <Label htmlFor="enable_dark_mode">Enable Dark Mode</Label>
            </div>

            <div>
              <Label htmlFor="default_mode">Default Mode</Label>
              <select
                id="default_mode"
                name="default_mode"
                defaultValue={theme?.default_mode || 'dark'}
                className="w-full border rounded-md p-2"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={navigation.state === 'submitting'}>
            {navigation.state === 'submitting' ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Form>
    </div>
  )
}
```

---

## Part 6: Advanced: Custom Color Overrides

### Color Picker Component

**File: `apps/ops/app/components/color-picker.tsx`**

```typescript
import { useState } from "react"
import { Input } from "@leaselab/ui-components"
import { Label } from "@leaselab/ui-components"

interface ColorPickerProps {
  label: string
  name: string
  defaultValue?: string
  onChange?: (hsl: string) => void
}

export function ColorPicker({
  label,
  name,
  defaultValue,
  onChange
}: ColorPickerProps) {
  const [hsl, setHsl] = useState(defaultValue || '210 40% 56%')

  const handleChange = (value: string) => {
    setHsl(value)
    onChange?.(value)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex gap-2 items-center">
        <div
          className="w-12 h-12 rounded border"
          style={{ backgroundColor: `hsl(${hsl})` }}
        />
        <Input
          id={name}
          name={name}
          value={hsl}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="210 40% 56%"
          className="flex-1"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Format: hue saturation% lightness% (e.g., "210 40% 56%")
      </p>
    </div>
  )
}
```

---

## Summary

### What This Enables

1. **Ops Admin** can configure Site theme through UI
2. **3 preset themes** (Professional, Modern, Classic)
3. **Custom brand settings** (name, logo)
4. **Display settings** (dark mode, default mode)
5. **Advanced users** can override individual colors
6. **No deploys needed** - changes apply instantly

### Implementation Checklist

- [ ] Create database migration for theme_configurations table
- [ ] Create theme preset definitions in shared package
- [ ] Build theme API route in Site app
- [ ] Build admin theme API route in Ops app
- [ ] Create theme settings UI in Ops admin
- [ ] Implement dynamic CSS injection in Site root
- [ ] Add color picker for advanced customization (optional)
- [ ] Test all three presets
- [ ] Document for users

---

**Next**: Implement the database migration and start with the Professional theme preset.
