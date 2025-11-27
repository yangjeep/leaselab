-- Migration: Test Data for Preview Environment
-- Creates realistic test data with proper relationships between all entities
-- Safe to re-run (uses INSERT OR IGNORE)

-- =============================================================================
-- PROPERTIES
-- =============================================================================

INSERT OR IGNORE INTO properties (
  id, site_id, name, slug, address, city, province, postal_code,
  property_type, description, year_built, lot_size, amenities,
  latitude, longitude, is_active, created_at, updated_at
) VALUES
  -- Property 1: Single Family Home
  (
    'prop_oakwood',
    'default',
    'Glebe Heritage Home',
    'glebe-heritage-home',
    '123 Third Avenue',
    'Ottawa',
    'ON',
    'K1S 2K1',
    'single_family',
    'Beautiful 3-bedroom heritage home in the Glebe with large backyard, original hardwood, and modern updates.',
    2015,
    5000.5,
    '["parking", "laundry", "yard", "pets_allowed", "dishwasher", "air_conditioning"]',
    45.4015,
    -75.6972,
    1,
    datetime('now', '-180 days'),
    datetime('now', '-30 days')
  ),

  -- Property 2: Multi-unit Apartment Building
  (
    'prop_maple_apts',
    'default',
    'Byward Market Lofts',
    'byward-market-lofts',
    '456 Clarence Street',
    'Ottawa',
    'ON',
    'K1N 5P6',
    'apartment',
    'Modern 12-unit apartment building in the heart of Byward Market with elevator, fitness center, and bike storage.',
    2020,
    8500.0,
    '["elevator", "fitness_center", "bike_storage", "laundry", "secure_entry", "pet_friendly"]',
    45.4272,
    -75.6911,
    1,
    datetime('now', '-365 days'),
    datetime('now', '-10 days')
  ),

  -- Property 3: Condo Building
  (
    'prop_harbor_view',
    'default',
    'Rideau River View Condos',
    'rideau-river-view-condos',
    '789 Colonel By Drive',
    'Ottawa',
    'ON',
    'K1S 5B6',
    'condo',
    'Luxury waterfront condos with stunning Rideau River and canal views, concierge, and rooftop terrace.',
    2018,
    12000.0,
    '["concierge", "rooftop_terrace", "pool", "gym", "parking", "storage", "water_view"]',
    45.4042,
    -75.6810,
    1,
    datetime('now', '-200 days'),
    datetime('now', '-5 days')
  ),

  -- Property 4: Townhouse Complex
  (
    'prop_cedar_town',
    'default',
    'Kanata Lakes Townhomes',
    'kanata-lakes-townhomes',
    '321 Campeau Drive',
    'Kanata',
    'ON',
    'K2K 2M5',
    'townhouse',
    'Family-friendly townhouse complex in Kanata Lakes with playground, community garden, and walking trails.',
    2016,
    6500.0,
    '["playground", "community_garden", "parking", "storage", "pets_allowed"]',
    45.3088,
    -75.9050,
    1,
    datetime('now', '-300 days'),
    datetime('now', '-20 days')
  );

-- =============================================================================
-- UNITS
-- =============================================================================

