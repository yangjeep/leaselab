import { json, type LoaderFunctionArgs, type LinksFunction } from "@remix-run/cloudflare";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  isRouteErrorResponse,
  useLoaderData,
} from "@remix-run/react";
import { getSiteId } from "~/lib/site.server";
import { getSessionCookie, verifySessionCookie } from "~/lib/session-cookie.server";
import { fetchUserAccessibleSitesFromWorker, fetchUserHasAccessToSiteFromWorker } from "~/lib/worker-client";
import { setActiveSite } from "~/lib/auth.server";
import { SiteSwitcher } from "~/components/SiteSwitcher";

import "./tailwind.css";

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
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const workerEnv = { WORKER_URL: env.WORKER_URL, WORKER_INTERNAL_KEY: env.WORKER_INTERNAL_KEY };
  const sessionSecret = env.SESSION_SECRET;

  let activeSite: string | null = null;
  let accessibleSites: { siteId: string; grantedAt?: string }[] = [];

  const cookie = getSessionCookie(request);
  if (cookie) {
    const session = await verifySessionCookie(cookie, sessionSecret);
    if (session) {
      activeSite = session.siteId;
      // Fetch sites user can access
      accessibleSites = await fetchUserAccessibleSitesFromWorker(workerEnv, session.userId);
      // If active site revoked, choose first accessible and reissue cookie
      if (activeSite && !accessibleSites.find(s => s.siteId === activeSite)) {
        if (accessibleSites.length > 0) {
          const newSiteId = accessibleSites[0].siteId;
          const setCookieHeader = await setActiveSite(request, sessionSecret, newSiteId);
          activeSite = newSiteId;
          return json({ siteId: activeSite, accessibleSites }, { headers: { 'Set-Cookie': setCookieHeader } });
        } else {
          activeSite = null;
        }
      }
    }
  }

  // Fallback to request-derived site if no session-based context
  if (!activeSite) {
    activeSite = getSiteId(request);
  }

  return json({ siteId: activeSite, accessibleSites });
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { siteId, accessibleSites } = useLoaderData<typeof loader>();
  return (
    <>
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-between">
          <h1 className="text-lg font-semibold">LeaseLab Ops Dashboard</h1>
          <SiteSwitcher currentSite={siteId || ''} availableSites={accessibleSites || []} />
        </div>
      </div>
      <Outlet context={{ siteId, accessibleSites }} />
    </>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  let errorMessage = "Unknown error";
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
        <h1 className="text-4xl font-bold text-red-600">{errorStatus}</h1>
        <p className="mt-2 text-lg text-gray-600">{errorMessage}</p>
      </div>
    </div>
  );
}
