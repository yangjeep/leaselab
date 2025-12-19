-- LeaseLab Test Data Seed Script
-- Run with: npx wrangler d1 execute leaselab-db --remote --file=scripts/util/seed-test-data.sql

-- Step 1: Create Properties
INSERT INTO properties (id, site_id, name, slug, address, city, province, postal_code, property_type, description, is_active, created_at, updated_at)
VALUES
  ('prop_maple_view', 'default', 'Maple View Apartments', 'maple-view-apartments', '123 Main St', 'Toronto', 'ON', 'M5V 1A1', 'apartment', 'Modern apartment building with great amenities', 1, datetime('now'), datetime('now')),
  ('prop_oak_ridge', 'default', 'Oak Ridge Townhomes', 'oak-ridge-townhomes', '456 Oak Rd', 'Mississauga', 'ON', 'L5B 2G3', 'townhouse', 'Family-friendly townhomes in quiet neighborhood', 1, datetime('now'), datetime('now')),
  ('prop_downtown_lofts', 'default', 'Downtown Lofts', 'downtown-lofts', '789 King St W', 'Toronto', 'ON', 'M5V 3K7', 'condo', 'Luxury lofts in the heart of downtown', 1, datetime('now'), datetime('now'));

-- Step 2: Create Leads (Rental Applications)
INSERT INTO leads (id, site_id, property_id, first_name, last_name, email, phone, employment_status, move_in_date, status, current_address, message, is_active, created_at, updated_at)
VALUES
  ('lead_james_kim', 'default', 'prop_maple_view', 'James', 'Kim', 'james.kim@example.com', '416-555-1001', 'employed_full_time', '2025-02-01', 'documents_received', '123 Oak St, Toronto, ON', 'Looking for a quiet place close to work. Non-smoker, no pets. Have stable employment at tech company.', 1, datetime('now'), datetime('now')),
  ('lead_maria_garcia', 'default', 'prop_maple_view', 'Maria', 'Garcia', 'maria.garcia@example.com', '647-555-1002', 'employed_full_time', '2025-01-15', 'documents_received', '456 Maple Ave, Toronto, ON', 'Graduate student with stable income. References available. Looking for 1-year lease.', 1, datetime('now'), datetime('now')),
  ('lead_alex_johnson', 'default', 'prop_oak_ridge', 'Alex', 'Johnson', 'alex.johnson@example.com', '416-555-1003', 'self_employed', '2025-02-15', 'new', '789 Elm St, Mississauga, ON', 'Freelance software developer. Can provide tax returns and bank statements.', 1, datetime('now'), datetime('now')),
  ('lead_sarah_lee', 'default', 'prop_oak_ridge', 'Sarah', 'Lee', 'sarah.lee@example.com', '647-555-1004', 'employed_part_time', '2025-03-01', 'application_submitted', '321 Pine Rd, Brampton, ON', 'Part-time nurse, stable employment for 3 years. Excellent references.', 1, datetime('now'), datetime('now')),
  ('lead_michael_chen', 'default', 'prop_downtown_lofts', 'Michael', 'Chen', 'michael.chen@example.com', '416-555-1005', 'employed_full_time', '2025-01-20', 'documents_received', '654 Cedar Ln, Toronto, ON', 'Software engineer at Google. Excellent credit score, income verification available.', 1, datetime('now'), datetime('now')),
  ('lead_emily_rodriguez', 'default', 'prop_downtown_lofts', 'Emily', 'Rodriguez', 'emily.rodriguez@example.com', '647-555-1006', 'employed_full_time', '2025-02-10', 'new', '987 Birch Ave, Toronto, ON', 'Marketing manager, relocating from Vancouver. Clean rental history.', 1, datetime('now'), datetime('now'));

-- Step 3: Create Lead History Events
INSERT INTO lead_history (id, site_id, lead_id, event_type, event_data, created_at)
VALUES
  (hex(randomblob(16)), 'default', 'lead_james_kim', 'status_changed', '{"from":"new","to":"application_submitted","note":"Application received"}', datetime('now')),
  (hex(randomblob(16)), 'default', 'lead_maria_garcia', 'status_changed', '{"from":"new","to":"documents_received","note":"Documents uploaded"}', datetime('now')),
  (hex(randomblob(16)), 'default', 'lead_alex_johnson', 'status_changed', '{"from":"new","to":"application_submitted","note":"Initial application"}', datetime('now')),
  (hex(randomblob(16)), 'default', 'lead_sarah_lee', 'status_changed', '{"from":"new","to":"application_submitted","note":"Application complete"}', datetime('now')),
  (hex(randomblob(16)), 'default', 'lead_michael_chen', 'status_changed', '{"from":"new","to":"documents_received","note":"All documents received"}', datetime('now')),
  (hex(randomblob(16)), 'default', 'lead_emily_rodriguez', 'status_changed', '{"from":"new","to":"application_submitted","note":"Application received"}', datetime('now'));
