# PRD: File Upload/Download Workflow for LeaseLab Site App

**Version:** 1.0
**Date:** 2025-11-28
**Status:** Ready for Implementation
**Owner:** Engineering Team

---

## 📋 Executive Summary

This PRD defines the file upload and download workflows for the LeaseLab Site app (public storefront), enabling:
1. **Download**: Property and unit images displayed to prospective tenants
2. **Upload**: Applicant document uploads (ID, pay stubs, etc.) during lead submission

Both workflows adhere to the monorepo architecture where the Site app communicates exclusively with the Worker API, which manages all R2 storage operations.

---

## 🎯 Goals and Objectives

### Primary Goals
- Enable fast, SEO-friendly property image viewing on public storefront
- Allow applicants to upload supporting documents (≤5MB per file)
- Maintain strict security and multi-tenant data isolation
- Minimize costs (worker bandwidth, R2 operations)

### Success Metrics
- Property images load in <500ms (cached)
- File uploads complete in <10s for 5MB files
- Zero cross-site data leaks
- 100% file size enforcement (no files >5MB stored)

---

## 👥 User Stories

### Story 1: Prospective Tenant Views Property
**As a** prospective tenant
**I want to** see high-quality property and unit photos
**So that** I can evaluate if the rental meets my needs

**Acceptance Criteria:**
- Property images load quickly (direct from CDN)
- Images display in correct order: property photos first, then unit photos
- Images are responsive and optimized for mobile
- Cover image displays prominently

### Story 2: Applicant Uploads Documents
**As an** applicant submitting a rental application
**I want to** upload supporting documents (ID, pay stubs, employment letter)
**So that** I can complete my application

**Acceptance Criteria:**
- Can upload PDF, JPG, PNG, HEIC, DOC, DOCX files
- Maximum 5MB per file
- Maximum 10 files per application
- Clear error messages if file rejected
- Upload progress indicator
- Files stored securely (not publicly accessible)

### Story 3: Ops Admin Reviews Application Files
**As an** ops admin
**I want to** view uploaded applicant documents
**So that** I can review and process the application

**Acceptance Criteria:**
- Can view all files for a lead
- Files download securely (signed URLs)
- File names and types clearly labeled
- Access logged for audit trail

---

## 🏗️ Technical Design

### Architecture Overview

```
┌──────────────┐                    ┌──────────────┐                    ┌──────────────┐
│              │   HTTP/Bearer      │              │                    │              │
│  Site App    │ ────────────────>  │  Worker API  │ ────────────────>  │  R2 Storage  │
│  (Remix)     │                    │  (Hono)      │                    │              │
└──────────────┘                    └──────────────┘                    └──────────────┘
     │                                     │                                     │
     │                                     │                                     │
     ▼                                     ▼                                     ▼
Downloads:                           Manages:                            Stores:
- Fetch metadata                     - Generates URLs                    PUBLIC_BUCKET:
- Render <img> tags                  - Validates uploads                 - Property images
- Browser → R2 direct                - Enforces 5MB limit                PRIVATE_BUCKET:
                                     - Saves metadata to D1              - Applicant files
```

---

## 📥 Download Workflow: Property/Unit Images

### Strategy: Direct Public URLs (CDN-Optimized)

#### Flow Diagram

```
1. User navigates to property page
      ↓
2. Site app fetches property data from Worker API
      GET /api/public/properties/{slug}
      ↓
3. Worker returns property + unit data with image URLs
      {
        property: { images: [{url, sortOrder, isCover}] },
        unit: { images: [{url, sortOrder, isCover}] }
      }
      ↓
4. Site app merges images (property first, then unit)
      allImages = [...property.images, ...unit.images]
      ↓
5. Browser loads images directly from R2 PUBLIC_BUCKET
      <img src="https://leaselab-pub.r2.cloudflarestorage.com/..." />
```

#### File Organization (PUBLIC_BUCKET)

```
leaselab-pub/
  {siteId}/
    properties/
      {propertyId}/
        {imageId}-cover.jpg          # Cover image
        {imageId}-gallery-1.jpg      # Gallery images
        {imageId}-gallery-2.jpg
    units/
      {unitId}/
        {imageId}-cover.jpg
        {imageId}-gallery-1.jpg
```

#### Image URL Format

```
https://pub-{hash}.r2.dev/{siteId}/properties/{propertyId}/{imageId}.jpg
```

