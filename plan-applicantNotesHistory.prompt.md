## Plan: Applicant Notes & History Changes

Add landlord-only notes and applicant history while removing applicant-facing Monthly Income. Introduce schema changes (new note + history table, drop/monthly_income deprecation), update storage abstractions, adjust Ops and Site UIs, and implement a consistent event-driven history capture on applicant mutations to support auditing without exposing sensitive data on the public app.

### Steps
1. Extend schema: add `landlord_note` (TEXT NULL) + `application_note` (optional) and create `applicant_history` (id, applicant_id, event_type, changed_fields JSON, actor_user_id, created_at) in new migration; deprecate/remove `monthly_income` column. Put limits to note lengths as needed.
2. Update storage layer (`shared/storage-*` factories/models) to remove `monthly_income` exposure and include new note fields + history write helper.
3. Refactor Site applicant form components (`apps/site/app/routes/*application*`) to remove Monthly Income input, validation, and payload mapping.
4. Add Ops UI components (`apps/ops/app/components/applicant/*`) for landlord Note edit + read-only history timeline; wire to new endpoints.
5. Implement backend endpoints/mutations in Ops (`apps/ops/functions/[[path]].ts`) to update notes and append history entries on create/update/delete events.
6. Backfill migration: copy existing `monthly_income` values into initial history entries before dropping column (preserve legacy info).

### Further Considerations
1. History scope: capture only changed fields vs full snapshot? Recommend diff JSON for efficiency.
2. Access control: restrict notes/history to landlord/admin roles; confirm role checks location.
3. Column removal timing: phased (soft hide then drop) vs immediate; choose based on deployment risk.
