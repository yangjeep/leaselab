import { professionalTheme } from "./professional";
import { modernTheme } from "./modern";
import { classicTheme } from "./classic";

export const themePresets = {
  professional: professionalTheme,
  modern: modernTheme,
  classic: classicTheme,
} as const;

export type ThemePreset = keyof typeof themePresets;
export type ThemeMode = "light" | "dark";

export interface ThemeConfiguration {
  siteId: string;
  themePreset: ThemePreset;
  brandName?: string | null;
  brandLogoUrl?: string | null;
  fontFamily?: string | null;
  enableDarkMode?: boolean;
  defaultMode?: ThemeMode;
  customColors?: {
    primary?: string | null;
    secondary?: string | null;
    accent?: string | null;
  } | null;
}

export { professionalTheme, modernTheme, classicTheme };
