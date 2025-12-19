/**
 * Application Board - Property-centric application overview
 * Shows all properties with pending application counts
 */

import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link } from '@remix-run/react';
import { requireUser } from '~/lib/auth.server';
import { fetchPropertiesFromWorker } from '~/lib/worker-client';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await requireUser(request, context);

  // Fetch all properties
  const properties = await fetchPropertiesFromWorker(context.env, user.siteId);

  // TODO: Fetch application counts per property
  // For now, we'll use placeholder data until we add aggregation queries

  return json({
    user,
    properties,
  });
}

export default function ApplicationBoard() {
  const { properties } = useLoaderData<typeof loader>();

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
          to="/admin/leads/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          New Application
        </Link>
      </div>

      {/* Property Grid */}
      {properties.length === 0 ? (
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
          <h3 className="text-lg font-medium text-gray-900 mb-1">No properties yet</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first property</p>
          <Link
            to="/admin/properties/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Property
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property: any) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}

function PropertyCard({ property }: { property: any }) {
  // TODO: Get actual counts from API
  const pendingCount = 0;
  const shortlistedCount = 0;

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