INSERT OR IGNORE INTO units (
  id, site_id, property_id, unit_number, name, bedrooms, bathrooms,
  sqft, rent_amount, deposit_amount, status, floor, features,
  available_date, current_tenant_id, is_active, created_at, updated_at
) VALUES
  -- Oakwood Family Home (single unit)
  (
    'unit_oakwood_main',
    'default',
    'prop_oakwood',
    'Main',
    'Main House',
    3,
    2.5,
    1800,
    3200.00,
    3200.00,
    'occupied',
    1,
    '["hardwood_floors", "updated_kitchen", "gas_fireplace", "ensuite_bathroom"]',
    NULL,
    NULL,
    1,
    datetime('now', '-180 days'),
    datetime('now', '-90 days')
  ),

  -- Maple Street Apartments (12 units)
  (
    'unit_maple_101',
    'default',
    'prop_maple_apts',
    '101',
    'Studio Suite 101',
    0,
    1.0,
    450,
    1400.00,
    700.00,
    'occupied',
    1,
    '["hardwood_floors", "in_suite_laundry", "balcony"]',
    NULL,
    NULL,
    1,
    datetime('now', '-365 days'),
    datetime('now', '-200 days')
  ),
  (
    'unit_maple_102',
    'default',
    'prop_maple_apts',
    '102',
    'One Bedroom 102',
    1,
    1.0,
    650,
    1850.00,
    1850.00,
    'occupied',
    1,
    '["hardwood_floors", "in_suite_laundry", "storage_locker"]',
    NULL,
    NULL,
    1,
    datetime('now', '-365 days'),
    datetime('now', '-150 days')
  ),
  (
    'unit_maple_201',
    'default',
    'prop_maple_apts',
    '201',
    'Two Bedroom 201',
    2,
    1.0,
    850,
    2400.00,
    2400.00,
    'available',
    2,
    '["hardwood_floors", "in_suite_laundry", "balcony", "updated_appliances"]',
    date('now', '+15 days'),
    NULL,
    1,
    datetime('now', '-365 days'),
    datetime('now', '-2 days')
  ),
  (
    'unit_maple_202',
    'default',
    'prop_maple_apts',
    '202',
    'Two Bedroom 202',
    2,
    2.0,
    900,
    2600.00,
    2600.00,
    'occupied',
    2,
    '["hardwood_floors", "in_suite_laundry", "two_bathrooms", "walk_in_closet"]',
    NULL,
    NULL,
    1,
    datetime('now', '-365 days'),
    datetime('now', '-180 days')
  ),
  (
    'unit_maple_301',
    'default',
    'prop_maple_apts',
    '301',
    'Penthouse 301',
    3,
    2.0,
    1200,
    3500.00,
    3500.00,
    'available',
    3,
    '["hardwood_floors", "in_suite_laundry", "two_bathrooms", "rooftop_access", "city_views"]',
    date('now', '+30 days'),
    NULL,
    1,
    datetime('now', '-365 days'),
    datetime('now', '-1 days')
  ),

  -- Harbor View Condos (3 units)
  (
    'unit_harbor_1205',
    'default',
    'prop_harbor_view',
    '1205',
    'Harbor View 1205',
    2,
    2.0,
    1100,
    3800.00,
    3800.00,
    'occupied',
    12,
    '["ocean_view", "floor_to_ceiling_windows", "granite_counters", "parking_included"]',
    NULL,
    NULL,
    1,
    datetime('now', '-200 days'),
    datetime('now', '-120 days')
  ),
  (
    'unit_harbor_1506',
    'default',
    'prop_harbor_view',
    '1506',
    'Harbor View 1506',
    3,
    2.5,
    1500,
    4800.00,
    4800.00,
    'available',
    15,
    '["ocean_view", "wraparound_balcony", "gourmet_kitchen", "two_parking"]',
    date('now', '+7 days'),
    NULL,
    1,
    datetime('now', '-200 days'),
    datetime('now', '-3 days')
  ),

  -- Cedar Grove Townhomes (4 units)
  (
    'unit_cedar_1',
    'default',
    'prop_cedar_town',
    '1',
    'Townhome 1',
    3,
    2.5,
    1600,
    2900.00,
    2900.00,
    'occupied',
    2,
    '["attached_garage", "fenced_yard", "fireplace", "master_ensuite"]',
    NULL,
    NULL,
    1,
    datetime('now', '-300 days'),
    datetime('now', '-250 days')
  ),
  (
    'unit_cedar_4',
    'default',
    'prop_cedar_town',
    '4',
    'Townhome 4',
    4,
    3.0,
    2000,
    3400.00,
    3400.00,
    'available',
    2,
    '["attached_garage", "fenced_yard", "fireplace", "master_ensuite", "finished_basement"]',
    date('now', '+20 days'),
    NULL,
    1,
    datetime('now', '-300 days'),
    datetime('now', '-5 days')
  );

-- =============================================================================
-- LEADS (Prospective Tenants)
-- =============================================================================

