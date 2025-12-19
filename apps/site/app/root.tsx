import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  isRouteErrorResponse,
  useRouteLoaderData,
} from "@remix-run/react";
import type { LinksFunction, MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { fetchThemeConfig, type ThemeConfig } from "~/lib/api-client";
import { themePresets } from "@leaselab/ui-components/themes";

import "./tailwind.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Rental Properties - Find Your Perfect Home" },
    { name: "description", content: "Browse available rental properties and apply online" },
  ];
};

export const links: LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  },
];

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
  let theme = fallbackTheme;

  try {
    theme = await fetchThemeConfig(env);
  } catch (error) {
    console.error("Failed to load theme configuration", error);
  }

  return json({
    GOOGLE_MAPS_API_KEY: env.GOOGLE_MAPS_API_KEY,
    theme,
  });
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  const apiKey = data?.GOOGLE_MAPS_API_KEY;
  const theme = data?.theme ?? fallbackTheme;
  const htmlMode = theme.defaultMode === "light" ? "light" : "dark";

  return (
    <html lang="en" className={htmlMode}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <style dangerouslySetInnerHTML={{ __html: buildThemeCSS(theme) }} />
        {apiKey ? (
          <script src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}`} defer />
        ) : null}
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();

  let errorMessage = "An unexpected error occurred";
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error.data?.message || error.statusText;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-muted-foreground">{errorStatus}</h1>
        <p className="text-lg text-muted-foreground">{errorMessage}</p>
        <a href="/" className="inline-flex btn">
          Go Home
        </a>
      </div>
    </div>
  );
}

function buildThemeCSS(theme: ThemeConfig): string {
  const preset = themePresets[theme.themePreset as keyof typeof themePresets] ?? themePresets.professional;
  const light = { ...preset.colors.light };
  const dark = { ...preset.colors.dark };

  if (theme.customColors?.primary) {
    light.primary = theme.customColors.primary;
    dark.primary = theme.customColors.primary;
  }
  if (theme.customColors?.secondary) {
    light.secondary = theme.customColors.secondary;
    dark.secondary = theme.customColors.secondary;
  }
  if (theme.customColors?.accent) {
    light.accent = theme.customColors.accent;
    dark.accent = theme.customColors.accent;
  }

  const declarations = (colors: typeof light) => `
    --color-background: ${colors.background};
    --color-foreground: ${colors.foreground};
    --color-card: ${colors.card};
    --color-card-foreground: ${colors.cardForeground};
    --color-popover: ${colors.popover};
    --color-popover-foreground: ${colors.popoverForeground};
    --color-primary: ${colors.primary};
    --color-primary-foreground: ${colors.primaryForeground};
    --color-secondary: ${colors.secondary};
    --color-secondary-foreground: ${colors.secondaryForeground};
    --color-muted: ${colors.muted};
    --color-muted-foreground: ${colors.mutedForeground};
    --color-accent: ${colors.accent};
    --color-accent-foreground: ${colors.accentForeground};
    --color-destructive: ${colors.destructive};
    --color-destructive-foreground: ${colors.destructiveForeground};
    --color-border: ${colors.border};
    --color-input: ${colors.input};
    --color-ring: ${colors.ring};
  `;

  const initial = theme.defaultMode === "light" ? light : dark;
  const fontFamily = `${theme.fontFamily ?? preset.font}, ui-sans-serif, system-ui, sans-serif`;

  return `
    :root {
      --font-family-sans: ${fontFamily};
      --radius: ${preset.radius};
      ${declarations(initial)}
    }
    .light {
      ${declarations(light)}
    }
    .dark {
      ${declarations(dark)}
    }
  `;
}
