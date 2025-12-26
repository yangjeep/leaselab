# Property & Unit Management - Quick Reference

**Status**: Implemented
**Last Updated**: 2025-12-17

---

## 🎯 What It Does

Enables property owners to manage properties, units, and leases with a flexible data model.

**Key Features**:
- ✅ Multi-property support
- ✅ Unit-level management (apartments, rooms)
- ✅ Lease tracking and status management
- ✅ Flexible property attributes (JSON metadata)

---

## 🏗️ Data Model (30-Second Overview)

```
Property (1) ──→ (N) Units ──→ (N) Leases ──→ (1) Lead/Tenant
```

**Hierarchy**:
- **Property**: Building or property complex
- **Unit**: Individual rentable unit (apartment #, room #)
- **Lease**: Rental agreement tied to a unit
- **Lead**: Prospective tenant applying for a unit

---

## 📄 Documentation

| Document | Purpose |
|----------|---------|
| [01-prd-property-unit-management.md](./01-prd-property-unit-management.md) | Complete PRD with data model and requirements |

---

## 🔑 Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Data Model** | Property → Units → Leases | Flexible for multi-unit properties |
| **Metadata Storage** | JSON columns | Flexible attributes without schema changes |
| **Status Tracking** | Enum fields (available, occupied, etc.) | Simple state management |

---

## 📐 Database Schema (Quick Reference)

### Properties Table
```sql
CREATE TABLE properties (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address JSON,
  metadata JSON,
  created_at TEXT,
  updated_at TEXT
);
```

### Units Table
```sql
CREATE TABLE units (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  unit_number TEXT NOT NULL,
  bedrooms INTEGER,
  bathrooms REAL,
  square_feet INTEGER,
  monthly_rent REAL,
  status TEXT, -- 'available', 'occupied', 'maintenance'
  metadata JSON,
  FOREIGN KEY (property_id) REFERENCES properties(id)
);
```

---

**Status**: ✅ Fully implemented and deployed
