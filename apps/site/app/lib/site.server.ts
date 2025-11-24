/**
 * Extracts the site ID from the request hostname.
 * 
 * Strategy:
 * 1. If host is `localhost` or an IP, return 'default'.
 * 2. If host has subdomains, use the first subdomain as site ID.
 *    e.g. `site1.leaselab.io` -> `site1`
 *    e.g. `demo.localhost` -> `demo`
 * 3. Fallback to 'default'.
 */
export function getSiteId(request: Request): string {
    const host = request.headers.get('Host');
    if (!host) return 'default';

    const hostname = host.split(':')[0];

    // Localhost handling
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'default';
    }

    // Split by dot
    const parts = hostname.split('.');

    // If we have more than 2 parts (e.g. sub.domain.com) or it's localhost with sub (sub.localhost)
    // we take the first part.
    // Note: This is a simple implementation. For production with custom domains, 
    // we might need a mapping table or more complex logic.
    if (parts.length > 2 || (hostname.endsWith('.localhost') && parts.length > 1)) {
        return parts[0];
    }

    return 'default';
}
