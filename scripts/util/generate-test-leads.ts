/**
 * Generate Test Lead (Rental Application) Data
 *
 * Creates test rental applications with various statuses for testing the AI evaluation feature
 *
 * Usage:
 * npx tsx scripts/util/generate-test-leads.ts
 */

import { execFileSync } from 'child_process';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Test lead data - rental applications
const testLeads = [
  {
    firstName: 'James',
    lastName: 'Kim',
    email: 'james.kim@example.com',
    phone: '416-555-1001',
    employmentStatus: 'employed_full_time',
    moveInDate: '2025-02-01',
    status: 'documents_received',
    currentAddress: '123 Oak St, Toronto, ON',
    message: 'Looking for a quiet place close to work. Non-smoker, no pets.',
  },
  {
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria.garcia@example.com',
    phone: '647-555-1002',
    employmentStatus: 'employed_full_time',
    moveInDate: '2025-01-15',
    status: 'documents_received',
    currentAddress: '456 Maple Ave, Toronto, ON',
    message: 'Graduate student with stable income. References available.',
  },
  {
    firstName: 'Alex',
    lastName: 'Johnson',
    email: 'alex.johnson@example.com',
    phone: '416-555-1003',
    employmentStatus: 'self_employed',
    moveInDate: '2025-02-15',
    status: 'new',
    currentAddress: '789 Elm St, Mississauga, ON',
    message: 'Freelance software developer. Can provide tax returns and bank statements.',
  },
  {
    firstName: 'Sarah',
    lastName: 'Lee',
    email: 'sarah.lee@example.com',
    phone: '647-555-1004',
    employmentStatus: 'employed_part_time',
    moveInDate: '2025-03-01',
    status: 'application_submitted',
    currentAddress: '321 Pine Rd, Brampton, ON',
    message: 'Part-time nurse, stable employment for 3 years.',
  },
  {
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@example.com',
    phone: '416-555-1005',
    employmentStatus: 'employed_full_time',
    moveInDate: '2025-01-20',
    status: 'ai_evaluated',
    currentAddress: '654 Cedar Ln, Toronto, ON',
    message: 'Software engineer at Google. Excellent credit score.',
  },
];

function executeD1Query(sql: string): string {
  try {
    const result = execFileSync(
      'npx',
      ['wrangler', 'd1', 'execute', 'leaselab-db', '--remote', '--command', sql],
      {
        encoding: 'utf-8',
        stdio: 'pipe',
        cwd: process.cwd()
      }
    );
    return result;
  } catch (error: any) {
    console.error('Error executing query:', error.stderr || error.message);
    throw error;
  }
}

function queryD1(sql: string): any[] {
  try {
    const result = execFileSync(
      'npx',
      ['wrangler', 'd1', 'execute', 'leaselab-db', '--remote', '--json', '--command', sql],
      {
        encoding: 'utf-8',
        stdio: 'pipe',
        cwd: process.cwd()
      }
    );
    const parsed = JSON.parse(result);
    return parsed[0]?.results || [];
  } catch (error: any) {
    console.error('Error querying:', error.stderr || error.message);
    return [];
  }
}

async function main() {
  const siteId = 'default';
  console.log(`✅ Using site ID: ${siteId}`);

  console.log('🔍 Fetching properties...');
  const properties = queryD1(`SELECT id, name FROM properties WHERE site_id = '${siteId}' AND is_active = 1 LIMIT 5`);

  let propertyId = null;
  if (properties.length > 0) {
    propertyId = properties[0].id;
    console.log(`✅ Found ${properties.length} properties, using: ${properties[0].name}`);
  } else {
    console.log(`⚠️  No properties found - leads will be created without property assignment`);
  }

  // Create leads
  console.log('\n📝 Creating test leads (rental applications)...');
  const createdLeads: string[] = [];

  for (let i = 0; i < testLeads.length; i++) {
    const lead = testLeads[i];
    const leadId = generateId('lead');
    const now = new Date().toISOString();

    try {
      // Create lead with or without property_id
      const propertyField = propertyId ? `property_id,` : '';
      const propertyValue = propertyId ? `'${propertyId}',` : '';

      executeD1Query(
        `INSERT INTO leads (
          id, site_id, ${propertyField} first_name, last_name, email, phone,
          employment_status, move_in_date, status, current_address, message,
          is_active, created_at, updated_at
        ) VALUES (
          '${leadId}', '${siteId}', ${propertyValue} '${lead.firstName}', '${lead.lastName}',
          '${lead.email}', '${lead.phone}', '${lead.employmentStatus}', '${lead.moveInDate}',
          '${lead.status}', '${lead.currentAddress}', '${lead.message}',
          1, '${now}', '${now}'
        )`
      );

      createdLeads.push(leadId);
      console.log(`✅ Created lead: ${lead.firstName} ${lead.lastName} (${lead.status})`);
      console.log(`   📍 Lead ID: ${leadId}`);
      console.log(`   🔗 URL: /admin/leads/${leadId}`);
    } catch (error) {
      console.error(`❌ Failed to create lead for ${lead.firstName} ${lead.lastName}:`, error);
    }
  }

  // Create a history event for each lead
  console.log('\n📜 Creating history events...');
  for (const leadId of createdLeads) {
    const historyId = generateId('hist');
    const now = new Date().toISOString();

    try {
      executeD1Query(
        `INSERT INTO lead_history (id, site_id, lead_id, event_type, event_data, created_at)
         VALUES ('${historyId}', '${siteId}', '${leadId}', 'status_changed', '{"from":"new","to":"application_submitted"}', '${now}')`
      );
    } catch (error) {
      console.log(`   ⚠️  Could not create history for ${leadId} (table may not exist)`);
    }
  }

  console.log('\n✨ Test lead generation complete!');
  console.log(`📊 Summary:`);
  console.log(`   - ${createdLeads.length} leads created`);
  console.log(`\n🔍 Test the leads:`);
  console.log(`   - List view: http://localhost:5173/admin/leads`);
  console.log(`   - First lead: http://localhost:5173/admin/leads/${createdLeads[0]}`);
  console.log(`\n💡 Lead statuses:`);
  testLeads.forEach((lead, i) => {
    if (createdLeads[i]) {
      console.log(`   - ${lead.firstName} ${lead.lastName}: ${lead.status}`);
    }
  });
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
