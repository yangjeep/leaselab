import { generateId } from '../../../../shared/utils';
import type { DatabaseInput } from './helpers';
import { normalizeDb } from './helpers';

export interface ThemeConfigurationRecord {
  id: string;
  siteId: string;
  themePreset: string;
  brandName: string | null;
  brandLogoUrl: string | null;
  brandFaviconUrl: string | null;
  customPrimaryHsl: string | null;
  customSecondaryHsl: string | null;
  customAccentHsl: string | null;
  fontFamily: string | null;
  enableDarkMode: boolean;
  defaultMode: string;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: any | null): ThemeConfigurationRecord | null {
  if (!row) return null;
  return {
    id: row.id,
    siteId: row.site_id,
    themePreset: row.theme_preset,
    brandName: row.brand_name,
    brandLogoUrl: row.brand_logo_url,
    brandFaviconUrl: row.brand_favicon_url,
    customPrimaryHsl: row.custom_primary_hsl,
    customSecondaryHsl: row.custom_secondary_hsl,
    customAccentHsl: row.custom_accent_hsl,
    fontFamily: row.font_family,
    enableDarkMode: row.enable_dark_mode ? Boolean(row.enable_dark_mode) : false,
    defaultMode: row.default_mode || 'dark',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getThemeConfiguration(
  dbInput: DatabaseInput,
  siteId: string
): Promise<ThemeConfigurationRecord | null> {
  const db = normalizeDb(dbInput);
  const row = await db.queryOne(
    `SELECT * FROM theme_configurations WHERE site_id = ? LIMIT 1`,
    [siteId]
  );
  return mapRow(row);
}

export interface UpsertThemeConfigInput {
  themePreset: string;
  brandName?: string | null;
  brandLogoUrl?: string | null;
  brandFaviconUrl?: string | null;
  customPrimaryHsl?: string | null;
  customSecondaryHsl?: string | null;
  customAccentHsl?: string | null;
  fontFamily?: string | null;
  enableDarkMode?: boolean;
  defaultMode?: string;
}

export async function upsertThemeConfiguration(
  dbInput: DatabaseInput,
  siteId: string,
  data: UpsertThemeConfigInput
): Promise<ThemeConfigurationRecord> {
  const db = normalizeDb(dbInput);
  const now = new Date().toISOString();
  const id = generateId('theme');

  await db.execute(
    `INSERT INTO theme_configurations (
      id,
      site_id,
      theme_preset,
      brand_name,
      brand_logo_url,
      brand_favicon_url,
      custom_primary_hsl,
      custom_secondary_hsl,
      custom_accent_hsl,
      font_family,
      enable_dark_mode,
      default_mode,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(site_id) DO UPDATE SET
      theme_preset = excluded.theme_preset,
      brand_name = excluded.brand_name,
      brand_logo_url = excluded.brand_logo_url,
      brand_favicon_url = excluded.brand_favicon_url,
      custom_primary_hsl = excluded.custom_primary_hsl,
      custom_secondary_hsl = excluded.custom_secondary_hsl,
      custom_accent_hsl = excluded.custom_accent_hsl,
      font_family = excluded.font_family,
      enable_dark_mode = excluded.enable_dark_mode,
      default_mode = excluded.default_mode,
      updated_at = excluded.updated_at`,
    [
      id,
      siteId,
      data.themePreset,
      data.brandName ?? null,
      data.brandLogoUrl ?? null,
      data.brandFaviconUrl ?? null,
      data.customPrimaryHsl ?? null,
      data.customSecondaryHsl ?? null,
      data.customAccentHsl ?? null,
      data.fontFamily ?? 'Inter',
      data.enableDarkMode === false ? 0 : 1,
      data.defaultMode ?? 'dark',
      now,
      now,
    ]
  );

  const row = await db.queryOne(
    `SELECT * FROM theme_configurations WHERE site_id = ? LIMIT 1`,
    [siteId]
  );
  return mapRow(row)!;
}
