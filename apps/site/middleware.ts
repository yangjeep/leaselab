import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Only enable Basic Auth if DEMO_USER is set (demo/preview environment)
  // If DEMO_USER is not set, this is production and should be publicly accessible
  const user = process.env.DEMO_USER;
  
  if (!user) {
    // Production mode - no authentication required
    return NextResponse.next();
  }

  // Demo/preview mode - require Basic Auth
  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }
  const pass = process.env.DEMO_PASS || "demo123";
  const authHeader = req.headers.get("authorization") || "";
  const expected = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
  if (authHeader === expected) return NextResponse.next();
  return new NextResponse("Auth required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Protected"' }
  });
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|robots.txt|sitemap.xml).*)"],
};
