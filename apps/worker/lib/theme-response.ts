import type { ThemeConfigurationRecord } from "./db/themes";

export interface ThemeApiPayload {
  siteId: string;
  themePreset: string;
  brandName: string | null;
  brandLogoUrl: string | null;
  brandFaviconUrl: string | null;
  fontFamily: string | null;
  enableDarkMode: boolean;
  defaultMode: string;
  customColors: {
    primary: string | null;
    secondary: string | null;
    accent: string | null;
  } | null;
  updatedAt: string;
}

export function buildThemePayload(
  record: ThemeConfigurationRecord | null,
  siteId: string
): ThemeApiPayload {
  if (!record) {
    return {
      siteId,
      themePreset: "professional",
      brandName: "LeaseLab",
      brandLogoUrl: null,
      brandFaviconUrl: null,
      fontFamily: "Inter",
      enableDarkMode: true,
      defaultMode: "dark",
      customColors: null,
      updatedAt: new Date(0).toISOString(),
    };
  }

  const customColors =
    record.customPrimaryHsl || record.customSecondaryHsl || record.customAccentHsl
      ? {
          primary: record.customPrimaryHsl,
          secondary: record.customSecondaryHsl,
          accent: record.customAccentHsl,
        }
      : null;

  return {
    siteId,
    themePreset: record.themePreset,
    brandName: record.brandName,
    brandLogoUrl: record.brandLogoUrl,
    brandFaviconUrl: record.brandFaviconUrl,
    fontFamily: record.fontFamily,
    enableDarkMode: record.enableDarkMode,
    defaultMode: record.defaultMode || "dark",
    customColors,
    updatedAt: record.updatedAt,
  };
}
