import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { fetchThemeConfig, type ThemeConfig } from "~/lib/api-client";

const fallbackTheme: ThemeConfig = {
  siteId: "main",
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

export async function loader({ context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env || (typeof process !== "undefined" ? process.env : {});
  try {
    const theme = await fetchThemeConfig(env);
    return json(theme);
  } catch (error) {
    console.error("Failed to fetch theme via API route", error);
    return json(fallbackTheme, { status: 200 });
  }
}
