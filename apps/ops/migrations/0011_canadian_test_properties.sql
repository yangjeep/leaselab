-- Migration: Update Test Properties to Canadian Format
-- Converts existing US test properties to Canadian addresses and format

-- Update properties to Canadian addresses
UPDATE properties SET
  name = 'Harbourfront Villa',
  slug = 'harbourfront-villa-prop001',
  address = '123 Queens Quay East',
  city = 'Toronto',
  province = 'ON',
  postal_code = 'M5A 1A1',
  description = 'Beautiful waterfront property with stunning harbour views. Recently renovated with modern finishes throughout.',
  amenities = '["Pool", "Lake View", "Private Terrace", "Parking"]'
WHERE id = 'prop_001';

UPDATE properties SET
  name = 'Downtown King West Loft',
  slug = 'downtown-king-west-loft-prop002',
  address = '456 King Street West',
  city = 'Toronto',
  province = 'ON',
  postal_code = 'M5V 1L7',
  description = 'Modern loft in the heart of downtown Toronto. Walking distance to restaurants, shops, and entertainment.',
  amenities = '["Gym", "Rooftop Deck", "Concierge", "Parking"]'
WHERE id = 'prop_002';

UPDATE properties SET
  name = 'Don Valley Apartments',
  slug = 'don-valley-apartments-prop003',
  address = '789 Don Mills Road',
  city = 'Toronto',
  province = 'ON',
  postal_code = 'M3C 1V5',
  description = 'Charming apartment complex near Don Valley with beautiful garden spaces and park access.',
  amenities = '["Garden", "Laundry", "Pet Friendly", "Bike Storage"]'
WHERE id = 'prop_003';

UPDATE properties SET
  name = 'High Park House',
  slug = 'high-park-house-prop004',
  address = '321 Bloor Street West',
  city = 'Toronto',
  province = 'ON',
  postal_code = 'M6P 1A7',
  description = 'Spacious family home near High Park with beautiful tree-lined views. Large backyard perfect for entertaining.',
  amenities = '["Park View", "Fireplace", "Deck", "2-Car Garage"]'
WHERE id = 'prop_004';

UPDATE properties SET
  name = 'Yonge & Eglinton Studio',
  slug = 'yonge-eglinton-studio-prop005',
  address = '654 Yonge Street',
  city = 'Toronto',
  province = 'ON',
  postal_code = 'M4Y 2A4',
  description = 'Efficient studio apartment in prime midtown location. Perfect for young professionals with easy subway access.',
  amenities = '["Gym", "Security", "Transit Access"]'
WHERE id = 'prop_005';

UPDATE properties SET
  name = 'Historic Cabbagetown Townhouse',
  slug = 'historic-cabbagetown-townhouse-prop006',
  address = '987 Parliament Street',
  city = 'Toronto',
  province = 'ON',
  postal_code = 'M4X 1P8',
  description = 'Beautifully restored historic Victorian townhouse with modern amenities. Original hardwood floors and architectural details preserved.',
  amenities = '["Historic", "Renovated", "Private Patio"]'
WHERE id = 'prop_006';

-- Update unit names and features to reflect Canadian properties
UPDATE units SET
  name = 'Harbourfront Villa',
  features = '["Lake View", "Master Suite", "Updated Kitchen", "Private Pool"]'
WHERE id = 'unit_001';

UPDATE units SET
  name = 'Downtown King West Loft',
  features = '["High Ceilings", "Open Floor Plan", "City Views", "Stainless Appliances"]'
WHERE id = 'unit_002';

UPDATE units SET
  name = 'Garden View',
  features = '["Ground Floor", "Patio Access", "Updated", "In-Suite Laundry"]'
WHERE id = 'unit_003a';

UPDATE units SET
  name = 'Valley View',
  features = '["Balcony", "Valley View", "In-Suite Laundry"]'
WHERE id = 'unit_003b';

UPDATE units SET
  name = 'Top Floor',
  features = '["Top Floor", "In-Suite Laundry", "Updated Kitchen"]'
WHERE id = 'unit_003c';

UPDATE units SET
  name = 'High Park House',
  features = '["Park View", "Updated", "Large Yard", "Home Office"]'
WHERE id = 'unit_004';

UPDATE units SET
  name = 'Yonge & Eglinton Studio',
  features = '["Efficient Layout", "Murphy Bed", "Midtown Location"]'
WHERE id = 'unit_005';

UPDATE units SET
  name = 'Historic Cabbagetown Townhouse',
  features = '["Historic", "Hardwood Floors", "Exposed Brick", "Victorian Details"]'
WHERE id = 'unit_006';

-- Update image alt text to reflect Canadian properties
UPDATE images SET
  alt_text = 'Harbourfront waterfront exterior'
WHERE id = 'img_001';

UPDATE images SET
  alt_text = 'Modern King West loft living area'
WHERE id = 'img_002';

UPDATE images SET
  alt_text = 'Don Valley Apartments exterior'
WHERE id = 'img_003';

UPDATE images SET
  alt_text = 'View from High Park House deck'
WHERE id = 'img_004';
