/**
 * Generate Test Tenant Data
 *
 * This script creates test tenants with leases and work orders
 *
 * Usage:
 * npm run generate-test-tenants
 *
 * Or with npx:
 * npx tsx scripts/generate-test-tenants.ts
 */

import { generateId } from '../shared/utils';

interface Property {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
}

// Test tenant data
const testTenants = [
  {
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@example.com',
    phone: '416-555-0101',
    status: 'active',
    emergencyContact: 'Mike Johnson',
    emergencyPhone: '416-555-0102',
  },
  {
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@example.com',
    phone: '416-555-0201',
    status: 'active',
    emergencyContact: 'Lisa Chen',
    emergencyPhone: '416-555-0202',
  },
  {
    firstName: 'Emily',
    lastName: 'Rodriguez',
    email: 'emily.rodriguez@example.com',
    phone: '647-555-0301',
    status: 'moving_in',
    emergencyContact: 'Carlos Rodriguez',
    emergencyPhone: '647-555-0302',
  },
  {
    firstName: 'James',
    lastName: 'Thompson',
    email: 'james.thompson@example.com',
    phone: '647-555-0401',
    status: 'lease_up',
    emergencyContact: 'Jane Thompson',
    emergencyPhone: '647-555-0402',
  },
  {
    firstName: 'Olivia',
    lastName: 'Martinez',
    email: 'olivia.martinez@example.com',
    phone: '416-555-0501',
    status: 'renewing',
    emergencyContact: 'Diego Martinez',
    emergencyPhone: '416-555-0502',
  },
  {
    firstName: 'David',
    lastName: 'Kim',
    email: 'david.kim@example.com',
    phone: '647-555-0601',
    status: 'moving_out',
    emergencyContact: 'Susan Kim',
    emergencyPhone: '647-555-0602',
  },
  {
    firstName: 'Sophia',
    lastName: 'Patel',
    email: 'sophia.patel@example.com',
    phone: '416-555-0701',
    status: 'active',
    emergencyContact: 'Raj Patel',
    emergencyPhone: '416-555-0702',
  },
  {
    firstName: 'William',
    lastName: 'Brown',
    email: 'william.brown@example.com',
    phone: '647-555-0801',
    status: 'pending_n11',
    emergencyContact: 'Mary Brown',
    emergencyPhone: '647-555-0802',
  },
];

// Work order templates
const workOrderTemplates = [
  {
    title: 'Leaking faucet in bathroom',
    description: 'Bathroom sink faucet has a slow leak that needs repair',
    category: 'plumbing',
    priority: 'medium',
    status: 'open',
  },
  {
    title: 'Broken window in bedroom',
    description: 'Bedroom window pane is cracked and needs replacement',
    category: 'structural',
    priority: 'high',
    status: 'in_progress',
  },
  {
    title: 'HVAC not heating properly',
    description: 'Heating system not reaching set temperature',
    category: 'hvac',
    priority: 'high',
    status: 'scheduled',
  },
  {
    title: 'Refrigerator making noise',
    description: 'Kitchen refrigerator making unusual grinding noise',
    category: 'appliance',
    priority: 'low',
    status: 'open',
  },
];

async function main() {
  const DATABASE_ID = process.env.DATABASE_ID;
  const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
  const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

  if (!DATABASE_ID || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('Missing required environment variables:');
    console.error('DATABASE_ID, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN');
    process.exit(1);
  }

  const d1Url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

  // Helper function to execute D1 queries
  async function executeQuery(sql: string, params: unknown[] = []) {
    const response = await fetch(d1Url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    });

    if (!response.ok) {
      throw new Error(`D1 query failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result[0].results;
  }

  console.log('🔍 Fetching site ID...');
  const sites = await executeQuery('SELECT id, name FROM sites LIMIT 1');
  if (sites.length === 0) {
    console.error('❌ No sites found in database. Please create a site first.');
    process.exit(1);
  }
  const siteId = sites[0].id;
  console.log(`✅ Using site: ${sites[0].name} (${siteId})`);

  console.log('🔍 Fetching properties and units...');
  const properties: Property[] = await executeQuery(
    'SELECT id, name FROM properties WHERE site_id = ? AND is_active = 1',
    [siteId]
  );

  if (properties.length === 0) {
    console.error('❌ No properties found. Please create properties first.');
    process.exit(1);
  }

  console.log(`✅ Found ${properties.length} properties`);

  const units: Unit[] = await executeQuery(
    'SELECT id, property_id, unit_number FROM units WHERE site_id = ? AND is_active = 1',
    [siteId]
  );

  if (units.length === 0) {
    console.error('❌ No units found. Please create units first.');
    process.exit(1);
  }

  console.log(`✅ Found ${units.length} units`);

  // Create tenants
  console.log('\n📝 Creating test tenants...');
  const createdTenants: { id: string; propertyId: string; unitId: string }[] = [];

  for (let i = 0; i < testTenants.length && i < units.length; i++) {
    const tenant = testTenants[i];
    const unit = units[i];
    const tenantId = generateId('tenant');
    const now = new Date().toISOString();

    await executeQuery(
      `INSERT INTO tenants (id, site_id, first_name, last_name, email, phone, emergency_contact, emergency_phone, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        siteId,
        tenant.firstName,
        tenant.lastName,
        tenant.email,
        tenant.phone,
        tenant.emergencyContact,
        tenant.emergencyPhone,
        tenant.status,
        now,
        now,
      ]
    );

    // Create a lease for the tenant
    const leaseId = generateId('lease');
    const startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(); // 6 months ago
    const endDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(); // 6 months from now
    const monthlyRent = 1500 + Math.floor(Math.random() * 1000); // $1500-$2500

    await executeQuery(
      `INSERT INTO leases (id, site_id, property_id, unit_id, tenant_id, start_date, end_date, monthly_rent, security_deposit, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        leaseId,
        siteId,
        unit.property_id,
        unit.id,
        tenantId,
        startDate,
        endDate,
        monthlyRent,
        monthlyRent, // Security deposit = 1 month rent
        now,
        now,
      ]
    );

    createdTenants.push({
      id: tenantId,
      propertyId: unit.property_id,
      unitId: unit.id,
    });

    console.log(`✅ Created tenant: ${tenant.firstName} ${tenant.lastName} (Unit ${unit.unit_number})`);
  }

  // Create work orders for some tenants
  console.log('\n🔧 Creating test work orders...');
  const tenantsWithWorkOrders = createdTenants.slice(0, 4); // First 4 tenants get work orders

  for (let i = 0; i < tenantsWithWorkOrders.length; i++) {
    const tenant = tenantsWithWorkOrders[i];
    const workOrder = workOrderTemplates[i];
    const workOrderId = generateId('wo');
    const now = new Date().toISOString();

    await executeQuery(
      `INSERT INTO work_orders (id, site_id, property_id, tenant_id, title, description, category, priority, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        workOrderId,
        siteId,
        tenant.propertyId,
        tenant.id,
        workOrder.title,
        workOrder.description,
        workOrder.category,
        workOrder.priority,
        workOrder.status,
        now,
        now,
      ]
    );

    console.log(`✅ Created work order: ${workOrder.title} (${workOrder.status})`);
  }

  console.log('\n✨ Test data generation complete!');
  console.log(`📊 Summary:`);
  console.log(`   - ${createdTenants.length} tenants created`);
  console.log(`   - ${createdTenants.length} leases created`);
  console.log(`   - ${tenantsWithWorkOrders.length} work orders created`);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
