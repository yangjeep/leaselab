import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json, redirect } from '@remix-run/cloudflare';
import { useLoaderData, Link, useFetcher, useNavigate } from '@remix-run/react';
import { fetchLeaseByIdFromWorker } from '~/lib/worker-client';
import { getSiteId } from '~/lib/site.server';
import { useState, useRef, useCallback, DragEvent, ChangeEvent, useEffect } from 'react';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: 'Upload Document' }];
  return [{ title: `Upload Document - ${data.lease.tenant?.firstName} ${data.lease.tenant?.lastName}` }];
};

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const siteId = getSiteId(request);
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const leaseId = params.id;

  if (!leaseId) {
    throw new Response('Lease ID is required', { status: 400 });
  }

  const lease = await fetchLeaseByIdFromWorker(workerEnv, siteId, leaseId);

  if (!lease) {
    throw new Response('Lease not found', { status: 404 });
  }

  return json({ lease });
}

export async function action({ params, request, context }: ActionFunctionArgs) {
  console.log('Action triggered for upload');
  const siteId = getSiteId(request);
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };
  const leaseId = params.id;

  if (!leaseId) {
    console.error('No lease ID');
    throw new Response('Lease ID is required', { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const fileType = formData.get('fileType') as string;

  console.log('Upload action data:', {
    fileName: file?.name,
    fileSize: file?.size,
    fileType,
    leaseId
  });

  if (!file || file.size === 0) {
    return json({ error: 'Please select a file to upload' }, { status: 400 });
  }

  if (!fileType) {
    return json({ error: 'Please select a file type' }, { status: 400 });
  }

  // Create a new FormData for the worker request
  const workerFormData = new FormData();
  workerFormData.append('file', file);
  workerFormData.append('fileType', fileType);

  console.log('Sending to worker:', `${workerEnv.WORKER_URL}/api/ops/leases/${leaseId}/files`);

  // Upload to worker
  try {
    const response = await fetch(`${workerEnv.WORKER_URL}/api/ops/leases/${leaseId}/files`, {
      method: 'POST',
      headers: {
        'X-Internal-Key': workerEnv.WORKER_INTERNAL_KEY as string,
        'X-Site-Id': siteId,
      },
      body: workerFormData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' })) as { message?: string };
      console.error('Worker upload failed:', error);
      return json({ error: error.message || 'Upload failed' }, { status: response.status });
    }

    console.log('Worker upload success');
    return json({ success: true });
  } catch (err) {
    console.error('Fetch error:', err);
    return json({ error: 'Network error during upload' }, { status: 500 });
  }
}

export default function LeaseUpload() {
  const { lease } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher<{ error?: string; success?: boolean }>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<string>('');
  const [clientError, setClientError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploading = fetcher.state === 'submitting' || fetcher.state === 'loading';
  const error = clientError || fetcher.data?.error;

  useEffect(() => {
    if (fetcher.data?.success) {
      console.log('Upload successful, navigating...');
      navigate(`/admin/leases/${lease.id}`);
    }
  }, [fetcher.data, navigate, lease.id]);

  const handleUpload = useCallback((file: File) => {
    console.log('handleUpload called', { file: file.name, fileType });
    if (!fileType) {
      setClientError('Please select a document type first');
      return;
    }

    setClientError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', fileType);

    console.log('Submitting fetcher to:', `/admin/leases/${lease.id}/upload`);
    fetcher.submit(formData, {
      method: 'post',
      action: `/admin/leases/${lease.id}/upload`,
      encType: 'multipart/form-data',
    });
  }, [fileType, fetcher, lease.id]);

  const validateAndUploadFile = useCallback((file: File) => {
    console.log('validateAndUploadFile', file.name);
    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ];

    if (!validTypes.includes(file.type)) {
      setClientError('Invalid file type. Please upload PDF, DOC, DOCX, PNG, or JPG files.');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setClientError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setClientError(null);

    // Auto-upload if file type is already selected
    if (fileType) {
      console.log('Auto-uploading...');
      // We need to use the callback version or useEffect to ensure state is updated, 
      // but here we can just call submit directly with the file and current fileType
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);

      console.log('Submitting fetcher (auto) to:', `/admin/leases/${lease.id}/upload`);
      fetcher.submit(formData, {
        method: 'post',
        action: `/admin/leases/${lease.id}/upload`,
        encType: 'multipart/form-data',
      });
    }
  }, [fileType, fetcher, lease.id]);

  // Drag event handlers
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) {
      setIsDragActive(true);
    }
  }, [uploading]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (!uploading && e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUploadFile(e.dataTransfer.files[0]);
    }
  }, [uploading, validateAndUploadFile]);

  const handleFileInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed');
    if (e.target.files && e.target.files[0]) {
      validateAndUploadFile(e.target.files[0]);
      e.target.value = '';
    }
  }, [validateAndUploadFile]);

  const handleClick = useCallback(() => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  }, [uploading]);

  const handleSubmit = useCallback(() => {
    console.log('Submit clicked', { selectedFile: selectedFile?.name });
    if (selectedFile) {
      handleUpload(selectedFile);
    }
  }, [selectedFile, handleUpload]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/admin/leases/${lease.id}`}
          className="text-sm text-indigo-600 hover:text-indigo-700 mb-2 inline-block"
        >
          ← Back to Lease
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Upload Lease Document</h1>
        <p className="text-sm text-gray-500 mt-1">
          Lease for {lease.tenant?.firstName} {lease.tenant?.lastName}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
          <span className="text-lg">⚠️</span>
          <span>{error}</span>
          <button
            onClick={() => setClientError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Upload Form */}
      <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
        <div className="space-y-6">
          {/* File Type Selection */}
          <div>
            <label htmlFor="fileType" className="block text-sm font-medium text-gray-700 mb-2">
              Document Type *
            </label>
            <select
              id="fileType"
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              disabled={uploading}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:opacity-50"
            >
              <option value="">Select document type...</option>
              <option value="lease_agreement">Lease Agreement</option>
              <option value="amendment">Amendment</option>
              <option value="addendum">Addendum</option>
              <option value="move_in_checklist">Move-in Checklist</option>
              <option value="move_out_checklist">Move-out Checklist</option>
              <option value="inspection_report">Inspection Report</option>
              <option value="notice">Notice</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Drag & Drop Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File *
            </label>
            <div
              onClick={handleClick}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative rounded-lg border-2 border-dashed cursor-pointer
                transition-all duration-200 p-12 text-center
                ${isDragActive
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                }
                ${uploading ? 'opacity-50 pointer-events-none' : ''}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={handleFileInputChange}
                disabled={uploading}
                className="hidden"
              />

              <div className="flex flex-col items-center">
                <div className="text-6xl mb-4 text-gray-400">
                  {uploading ? '⏳' : selectedFile ? '📄' : '📁'}
                </div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  {uploading ? 'Uploading...' : selectedFile ? selectedFile.name : (isDragActive ? 'Drop file here' : 'Drag & drop file here')}
                </p>
                <p className="text-sm text-gray-500">
                  {!uploading && !selectedFile && 'or click to browse'}
                </p>
                {selectedFile && !uploading && (
                  <p className="text-sm text-gray-600 mt-2">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Accepted formats: PDF, DOC, DOCX, PNG, JPG • Max size: 10MB
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Link
              to={`/admin/leases/${lease.id}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              onClick={handleSubmit}
              disabled={uploading || !selectedFile || !fileType}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
