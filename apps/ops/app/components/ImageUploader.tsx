import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import type { PropertyImage } from '~/shared/types';

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
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const handleUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (const file of files) {
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

        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

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
        setUploadProgress(prev => ({ ...prev, [file.name]: 33 }));

        // Step 2: Upload to R2
        const uploadRes = await fetch(presignData.uploadUrl, {
          method: 'POST',
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload file');
        }

        setUploadProgress(prev => ({ ...prev, [file.name]: 66 }));

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
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        onUploadComplete?.(newImage);

        // Clear progress after a brief delay
        setTimeout(() => {
          setUploadProgress(prev => {
            const next = { ...prev };
            delete next[file.name];
            return next;
          });
        }, 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [entityType, entityId, onUploadComplete]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    handleUpload(acceptedFiles);
  }, [handleUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
    disabled: uploading,
  });

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
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
          <span className="text-lg">⚠️</span>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Existing Images */}
        {images.map((image) => (
          <div
            key={image.id}
            className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group hover:shadow-lg transition-shadow"
          >
            <img
              src={image.url || `/api/images/${image.id}/file`}
              alt={image.altText || image.filename}
              className="w-full h-full object-cover"
            />

            {/* Cover Badge */}
            {image.isCover && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-green-600 text-white text-xs font-medium rounded shadow-lg">
                ⭐ Cover
              </div>
            )}

            {/* Delete Button (X) - Top Right */}
            <button
              onClick={() => handleDelete(image.id)}
              className="absolute top-2 right-2 w-7 h-7 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete image"
            >
              ✕
            </button>

            {/* Action Buttons - Bottom (show on hover) */}
            {!image.isCover && (
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleSetCover(image.id)}
                  className="w-full px-3 py-1.5 bg-white text-gray-900 text-xs font-medium rounded hover:bg-gray-100 transition-colors"
                >
                  Set as Cover
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Upload Placeholder with "+" */}
        <div
          {...getRootProps()}
          className={`
            relative aspect-square rounded-lg border-2 border-dashed cursor-pointer
            transition-all duration-200 flex flex-col items-center justify-center
            ${isDragActive
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
            }
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input {...getInputProps()} />

          <div className="text-center p-4">
            <div className="text-5xl mb-2 text-gray-400">
              {uploading ? '⏳' : '+'}
            </div>
            <p className="text-sm font-medium text-gray-600">
              {uploading ? 'Uploading...' : isDragActive ? 'Drop here' : 'Add Photos'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {!uploading && 'Drag & drop or click'}
            </p>
          </div>

          {/* Upload Progress Indicator */}
          {uploading && Object.keys(uploadProgress).length > 0 && (
            <div className="absolute bottom-2 left-2 right-2 space-y-1">
              {Object.entries(uploadProgress).map(([filename, progress]) => (
                <div key={filename} className="bg-white rounded p-2 shadow-sm">
                  <div className="text-xs text-gray-600 truncate mb-1">{filename}</div>
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info Text */}
      <p className="text-xs text-gray-500 text-center">
        Supported formats: PNG, JPG, GIF, WebP • Max size: 10MB per file • Drag multiple files at once
      </p>
    </div>
  );
}