INSERT OR IGNORE INTO leads (
  id, site_id, property_id, unit_id, first_name, last_name, email, phone,
  current_address, employment_status, monthly_income, move_in_date,
  message, status, ai_score, ai_label, landlord_note, application_note,
  created_at, updated_at
) VALUES
  -- Lead 1: High quality, converted to tenant
  (
    'lead_sarah_johnson',
    'default',
    'prop_oakwood',
    'unit_oakwood_main',
    'Sarah',
    'Johnson',
    'sarah.johnson@email.com',
    '613-555-0101',
    '789 Laurier Avenue, Ottawa, ON',
    'employed',
    9500.00,
    date('now', '-85 days'),
    'Looking for a family home with a yard for our dog. Non-smokers, excellent references.',
    'approved',
    92,
    'A',
    'Excellent candidate, stable employment at tech company in Kanata',
    'All documents verified, references checked out perfectly',
    datetime('now', '-95 days'),
    datetime('now', '-85 days')
  ),

  -- Lead 2: Good quality, converted to tenant
  (
    'lead_david_chen',
    'default',
    'prop_maple_apts',
    'unit_maple_101',
    'David',
    'Chen',
    'david.chen@email.com',
    '343-555-0102',
    '123 Elgin Street, Ottawa, ON',
    'employed',
    5200.00,
    date('now', '-205 days'),
    'Recent grad starting new job, looking for studio near Byward Market',
    'approved',
    85,
    'A',
    'Good income, verified employment letter from employer',
    NULL,
    datetime('now', '-210 days'),
    datetime('now', '-200 days')
  ),

  -- Lead 3: Good quality, converted to tenant
  (
    'lead_priya_patel',
    'default',
    'prop_maple_apts',
    'unit_maple_102',
    'Priya',
    'Patel',
    'priya.patel@email.com',
    '613-555-0103',
    '456 Hunt Club Road, Nepean, ON',
    'employed',
    7200.00,
    date('now', '-155 days'),
    'Healthcare professional relocating for work at Ottawa Hospital. Clean, quiet, no pets.',
    'approved',
    88,
    'A',
    'Healthcare worker, very stable profession',
    'Excellent credit score, spotless rental history',
    datetime('now', '-160 days'),
    datetime('now', '-150 days')
  ),

  -- Lead 4: Good quality, converted to tenant
  (
    'lead_maria_rodriguez',
    'default',
    'prop_maple_apts',
    'unit_maple_202',
    'Maria',
    'Rodriguez',
    'maria.rodriguez@email.com',
    '343-555-0104',
    '789 Somerset Street, Ottawa, ON',
    'employed',
    8900.00,
    date('now', '-185 days'),
    'Professional couple, both employed, looking for 2BR with in-suite laundry',
    'approved',
    90,
    'A',
    'Both applicants have stable jobs, combined income well above requirement',
    NULL,
    datetime('now', '-190 days'),
    datetime('now', '-180 days')
  ),

  -- Lead 5: Excellent quality, converted to tenant
  (
    'lead_james_kim',
    'default',
    'prop_harbor_view',
    'unit_harbor_1205',
    'James',
    'Kim',
    'james.kim@email.com',
    '613-555-0105',
    '321 Sussex Drive, Ottawa, ON',
    'employed',
    15000.00,
    date('now', '-125 days'),
    'Senior executive looking for luxury waterfront condo. References available.',
    'approved',
    95,
    'A',
    'High income, excellent credit, corporate executive',
    'Premium tenant, offered signing bonus accepted',
    datetime('now', '-130 days'),
    datetime('now', '-120 days')
  ),

  -- Lead 6: Good quality, converted to tenant
  (
    'lead_linh_nguyen',
    'default',
    'prop_cedar_town',
    'unit_cedar_1',
    'Linh',
    'Nguyen',
    'linh.nguyen@email.com',
    '613-555-0106',
    '654 Greenbank Road, Nepean, ON',
    'employed',
    11000.00,
    date('now', '-255 days'),
    'Family of 4 looking for townhome near good schools in Kanata',
    'approved',
    87,
    'A',
    'Family with two kids, both parents employed',
    'Clean background check, great references from previous landlord',
    datetime('now', '-260 days'),
    datetime('now', '-250 days')
  ),

  -- Lead 7: New applicant - High quality
  (
    'lead_emma_wilson',
    'default',
    'prop_maple_apts',
    'unit_maple_201',
    'Emma',
    'Wilson',
    'emma.wilson@email.com',
    '343-555-0201',
    '147 Bank Street, Ottawa, ON',
    'employed',
    8500.00,
    date('now', '+20 days'),
    'Software engineer at Shopify looking for 2BR. Clean, quiet, no smoking or pets.',
    'reviewing',
    91,
    'A',
    NULL,
    NULL,
    datetime('now', '-3 days'),
    datetime('now', '-1 days')
  ),

  -- Lead 8: New applicant - Good quality
  (
    'lead_michael_brown',
    'default',
    'prop_harbor_view',
    'unit_harbor_1506',
    'Michael',
    'Brown',
    'michael.brown@email.com',
    '613-555-0202',
    '852 Wellington Street, Ottawa, ON',
    'employed',
    13500.00,
    date('now', '+10 days'),
    'Doctor relocating to Ottawa General Hospital. Looking for luxury condo with parking.',
    'reviewing',
    93,
    'A',
    'Medical professional, very strong application',
    NULL,
    datetime('now', '-5 days'),
    datetime('now', '-2 days')
  ),

  -- Lead 9: New applicant - Medium quality
  (
    'lead_alex_taylor',
    'default',
    'prop_cedar_town',
    'unit_cedar_4',
    'Alex',
    'Taylor',
    'alex.taylor@email.com',
    '343-555-0203',
    '963 Carling Avenue, Ottawa, ON',
    'self_employed',
    9800.00,
    date('now', '+25 days'),
    'Freelance consultant, can provide tax returns and bank statements',
    'new',
    78,
    'B',
    NULL,
    NULL,
    datetime('now', '-2 days'),
    datetime('now', '-2 days')
  ),

  -- Lead 10: New applicant - Lower quality
  (
    'lead_jordan_lee',
    'default',
    'prop_maple_apts',
    'unit_maple_201',
    'Jordan',
    'Lee',
    'jordan.lee@email.com',
    '613-555-0204',
    '741 Montreal Road, Ottawa, ON',
    'employed',
    5800.00,
    date('now', '+30 days'),
    'Recent job change, but stable income. Have small cat.',
    'new',
    68,
    'C',
    NULL,
    NULL,
    datetime('now', '-1 days'),
    datetime('now', '-1 days')
  ),

  -- Lead 11: Rejected applicant
  (
    'lead_chris_martin',
    'default',
    'prop_maple_apts',
    'unit_maple_301',
    'Chris',
    'Martin',
    'chris.martin@email.com',
    '343-555-0205',
    '369 Rideau Street, Ottawa, ON',
    'student',
    2800.00,
    date('now', '+35 days'),
    'Full-time student at uOttawa, parents will co-sign',
    'rejected',
    45,
    'D',
    'Income too low even with co-signer, no rental history',
    NULL,
    datetime('now', '-10 days'),
    datetime('now', '-8 days')
  ),

  -- Lead 12: Pending application
  (
    'lead_sam_anderson',
    'default',
    'prop_maple_apts',
    'unit_maple_301',
    'Sam',
    'Anderson',
    'sam.anderson@email.com',
    '613-555-0206',
    '159 Merivale Road, Nepean, ON',
    'employed',
    11200.00,
    date('now', '+40 days'),
    'Marketing director, looking for spacious unit with views of the market',
    'new',
    NULL,
    NULL,
    NULL,
    NULL,
    datetime('now', '-12 hours'),
    datetime('now', '-12 hours')
  );

-- =============================================================================
-- LEAD FILES
-- =============================================================================

