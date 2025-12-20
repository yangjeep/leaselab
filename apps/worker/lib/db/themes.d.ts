import type { DatabaseInput } from './helpers';
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
export declare function getThemeConfiguration(dbInput: DatabaseInput, siteId: string): Promise<ThemeConfigurationRecord | null>;
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
export declare function upsertThemeConfiguration(dbInput: DatabaseInput, siteId: string, data: UpsertThemeConfigInput): Promise<ThemeConfigurationRecord>;
//# sourceMappingURL=themes.d.ts.map