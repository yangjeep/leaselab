-- Migration: Convert to Canadian Address Format
-- Changes state → province, zip_code → postal_code

-- Rename columns in properties table
ALTER TABLE properties RENAME COLUMN state TO province;
ALTER TABLE properties RENAME COLUMN zip_code TO postal_code;
