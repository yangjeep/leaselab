/**
 * DocumentsList - Display and manage application documents
 * Supports verification workflow and document upload
 */

import type { ApplicationDocument } from '~/shared/types';
import { useState } from 'react';

type DocumentsListProps = {
  documents: ApplicationDocument[];
  applicationId: string;
  onVerify?: (documentId: string) => void;
  onReject?: (documentId: string, reason: string) => void;
  onDelete?: (documentId: string) => void;
  onUpload?: (file: File, documentType: string) => void;
  isReadOnly?: boolean;
};

export function DocumentsList({
  documents,
  applicationId,
  onVerify,
  onReject,
  onDelete,
  onUpload,
  isReadOnly = false,
}: DocumentsListProps) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const documentTypeLabels: Record<ApplicationDocument['documentType'], string> = {
    government_id: 'Government ID',
    paystub: 'Pay Stub',
    bank_statement: 'Bank Statement',
    employment_letter: 'Employment Letter',
    tax_return: 'Tax Return',
    reference_letter: 'Reference Letter',
    proof_of_income: 'Proof of Income',
    credit_report: 'Credit Report',
    other: 'Other Document',
  };

  const verificationColors: Record<ApplicationDocument['verificationStatus'], string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    verified: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    expired: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const groupedDocs = documents.reduce((acc, doc) => {
    const type = doc.documentType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, ApplicationDocument[]>);

  const handleReject = (documentId: string) => {
    if (onReject && rejectReason.trim()) {
      onReject(documentId, rejectReason);
      setRejectingId(null);
      setRejectReason('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Empty State */}
      {documents.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
          <p className="mt-1 text-sm text-gray-500">No documents have been uploaded yet.</p>
        </div>
      )}

      {/* Document Groups */}
      {Object.entries(groupedDocs).map(([docType, docs]) => (
        <div key={docType} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Group Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                {documentTypeLabels[docType as ApplicationDocument['documentType']] || docType}
              </h4>
              <span className="text-sm text-gray-500">{docs.length} file{docs.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Document Items */}
          <div className="divide-y divide-gray-200">
            {docs.map((doc) => (
              <div key={doc.id} className="p-4">
                <div className="flex items-start gap-3">
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>

                  {/* Document Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="text-sm font-medium text-gray-900 truncate">
                            {doc.fileName}
                          </h5>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium border ${
                              verificationColors[doc.verificationStatus]
                            }`}
                          >
                            {doc.verificationStatus}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                          {doc.fileSize && (
                            <span>{formatFileSize(doc.fileSize)}</span>
                          )}
                          {doc.expiresAt && (
                            <span className={new Date(doc.expiresAt) < new Date() ? 'text-red-600' : ''}>
                              Expires {new Date(doc.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {doc.uploadedByApplicantId && (
                          <div className="mt-1 text-xs text-gray-500">
                            Uploaded by applicant
                          </div>
                        )}

                        {doc.notes && (
                          <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            {doc.notes}
                          </div>
                        )}

                        {doc.rejectionReason && (
                          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                            <strong>Rejected:</strong> {doc.rejectionReason}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {!isReadOnly && (
                        <div className="flex items-center gap-2">
                          {/* Download */}
                          {doc.r2Key && (
                            <a
                              href={`/api/documents/${doc.id}/download`}
                              download
                              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                              title="Download"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </a>
                          )}

                          {/* Verify */}
                          {doc.verificationStatus === 'pending' && onVerify && (
                            <button
                              onClick={() => onVerify(doc.id)}
                              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                              title="Verify"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}

                          {/* Reject */}
                          {doc.verificationStatus === 'pending' && onReject && (
                            <button
                              onClick={() => setRejectingId(doc.id)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="Reject"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}

                          {/* Delete */}
                          {onDelete && (
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this document?')) {
                                  onDelete(doc.id);
                                }
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Rejection Form */}
                    {rejectingId === doc.id && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <label className="block text-sm font-medium text-red-800 mb-2">
                          Rejection Reason
                        </label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Explain why this document is being rejected..."
                          rows={2}
                          className="w-full border border-red-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => handleReject(doc.id)}
                            disabled={!rejectReason.trim()}
                            className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Submit Rejection
                          </button>
                          <button
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReason('');
                            }}
                            className="px-3 py-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
