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

export async function loader({ context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env || (typeof process !== "undefined" ? process.env : {});
  return json({
    GOOGLE_MAPS_API_KEY: env.GOOGLE_MAPS_API_KEY,
  });
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  const apiKey = data?.GOOGLE_MAPS_API_KEY;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {/* Google Maps JS API loader (only if key is present) */}
        {apiKey ? (
          <script
            src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}`}
            defer
          />
        ) : null}
      </head>
      <body className="min-h-screen antialiased">
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
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white/20">{errorStatus}</h1>
        <p className="mt-4 text-xl text-white/60">{errorMessage}</p>
        <a href="/" className="mt-6 inline-block btn">
          Go Home
        </a>
      </div>
    </div>
  );
}
