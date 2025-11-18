import { useState, useCallback } from 'react';
import type { PropertyImage } from '@leaselab/shared-types';

interface ImageUploaderProps {
  entityType: 'property' | 'unit';
  entityId: string;
  images: PropertyImage[];
  onUploadComplete?: (image: PropertyImage) => void;
  onDelete?: (imageId: string) => void;
  onSetCover?: (imageId: string) => void;
}

export function ImageUploader({
  entityType,
  entityId,
  images,
  onUploadComplete,
  onDelete,
  onSetCover,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError('Only image files are allowed');
          continue;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          setError('File size must be less than 10MB');
          continue;
        }

        // Step 1: Get presigned URL
        const presignRes = await fetch('/api/images/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType,
            entityId,
            filename: file.name,
            contentType: file.type,
            sizeBytes: file.size,
          }),
        });

        if (!presignRes.ok) {
          throw new Error('Failed to get upload URL');
        }

        const { data: presignData } = await presignRes.json();

        // Step 2: Upload to R2
        const uploadRes = await fetch(presignData.uploadUrl, {
          method: 'POST',
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload file');
        }

        // Step 3: Register image in database
        const registerRes = await fetch('/api/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType,
            entityId,
            r2Key: presignData.r2Key,
            filename: file.name,
            contentType: file.type,
            sizeBytes: file.size,
          }),
        });

        if (!registerRes.ok) {
          throw new Error('Failed to register image');
        }

        const { data: newImage } = await registerRes.json();
        onUploadComplete?.(newImage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [entityType, entityId, onUploadComplete]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  const handleDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const res = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete image');
      }

      onDelete?.(imageId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleSetCover = async (imageId: string) => {
    try {
      const res = await fetch(`/api/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCover: true }),
      });

      if (!res.ok) {
        throw new Error('Failed to set cover image');
      }

      onSetCover?.(imageId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set cover');
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
          id={`file-upload-${entityId}`}
          disabled={uploading}
        />
        <label
          htmlFor={`file-upload-${entityId}`}
          className="cursor-pointer"
        >
          <div className="text-3xl mb-2">📷</div>
          <p className="text-sm text-gray-600">
            {uploading ? 'Uploading...' : 'Drop images here or click to upload'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Max 10MB per file, images only
          </p>
        </label>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative group aspect-square">
              <img
                src={image.url || `/api/images/${image.id}/file`}
                alt={image.altText || image.filename}
                className="w-full h-full object-cover rounded-lg"
              />
              {image.isCover && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-indigo-600 text-white text-xs rounded">
                  Cover
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                {!image.isCover && (
                  <button
                    onClick={() => handleSetCover(image.id)}
                    className="px-2 py-1 bg-white text-gray-900 text-xs rounded hover:bg-gray-100"
                  >
                    Set Cover
                  </button>
                )}
                <button
                  onClick={() => handleDelete(image.id)}
                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
