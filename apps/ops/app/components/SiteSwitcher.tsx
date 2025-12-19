import { useFetcher } from '@remix-run/react';
import { Label, Select } from '@leaselab/ui-components';

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
        const formData = new FormData();
        formData.append('siteId', siteId);
        fetcher.submit(formData, { 
            method: 'POST', 
            action: '/api/site/switch'
        });
    };

    return (
        <div className="relative inline-flex items-center gap-3">
            <Label htmlFor="site-switcher" className="sr-only">
                Switch Site
            </Label>
            <Select
                id="site-switcher"
                value={currentSite}
                onChange={(event) => handleSiteChange(event.target.value)}
                disabled={fetcher.state !== 'idle'}
                className="min-w-[180px]"
            >
                {availableSites.map((site) => (
                    <option key={site.siteId} value={site.siteId}>
                        {site.siteId}
                    </option>
                ))}
            </Select>

            {fetcher.state !== 'idle' && (
                <svg className="animate-spin h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
        </div>
    );
}
