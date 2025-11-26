import type { Listing } from './types';

/**
 * API Client for communicating with the backend ops API
 * Uses token-based authentication
 */

export interface SiteConfig {
    siteId: string;
    siteName: string;
    about: {
        title: string | null;
        description: string | null;
        stats: Array<{ label: string; value: string }>;
    };
    branding: {
        logoUrl: string | null;
        primaryColor: string | null;
    };
    contact: {
        email: string | null;
        phone: string | null;
    };
}

/**
 * Get the API base URL from environment
 * Prefers WORKER_URL for CRUD operations, falls back to OPS_API_URL
 */
function getApiUrl(env: { WORKER_URL?: string; OPS_API_URL?: string }): string {
    const url = env.WORKER_URL || env.OPS_API_URL;
    if (!url) {
        throw new Error('WORKER_URL or OPS_API_URL environment variable must be configured');
    }
    return url;
}

/**
 * Get the API token from environment
 */
function getApiToken(env: { SITE_API_TOKEN?: string }): string {
    const token = env.SITE_API_TOKEN;
    if (!token) {
        throw new Error('SITE_API_TOKEN environment variable is not configured');
    }
    return token;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
    env: { WORKER_URL?: string; OPS_API_URL?: string; SITE_API_TOKEN?: string },
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const baseUrl = getApiUrl(env);
    const token = getApiToken(env);
    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            ...options?.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'API request failed');
    }

    return data.data as T;
}

/**
 * Fetch all properties with optional filters
 */
export async function fetchProperties(
    env: { WORKER_URL?: string; OPS_API_URL?: string; SITE_API_TOKEN?: string },
    filters?: {
        city?: string;
        bedrooms?: string;
        bathrooms?: string;
        max?: string;
        status?: string;
        pet?: string;
    }
): Promise<Listing[]> {
    const params = new URLSearchParams();
    if (filters?.city && filters.city !== 'All') params.append('city', filters.city);
    if (filters?.status) params.append('status', filters.status);

    const endpoint = `/api/public/properties${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<Listing[]>(env, endpoint);
}

/**
 * Fetch a single property by ID
 */
export async function fetchPropertyById(
    env: { WORKER_URL?: string; OPS_API_URL?: string; SITE_API_TOKEN?: string },
    id: string
): Promise<Listing> {
    return apiRequest<Listing>(env, `/api/public/properties/${id}`);
}

/**
 * Fetch site configuration
 */
export async function fetchSiteConfig(
    env: { WORKER_URL?: string; OPS_API_URL?: string; SITE_API_TOKEN?: string }
): Promise<SiteConfig> {
    return apiRequest<SiteConfig>(env, '/api/public/site-config');
}

/**
 * Submit an application with optional file uploads
 */
export async function submitApplication(
    env: { WORKER_URL?: string; OPS_API_URL?: string; SITE_API_TOKEN?: string },
    data: {
        propertyId: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        employmentStatus: string;
        monthlyIncome: number;
        moveInDate: string;
        message?: string;
    },
    files?: Array<{ name: string; file: File }>
): Promise<{ leadId: string; message: string }> {
    const baseUrl = getApiUrl(env);
    const token = getApiToken(env);

    // If no files, use JSON
    if (!files || files.length === 0) {
        const response = await fetch(`${baseUrl}/api/public/leads`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || 'Failed to submit application');
        }

        const result = await response.json();
        return result.data;
    }

    // With files, use multipart/form-data
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
    });

    files.forEach(({ name, file }) => {
        formData.append(name, file);
    });

    const response = await fetch(`${baseUrl}/api/public/leads`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to submit application');
    }

    const result = await response.json();
    return result.data;
}