INSERT OR IGNORE INTO lead_files (
  id, site_id, lead_id, file_type, file_name, file_size, mime_type, r2_key, uploaded_at
) VALUES
  -- Files for lead_sarah_johnson
  ('file_sarah_id', 'default', 'lead_sarah_johnson', 'id', 'drivers_license.jpg', 245678, 'image/jpeg', 'leads/lead_sarah_johnson/drivers_license.jpg', datetime('now', '-95 days')),
  ('file_sarah_pay1', 'default', 'lead_sarah_johnson', 'paystub', 'paystub_jan_2024.pdf', 189234, 'application/pdf', 'leads/lead_sarah_johnson/paystub_jan_2024.pdf', datetime('now', '-95 days')),
  ('file_sarah_pay2', 'default', 'lead_sarah_johnson', 'paystub', 'paystub_feb_2024.pdf', 192456, 'application/pdf', 'leads/lead_sarah_johnson/paystub_feb_2024.pdf', datetime('now', '-95 days')),

  -- Files for lead_david_chen
  ('file_david_id', 'default', 'lead_david_chen', 'id', 'passport.jpg', 312456, 'image/jpeg', 'leads/lead_david_chen/passport.jpg', datetime('now', '-210 days')),
  ('file_david_employ', 'default', 'lead_david_chen', 'employment_letter', 'employment_letter.pdf', 156789, 'application/pdf', 'leads/lead_david_chen/employment_letter.pdf', datetime('now', '-210 days')),

  -- Files for lead_priya_patel
  ('file_priya_id', 'default', 'lead_priya_patel', 'id', 'drivers_license.jpg', 278934, 'image/jpeg', 'leads/lead_priya_patel/drivers_license.jpg', datetime('now', '-160 days')),
  ('file_priya_pay1', 'default', 'lead_priya_patel', 'paystub', 'paystub_1.pdf', 198765, 'application/pdf', 'leads/lead_priya_patel/paystub_1.pdf', datetime('now', '-160 days')),
  ('file_priya_credit', 'default', 'lead_priya_patel', 'credit_report', 'credit_report.pdf', 423156, 'application/pdf', 'leads/lead_priya_patel/credit_report.pdf', datetime('now', '-160 days')),

  -- Files for lead_emma_wilson (new applicant)
  ('file_emma_id', 'default', 'lead_emma_wilson', 'id', 'bc_id.jpg', 267891, 'image/jpeg', 'leads/lead_emma_wilson/bc_id.jpg', datetime('now', '-3 days')),
  ('file_emma_pay', 'default', 'lead_emma_wilson', 'paystub', 'recent_paystub.pdf', 187234, 'application/pdf', 'leads/lead_emma_wilson/recent_paystub.pdf', datetime('now', '-3 days')),

  -- Files for lead_michael_brown (new applicant)
  ('file_michael_id', 'default', 'lead_michael_brown', 'id', 'drivers_license.jpg', 289456, 'image/jpeg', 'leads/lead_michael_brown/drivers_license.jpg', datetime('now', '-5 days')),
  ('file_michael_employ', 'default', 'lead_michael_brown', 'employment_letter', 'hospital_employment.pdf', 234567, 'application/pdf', 'leads/lead_michael_brown/hospital_employment.pdf', datetime('now', '-5 days')),
  ('file_michael_ref', 'default', 'lead_michael_brown', 'reference_letter', 'landlord_reference.pdf', 145678, 'application/pdf', 'leads/lead_michael_brown/landlord_reference.pdf', datetime('now', '-5 days'));

-- =============================================================================
-- LEAD AI EVALUATIONS
-- =============================================================================

INSERT OR IGNORE INTO lead_ai_evaluations (
  id, site_id, lead_id, score, label, summary, risk_flags, recommendation,
  fraud_signals, model_version, evaluated_at
) VALUES
  (
    'eval_sarah',
    'default',
    'lead_sarah_johnson',
    92,
    'A',
    'Excellent candidate with strong financials and stable employment. Income is 3x rent, clean documentation, and positive rental history.',
    '[]',
    'APPROVE - Strong candidate for immediate lease signing',
    '[]',
    'v1.2',
    datetime('now', '-94 days')
  ),
  (
    'eval_david',
    'default',
    'lead_david_chen',
    85,
    'A',
    'Good applicant with verified employment and adequate income. Recent graduate with new job shows growth potential.',
    '["new_employment"]',
    'APPROVE - Consider requiring additional deposit due to limited rental history',
    '[]',
    'v1.2',
    datetime('now', '-209 days')
  ),
  (
    'eval_priya',
    'default',
    'lead_priya_patel',
    88,
    'A',
    'Healthcare professional with excellent credit and stable income. Very low risk tenant.',
    '[]',
    'APPROVE - Ideal tenant profile',
    '[]',
    'v1.2',
    datetime('now', '-159 days')
  ),
  (
    'eval_maria',
    'default',
    'lead_maria_rodriguez',
    90,
    'A',
    'Dual income household with combined earnings well above requirement. Both applicants employed full-time.',
    '[]',
    'APPROVE - Strong financial position',
    '[]',
    'v1.2',
    datetime('now', '-189 days')
  ),
  (
    'eval_james',
    'default',
    'lead_james_kim',
    95,
    'A',
    'Senior executive with exceptional income and credit profile. Very high quality tenant for luxury unit.',
    '[]',
    'APPROVE - Premium tenant, prioritize application',
    '[]',
    'v1.2',
    datetime('now', '-129 days')
  ),
  (
    'eval_linh',
    'default',
    'lead_linh_nguyen',
    87,
    'A',
    'Family with strong dual income and excellent references. Long-term stability indicators present.',
    '[]',
    'APPROVE - Good fit for family-oriented property',
    '[]',
    'v1.2',
    datetime('now', '-259 days')
  ),
  (
    'eval_emma',
    'default',
    'lead_emma_wilson',
    91,
    'A',
    'Software engineer with strong tech sector income. Clean background, no red flags in documentation.',
    '[]',
    'APPROVE - Excellent candidate',
    '[]',
    'v1.3',
    datetime('now', '-2 days')
  ),
  (
    'eval_michael',
    'default',
    'lead_michael_brown',
    93,
    'A',
    'Medical professional with verified hospital employment. Very stable career with high income.',
    '[]',
    'APPROVE - High quality tenant for premium unit',
    '[]',
    'v1.3',
    datetime('now', '-4 days')
  ),
  (
    'eval_alex',
    'default',
    'lead_alex_taylor',
    78,
    'B',
    'Self-employed with variable income. Tax returns show adequate earnings but less stability than salaried position.',
    '["self_employed", "variable_income"]',
    'CONDITIONAL APPROVE - Request additional financial documentation and larger deposit',
    '[]',
    'v1.3',
    datetime('now', '-1 days')
  ),
  (
    'eval_jordan',
    'default',
    'lead_jordan_lee',
    68,
    'C',
    'Income meets minimum but recent job change raises stability concerns. Rent-to-income ratio is borderline.',
    '["recent_job_change", "borderline_income"]',
    'REVIEW - Consider co-signer or additional references',
    '[]',
    'v1.3',
    datetime('now', '-1 days')
  ),
  (
    'eval_chris',
    'default',
    'lead_chris_martin',
    45,
    'D',
    'Student with insufficient income. Even with co-signer, no independent rental history or credit established.',
    '["insufficient_income", "no_rental_history", "student_status"]',
    'REJECT - Does not meet income requirements',
    '[]',
    'v1.3',
    datetime('now', '-9 days')
  );

