-- Migration: Add Test Rental Applications
-- Adds sample rental application data for testing

-- Insert sample leads (rental applications)
INSERT INTO leads (
  id, site_id, property_id, unit_id, first_name, last_name, email, phone,
  current_address, employment_status, monthly_income, move_in_date, message,
  status, ai_score, ai_label, created_at, updated_at
) VALUES
  (
    'lead_test_001',
    'default',
    (SELECT id FROM properties LIMIT 1),
    (SELECT id FROM units LIMIT 1),
    'Sarah',
    'Anderson',
    'sarah.anderson@example.com',
    '+1-416-555-0101',
    '123 Maple Street, Toronto, ON M5V 1A1',
    'employed',
    5200.00,
    date('now', '+7 days'),
    'Looking for a quiet place close to work. Non-smoker, no pets.',
    'ai_evaluated',
    85,
    'A',
    datetime('now', '-3 days'),
    datetime('now', '-3 days')
  ),
  (
    'lead_test_002',
    'default',
    (SELECT id FROM properties LIMIT 1 OFFSET 1),
    (SELECT id FROM units LIMIT 1 OFFSET 1),
    'Michael',
    'Chen',
    'michael.chen@example.com',
    '+1-647-555-0202',
    '456 Oak Avenue, Mississauga, ON L5B 2C3',
    'employed',
    6800.00,
    date('now', '+14 days'),
    'Software engineer relocating to Toronto. Clean, responsible tenant.',
    'approved',
    92,
    'A',
    datetime('now', '-5 days'),
    datetime('now', '-1 day')
  ),
  (
    'lead_test_003',
    'default',
    (SELECT id FROM properties LIMIT 1),
    (SELECT id FROM units LIMIT 1),
    'Jennifer',
    'Taylor',
    'jennifer.taylor@example.com',
    '+1-416-555-0303',
    '789 Pine Road, Toronto, ON M4S 1E5',
    'employed',
    4500.00,
    date('now', '+10 days'),
    'Recent graduate starting new job. First time renting.',
    'new',
    NULL,
    NULL,
    datetime('now', '-1 day'),
    datetime('now', '-1 day')
  ),
  (
    'lead_test_004',
    'default',
    (SELECT id FROM properties LIMIT 1 OFFSET 2),
    (SELECT id FROM units LIMIT 1 OFFSET 2),
    'David',
    'Patel',
    'david.patel@example.com',
    '+1-905-555-0404',
    '321 Elm Street, Brampton, ON L6T 3G7',
    'self_employed',
    7200.00,
    date('now', '+21 days'),
    'Business consultant. Excellent references available.',
    'ai_evaluated',
    78,
    'B',
    datetime('now', '-2 days'),
    datetime('now', '-2 days')
  ),
  (
    'lead_test_005',
    'default',
    (SELECT id FROM properties LIMIT 1),
    (SELECT id FROM units LIMIT 1),
    'Emily',
    'Rodriguez',
    'emily.rodriguez@example.com',
    '+1-416-555-0505',
    '654 Birch Lane, Toronto, ON M2N 4H9',
    'employed',
    5800.00,
    date('now', '+30 days'),
    'Nurse at Toronto General Hospital. Quiet and responsible.',
    'documents_pending',
    NULL,
    NULL,
    datetime('now', '-4 days'),
    datetime('now', '-4 days')
  ),
  (
    'lead_test_006',
    'default',
    (SELECT id FROM properties LIMIT 1 OFFSET 1),
    (SELECT id FROM units LIMIT 1 OFFSET 1),
    'James',
    'Wilson',
    'james.wilson@example.com',
    '+1-647-555-0606',
    '987 Cedar Court, Markham, ON L3R 5J1',
    'employed',
    6200.00,
    date('now', '+15 days'),
    'Teacher with stable income. Non-smoker.',
    'ai_evaluated',
    88,
    'A',
    datetime('now', '-6 days'),
    datetime('now', '-6 days')
  ),
  (
    'lead_test_007',
    'default',
    (SELECT id FROM properties LIMIT 1),
    (SELECT id FROM units LIMIT 1),
    'Lisa',
    'Kumar',
    'lisa.kumar@example.com',
    '+1-416-555-0707',
    '147 Willow Way, Toronto, ON M1P 2K4',
    'employed',
    4800.00,
    date('now', '+20 days'),
    'College student working part-time.',
    'rejected',
    45,
    'D',
    datetime('now', '-8 days'),
    datetime('now', '-3 days')
  ),
  (
    'lead_test_008',
    'default',
    (SELECT id FROM properties LIMIT 1 OFFSET 2),
    (SELECT id FROM units LIMIT 1 OFFSET 2),
    'Robert',
    'Nguyen',
    'robert.nguyen@example.com',
    '+1-905-555-0808',
    '258 Spruce Street, Vaughan, ON L4L 1M6',
    'employed',
    5500.00,
    date('now', '+12 days'),
    'Accountant with 5 years experience. Excellent credit history.',
    'ai_evaluated',
    82,
    'A',
    datetime('now', '-4 days'),
    datetime('now', '-4 days')
  );

-- Add some AI evaluation results for evaluated applications
INSERT INTO lead_ai_evaluations (
  id, lead_id, score, label, summary, risk_flags, recommendation, fraud_signals, model_version, evaluated_at
)
SELECT
  'eval_' || substr(id, 6),
  id,
  ai_score,
  ai_label,
  CASE
    WHEN ai_score >= 80 THEN 'Excellent candidate with strong income and employment stability. Income-to-rent ratio is healthy at 3:1. No red flags identified in documents.'
    WHEN ai_score >= 60 THEN 'Good candidate with stable employment and acceptable income. Income-to-rent ratio meets minimum requirements. Some minor concerns noted.'
    ELSE 'Marginal candidate with concerns about income stability and employment verification. Income-to-rent ratio below recommended threshold.'
  END,
  CASE
    WHEN ai_score < 60 THEN '["income_to_rent_ratio","employment_verification"]'
    ELSE '[]'
  END,
  CASE
    WHEN ai_score >= 80 THEN 'approve'
    WHEN ai_score >= 60 THEN 'approve_with_conditions'
    ELSE 'reject'
  END,
  '[]',
  'gpt-4-vision-preview',
  datetime('now', '-1 day')
FROM leads
WHERE ai_score IS NOT NULL AND id LIKE 'lead_test_%';
