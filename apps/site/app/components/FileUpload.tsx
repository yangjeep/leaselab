import { useState, useRef, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle, Button, Label } from "@leaselab/ui-components";
import type { LeadFileType, FileUploadResponse } from "../../../../shared/types";

// File constraints from PRD
const FILE_CONSTRAINTS = {
  maxSize: 5 * 1024 * 1024, // 5MB per file
  maxFiles: 10, // 10 files per application
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  allowedExtensions: [
    '.pdf',
    '.jpg', '.jpeg',
    '.png',
    '.heic', '.heif',
    '.doc', '.docx'
  ]
};

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: LeadFileType;
  uploadedAt: string;
  uploading?: boolean;
  error?: string;
}

interface FileUploadProps {
  onFilesChange: (fileIds: string[]) => void;
}

export default function FileUpload({ onFilesChange }: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatically notify parent when files change
  useEffect(() => {
    const fileIds = files
      .filter(f => !f.uploading && !f.error && !f.id.startsWith('temp-'))
      .map(f => f.id);
    onFilesChange(fileIds);
  }, [files, onFilesChange]);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > FILE_CONSTRAINTS.maxSize) {
      return `File too large. Maximum size is 5MB. (${file.name})`;
    }

    // Check file type by MIME type
    if (!FILE_CONSTRAINTS.allowedMimeTypes.includes(file.type)) {
      // Also check file extension as fallback
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!FILE_CONSTRAINTS.allowedExtensions.includes(ext)) {
        return `File type not allowed. Allowed types: PDF, JPG, PNG, HEIC, DOC, DOCX. (${file.name})`;
      }
    }

    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const guessFileType = (fileName: string): LeadFileType => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('id') || lowerName.includes('license') || lowerName.includes('passport')) {
      return 'government_id';
    }
    if (lowerName.includes('paystub') || lowerName.includes('pay-stub') || lowerName.includes('pay_stub')) {
      return 'paystub';
    }
    if (lowerName.includes('bank') || lowerName.includes('statement')) {
      return 'bank_statement';
    }
    if (lowerName.includes('tax') || lowerName.includes('t4') || lowerName.includes('1040')) {
      return 'tax_return';
    }
    if (lowerName.includes('employment') || lowerName.includes('offer') || lowerName.includes('letter')) {
      return 'employment_letter';
    }
    return 'other';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setError("");

    // Check total file count
    if (files.length + selectedFiles.length > FILE_CONSTRAINTS.maxFiles) {
      setError(`Maximum ${FILE_CONSTRAINTS.maxFiles} files allowed per application.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate each file
    for (const file of selectedFiles) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    // Upload files one by one
    for (const file of selectedFiles) {
      await uploadFile(file);
    }

    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFile = async (file: File) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const fileType = guessFileType(file.name);

    // Add file with uploading state
    const uploadingFile: UploadedFile = {
      id: tempId,
      name: file.name,
      size: file.size,
      type: fileType,
      uploadedAt: new Date().toISOString(),
      uploading: true,
    };

    setFiles(prev => [...prev, uploadingFile]);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);

      // Upload to API
      const response = await fetch('/api/file-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Upload failed');
      }

      const responseData = await response.json() as { success?: boolean; data?: FileUploadResponse } | FileUploadResponse;
      // Handle both direct response and wrapped response { success: true, data: {...} }
      const result: FileUploadResponse = 'data' in responseData && responseData.data ? responseData.data : responseData as FileUploadResponse;

      // Update file with real ID (useEffect will notify parent)
      setFiles(prev => prev.map(f =>
        f.id === tempId
          ? { ...f, id: result.fileId, uploading: false }
          : f
      ));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';

      // Update file with error
      setFiles(prev => prev.map(f =>
        f.id === tempId
          ? { ...f, uploading: false, error: errorMessage }
          : f
      ));

      setError(`Failed to upload ${file.name}: ${errorMessage}`);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setError("");
    // useEffect will notify parent automatically
  };

  const getFileTypeLabel = (type: LeadFileType): string => {
    const labels: Record<LeadFileType, string> = {
      government_id: 'Government ID',
      paystub: 'Pay Stub',
      bank_statement: 'Bank Statement',
      tax_return: 'Tax Return',
      employment_letter: 'Employment Letter',
      other: 'Other Document',
    };
    return labels[type];
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="mb-2 block">
          Supporting Documents (Optional)
          <span className="ml-2 text-sm font-normal text-white/60">
            Max 5MB per file, {FILE_CONSTRAINTS.maxFiles} files total
          </span>
        </Label>

        {/* File input */}
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept={FILE_CONSTRAINTS.allowedExtensions.join(',')}
            multiple
            className="hidden"
            id="file-upload-input"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= FILE_CONSTRAINTS.maxFiles}
          >
            Choose Files
          </Button>
          <span className="text-sm text-white/60">PDF, JPG, PNG, HEIC, DOC, DOCX</span>
        </div>

        {/* Error message */}
        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertTitle>Upload error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Help text */}
        <p className="mt-2 text-sm text-white/60">
          Upload supporting documents such as government ID, pay stubs, bank statements,
          employment letters, or tax returns to help expedite your application.
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">
            Uploaded Files ({files.length}/{FILE_CONSTRAINTS.maxFiles})
          </div>
          <div className="space-y-2">
            {files.map(file => (
              <div
                key={file.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  file.error
                    ? 'bg-red-400/10 border border-red-400/20'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {file.name}
                    </span>
                    {file.uploading && (
                      <span className="text-xs text-white/60 animate-pulse">
                        Uploading...
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-white/60">
                      {formatFileSize(file.size)}
                    </span>
                    <span className="text-xs text-white/60">•</span>
                    <span className="text-xs text-white/60">
                      {getFileTypeLabel(file.type)}
                    </span>
                  </div>
                  {file.error && (
                    <div className="text-xs text-red-400 mt-1">
                      {file.error}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(file.id)}
                  disabled={file.uploading}
                  aria-label="Remove file"
                  className="ml-3 text-white/70 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