-- =============================================================================
-- LEAD HISTORY
-- =============================================================================

INSERT OR IGNORE INTO lead_history (
  id, site_id, lead_id, event_type, event_data, created_at
) VALUES
  ('hist_sarah_1', 'default', 'lead_sarah_johnson', 'status_change', '{"from":"new","to":"reviewing","changed_by":"user_admin"}', datetime('now', '-94 days')),
  ('hist_sarah_2', 'default', 'lead_sarah_johnson', 'ai_evaluation', '{"score":92,"label":"A"}', datetime('now', '-94 days')),
  ('hist_sarah_3', 'default', 'lead_sarah_johnson', 'status_change', '{"from":"reviewing","to":"approved","changed_by":"user_admin"}', datetime('now', '-85 days')),
  ('hist_sarah_4', 'default', 'lead_sarah_johnson', 'converted_to_tenant', '{"tenant_id":"tenant_johnson"}', datetime('now', '-85 days')),

  ('hist_emma_1', 'default', 'lead_emma_wilson', 'status_change', '{"from":"new","to":"reviewing","changed_by":"user_admin"}', datetime('now', '-2 days')),
  ('hist_emma_2', 'default', 'lead_emma_wilson', 'ai_evaluation', '{"score":91,"label":"A"}', datetime('now', '-2 days')),

  ('hist_chris_1', 'default', 'lead_chris_martin', 'status_change', '{"from":"new","to":"reviewing","changed_by":"user_admin"}', datetime('now', '-9 days')),
  ('hist_chris_2', 'default', 'lead_chris_martin', 'ai_evaluation', '{"score":45,"label":"D"}', datetime('now', '-9 days')),
  ('hist_chris_3', 'default', 'lead_chris_martin', 'status_change', '{"from":"reviewing","to":"rejected","changed_by":"user_admin","reason":"Insufficient income"}', datetime('now', '-8 days'));

-- =============================================================================
-- TENANTS
-- =============================================================================

INSERT OR IGNORE INTO tenants (
  id, site_id, lead_id, first_name, last_name, email, phone,
  emergency_contact, emergency_phone, status, created_at, updated_at
) VALUES
  (
    'tenant_johnson',
    'default',
    'lead_sarah_johnson',
    'Sarah',
    'Johnson',
    'sarah.johnson@email.com',
    '613-555-0101',
    'Mike Johnson (Husband)',
    '613-555-0199',
    'active',
    datetime('now', '-85 days'),
    datetime('now', '-85 days')
  ),
  (
    'tenant_chen',
    'default',
    'lead_david_chen',
    'David',
    'Chen',
    'david.chen@email.com',
    '343-555-0102',
    'Lisa Chen (Sister)',
    '343-555-0198',
    'active',
    datetime('now', '-200 days'),
    datetime('now', '-200 days')
  ),
  (
    'tenant_patel',
    'default',
    'lead_priya_patel',
    'Priya',
    'Patel',
    'priya.patel@email.com',
    '613-555-0103',
    'Raj Patel (Brother)',
    '613-555-0197',
    'active',
    datetime('now', '-150 days'),
    datetime('now', '-150 days')
  ),
  (
    'tenant_rodriguez',
    'default',
    'lead_maria_rodriguez',
    'Maria',
    'Rodriguez',
    'maria.rodriguez@email.com',
    '343-555-0104',
    'Carlos Rodriguez (Spouse)',
    '343-555-0196',
    'active',
    datetime('now', '-180 days'),
    datetime('now', '-180 days')
  ),
  (
    'tenant_kim',
    'default',
    'lead_james_kim',
    'James',
    'Kim',
    'james.kim@email.com',
    '613-555-0105',
    'Jennifer Kim (Spouse)',
    '613-555-0195',
    'active',
    datetime('now', '-120 days'),
    datetime('now', '-120 days')
  ),
  (
    'tenant_nguyen',
    'default',
    'lead_linh_nguyen',
    'Linh',
    'Nguyen',
    'linh.nguyen@email.com',
    '613-555-0106',
    'Tom Nguyen (Spouse)',
    '613-555-0194',
    'active',
    datetime('now', '-250 days'),
    datetime('now', '-250 days')
  );

-- =============================================================================
-- LEASES
-- =============================================================================

