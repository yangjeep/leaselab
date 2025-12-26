-- Theme configurations for storefront styling
CREATE TABLE IF NOT EXISTS theme_configurations (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  theme_preset TEXT NOT NULL DEFAULT 'professional',
  brand_name TEXT,
  brand_logo_url TEXT,
  brand_favicon_url TEXT,
  custom_primary_hsl TEXT,
  custom_secondary_hsl TEXT,
  custom_accent_hsl TEXT,
  font_family TEXT DEFAULT 'Inter',
  enable_dark_mode INTEGER DEFAULT 1,
  default_mode TEXT DEFAULT 'dark',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(site_id)
);

-- Ensure there is a default row for the main site
INSERT INTO theme_configurations (id, site_id, theme_preset, brand_name)
VALUES ('theme_main', 'main', 'professional', 'LeaseLab')
ON CONFLICT(site_id) DO UPDATE SET theme_preset = excluded.theme_preset;
