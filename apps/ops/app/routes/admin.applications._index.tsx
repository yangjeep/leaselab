/**
 * Application Board - Property-centric application overview
 * Shows all properties with pending application counts
 */

import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link, useSearchParams } from '@remix-run/react';
import { useState, useMemo } from 'react';
import { getSiteId } from '~/lib/site.server';
import { fetchPropertiesWithApplicationCountsFromWorker, fetchGeneralInquiriesCountFromWorker } from '~/lib/worker-client';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);

  // Fetch properties with application counts
  // Only show properties with available units
  const properties = await fetchPropertiesWithApplicationCountsFromWorker(env, siteId, {
    onlyAvailable: true,
  });

  // Fetch general inquiries count
  const generalInquiriesCount = await fetchGeneralInquiriesCountFromWorker(env, siteId);

  return json({
    properties,
    generalInquiriesCount,
  });
}

export default function ApplicationBoard() {
  const { properties, generalInquiriesCount } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  const filterType = searchParams.get('filter') || 'all';

  const setFilter = (filter: string) => {
    const params = new URLSearchParams(searchParams);
    if (filter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', filter);
    }
    setSearchParams(params);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set('search', query);
    } else {
      params.delete('search');
    }
    setSearchParams(params);
  };

  // Filter properties based on search and filter type
  const filteredProperties = useMemo(() => {
    return properties.filter((property: any) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = property.name.toLowerCase().includes(query);
        const matchesCity = property.city.toLowerCase().includes(query);
        if (!matchesName && !matchesCity) {
          return false;
        }
      }

      // Type filter
      if (filterType === 'high_volume') {
        return property.pendingCount >= 10;
      } else if (filterType === 'needs_review') {
        // Properties with applications that don't have AI scores
        // For now, we'll show properties with any pending applications
        // TODO: Add AI score tracking to determine which need review
        return property.pendingCount > 0;
      }

      return true;
    });
  }, [properties, searchQuery, filterType]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-600 mt-1">
            Review and manage applications across all properties
          </p>
        </div>
        <Link
          to="/admin/properties"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          View Properties
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by property name or city..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({properties.length})
          </button>
          <button
            onClick={() => setFilter('high_volume')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'high_volume'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            High Volume (10+ apps)
          </button>
          <button
            onClick={() => setFilter('needs_review')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'needs_review'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Needs Review
          </button>
        </div>
      </div>

      {/* General Inquiries Section */}
      {generalInquiriesCount && generalInquiriesCount.totalCount > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">General Inquiries</h2>
          <GeneralInquiriesCard counts={generalInquiriesCount} />
        </div>
      )}

      {/* Property Applications Section */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Property Applications</h2>
      {filteredProperties.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {properties.length === 0 ? 'No properties yet' : 'No properties match your filters'}
          </h3>
          <p className="text-gray-500 mb-4">
            {properties.length === 0
              ? 'Get started by adding your first property'
              : 'Try adjusting your search or filter criteria'}
          </p>
          {properties.length === 0 && (
            <Link
              to="/admin/properties/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Property
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property: any) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}

function GeneralInquiriesCard({ counts }: { counts: { totalCount: number; pendingCount: number; resolvedCount: number } }) {
  return (
    <Link
      to="/admin/general-inquiries"
      className="block bg-white border-2 border-purple-200 rounded-lg hover:shadow-lg transition-shadow overflow-hidden max-w-md"
    >
      {/* Header */}
      <div className="h-48 bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
        <svg
          className="h-20 w-20 text-white opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          General Inquiries
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Non-property specific inquiries
        </p>

        <div className="flex items-center gap-3">
          {counts.pendingCount > 0 && (
            <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              {counts.pendingCount} pending
            </span>
          )}
          {counts.resolvedCount > 0 && (
            <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              {counts.resolvedCount} resolved
            </span>
          )}
          {counts.totalCount === 0 && (
            <span className="text-sm text-gray-500">No inquiries</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function PropertyCard({ property }: { property: any }) {
  // Get counts from API data
  const pendingCount = property.pendingCount || 0;
  const shortlistedCount = property.shortlistedCount || 0;

  return (
    <Link
      to={`/admin/properties/${property.id}/applications`}
      className="block bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow overflow-hidden"
    >
      {/* Property Image - placeholder for now */}
      <div className="h-48 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
        <svg
          className="h-20 w-20 text-white opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {property.name}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {property.address}, {property.city}
        </p>

        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {pendingCount} pending
            </span>
          )}
          {shortlistedCount > 0 && (
            <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {shortlistedCount} shortlisted
            </span>
          )}
          {pendingCount === 0 && shortlistedCount === 0 && (
            <span className="text-sm text-gray-500">No active applications</span>
          )}
        </div>
      </div>
    </Link>
  );
}