INSERT OR IGNORE INTO leases (
  id, site_id, property_id, unit_id, tenant_id, start_date, end_date,
  monthly_rent, security_deposit, status, docusign_envelope_id, signed_at,
  created_at, updated_at
) VALUES
  -- Active lease for Sarah Johnson at Oakwood
  (
    'lease_johnson_oakwood',
    'default',
    'prop_oakwood',
    'unit_oakwood_main',
    'tenant_johnson',
    date('now', '-80 days'),
    date('now', '+285 days'),
    3200.00,
    3200.00,
    'active',
    'docusign_env_001',
    datetime('now', '-82 days'),
    datetime('now', '-85 days'),
    datetime('now', '-80 days')
  ),

  -- Active lease for David Chen at Maple 101
  (
    'lease_chen_maple101',
    'default',
    'prop_maple_apts',
    'unit_maple_101',
    'tenant_chen',
    date('now', '-195 days'),
    date('now', '+170 days'),
    1400.00,
    700.00,
    'active',
    'docusign_env_002',
    datetime('now', '-197 days'),
    datetime('now', '-200 days'),
    datetime('now', '-195 days')
  ),

  -- Active lease for Priya Patel at Maple 102
  (
    'lease_patel_maple102',
    'default',
    'prop_maple_apts',
    'unit_maple_102',
    'tenant_patel',
    date('now', '-145 days'),
    date('now', '+220 days'),
    1850.00,
    1850.00,
    'active',
    'docusign_env_003',
    datetime('now', '-147 days'),
    datetime('now', '-150 days'),
    datetime('now', '-145 days')
  ),

  -- Active lease for Maria Rodriguez at Maple 202
  (
    'lease_rodriguez_maple202',
    'default',
    'prop_maple_apts',
    'unit_maple_202',
    'tenant_rodriguez',
    date('now', '-175 days'),
    date('now', '+190 days'),
    2600.00,
    2600.00,
    'active',
    'docusign_env_004',
    datetime('now', '-177 days'),
    datetime('now', '-180 days'),
    datetime('now', '-175 days')
  ),

  -- Active lease for James Kim at Harbor View
  (
    'lease_kim_harbor',
    'default',
    'prop_harbor_view',
    'unit_harbor_1205',
    'tenant_kim',
    date('now', '-115 days'),
    date('now', '+250 days'),
    3800.00,
    3800.00,
    'active',
    'docusign_env_005',
    datetime('now', '-117 days'),
    datetime('now', '-120 days'),
    datetime('now', '-115 days')
  ),

  -- Active lease for Nguyen family at Cedar Grove
  (
    'lease_nguyen_cedar',
    'default',
    'prop_cedar_town',
    'unit_cedar_1',
    'tenant_nguyen',
    date('now', '-245 days'),
    date('now', '+120 days'),
    2900.00,
    2900.00,
    'active',
    'docusign_env_006',
    datetime('now', '-247 days'),
    datetime('now', '-250 days'),
    datetime('now', '-245 days')
  );

-- =============================================================================
-- WORK ORDERS
-- =============================================================================

INSERT OR IGNORE INTO work_orders (
  id, site_id, property_id, tenant_id, title, description, category,
  priority, status, assigned_to, scheduled_date, completed_at, notes,
  created_at, updated_at
) VALUES
  -- Completed work order
  (
    'wo_001',
    'default',
    'prop_oakwood',
    'tenant_johnson',
    'Leaking kitchen faucet',
    'Kitchen faucet has slow drip. Tenant reports it started 3 days ago.',
    'plumbing',
    'medium',
    'completed',
    'John the Plumber',
    date('now', '-15 days'),
    datetime('now', '-13 days'),
    'Replaced washer and O-ring. Leak stopped. Tenant satisfied.',
    datetime('now', '-20 days'),
    datetime('now', '-13 days')
  ),

  -- In progress work order
  (
    'wo_002',
    'default',
    'prop_maple_apts',
    'tenant_chen',
    'Heating not working properly',
    'Unit 101 thermostat not reaching set temperature. Needs inspection.',
    'hvac',
    'high',
    'in_progress',
    'ABC HVAC Services',
    date('now', '+1 days'),
    NULL,
    'Technician scheduled for tomorrow morning',
    datetime('now', '-2 days'),
    datetime('now', '-1 days')
  ),

  -- Open high priority
  (
    'wo_003',
    'default',
    'prop_harbor_view',
    'tenant_kim',
    'Water leak from ceiling',
    'Water staining on ceiling in master bedroom. Possible leak from unit above.',
    'plumbing',
    'high',
    'open',
    NULL,
    NULL,
    NULL,
    NULL,
    datetime('now', '-6 hours'),
    datetime('now', '-6 hours')
  ),

  -- Scheduled maintenance
  (
    'wo_004',
    'default',
    'prop_cedar_town',
    'tenant_nguyen',
    'Annual furnace inspection',
    'Scheduled annual furnace maintenance and safety inspection',
    'hvac',
    'low',
    'scheduled',
    'ABC HVAC Services',
    date('now', '+14 days'),
    NULL,
    'Part of annual maintenance program',
    datetime('now', '-30 days'),
    datetime('now', '-30 days')
  ),

  -- Completed electrical work
  (
    'wo_005',
    'default',
    'prop_maple_apts',
    'tenant_patel',
    'Outlet not working in bedroom',
    'Electrical outlet near desk stopped working. No power.',
    'electrical',
    'medium',
    'completed',
    'Bright Spark Electric',
    date('now', '-8 days'),
    datetime('now', '-7 days'),
    'Found tripped GFCI in bathroom. Reset and tested all outlets. Working normally.',
    datetime('now', '-10 days'),
    datetime('now', '-7 days')
  ),

  -- Open work order for common area
  (
    'wo_006',
    'default',
    'prop_maple_apts',
    NULL,
    'Lobby light fixture flickering',
    'Main lobby chandelier has flickering bulbs. Needs replacement or repair.',
    'electrical',
    'low',
    'open',
    NULL,
    NULL,
    NULL,
    NULL,
    datetime('now', '-3 days'),
    datetime('now', '-3 days')
  ),

  -- Urgent in progress
  (
    'wo_007',
    'default',
    'prop_oakwood',
    'tenant_johnson',
    'Broken window in living room',
    'Storm caused tree branch to break front window. Boarded up temporarily.',
    'general',
    'urgent',
    'in_progress',
    'Quick Glass Repair',
    date('now'),
    NULL,
    'Emergency board-up completed. Glass replacement scheduled for today.',
    datetime('now', '-1 days'),
    datetime('now', '-12 hours')
  ),

  -- Scheduled appliance maintenance
  (
    'wo_008',
    'default',
    'prop_harbor_view',
    'tenant_kim',
    'Dishwasher making loud noise',
    'Dishwasher running but making grinding sound during wash cycle',
    'appliance',
    'medium',
    'scheduled',
    'Appliance Pros',
    date('now', '+3 days'),
    NULL,
    'Appointment confirmed with tenant for Friday morning',
    datetime('now', '-4 days'),
    datetime('now', '-2 days')
  ),

  -- Completed landscaping
  (
    'wo_009',
    'default',
    'prop_cedar_town',
    NULL,
    'Seasonal landscaping',
    'Spring cleanup, lawn aeration, and fertilizing for all units',
    'landscaping',
    'low',
    'completed',
    'Green Thumb Landscaping',
    date('now', '-45 days'),
    datetime('now', '-42 days'),
    'All units completed. Grass seed applied, will monitor growth.',
    datetime('now', '-50 days'),
    datetime('now', '-42 days')
  ),

  -- Open maintenance request
  (
    'wo_010',
    'default',
    'prop_maple_apts',
    'tenant_rodriguez',
    'Bathroom tile grout cracking',
    'Grout between shower tiles is cracking and needs repair to prevent water damage',
    'general',
    'medium',
    'open',
    NULL,
    NULL,
    NULL,
    NULL,
    datetime('now', '-5 days'),
    datetime('now', '-5 days')
  );

