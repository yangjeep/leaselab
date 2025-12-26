/**
 * General Inquiries Board - Simplified inquiry management
 * Email-focused workflow for non-property specific inquiries
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useFetcher, Link } from '@remix-run/react';
import { getSiteId } from '~/lib/site.server';
import { fetchLeadsFromWorker, updateLeadInWorker } from '~/lib/worker-client';
import { useState, useMemo } from 'react';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);

  // Fetch general inquiries (leads with propertyId = 'general')
  const inquiries = await fetchLeadsFromWorker(env, siteId, {
    propertyId: 'general',
  });

  return json({ inquiries });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);
  const formData = await request.formData();
  const action = formData.get('action');
  const inquiryId = formData.get('inquiryId') as string;

  if (action === 'dismiss') {
    // Update the inquiry status to 'rejected' (dismissed)
    await updateLeadInWorker(env, siteId, inquiryId, {
      status: 'rejected',
    });

    return json({ success: true });
  }

  return json({ error: 'Invalid action' }, { status: 400 });
}

export default function GeneralInquiriesIndex() {
  const { inquiries } = useLoaderData<typeof loader>();
  const [filter, setFilter] = useState<'all' | 'active' | 'dismissed'>('active');

  // Sort and filter inquiries
  const sortedInquiries = useMemo(() => {
    let filtered = inquiries;

    // Filter by status
    if (filter === 'active') {
      filtered = inquiries.filter((inq: any) => inq.status !== 'rejected');
    } else if (filter === 'dismissed') {
      filtered = inquiries.filter((inq: any) => inq.status === 'rejected');
    }

    // Sort: active inquiries first (by date desc), then dismissed (by date desc)
    return [...filtered].sort((a: any, b: any) => {
      const aIsDismissed = a.status === 'rejected';
      const bIsDismissed = b.status === 'rejected';

      if (aIsDismissed !== bIsDismissed) {
        return aIsDismissed ? 1 : -1; // Active first
      }

      // Within same status, sort by date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [inquiries, filter]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">General Inquiries</h1>
          <p className="text-gray-600 mt-1">
            Manage non-property specific inquiries and questions
          </p>
        </div>
        <Link
          to="/admin/applications"
          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          ← Back to Applications
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setFilter('active')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              filter === 'active'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active ({inquiries.filter((inq: any) => inq.status !== 'rejected').length})
          </button>
          <button
            onClick={() => setFilter('dismissed')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              filter === 'dismissed'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Dismissed ({inquiries.filter((inq: any) => inq.status === 'rejected').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              filter === 'all'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All ({inquiries.length})
          </button>
        </nav>
      </div>

      {/* Inquiries List */}
      {sortedInquiries.length === 0 ? (
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
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No inquiries found</h3>
          <p className="text-gray-500">
            {filter === 'active'
              ? 'No active inquiries at the moment'
              : filter === 'dismissed'
              ? 'No dismissed inquiries'
              : 'No general inquiries have been submitted yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedInquiries.map((inquiry: any) => (
            <InquiryCard key={inquiry.id} inquiry={inquiry} />
          ))}
        </div>
      )}
    </div>
  );
}

function InquiryCard({ inquiry }: { inquiry: any }) {
  const fetcher = useFetcher();
  const isDismissed = inquiry.status === 'rejected';
  const isSubmitting = fetcher.state === 'submitting';

  const handleDismiss = () => {
    if (confirm('Are you sure you want to dismiss this inquiry?')) {
      fetcher.submit(
        { action: 'dismiss', inquiryId: inquiry.id },
        { method: 'post' }
      );
    }
  };

  const handleReply = () => {
    const subject = encodeURIComponent(`Re: General Inquiry from ${inquiry.firstName} ${inquiry.lastName}`);
    const body = encodeURIComponent(`Hi ${inquiry.firstName},\n\nThank you for reaching out.\n\n`);
    window.location.href = `mailto:${inquiry.email}?subject=${subject}&body=${body}`;
  };

  return (
    <div
      className={`bg-white border rounded-lg p-6 transition-all ${
        isDismissed
          ? 'opacity-50 border-gray-200 bg-gray-50'
          : 'border-purple-200 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between">
        {/* Left side - Inquiry details */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            {/* Status badge */}
            {isDismissed && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">
                Dismissed
              </span>
            )}
            {!isDismissed && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                New
              </span>
            )}

            {/* Date */}
            <span className="text-sm text-gray-500">
              {new Date(inquiry.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {/* Name and Email */}
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {inquiry.firstName} {inquiry.lastName}
            </h3>
            <a
              href={`mailto:${inquiry.email}`}
              className="text-sm text-purple-600 hover:text-purple-800 hover:underline"
            >
              {inquiry.email}
            </a>
            {inquiry.phone && (
              <span className="text-sm text-gray-600 ml-3">
                {inquiry.phone}
              </span>
            )}
          </div>

          {/* Message Content */}
          {inquiry.message && (
            <div className="bg-gray-50 rounded-lg p-4 mb-3">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {inquiry.message}
              </p>
            </div>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="ml-6 flex flex-col gap-2">
          {!isDismissed && (
            <>
              <button
                onClick={handleReply}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Reply
              </button>
              <button
                onClick={handleDismiss}
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Dismissing...' : 'Dismiss'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
