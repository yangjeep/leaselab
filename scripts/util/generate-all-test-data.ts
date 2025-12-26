/**
 * Generate Complete Test Data for LeaseLab Preview Database
 *
 * Creates a complete test environment with:
 * - Properties
 * - Leads (rental applications) including James Kim
 * - Lead files (documents)
 * - Sample data for testing AI evaluation
 *
 * Usage:
 * npx tsx scripts/util/generate-all-test-data.ts
 */

import { execFileSync } from 'child_process';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function executeD1Query(sql: string, useLocal: boolean = false): string {
  try {
    const args = ['wrangler', 'd1', 'execute', 'leaselab-db'];

    if (!useLocal) {
      args.push('--remote');
    } else {
      args.push('--local');
    }

    args.push('--command', sql);

    const result = execFileSync('npx', args, {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: 'apps/worker' // Run from apps/worker where wrangler.toml is
    });
    return result;
  } catch (error: any) {
    console.error('Error executing query:', error.message);
    throw error;
  }
}

function queryD1(sql: string, useLocal: boolean = false): any[] {
  try {
    const args = ['wrangler', 'd1', 'execute', 'leaselab-db'];

    if (!useLocal) {
      args.push('--remote');
    } else {
      args.push('--local');
    }

    args.push('--json', '--command', sql);

    const result = execFileSync('npx', args, {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: 'apps/worker'
    });
    const parsed = JSON.parse(result);
    return parsed[0]?.results || [];
  } catch (error: any) {
    console.error('Error querying:', error.message);
    return [];
  }
}

// Test properties
const testProperties = [
  {
    name: 'Maple View Apartments',
    slug: 'maple-view-apartments',
    address: '123 Main St',
    city: 'Toronto',
    province: 'ON',
    postalCode: 'M5V 1A1',
    propertyType: 'apartment',
    description: 'Modern apartment building with great amenities',
  },
  {
    name: 'Oak Ridge Townhomes',
    slug: 'oak-ridge-townhomes',
    address: '456 Oak Rd',
    city: 'Mississauga',
    province: 'ON',
    postalCode: 'L5B 2G3',
    propertyType: 'townhouse',
    description: 'Family-friendly townhomes in quiet neighborhood',
  },
  {
    name: 'Downtown Lofts',
    slug: 'downtown-lofts',
    address: '789 King St W',
    city: 'Toronto',
    province: 'ON',
    postalCode: 'M5V 3K7',
    propertyType: 'condo',
    description: 'Luxury lofts in the heart of downtown',
  },
];

// Test leads - rental applications
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
    message: 'Looking for a quiet place close to work. Non-smoker, no pets. Have stable employment at tech company.',
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
    message: 'Graduate student with stable income. References available. Looking for 1-year lease.',
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
    message: 'Part-time nurse, stable employment for 3 years. Excellent references.',
  },
  {
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@example.com',
    phone: '416-555-1005',
    employmentStatus: 'employed_full_time',
    moveInDate: '2025-01-20',
    status: 'documents_received',
    currentAddress: '654 Cedar Ln, Toronto, ON',
    message: 'Software engineer at Google. Excellent credit score, income verification available.',
  },
  {
    firstName: 'Emily',
    lastName: 'Rodriguez',
    email: 'emily.rodriguez@example.com',
    phone: '647-555-1006',
    employmentStatus: 'employed_full_time',
    moveInDate: '2025-02-10',
    status: 'new',
    currentAddress: '987 Birch Ave, Toronto, ON',
    message: 'Marketing manager, relocating from Vancouver. Clean rental history.',
  },
];

