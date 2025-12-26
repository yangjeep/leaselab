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
export declare function buildThemePayload(record: ThemeConfigurationRecord | null, siteId: string): ThemeApiPayload;
//# sourceMappingURL=theme-response.d.ts.map