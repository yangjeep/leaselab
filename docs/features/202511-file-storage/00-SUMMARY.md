# File Storage & Upload - Quick Reference

**Status**: Implemented
**Last Updated**: 2025-12-17

---

## 🎯 What It Does

Manages file uploads and storage for tenant applications using Cloudflare R2 with a clean abstraction layer.

**Key Features**:
- ✅ Direct uploads to R2 (no worker middleman)
- ✅ Presigned URLs for secure access
- ✅ Multi-file upload support
- ✅ Storage abstraction layer for easy provider swapping

---

## 🏗️ Architecture (30-Second Overview)

```
Frontend → Presigned URL (from Worker) → Upload directly to R2
Frontend → Presigned URL (from Worker) → Download directly from R2
```

**Why this works**: Efficient, no bandwidth through worker, cost-effective.

---

## 📄 Documentation

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [01-prd-file-upload-download.md](./01-prd-file-upload-download.md) | Complete PRD for file upload/download | Requirements & specifications |
| [02-prd-storage-abstraction.md](./02-prd-storage-abstraction.md) | Storage abstraction layer design | Architecture deep dive |

---

## 🔑 Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Storage** | Cloudflare R2 | S3-compatible, cheap egress |
| **Upload Method** | Presigned URLs | Direct upload, no worker bandwidth |
| **Access Control** | Presigned URLs (5min TTL) | Secure, time-limited access |
| **Abstraction** | StorageAdapter interface | Easy to swap providers |

---

## 📐 Quick Reference

### Upload Flow
```typescript
// 1. Request presigned URL
POST /api/ops/leads/:id/documents/upload-url
→ { upload_url, key }

// 2. Upload directly to R2
PUT {upload_url} with file data

// 3. Confirm upload
POST /api/ops/leads/:id/documents
{ storage_key, file_name, mime_type }
```

### Download Flow
```typescript
// Request presigned download URL
GET /api/ops/documents/:id/download-url
→ { download_url, expires_at }

// Download directly from R2
GET {download_url}
```

---

**Status**: ✅ Fully implemented and deployed