async function main() {
  const siteId = 'default';
  const useLocal = process.argv.includes('--local');
  const dbLabel = useLocal ? 'LOCAL' : 'REMOTE (Production)';

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🏗️  LeaseLab Test Data Generator`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📊 Database: ${dbLabel}`);
  console.log(`🏢 Site ID: ${siteId}`);
  console.log(`${'='.repeat(60)}\n`);

  // Step 1: Create Properties
  console.log('🏘️  Step 1: Creating Properties...\n');
  const createdProperties: Array<{ id: string; name: string }> = [];

  for (const property of testProperties) {
    const propertyId = generateId('prop');
    const now = new Date().toISOString();

    try {
      executeD1Query(
        `INSERT INTO properties (
          id, site_id, name, slug, address, city, province, postal_code,
          property_type, description, is_active, created_at, updated_at
        ) VALUES (
          '${propertyId}', '${siteId}', '${property.name}', '${property.slug}',
          '${property.address}', '${property.city}', '${property.province}', '${property.postalCode}',
          '${property.propertyType}', '${property.description}', 1, '${now}', '${now}'
        )`,
        useLocal
      );

      createdProperties.push({ id: propertyId, name: property.name });
      console.log(`   ✅ ${property.name}`);
      console.log(`      📍 ${property.address}, ${property.city}`);
      console.log(`      🆔 ${propertyId}\n`);
    } catch (error) {
      console.error(`   ❌ Failed to create ${property.name}`);
    }
  }

  console.log(`✅ Created ${createdProperties.length}/${testProperties.length} properties\n`);

  // Step 2: Create Leads
  console.log('📝 Step 2: Creating Leads (Rental Applications)...\n');
  const createdLeads: Array<{ id: string; firstName: string; lastName: string }> = [];

  for (let i = 0; i < testLeads.length; i++) {
    const lead = testLeads[i];
    const property = createdProperties[i % createdProperties.length];
    const leadId = lead.firstName === 'James' && lead.lastName === 'Kim'
      ? 'lead_james_kim'
      : generateId('lead');
    const now = new Date().toISOString();

    try {
      executeD1Query(
        `INSERT INTO leads (
          id, site_id, property_id, first_name, last_name, email, phone,
          employment_status, move_in_date, status, current_address, message,
          is_active, created_at, updated_at
        ) VALUES (
          '${leadId}', '${siteId}', '${property.id}', '${lead.firstName}', '${lead.lastName}',
          '${lead.email}', '${lead.phone}', '${lead.employmentStatus}', '${lead.moveInDate}',
          '${lead.status}', '${lead.currentAddress}', '${lead.message}',
          1, '${now}', '${now}'
        )`,
        useLocal
      );

      createdLeads.push({ id: leadId, firstName: lead.firstName, lastName: lead.lastName });
      console.log(`   ✅ ${lead.firstName} ${lead.lastName} (${lead.status})`);
      console.log(`      📧 ${lead.email}`);
      console.log(`      🏢 Property: ${property.name}`);
      console.log(`      🆔 ${leadId}`);
      console.log(`      🔗 /admin/leads/${leadId}\n`);
    } catch (error: any) {
      console.error(`   ❌ Failed to create ${lead.firstName} ${lead.lastName}: ${error.message}`);
    }
  }

  console.log(`✅ Created ${createdLeads.length}/${testLeads.length} leads\n`);

  // Step 3: Create Lead History Events
  console.log('📜 Step 3: Creating Lead History Events...\n');
  let historyCount = 0;

  for (const lead of createdLeads) {
    const historyId = generateId('hist');
    const now = new Date().toISOString();

    try {
      executeD1Query(
        `INSERT INTO lead_history (id, site_id, lead_id, event_type, event_data, created_at)
         VALUES (
           '${historyId}', '${siteId}', '${lead.id}', 'status_changed',
           '{"from":"new","to":"application_submitted","note":"Application received"}', '${now}'
         )`,
        useLocal
      );
      historyCount++;
    } catch (error) {
      // Table might not exist, that's okay
    }
  }

  if (historyCount > 0) {
    console.log(`✅ Created ${historyCount} history events\n`);
  } else {
    console.log(`⚠️  Lead history table not available (skipped)\n`);
  }

  // Summary
  console.log(`${'='.repeat(60)}`);
  console.log('🎉 Test Data Generation Complete!');
  console.log(`${'='.repeat(60)}`);
  console.log(`\n📊 Summary:`);
  console.log(`   🏘️  Properties: ${createdProperties.length}`);
  console.log(`   📝 Leads: ${createdLeads.length}`);
  console.log(`   📜 History Events: ${historyCount}`);
  console.log(`\n🔍 Quick Access:`);
  console.log(`   📋 All Leads: http://localhost:5173/admin/leads`);
  console.log(`   👤 James Kim: http://localhost:5173/admin/leads/lead_james_kim`);

  if (createdLeads.length > 1) {
    console.log(`   👤 ${createdLeads[1].firstName} ${createdLeads[1].lastName}: http://localhost:5173/admin/leads/${createdLeads[1].id}`);
  }

  console.log(`\n💡 Next Steps:`);
  console.log(`   1. Start the dev server: npm run dev`);
  console.log(`   2. Visit http://localhost:5173/admin/leads`);
  console.log(`   3. Test AI Evaluation on James Kim's application`);
  console.log(`\n${'='.repeat(60)}\n`);
}

main().catch((error) => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});