**Benefits:**
- ✅ Cloudflare CDN caching (global edge network)
- ✅ SEO-friendly (public URLs, crawlable)
- ✅ Zero worker bandwidth costs
- ✅ Browser caching
- ✅ Fast load times (<200ms from edge)

#### API Response Format

```typescript
GET /api/public/properties/{slug}

Response:
{
  property: {
    id: string,
    name: string,
    slug: string,
    images: [
      {
        id: string,
        url: string,              // Direct R2 public URL
        sortOrder: number,
        isCover: boolean,
        altText: string
      }
    ]
  },
  unit: {
    id: string,
    number: string,
    images: [...]                // Same structure
  }
}
```

#### Image Display Logic (Site App)

```typescript
// Merge and sort images
const allImages = [
  ...property.images.sort((a, b) => a.sortOrder - b.sortOrder),
  ...unit.images.sort((a, b) => a.sortOrder - b.sortOrder)
];

// Cover image (first cover=true, or first image)
const coverImage = allImages.find(img => img.isCover) || allImages[0];

// Gallery images (all images)
const galleryImages = allImages;
```

---

## 📤 Upload Workflow: Applicant Files

### Strategy: Worker-Mediated Upload with 5MB Enforcement

#### Flow Diagram

```
1. User selects file in browser
      ↓
2. Client-side validation
      - Check file size ≤ 5MB
      - Check file type allowed
      - Show error if invalid
      ↓
3. Upload file to Worker API
      POST /api/public/leads/files/upload
      Content-Type: multipart/form-data
      Headers: X-Site-Id, X-File-Type
      ↓
4. Worker validation (Layer 2)
      - Check Content-Length header ≤ 5MB
      - Validate MIME type
      - Check file count limit
      ↓
5. Worker streams file to R2 PRIVATE_BUCKET
      - Abort if size exceeded mid-stream
      - Store in temp location
      ↓
6. Worker saves metadata to database
      - File ID, name, size, type, uploadedAt
      ↓
7. Worker returns fileId to client
      {
        fileId: "uuid",
        fileName: "drivers-license.jpg",
        fileSize: 2458392,
        uploadedAt: "2025-11-28T..."
      }
      ↓
8. Client submits lead with fileIds
      POST /api/public/leads
      {
        ...leadData,
        fileIds: ["uuid1", "uuid2"]
      }
      ↓
9. Worker associates files with lead
      - Move files from temp/ to leads/{leadId}/
      - Update lead_files table with lead_id
```

#### File Organization (PRIVATE_BUCKET)

```
leaselab-pri/
  {siteId}/
    leads/
      temp/
        {fileId}.pdf              # Temporary (before lead submitted)
        {fileId}.jpg
      {leadId}/
        {fileId}-drivers-license.jpg    # After lead association
        {fileId}-paystub-1.pdf
        {fileId}-paystub-2.pdf
        {fileId}-employment-letter.pdf
```

#### File Constraints

```typescript
const FILE_CONSTRAINTS = {
  maxSize: 5 * 1024 * 1024,        // 5MB per file
  maxFiles: 10,                     // 10 files per application
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
```

#### Multi-Layer Validation

**Layer 1: Client-Side (UX)**
```typescript
// Immediate feedback to user
if (file.size > 5 * 1024 * 1024) {
  showError('File too large. Maximum size is 5MB.');
  return;
}
```

**Layer 2: Worker Content-Length Header**
```typescript
// Reject before reading body
const contentLength = request.headers.get('content-length');
if (parseInt(contentLength) > MAX_FILE_SIZE) {
  return new Response('File too large', { status: 413 });
}
```

**Layer 3: Stream Validation**
```typescript
// Abort if size exceeded during upload
let bytesRead = 0;
const stream = new TransformStream({
  transform(chunk, controller) {
    bytesRead += chunk.byteLength;
    if (bytesRead > MAX_FILE_SIZE) {
      controller.error(new Error('File size limit exceeded'));
    }
    controller.enqueue(chunk);
  }
});
```

**Layer 4: Post-Upload Verification**
```typescript
// Final check after storage
const object = await PRIVATE_BUCKET.head(key);
if (object.size > MAX_FILE_SIZE) {
  await PRIVATE_BUCKET.delete(key);
  throw new Error('File exceeds maximum size');
}
```

---

## 🔐 Security Considerations

