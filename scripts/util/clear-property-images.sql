-- Clear all property and unit images from the database
-- This will remove image records but NOT delete the actual files from R2
-- Run this after migrating files to the new bucket structure

-- Count images before deletion
SELECT 'Total images before deletion:' as message, COUNT(*) as count FROM images;
SELECT 'Property images:' as message, COUNT(*) as count FROM images WHERE entity_type = 'property';
SELECT 'Unit images:' as message, COUNT(*) as count FROM images WHERE entity_type = 'unit';

-- Delete all property images
DELETE FROM images WHERE entity_type = 'property';

-- Delete all unit images
DELETE FROM images WHERE entity_type = 'unit';

-- Verify deletion
SELECT 'Total images after deletion:' as message, COUNT(*) as count FROM images;
