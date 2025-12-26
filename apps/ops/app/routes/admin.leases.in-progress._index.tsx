import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useRevalidator } from '@remix-run/react';
import { useState } from 'react';
import { getSiteId } from '~/lib/site.server';
import { LeaseInProgressCard } from '~/components/lease/LeaseInProgressCard';

export const meta: MetaFunction = () => {
  return [{ title: 'Leases in Progress - LeaseLab.io' }];
};

export async function loader({ context, request }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);

  // Fetch leases in progress from worker API
  const workerUrl = env.WORKER_API_URL || 'http://localhost:8787';
  const response = await fetch(`${workerUrl}/api/ops/leases/in-progress`, {
    headers: {
      'x-site-id': siteId,
      'x-user-id': 'system', // TODO: Get from auth context
    },
  });

  if (!response.ok) {
    console.error('Failed to fetch leases in progress:', await response.text());
    return json({ leases: [] });
  }

  const data = await response.json() as { leases: any[] };
  return json({ leases: data.leases });
}

export default function LeasesInProgressIndex() {
  const { leases } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChecklistUpdate = async (
    leaseId: string,
    stepId: string,
    completed: boolean,
    notes?: string
  ) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/ops/leases/${leaseId}/checklist`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step_id: stepId,
          completed,
          notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json() as { error: string };
        throw new Error(error.error || 'Failed to update checklist');
      }

      // Revalidate to refresh data
      revalidator.revalidate();
    } catch (error) {
      console.error('Error updating checklist:', error);
      alert(`Failed to update checklist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompleteOnboarding = async (leaseId: string) => {
    if (!confirm('Are you sure you want to complete onboarding for this lease? This will move it to the active leases list.')) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/ops/leases/${leaseId}/complete-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          set_active_status: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json() as { error: string; message?: string };
        throw new Error(error.message || error.error || 'Failed to complete onboarding');
      }

      alert('Lease onboarding completed successfully!');
      // Revalidate to refresh data
      revalidator.revalidate();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert(`Failed to complete onboarding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leases in Progress</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track new leases being onboarded
          </p>
        </div>
        <div className="text-sm text-gray-500">{leases.length} leases</div>
      </div>

      {leases.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-gray-400 mb-2">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No leases in progress</h3>
          <p className="text-gray-500">
            New leases created from applications will appear here until onboarding is complete.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {leases.map((lease) => (
            <LeaseInProgressCard
              key={lease.id}
              lease={lease}
              onChecklistUpdate={handleChecklistUpdate}
              onCompleteOnboarding={handleCompleteOnboarding}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}
    </div>
  );
}