### Download Security (Public Images)
- ✅ PUBLIC_BUCKET allows public reads (expected for marketing images)
- ✅ No sensitive data in public bucket
- ✅ Predictable URLs (not secret, meant to be shared)
- ✅ CDN caching (improves performance)

### Upload Security (Private Files)
- ✅ PRIVATE_BUCKET requires authentication
- ✅ Multi-layer file size validation (5MB max)
- ✅ MIME type whitelist enforcement
- ✅ File extension validation
- ✅ Site isolation (files organized by site_id)
- ✅ Applicant isolation (files organized by lead_id)
- ✅ Virus scanning capability (future enhancement)
- ✅ EXIF metadata stripping (future enhancement)
- ✅ Audit logging (who uploaded what, when)

### Viewing Security (Ops Admin)
- ✅ Signed URLs (expire after 24 hours)
- ✅ Site access validation (admin must have access to site)
- ✅ Audit trail (log file access events)
- ✅ No direct R2 access (through Worker API only)

---

## 🔌 API Specifications

### 1. Get Property with Images

```http
GET /api/public/properties/{slug}

Headers:
  X-Site-Id: {siteId}

Response: 200 OK
{
  property: {
    id: "prop_123",
    name: "Sunset Apartments",
    slug: "sunset-apartments",
    address: "123 Main St",
    images: [
      {
        id: "img_1",
        url: "https://pub-abc.r2.dev/site1/properties/prop_123/img_1.jpg",
        sortOrder: 0,
        isCover: true,
        altText: "Building exterior"
      },
      {
        id: "img_2",
        url: "https://pub-abc.r2.dev/site1/properties/prop_123/img_2.jpg",
        sortOrder: 1,
        isCover: false,
        altText: "Lobby"
      }
    ]
  },
  unit: {
    id: "unit_456",
    number: "101",
    bedrooms: 2,
    bathrooms: 1,
    rent: 1500,
    images: [
      {
        id: "img_3",
        url: "https://pub-abc.r2.dev/site1/units/unit_456/img_3.jpg",
        sortOrder: 0,
        isCover: true,
        altText: "Living room"
      }
    ]
  }
}
```

### 2. Upload Applicant File

```http
POST /api/public/leads/files/upload

Headers:
  X-Site-Id: {siteId}
  Content-Type: multipart/form-data

Body:
  file: [binary data]
  fileType: "drivers_license" | "pay_stub" | "employment_letter" | "other"

Response: 201 Created
{
  fileId: "file_789",
  fileName: "drivers-license.jpg",
  fileSize: 2458392,
  fileType: "drivers_license",
  uploadedAt: "2025-11-28T12:34:56Z"
}

Error Response: 413 Payload Too Large
{
  error: "File size exceeds maximum of 5MB",
  maxSize: 5242880
}

Error Response: 415 Unsupported Media Type
{
  error: "File type not allowed",
  allowedTypes: ["pdf", "jpg", "png", "heic", "doc", "docx"]
}
```

### 3. Submit Lead with Files

```http
POST /api/public/leads

Headers:
  X-Site-Id: {siteId}
  Content-Type: application/json

Body:
{
  propertyId: "prop_123",
  unitId: "unit_456",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: "555-1234",
  employmentStatus: "employed",
  monthlyIncome: 5000,
  moveInDate: "2025-12-01",
  message: "I'm interested in this unit",
  fileIds: ["file_789", "file_790"]
}

Response: 201 Created
{
  leadId: "lead_999",
  status: "new",
  filesAttached: 2
}
```

### 4. Get Lead Files (Ops Admin)

```http
GET /api/ops/leads/{leadId}/files

Headers:
  Authorization: Bearer {token}
  X-Site-Id: {siteId}
  X-User-Id: {userId}

Response: 200 OK
{
  files: [
    {
      id: "file_789",
      fileName: "drivers-license.jpg",
      fileType: "drivers_license",
      fileSize: 2458392,
      uploadedAt: "2025-11-28T12:34:56Z",
      signedUrl: "https://leaselab-pri.r2.dev/..?X-Amz-Signature=...",
      expiresAt: "2025-11-29T12:34:56Z"
    }
  ]
}
```

---

## 📊 Database Schema Updates

### lead_files Table (Already Exists)

