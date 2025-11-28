import { useFetcher, useLoaderData } from '@remix-run/react';

// Type definition for accessible sites
interface AccessibleSite {
    siteId: string;
    grantedAt?: string;
    role?: string;
}


interface SiteSwitcherProps {
    currentSite: string;
    availableSites: AccessibleSite[];
}

export function SiteSwitcher({ currentSite, availableSites }: SiteSwitcherProps) {
    const fetcher = useFetcher();

    if (availableSites.length <= 1) {
        // Only one site - no need to show switcher
        return null;
    }

    const handleSiteChange = (siteId: string) => {
        fetcher.submit(
            { siteId },
            { method: 'POST', action: '/api/site/switch', encType: 'application/json' }
        );
    };

    return (
        <div className="relative inline-block">
            <label htmlFor="site-switcher" className="sr-only">
                Switch Site
            </label>
            <select
                id="site-switcher"
                value={currentSite}
                onChange={(e) => handleSiteChange(e.target.value)}
                disabled={fetcher.state !== 'idle'}
                className="appearance-none bg-gray-800 border border-gray-700 text-white text-sm rounded-lg 
                   focus:ring-blue-500 focus:border-blue-500 block w-full px-3 py-2 pr-8
                   disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {availableSites.map((site) => (
                    <option key={site.siteId} value={site.siteId}>
                        {site.siteId}
                    </option>
                ))}
            </select>

            {fetcher.state !== 'idle' && (
                <div className="absolute right-2 top-2.5">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            )}

            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    );
}
