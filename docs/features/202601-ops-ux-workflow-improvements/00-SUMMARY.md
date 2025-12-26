# Ops UX & Workflow Improvements (2026-01)

**Status**: Draft
**Last Updated**: 2025-12-23

## Overview

This folder contains feature documentation for streamlining core workflows in the Ops dashboard. These improvements focus on better defaults, multi-select capabilities, and clearer separation of active vs. historical records.

## Features

### [01 - Unit-Level Application View](./01-unit-level-application-view.md)
Applications should be organized by unit by default (with toggle to property view). Most operational decisions happen at the unit level, reducing navigation friction.

### [02 - Multi-Select Operations for Applications](./02-multiselect-applications.md)
Enable bulk operations for applications within the same property/unit, including a streamlined "Proceed to Lease" button in the Shortlist view.

### [03 - Multi-Select for Lease and Tenant Views](./03-multiselect-lease-tenant.md)
Extend multi-select and bulk operations to lease and tenant management for improved operational efficiency.

### [04 - Separate Views: Existing Leases vs. Leases in Progress](./04-leases-in-progress.md)
Create distinct views for active lease management versus new leases being onboarded from applications.

### [05 - Work Orders Default View](./05-work-orders-default-view.md)
Default work order view should show only "Open & In-Progress" work orders to focus on actionable items.

## Cross-Feature Dependencies

- Feature #02 (Proceed to Lease from Shortlist) depends on Feature #04 (Leases in Progress workflow)
- Feature #04 (Leases in Progress) may integrate with AI lease execution workflow (see [202601-next-batch](../202601-next-batch/README.md) Feature #8)

## Implementation Priority

1. **Phase 1 (Foundation)**: Features #01, #05 - UI defaults and view changes
2. **Phase 2 (Bulk Operations)**: Features #02, #03 - Multi-select infrastructure
3. **Phase 3 (Workflow)**: Feature #04 - Leases in Progress with integration points

## Related Features

- See [202512-ux-improvements](../202512-ux-improvements/README.md) for complementary dashboard and navigation improvements
- See [202601-next-batch](../202601-next-batch/README.md) for AI-driven lease execution and other 2026-01 features