```sql
CREATE TABLE lead_files (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'drivers_license', 'pay_stub', 'employment_letter', 'other'
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- Bytes
  r2_key TEXT NOT NULL,       -- Path in R2 bucket
  uploaded_at INTEGER NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (site_id) REFERENCES sites(id)
);

CREATE INDEX idx_lead_files_lead_id ON lead_files(lead_id);
CREATE INDEX idx_lead_files_site_id ON lead_files(site_id);
```

### File Cleanup (Orphaned Files)

**Background job** to delete temp files older than 24 hours:
```sql
-- Find temp files uploaded >24h ago but never associated with a lead
SELECT r2_key FROM lead_files
WHERE lead_id IS NULL
AND uploaded_at < unixepoch() - 86400;
```

---

## 🧪 Testing Plan

### Unit Tests
- [ ] File size validation (reject >5MB)
- [ ] MIME type validation (reject invalid types)
- [ ] File count validation (reject >10 files)
- [ ] R2 key generation (correct path structure)
- [ ] Image URL generation (correct public URLs)

### Integration Tests
- [ ] Upload valid file (PDF, JPG, PNG)
- [ ] Upload oversized file (expect 413 error)
- [ ] Upload invalid file type (expect 415 error)
- [ ] Submit lead with multiple files
- [ ] Retrieve lead files as ops admin
- [ ] View property images (check URLs valid)

### Security Tests
- [ ] Cross-site file access (should fail)
- [ ] Unauthenticated file access (should fail)
- [ ] Expired signed URL (should fail)
- [ ] SQL injection in file names (should sanitize)
- [ ] Path traversal in file names (should sanitize)

### Performance Tests
- [ ] Upload 5MB file (should complete <10s)
- [ ] Load property with 20 images (should render <1s)
- [ ] Concurrent uploads (10 users simultaneously)

---

## 📈 Monitoring and Logging

### Metrics to Track
- File upload success rate
- Average upload time
- File size distribution
- Failed uploads by reason (size, type, etc.)
- R2 bandwidth usage (public vs private)
- Worker invocations for file operations

### Audit Logging
```typescript
// Log file upload event
{
  event: 'file_uploaded',
  siteId: 'site_123',
  fileId: 'file_789',
  fileName: 'drivers-license.jpg',
  fileSize: 2458392,
  uploadedAt: '2025-11-28T12:34:56Z',
  ipAddress: '192.168.1.1'
}

// Log file access event
{
  event: 'file_accessed',
  siteId: 'site_123',
  leadId: 'lead_999',
  fileId: 'file_789',
  userId: 'user_456',
  accessedAt: '2025-11-28T14:00:00Z',
  ipAddress: '192.168.1.2'
}
```

---

## 🚀 Implementation Plan

### Phase 1: Download Workflow (Priority: High)
- [ ] Update Worker API to return image URLs in property/unit responses
- [ ] Update `shared/types` for image response format
- [ ] Implement image URL generation in `apps/worker/lib/db/images.ts`
- [ ] Test image loading from R2 PUBLIC_BUCKET

### Phase 2: Upload Workflow (Priority: High)
- [ ] Create file upload endpoint in Worker API
- [ ] Implement multi-layer file validation
- [ ] Implement R2 streaming upload
- [ ] Create file association logic (temp → lead_id)
- [ ] Test upload flow end-to-end

### Phase 3: Ops Viewing (Priority: Medium)
- [ ] Create endpoint to retrieve lead files
- [ ] Implement signed URL generation
- [ ] Add audit logging for file access
- [ ] Update Ops UI to display files

### Phase 4: Cleanup and Optimization (Priority: Low)
- [ ] Implement background job for orphaned file cleanup
- [ ] Add virus scanning integration
- [ ] Add EXIF metadata stripping
- [ ] Implement image thumbnail generation

---

## 🎯 Success Criteria

- ✅ Property images load directly from R2 with <500ms latency
- ✅ File uploads enforce 5MB limit at all layers
- ✅ Zero files >5MB successfully stored
- ✅ Zero cross-site file access incidents
- ✅ Applicants can upload 10 files per application
- ✅ Ops admins can view all applicant files securely
- ✅ All file operations logged for audit

---

## 📚 References

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Cloudflare Workers File Uploads](https://developers.cloudflare.com/workers/examples/upload-file/)
- [Hono Multipart Form Data](https://hono.dev/helpers/middleware#body-limit)
- [OWASP File Upload Security](https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload)

---

**Last Updated:** 2025-11-28
**Next Review:** After Phase 2 implementation
