import { getActiveSiteFromSession } from './auth.server';

/**
 * Extract site ID from request hostname
 * Format: subdomain.domain.com -> subdomain
 * localhost -> 'default'
 * 
 * NOTE: This is the simple version for initial resolution.
 * Use getActiveSiteId() for super admin support (checks session).
 */
export function getSiteId(request: Request): string {
  const host = request.headers.get('Host');
  if (!host) return 'default';

  const hostname = host.split(':')[0];

  // Localhost handling
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'default';
  }

  // Cloudflare Pages domains (e.g., *.pages.dev) should map to default site
  if (hostname.endsWith('.pages.dev')) {
    return 'default';
  }

  // Split by dot
  const parts = hostname.split('.');

  // If we have more than 2 parts (e.g. sub.domain.com) or it's localhost with sub (sub.localhost)
  // we take the first part.
  if (parts.length > 2 || (hostname.endsWith('.localhost') && parts.length > 1)) {
    return parts[0];
  }

  return 'default';
}

/**
 * Get the active site ID, considering super admin session selection
 * For super admins: returns session-stored site if available
 * For regular users: returns their assigned site_id
 * 
 * This should be used in most route handlers to get the correct site context.
 */
export async function getActiveSiteId(
  request: Request,
  user: { isSuperAdmin: boolean; siteId: string } | null,
  kv: KVNamespace
): Promise<string> {
  // If not logged in, use hostname-based resolution
  if (!user) {
    return getSiteId(request);
  }

  // If super admin, check session for active site
  if (user.isSuperAdmin) {
    const activeSite = await getActiveSiteFromSession(request, kv);
    if (activeSite) {
      return activeSite;
    }
    // Fall back to default for super admins if no active site set
    return 'default';
  }

  // Regular users always use their assigned site_id
  return user.siteId;
}