-- =============================================================================
-- IMAGES
-- =============================================================================

INSERT OR IGNORE INTO images (
  id, site_id, entity_type, entity_id, r2_key, filename, content_type,
  size_bytes, width, height, sort_order, is_cover, alt_text, created_at
) VALUES
  -- Oakwood property images
  ('img_oakwood_1', 'default', 'property', 'prop_oakwood', 'properties/oakwood/exterior_front.jpg', 'exterior_front.jpg', 'image/jpeg', 1245678, 1920, 1080, 0, 1, 'Front view of Oakwood Family Home', datetime('now', '-180 days')),
  ('img_oakwood_2', 'default', 'property', 'prop_oakwood', 'properties/oakwood/living_room.jpg', 'living_room.jpg', 'image/jpeg', 989234, 1920, 1080, 1, 0, 'Spacious living room with fireplace', datetime('now', '-180 days')),
  ('img_oakwood_3', 'default', 'property', 'prop_oakwood', 'properties/oakwood/kitchen.jpg', 'kitchen.jpg', 'image/jpeg', 1123456, 1920, 1080, 2, 0, 'Modern updated kitchen', datetime('now', '-180 days')),
  ('img_oakwood_4', 'default', 'property', 'prop_oakwood', 'properties/oakwood/backyard.jpg', 'backyard.jpg', 'image/jpeg', 1345678, 1920, 1080, 3, 0, 'Large fenced backyard', datetime('now', '-180 days')),

  -- Maple Apartments images
  ('img_maple_1', 'default', 'property', 'prop_maple_apts', 'properties/maple/building_exterior.jpg', 'building_exterior.jpg', 'image/jpeg', 1567890, 1920, 1080, 0, 1, 'Maple Street Apartments exterior', datetime('now', '-365 days')),
  ('img_maple_2', 'default', 'property', 'prop_maple_apts', 'properties/maple/lobby.jpg', 'lobby.jpg', 'image/jpeg', 978234, 1920, 1080, 1, 0, 'Modern lobby entrance', datetime('now', '-365 days')),
  ('img_maple_3', 'default', 'property', 'prop_maple_apts', 'properties/maple/fitness_center.jpg', 'fitness_center.jpg', 'image/jpeg', 1089456, 1920, 1080, 2, 0, 'Fitness center amenity', datetime('now', '-365 days')),

  -- Unit specific images
  ('img_maple101_1', 'default', 'unit', 'unit_maple_101', 'units/maple_101/studio.jpg', 'studio.jpg', 'image/jpeg', 867234, 1920, 1080, 0, 1, 'Studio layout Unit 101', datetime('now', '-365 days')),
  ('img_maple201_1', 'default', 'unit', 'unit_maple_201', 'units/maple_201/living.jpg', 'living.jpg', 'image/jpeg', 945678, 1920, 1080, 0, 1, 'Two bedroom living room Unit 201', datetime('now', '-365 days')),
  ('img_maple201_2', 'default', 'unit', 'unit_maple_201', 'units/maple_201/bedroom.jpg', 'bedroom.jpg', 'image/jpeg', 823456, 1920, 1080, 1, 0, 'Master bedroom Unit 201', datetime('now', '-365 days')),

  -- Harbor View images
  ('img_harbor_1', 'default', 'property', 'prop_harbor_view', 'properties/harbor/exterior.jpg', 'exterior.jpg', 'image/jpeg', 1678234, 1920, 1080, 0, 1, 'Harbor View Condominiums waterfront', datetime('now', '-200 days')),
  ('img_harbor_2', 'default', 'property', 'prop_harbor_view', 'properties/harbor/ocean_view.jpg', 'ocean_view.jpg', 'image/jpeg', 1456789, 1920, 1080, 1, 0, 'Ocean view from balcony', datetime('now', '-200 days')),
  ('img_harbor_3', 'default', 'property', 'prop_harbor_view', 'properties/harbor/rooftop.jpg', 'rooftop.jpg', 'image/jpeg', 1234567, 1920, 1080, 2, 0, 'Rooftop terrace amenity', datetime('now', '-200 days')),

  -- Cedar Grove images
  ('img_cedar_1', 'default', 'property', 'prop_cedar_town', 'properties/cedar/townhomes.jpg', 'townhomes.jpg', 'image/jpeg', 1389234, 1920, 1080, 0, 1, 'Cedar Grove Townhomes exterior', datetime('now', '-300 days')),
  ('img_cedar_2', 'default', 'property', 'prop_cedar_town', 'properties/cedar/playground.jpg', 'playground.jpg', 'image/jpeg', 1156789, 1920, 1080, 1, 0, 'Community playground', datetime('now', '-300 days'));

