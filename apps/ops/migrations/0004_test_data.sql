-- Test Data for apps/site
-- Sample properties and units for testing

-- Insert test properties
INSERT INTO properties (id, name, slug, address, city, state, zip_code, property_type, description, amenities, is_active)
VALUES
  ('prop_001', 'Sunset Villa', 'sunset-villa-prop001', '123 Ocean Drive', 'Miami', 'FL', '33139', 'single_family', 'Beautiful beachfront property with stunning ocean views. Recently renovated with modern finishes throughout.', '["Pool", "Ocean View", "Private Beach Access", "Garage"]', 1),
  ('prop_002', 'Downtown Loft', 'downtown-loft-prop002', '456 Main Street', 'Austin', 'TX', '78701', 'condo', 'Modern loft in the heart of downtown. Walking distance to restaurants, shops, and entertainment.', '["Gym", "Rooftop Deck", "Concierge", "Parking"]', 1),
  ('prop_003', 'Riverside Apartments', 'riverside-apartments-prop003', '789 River Road', 'Portland', 'OR', '97209', 'multi_family', 'Charming riverside apartment complex with beautiful garden spaces.', '["Garden", "Laundry", "Pet Friendly", "Bike Storage"]', 1),
  ('prop_004', 'Mountain View House', 'mountain-view-house-prop004', '321 Peak Avenue', 'Denver', 'CO', '80202', 'single_family', 'Spacious family home with panoramic mountain views. Large backyard perfect for entertaining.', '["Mountain View", "Fireplace", "Deck", "2-Car Garage"]', 1),
  ('prop_005', 'City Center Studio', 'city-center-studio-prop005', '654 Urban Plaza', 'Seattle', 'WA', '98101', 'condo', 'Efficient studio apartment in prime downtown location. Perfect for young professionals.', '["Gym", "Security", "Walkable"]', 1),
  ('prop_006', 'Historic Townhouse', 'historic-townhouse-prop006', '987 Heritage Lane', 'Boston', 'MA', '02108', 'townhouse', 'Beautifully restored historic townhouse with modern amenities. Original hardwood floors and architectural details preserved.', '["Historic", "Renovated", "Private Patio"]', 0);

-- Insert test units
INSERT INTO units (id, property_id, unit_number, name, bedrooms, bathrooms, sqft, rent_amount, deposit_amount, status, features, available_date)
VALUES
  -- Sunset Villa (single family - one unit)
  ('unit_001', 'prop_001', 'Main', 'Sunset Villa', 4, 3.0, 2800, 5500, 5500, 'available', '["Ocean View", "Master Suite", "Updated Kitchen", "Private Pool"]', '2024-12-01'),
  
  -- Downtown Loft (condo - one unit)
  ('unit_002', 'prop_002', 'Main', 'Downtown Loft', 2, 2.0, 1400, 3200, 3200, 'available', '["High Ceilings", "Open Floor Plan", "City Views", "Stainless Appliances"]', '2024-11-25'),
  
  -- Riverside Apartments (multi-family - multiple units)
  ('unit_003a', 'prop_003', '1A', 'Garden View', 1, 1.0, 650, 1800, 1800, 'available', '["Ground Floor", "Patio Access", "Updated"]', '2024-12-15'),
  ('unit_003b', 'prop_003', '2B', 'River View', 2, 1.5, 950, 2400, 2400, 'available', '["Balcony", "River View", "Washer/Dryer"]', '2024-11-20'),
  ('unit_003c', 'prop_003', '3A', 'Top Floor', 2, 2.0, 1100, 2800, 2800, 'occupied', '["Top Floor", "Washer/Dryer", "Updated Kitchen"]', NULL),
  
  -- Mountain View House (single family)
  ('unit_004', 'prop_004', 'Main', 'Mountain View House', 5, 3.5, 3200, 4800, 4800, 'pending', '["Mountain View", "Updated", "Large Yard", "Office"]', '2025-01-01'),
  
  -- City Center Studio (condo)
  ('unit_005', 'prop_005', 'Main', 'City Center Studio', 0, 1.0, 450, 1600, 1600, 'available', '["Efficient Layout", "Murphy Bed", "Downtown"]', '2024-11-22'),
  
  -- Historic Townhouse (inactive property)
  ('unit_006', 'prop_006', 'Main', 'Historic Townhouse', 3, 2.5, 1800, 3800, 3800, 'maintenance', '["Historic", "Hardwood Floors", "Exposed Brick"]', NULL);

-- Insert some sample images (these won't have actual R2 files, but will show in the structure)
INSERT INTO images (id, entity_type, entity_id, r2_key, filename, content_type, size_bytes, width, height, sort_order, is_cover, alt_text)
VALUES
  ('img_001', 'property', 'prop_001', 'properties/prop_001/exterior.jpg', 'exterior.jpg', 'image/jpeg', 245000, 1920, 1080, 0, 1, 'Ocean view exterior'),
  ('img_002', 'property', 'prop_002', 'properties/prop_002/living.jpg', 'living.jpg', 'image/jpeg', 198000, 1920, 1080, 0, 1, 'Modern loft living area'),
  ('img_003', 'property', 'prop_003', 'properties/prop_003/building.jpg', 'building.jpg', 'image/jpeg', 215000, 1920, 1080, 0, 1, 'Riverside Apartments exterior'),
  ('img_004', 'property', 'prop_004', 'properties/prop_004/view.jpg', 'view.jpg', 'image/jpeg', 267000, 1920, 1080, 0, 1, 'Mountain view from deck');
