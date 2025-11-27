PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE user_access (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  granted_by TEXT, -- user_id of who granted access (NULL for system-granted)
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, site_id)
);
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  current_address TEXT,
  employment_status TEXT NOT NULL,
  monthly_income REAL NOT NULL,
  move_in_date TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  ai_score INTEGER,
  ai_label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')), unit_id TEXT REFERENCES units(id), site_id TEXT NOT NULL DEFAULT 'default', landlord_note TEXT, application_note TEXT,
  FOREIGN KEY (property_id) REFERENCES properties(id)
);
INSERT INTO "leads" VALUES('lead_test_001','prop_001','Sarah','Anderson','sarah.anderson@example.com','+1-416-555-0101','123 Maple Street, Toronto, ON M5V 1A1','employed',5200,'2025-12-03','Looking for a quiet place close to work. Non-smoker, no pets.','ai_evaluated',85,'A','2025-11-23 17:57:52','2025-11-23 17:57:52','unit_001','default','Legacy monthly income: $5200.0',NULL);
INSERT INTO "leads" VALUES('lead_test_002','prop_002','Michael','Chen','michael.chen@example.com','+1-647-555-0202','456 Oak Avenue, Mississauga, ON L5B 2C3','employed',6800,'2025-12-10','Software engineer relocating to Toronto. Clean, responsible tenant.','screening',92,'A','2025-11-21 17:57:52','2025-11-26T19:28:09.724Z','unit_002','default','Legacy monthly income: $6800.0',NULL);
INSERT INTO "leads" VALUES('lead_test_003','prop_001','Jennifer','Taylor','jennifer.taylor@example.com','+1-416-555-0303','789 Pine Road, Toronto, ON M4S 1E5','employed',4500,'2025-12-06','Recent graduate starting new job. First time renting.','new',NULL,NULL,'2025-11-25 17:57:52','2025-11-26T22:48:48.945Z','unit_001','default','Legacy monthly income: $4500.0',NULL);
INSERT INTO "leads" VALUES('lead_test_004','prop_003','David','Patel','david.patel@example.com','+1-905-555-0404','321 Elm Street, Brampton, ON L6T 3G7','self_employed',7200,'2025-12-17','Business consultant. Excellent references available.','ai_evaluated',78,'B','2025-11-24 17:57:52','2025-11-24 17:57:52','unit_003a','default','Legacy monthly income: $7200.0',NULL);
INSERT INTO "leads" VALUES('lead_test_005','prop_001','Emily','Rodriguez','emily.rodriguez@example.com','+1-416-555-0505','654 Birch Lane, Toronto, ON M2N 4H9','employed',5800,'2025-12-26','Nurse at Toronto General Hospital. Quiet and responsible.','new',NULL,NULL,'2025-11-22 17:57:52','2025-11-27T15:50:00.683Z','unit_001','default','Legacy monthly income: $5800.0',NULL);
INSERT INTO "leads" VALUES('lead_test_006','prop_002','James','Wilson','james.wilson@example.com','+1-647-555-0606','987 Cedar Court, Markham, ON L3R 5J1','employed',6200,'2025-12-11','Teacher with stable income. Non-smoker.','ai_evaluated',88,'A','2025-11-20 17:57:52','2025-11-20 17:57:52','unit_002','default','Legacy monthly income: $6200.0',NULL);
INSERT INTO "leads" VALUES('lead_test_007','prop_001','Lisa','Kumar','lisa.kumar@example.com','+1-416-555-0707','147 Willow Way, Toronto, ON M1P 2K4','employed',4800,'2025-12-16','College student working part-time.','lease_sent',45,'D','2025-11-18 17:57:52','2025-11-26T19:21:49.844Z','unit_001','default','Legacy monthly income: $4800.0',NULL);
INSERT INTO "leads" VALUES('lead_test_008','prop_003','Robert','Nguyen','robert.nguyen@example.com','+1-905-555-0808','258 Spruce Street, Vaughan, ON L4L 1M6','employed',5500,'2025-12-08','Accountant with 5 years experience. Excellent credit history.','ai_evaluated',82,'A','2025-11-22 17:57:52','2025-11-22 17:57:52','unit_003a','default','Legacy monthly income: $5500.0',NULL);
CREATE TABLE lead_files (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')), site_id TEXT NOT NULL DEFAULT 'default',
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);
CREATE TABLE lead_ai_evaluations (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL UNIQUE,
  score INTEGER NOT NULL,
  label TEXT NOT NULL,
  summary TEXT NOT NULL,
  risk_flags TEXT DEFAULT '[]',
  recommendation TEXT NOT NULL,
  fraud_signals TEXT DEFAULT '[]',
  model_version TEXT NOT NULL,
  evaluated_at TEXT NOT NULL DEFAULT (datetime('now')), site_id TEXT NOT NULL DEFAULT 'default',
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);
INSERT INTO "lead_ai_evaluations" VALUES('eval_test_001','lead_test_001',85,'A','Excellent candidate with strong income and employment stability. Income-to-rent ratio is healthy at 3:1. No red flags identified in documents.','[]','approve','[]','gpt-4-vision-preview','2025-11-25 17:57:52','default');
INSERT INTO "lead_ai_evaluations" VALUES('eval_test_002','lead_test_002',92,'A','Excellent candidate with strong income and employment stability. Income-to-rent ratio is healthy at 3:1. No red flags identified in documents.','[]','approve','[]','gpt-4-vision-preview','2025-11-25 17:57:52','default');
INSERT INTO "lead_ai_evaluations" VALUES('eval_test_004','lead_test_004',78,'B','Good candidate with stable employment and acceptable income. Income-to-rent ratio meets minimum requirements. Some minor concerns noted.','[]','approve_with_conditions','[]','gpt-4-vision-preview','2025-11-25 17:57:52','default');
INSERT INTO "lead_ai_evaluations" VALUES('eval_test_006','lead_test_006',88,'A','Excellent candidate with strong income and employment stability. Income-to-rent ratio is healthy at 3:1. No red flags identified in documents.','[]','approve','[]','gpt-4-vision-preview','2025-11-25 17:57:52','default');
INSERT INTO "lead_ai_evaluations" VALUES('eval_test_007','lead_test_007',45,'D','Marginal candidate with concerns about income stability and employment verification. Income-to-rent ratio below recommended threshold.','["income_to_rent_ratio","employment_verification"]','reject','[]','gpt-4-vision-preview','2025-11-25 17:57:52','default');
INSERT INTO "lead_ai_evaluations" VALUES('eval_test_008','lead_test_008',82,'A','Excellent candidate with strong income and employment stability. Income-to-rent ratio is healthy at 3:1. No red flags identified in documents.','[]','approve','[]','gpt-4-vision-preview','2025-11-25 17:57:52','default');
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  lead_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  emergency_contact TEXT,
  emergency_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')), site_id TEXT NOT NULL DEFAULT 'default',
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);
INSERT INTO "tenants" VALUES('tenant_mihmi2zu2nwu1sy',NULL,'Sarah','Johnson','sarah.johnson@example.com','416-555-0101','Mike Johnson','416-555-0102','active','2025-11-27T16:03:32.394Z','2025-11-27T16:03:32.394Z','default');
INSERT INTO "tenants" VALUES('tenant_mihmi4uqm4ayozw',NULL,'Michael','Chen','michael.chen@example.com','416-555-0201','Lisa Chen','416-555-0202','active','2025-11-27T16:03:34.802Z','2025-11-27T16:03:34.802Z','default');
INSERT INTO "tenants" VALUES('tenant_mihmi6o4dwabsuw',NULL,'Emily','Rodriguez','emily.rodriguez@example.com','647-555-0301','Carlos Rodriguez','647-555-0302','moving_in','2025-11-27T16:03:37.156Z','2025-11-27T16:03:37.156Z','default');
INSERT INTO "tenants" VALUES('tenant_mihmi8hn1faomrn',NULL,'James','Thompson','james.thompson@example.com','647-555-0401','Jane Thompson','647-555-0402','lease_up','2025-11-27T16:03:39.515Z','2025-11-27T16:03:39.515Z','default');
INSERT INTO "tenants" VALUES('tenant_mihmia9fab75dps',NULL,'Olivia','Martinez','olivia.martinez@example.com','416-555-0501','Diego Martinez','416-555-0502','renewing','2025-11-27T16:03:41.811Z','2025-11-27T16:03:41.811Z','default');
INSERT INTO "tenants" VALUES('tenant_mihmibymwxdsafb',NULL,'David','Kim','david.kim@example.com','647-555-0601','Susan Kim','647-555-0602','moving_out','2025-11-27T16:03:44.014Z','2025-11-27T16:03:44.014Z','default');
INSERT INTO "tenants" VALUES('tenant_mihmidpicej30gc',NULL,'Sophia','Patel','sophia.patel@example.com','416-555-0701','Raj Patel','416-555-0702','active','2025-11-27T16:03:46.278Z','2025-11-27T16:03:46.278Z','default');
INSERT INTO "tenants" VALUES('tenant_mihmifngsiyyks0',NULL,'William','Brown','william.brown@example.com','647-555-0801','Mary Brown','647-555-0802','pending_n11','2025-11-27T16:03:48.796Z','2025-11-27T16:03:48.796Z','default');
CREATE TABLE leases (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  monthly_rent REAL NOT NULL,
  security_deposit REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  docusign_envelope_id TEXT,
  signed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')), unit_id TEXT REFERENCES units(id), site_id TEXT NOT NULL DEFAULT 'default',
  FOREIGN KEY (property_id) REFERENCES properties(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
INSERT INTO "leases" VALUES('lease_mihmi3w5ur6e5qy','prop_001','tenant_mihmi2zu2nwu1sy','2025-05-31T16:03:33.557Z','2026-05-26T16:03:33.557Z',2339,2339,'active',NULL,NULL,'2025-11-27T16:03:32.394Z','2025-11-27T16:03:32.394Z','unit_001','default');
INSERT INTO "leases" VALUES('lease_mihmi5rckxbkbpw','prop_002','tenant_mihmi4uqm4ayozw','2025-05-31T16:03:35.976Z','2026-05-26T16:03:35.976Z',1879,1879,'active',NULL,NULL,'2025-11-27T16:03:34.802Z','2025-11-27T16:03:34.802Z','unit_002','default');
INSERT INTO "leases" VALUES('lease_mihmi7jub3bqd6l','prop_003','tenant_mihmi6o4dwabsuw','2025-05-31T16:03:38.298Z','2026-05-26T16:03:38.298Z',1517,1517,'active',NULL,NULL,'2025-11-27T16:03:37.156Z','2025-11-27T16:03:37.156Z','unit_003a','default');
INSERT INTO "leases" VALUES('lease_mihmi9d2jlmdqbq','prop_003','tenant_mihmi8hn1faomrn','2025-05-31T16:03:40.646Z','2026-05-26T16:03:40.646Z',1690,1690,'active',NULL,NULL,'2025-11-27T16:03:39.515Z','2025-11-27T16:03:39.515Z','unit_003b','default');
INSERT INTO "leases" VALUES('lease_mihmib54nt6diu1','prop_003','tenant_mihmia9fab75dps','2025-05-31T16:03:42.952Z','2026-05-26T16:03:42.952Z',2171,2171,'active',NULL,NULL,'2025-11-27T16:03:41.811Z','2025-11-27T16:03:41.811Z','unit_003c','default');
INSERT INTO "leases" VALUES('lease_mihmicubiacjogv','prop_004','tenant_mihmibymwxdsafb','2025-05-31T16:03:45.155Z','2026-05-26T16:03:45.155Z',1823,1823,'active',NULL,NULL,'2025-11-27T16:03:44.014Z','2025-11-27T16:03:44.014Z','unit_004','default');
INSERT INTO "leases" VALUES('lease_mihmies48lmcfav','prop_005','tenant_mihmidpicej30gc','2025-05-31T16:03:47.668Z','2026-05-26T16:03:47.668Z',2409,2409,'active',NULL,NULL,'2025-11-27T16:03:46.278Z','2025-11-27T16:03:46.278Z','unit_005','default');
INSERT INTO "leases" VALUES('lease_mihmiging4nrmp0','prop_006','tenant_mihmifngsiyyks0','2025-05-31T16:03:49.919Z','2026-05-26T16:03:49.919Z',2316,2316,'active',NULL,NULL,'2025-11-27T16:03:48.796Z','2025-11-27T16:03:48.796Z','unit_006','default');
CREATE TABLE work_orders (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  tenant_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  scheduled_date TEXT,
  completed_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')), site_id TEXT NOT NULL DEFAULT 'default',
  FOREIGN KEY (property_id) REFERENCES properties(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
INSERT INTO "work_orders" VALUES('wo_mihmihf1dovr0fj','prop_001','tenant_mihmi2zu2nwu1sy','Leaking faucet in bathroom','Bathroom sink faucet has a slow leak that needs repair','plumbing','medium','open',NULL,NULL,NULL,NULL,'2025-11-27T16:03:51.085Z','2025-11-27T16:03:51.085Z','default');
INSERT INTO "work_orders" VALUES('wo_mihmii9v3n2qq93','prop_002','tenant_mihmi4uqm4ayozw','Broken window in bedroom','Bedroom window pane is cracked and needs replacement','structural','high','in_progress',NULL,NULL,NULL,NULL,'2025-11-27T16:03:52.195Z','2025-11-27T16:03:52.195Z','default');
INSERT INTO "work_orders" VALUES('wo_mihmij7r9kzkq5g','prop_003','tenant_mihmi6o4dwabsuw','HVAC not heating properly','Heating system not reaching set temperature','hvac','high','scheduled',NULL,NULL,NULL,NULL,'2025-11-27T16:03:53.415Z','2025-11-27T16:03:53.415Z','default');
INSERT INTO "work_orders" VALUES('wo_mihmik5fwoniotk','prop_003','tenant_mihmi8hn1faomrn','Refrigerator making noise','Kitchen refrigerator making unusual grinding noise','appliance','low','open',NULL,NULL,NULL,NULL,'2025-11-27T16:03:54.627Z','2025-11-27T16:03:54.627Z','default');
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
, site_id TEXT NOT NULL DEFAULT 'default', is_super_admin INTEGER NOT NULL DEFAULT 0, updated_at TEXT);
INSERT INTO "users" VALUES('user_admin','admin@leaselab.io','fc678c353cb774ba554562fdaa4e9afe66ca6c28430c469e6f7bb68b013eff4f','Admin User','admin','2025-11-24 22:50:56',NULL,'default',1,'2025-11-26 21:03:49');
INSERT INTO "users" VALUES('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d','dwx.realty@gmail.com','a96f73d5496928869fee28f6e6e8a67310519901bdf854ad8fe69451534193d2','DWX Realty','admin','2025-11-26 20:58:57',NULL,'default',0,'2025-11-26 20:58:57');
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS "properties" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  property_type TEXT NOT NULL DEFAULT 'single_family', -- single_family, multi_family, condo, townhouse, commercial
  description TEXT,
  year_built INTEGER,
  lot_size REAL,
  amenities TEXT DEFAULT '[]', -- JSON array
  latitude REAL,
  longitude REAL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
, site_id TEXT NOT NULL DEFAULT 'default');
INSERT INTO "properties" VALUES('prop_001','Harbourfront Villa','harbourfront-villa-prop001','123 Queens Quay East','Toronto','ON','M5A 1A1','single_family','Beautiful waterfront property with stunning harbour views. Recently renovated with modern finishes throughout.',NULL,NULL,'["Pool", "Lake View", "Private Terrace", "Parking"]',NULL,NULL,1,'2025-11-24 22:49:39','2025-11-24 22:49:39','default');
INSERT INTO "properties" VALUES('prop_002','Downtown King West Loft','downtown-king-west-loft-prop002','456 King Street West','Toronto','ON','M5V 1L7','condo','Modern loft in the heart of downtown Toronto. Walking distance to restaurants, shops, and entertainment.',NULL,NULL,'["Gym", "Rooftop Deck", "Concierge", "Parking"]',NULL,NULL,1,'2025-11-24 22:49:39','2025-11-24 22:49:39','default');
INSERT INTO "properties" VALUES('prop_003','Don Valley Apartments','don-valley-apartments-prop003','789 Don Mills Road','Toronto','ON','M3C 1V5','multi_family','Charming apartment complex near Don Valley with beautiful garden spaces and park access.',NULL,NULL,'["Garden", "Laundry", "Pet Friendly", "Bike Storage"]',NULL,NULL,1,'2025-11-24 22:49:39','2025-11-26T00:40:25.636Z','default');
INSERT INTO "properties" VALUES('prop_004','High Park House','high-park-house-prop004','321 Bloor Street West','Toronto','ON','M6P 1A7','single_family','Spacious family home near High Park with beautiful tree-lined views. Large backyard perfect for entertaining.',NULL,NULL,'["Park View", "Fireplace", "Deck", "2-Car Garage"]',NULL,NULL,1,'2025-11-24 22:49:39','2025-11-24 22:49:39','default');
INSERT INTO "properties" VALUES('prop_005','Yonge & Eglinton Studio','yonge-eglinton-studio-prop005','654 Yonge Street','Toronto','ON','M4Y 2A4','condo','Efficient studio apartment in prime midtown location. Perfect for young professionals with easy subway access.',NULL,NULL,'["Gym", "Security", "Transit Access"]',NULL,NULL,1,'2025-11-24 22:49:39','2025-11-24 22:49:39','default');
INSERT INTO "properties" VALUES('prop_006','Historic Cabbagetown Townhouse','historic-cabbagetown-townhouse-prop006','987 Parliament Street','Toronto','ON','M4X 1P8','townhouse','Beautifully restored historic Victorian townhouse with modern amenities. Original hardwood floors and architectural details preserved.',NULL,NULL,'["Historic", "Renovated", "Private Patio"]',NULL,NULL,0,'2025-11-24 22:49:39','2025-11-25T16:16:02.999Z','default');
CREATE TABLE units (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  unit_number TEXT NOT NULL, -- e.g., "101", "A", "Main" for whole house
  name TEXT, -- optional friendly name
  bedrooms INTEGER NOT NULL DEFAULT 1,
  bathrooms REAL NOT NULL DEFAULT 1,
  sqft INTEGER,
  rent_amount REAL NOT NULL,
  deposit_amount REAL,
  status TEXT NOT NULL DEFAULT 'available', -- available, occupied, maintenance, pending
  floor INTEGER,
  features TEXT DEFAULT '[]', -- JSON array
  available_date TEXT,
  current_tenant_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')), site_id TEXT NOT NULL DEFAULT 'default',
  FOREIGN KEY (property_id) REFERENCES "properties"(id) ON DELETE CASCADE,
  FOREIGN KEY (current_tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);
INSERT INTO "units" VALUES('unit_001','prop_001','Main','Harbourfront Villa',4,3,2800,5500,5500,'occupied',NULL,'["Lake View", "Master Suite", "Updated Kitchen", "Private Pool"]',NULL,NULL,1,'2025-11-24 22:49:39','2025-11-24 22:49:39','default');
INSERT INTO "units" VALUES('unit_002','prop_002','Main','Downtown King West Loft',2,2,1400,3200,3200,'occupied',NULL,'["High Ceilings", "Open Floor Plan", "City Views", "Stainless Appliances"]',NULL,NULL,1,'2025-11-24 22:49:39','2025-11-24 22:49:39','default');
INSERT INTO "units" VALUES('unit_003a','prop_003','1A','Garden View',1,1,650,1800,1800,'occupied',NULL,'["Ground Floor", "Patio Access", "Updated", "In-Suite Laundry"]',NULL,NULL,1,'2025-11-24 22:49:39','2025-11-24 22:49:39','default');
INSERT INTO "units" VALUES('unit_003b','prop_003','2B','Valley View',2,1.5,950,2400,2400,'occupied',NULL,'["Balcony", "Valley View", "In-Suite Laundry"]',NULL,NULL,1,'2025-11-24 22:49:39','2025-11-24 22:49:39','default');
INSERT INTO "units" VALUES('unit_003c','prop_003','3A','Top Floor',2,2,1100,2800,2800,'occupied',NULL,'["Top Floor", "In-Suite Laundry", "Updated Kitchen"]',NULL,NULL,1,'2025-11-24 22:49:39','2025-11-24 22:49:39','default');
INSERT INTO "units" VALUES('unit_004','prop_004','Main','High Park House',5,3.5,3200,4800,4800,'occupied',NULL,'["Park View", "Updated", "Large Yard", "Home Office"]',NULL,NULL,1,'2025-11-24 22:49:39','2025-11-24 22:49:39','default');
INSERT INTO "units" VALUES('unit_005','prop_005','Main','Yonge & Eglinton Studio',0,1,450,1600,1600,'occupied',NULL,'["Efficient Layout", "Murphy Bed", "Midtown Location"]',NULL,NULL,1,'2025-11-24 22:49:39','2025-11-24 22:49:39','default');
INSERT INTO "units" VALUES('unit_006','prop_006','Main','Historic Cabbagetown Townhouse',3,2.5,1800,3800,3800,'occupied',NULL,'["Historic", "Hardwood Floors", "Exposed Brick", "Victorian Details"]',NULL,NULL,1,'2025-11-24 22:49:39','2025-11-24 22:49:39','default');
CREATE TABLE unit_history (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- tenant_move_in, tenant_move_out, rent_change, status_change
  event_data TEXT, -- JSON with event details
  created_at TEXT NOT NULL DEFAULT (datetime('now')), site_id TEXT NOT NULL DEFAULT 'default',
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);
CREATE TABLE images (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'property' or 'unit'
  entity_id TEXT NOT NULL,
  r2_key TEXT NOT NULL, -- R2 object key
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  sort_order INTEGER DEFAULT 0,
  is_cover INTEGER DEFAULT 0,
  alt_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), site_id TEXT NOT NULL DEFAULT 'default',
  UNIQUE(entity_type, entity_id, r2_key)
);
INSERT INTO "images" VALUES('img_mifa2t9auyswc62','property','prop_003','default/property/prop_003/1764117611932-img_mifa2t245lqk7z6.jpeg','download.jpeg','image/jpeg',10093,NULL,NULL,0,1,NULL,'2025-11-26T00:40:12.190Z','default');
INSERT INTO "images" VALUES('img_mifa2xz1ijfkmzd','property','prop_003','default/property/prop_003/1764117618043-img_mifa2xrvgii5wyj.jpg','istockphoto-1026205392-612x612.jpg','image/jpeg',62145,NULL,NULL,0,0,NULL,'2025-11-26T00:40:18.301Z','default');
INSERT INTO "images" VALUES('img_mifa3lbthrn7lr4','property','prop_001','default/property/prop_001/1764117648221-img_mifa3l25x5cqky3.jpg','white-house-a-frame-section-c0a4a3b3-e722202f114e4aeea4370af6dbb4312b.jpg','image/jpeg',661121,NULL,NULL,0,1,NULL,'2025-11-26T00:40:48.569Z','default');
INSERT INTO "images" VALUES('img_mifa7bjidpztc0m','property','prop_002','default/property/prop_002/1764117822297-img_mifa7bdlz1qxria.jpeg','pexels-photo-106399.jpeg','image/jpeg',26738,NULL,NULL,0,1,NULL,'2025-11-26T00:43:42.510Z','default');
INSERT INTO "images" VALUES('img_mifa87a8cirny3n','property','prop_004','default/property/prop_004/1764117863387-img_mifa872ziv7940v.jpg','istockphoto-472018064-612x612.jpg','image/jpeg',56853,NULL,NULL,0,1,NULL,'2025-11-26T00:44:23.648Z','default');
INSERT INTO "images" VALUES('img_mifa8g7n1hfacmi','property','prop_005','default/property/prop_005/1764117874972-img_mifa8g0s3jsaqrb.jpg','istockphoto-175259322-612x612.jpg','image/jpeg',66368,NULL,NULL,0,1,NULL,'2025-11-26T00:44:35.219Z','default');
INSERT INTO "images" VALUES('img_mifa8yx6y5aj9fa','property','prop_006','default/property/prop_006/1764117899230-img_mifa8yqm4o5t1n4.jpg','istockphoto-184122800-612x612.jpg','image/jpeg',92409,NULL,NULL,0,1,NULL,'2025-11-26T00:44:59.466Z','default');
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" VALUES(1,'0000_reset.sql','2025-11-26 21:41:15');
INSERT INTO "d1_migrations" VALUES(2,'0001_init.sql','2025-11-26 21:41:16');
INSERT INTO "d1_migrations" VALUES(3,'0013_lead_notes_history.sql','2025-11-26 22:21:42');
CREATE TABLE site_api_tokens (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  expires_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "site_api_tokens" VALUES('token_412b8b4c5eb9d8e1','default','f22e0d97b9ab59197afa180c1bc9644eb434e6d4483fac162671c13d4126f161','Default site API token','2025-11-26T03:01:40.765Z','2025-11-26T06:09:59.158Z',NULL,1);
INSERT INTO "site_api_tokens" VALUES('token_4d19e63f83516331','default','1578d9b6c1a7f54a500d8cebc57735bba872b0a012bcba6451ff860fdbde5be4','Site Production Token','2025-11-26T03:50:11.275Z','2025-11-27T20:36:23.963Z',NULL,1);
CREATE TABLE lead_history (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT NOT NULL, 
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);
INSERT INTO "lead_history" VALUES('hist_3706c172c8ba85fca0e236803c3d1fcd','lead_test_001','default','legacy_income_migrated','{"monthlyIncome":5200.0,"migratedToNote":true}','2025-11-23 17:57:52');
INSERT INTO "lead_history" VALUES('hist_bbe47be6c5e61466b64889da46e2b640','lead_test_002','default','legacy_income_migrated','{"monthlyIncome":6800.0,"migratedToNote":true}','2025-11-21 17:57:52');
INSERT INTO "lead_history" VALUES('hist_061c0450786eb0bdbf0f94c50ccaaa67','lead_test_003','default','legacy_income_migrated','{"monthlyIncome":4500.0,"migratedToNote":true}','2025-11-25 17:57:52');
INSERT INTO "lead_history" VALUES('hist_c6f775b31b450f911b2c88f95d3714c2','lead_test_004','default','legacy_income_migrated','{"monthlyIncome":7200.0,"migratedToNote":true}','2025-11-24 17:57:52');
INSERT INTO "lead_history" VALUES('hist_e7b4d4488b6fc08114612de63cb5e0ce','lead_test_005','default','legacy_income_migrated','{"monthlyIncome":5800.0,"migratedToNote":true}','2025-11-22 17:57:52');
INSERT INTO "lead_history" VALUES('hist_6fd232ebdd158aed113e74c2ce1f8b84','lead_test_006','default','legacy_income_migrated','{"monthlyIncome":6200.0,"migratedToNote":true}','2025-11-20 17:57:52');
INSERT INTO "lead_history" VALUES('hist_890840d2ef5d7cd56028ca1937b908a6','lead_test_007','default','legacy_income_migrated','{"monthlyIncome":4800.0,"migratedToNote":true}','2025-11-18 17:57:52');
INSERT INTO "lead_history" VALUES('hist_48d46510cc812cfec5e92512d48b77e7','lead_test_008','default','legacy_income_migrated','{"monthlyIncome":5500.0,"migratedToNote":true}','2025-11-22 17:57:52');
INSERT INTO "lead_history" VALUES('lh_a84feb114195430e','lead_test_003','default','lead_updated','{"status":"documents_pending"}','2025-11-26 22:48:45');
INSERT INTO "lead_history" VALUES('lh_c8e964c77e8c4404','lead_test_003','default','lead_updated','{"status":"new"}','2025-11-26 22:48:49');
INSERT INTO "lead_history" VALUES('lh_5d0c918e86e24078','lead_test_005','default','lead_updated','{"status":"screening"}','2025-11-27 15:49:50');
INSERT INTO "lead_history" VALUES('lh_47f5378ad70a4627','lead_test_005','default','lead_updated','{"status":"ai_evaluated"}','2025-11-27 15:49:58');
INSERT INTO "lead_history" VALUES('lh_57ccb76afb4b44ac','lead_test_005','default','lead_updated','{"status":"documents_pending"}','2025-11-27 15:49:59');
INSERT INTO "lead_history" VALUES('lh_b4191051f4674222','lead_test_005','default','lead_updated','{"status":"new"}','2025-11-27 15:50:00');
INSERT INTO "lead_history" VALUES('lh_d600c36baafd41cf','lead_test_005','default','lead_updated','{"status":"new"}','2025-11-27 15:50:00');
INSERT INTO "lead_history" VALUES('lh_70b41a1f4fe64447','lead_test_005','default','lead_updated','{"status":"new"}','2025-11-27 15:50:00');
INSERT INTO "lead_history" VALUES('lh_810fb97638114d51','lead_test_005','default','lead_updated','{"status":"new"}','2025-11-27 15:50:00');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" VALUES('d1_migrations',3);
CREATE INDEX idx_user_access_user ON user_access(user_id);
CREATE INDEX idx_user_access_site ON user_access(site_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_ai_score ON leads(ai_score DESC);
CREATE INDEX idx_leads_property ON leads(property_id);
CREATE INDEX idx_lead_files_lead ON lead_files(lead_id);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_leases_status ON leases(status);
CREATE INDEX idx_leases_property ON leases(property_id);
CREATE INDEX idx_leases_tenant ON leases(tenant_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_property ON work_orders(property_id);
CREATE INDEX idx_work_orders_priority ON work_orders(priority);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_properties_slug ON properties(slug);
CREATE INDEX idx_properties_type ON properties(property_type);
CREATE INDEX idx_properties_active ON properties(is_active);
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_units_property ON units(property_id);
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_units_tenant ON units(current_tenant_id);
CREATE INDEX idx_units_active ON units(is_active);
CREATE INDEX idx_unit_history_unit ON unit_history(unit_id);
CREATE INDEX idx_unit_history_type ON unit_history(event_type);
CREATE INDEX idx_images_entity ON images(entity_type, entity_id);
CREATE INDEX idx_images_cover ON images(entity_type, entity_id, is_cover);
CREATE INDEX idx_leads_unit ON leads(unit_id);
CREATE INDEX idx_leases_unit ON leases(unit_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_properties_site ON properties(site_id);
CREATE INDEX idx_units_site ON units(site_id);
CREATE INDEX idx_unit_history_site ON unit_history(site_id);
CREATE INDEX idx_leads_site ON leads(site_id);
CREATE INDEX idx_lead_files_site ON lead_files(site_id);
CREATE INDEX idx_lead_ai_evaluations_site ON lead_ai_evaluations(site_id);
CREATE INDEX idx_tenants_site ON tenants(site_id);
CREATE INDEX idx_leases_site ON leases(site_id);
CREATE INDEX idx_work_orders_site ON work_orders(site_id);
CREATE INDEX idx_images_site ON images(site_id);
CREATE INDEX idx_users_site ON users(site_id);
CREATE INDEX idx_site_api_tokens_site_id ON site_api_tokens(site_id);
CREATE INDEX idx_site_api_tokens_token_hash ON site_api_tokens(token_hash);
CREATE INDEX idx_users_updated_at ON users(updated_at);
CREATE INDEX idx_lead_history_lead_id ON lead_history(lead_id);
CREATE INDEX idx_lead_history_site_id ON lead_history(site_id);