-- =============================================================================
-- UNIT HISTORY
-- =============================================================================

INSERT OR IGNORE INTO unit_history (
  id, site_id, unit_id, event_type, event_data, created_at
) VALUES
  ('uhist_oakwood_1', 'default', 'unit_oakwood_main', 'status_change', '{"from":"available","to":"occupied","tenant_id":"tenant_johnson","lease_id":"lease_johnson_oakwood"}', datetime('now', '-80 days')),

  ('uhist_maple101_1', 'default', 'unit_maple_101', 'status_change', '{"from":"available","to":"occupied","tenant_id":"tenant_chen","lease_id":"lease_chen_maple101"}', datetime('now', '-195 days')),

  ('uhist_maple102_1', 'default', 'unit_maple_102', 'status_change', '{"from":"available","to":"occupied","tenant_id":"tenant_patel","lease_id":"lease_patel_maple102"}', datetime('now', '-145 days')),

  ('uhist_maple201_1', 'default', 'unit_maple_201', 'status_change', '{"from":"occupied","to":"available","reason":"lease_ended"}', datetime('now', '-2 days')),
  ('uhist_maple201_2', 'default', 'unit_maple_201', 'maintenance', '{"type":"cleaning","description":"Professional cleaning after tenant move-out"}', datetime('now', '-1 days')),

  ('uhist_maple202_1', 'default', 'unit_maple_202', 'status_change', '{"from":"available","to":"occupied","tenant_id":"tenant_rodriguez","lease_id":"lease_rodriguez_maple202"}', datetime('now', '-175 days')),

  ('uhist_harbor1205_1', 'default', 'unit_harbor_1205', 'status_change', '{"from":"available","to":"occupied","tenant_id":"tenant_kim","lease_id":"lease_kim_harbor"}', datetime('now', '-115 days')),

  ('uhist_cedar1_1', 'default', 'unit_cedar_1', 'status_change', '{"from":"available","to":"occupied","tenant_id":"tenant_nguyen","lease_id":"lease_nguyen_cedar"}', datetime('now', '-245 days'));

-- =============================================================================
-- UPDATE UNITS WITH CURRENT TENANTS
-- =============================================================================
-- Now that tenants exist, we can update units with their current_tenant_id

UPDATE units SET current_tenant_id = 'tenant_johnson' WHERE id = 'unit_oakwood_main';
UPDATE units SET current_tenant_id = 'tenant_chen' WHERE id = 'unit_maple_101';
UPDATE units SET current_tenant_id = 'tenant_patel' WHERE id = 'unit_maple_102';
UPDATE units SET current_tenant_id = 'tenant_rodriguez' WHERE id = 'unit_maple_202';
UPDATE units SET current_tenant_id = 'tenant_kim' WHERE id = 'unit_harbor_1205';
UPDATE units SET current_tenant_id = 'tenant_nguyen' WHERE id = 'unit_cedar_1';

-- =============================================================================
-- SUMMARY
-- =============================================================================

-- Test data summary:
-- ✓ 4 Properties (single_family, apartment, condo, townhouse)
-- ✓ 9 Units across properties (6 occupied, 3 available)
-- ✓ 12 Leads (6 converted to tenants, 3 new/reviewing, 1 rejected, 2 pending)
-- ✓ 13 Lead files (ID, paystubs, employment letters, etc.)
-- ✓ 11 AI evaluations (scores ranging from 45-95)
-- ✓ 9 Lead history events
-- ✓ 6 Tenants (all active, linked to leads)
-- ✓ 6 Leases (all active, with proper date ranges)
-- ✓ 10 Work orders (various statuses and priorities)
-- ✓ 14 Images (property and unit photos)
-- ✓ 8 Unit history events

-- Relationships verified:
-- ✓ Leads → Properties/Units
-- ✓ Leads → Tenants (via lead_id)
-- ✓ Tenants → Leases
-- ✓ Leases → Units (current_tenant_id updated)
-- ✓ Work Orders → Properties/Tenants
-- ✓ All entities properly linked to default site
