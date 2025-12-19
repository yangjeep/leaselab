/**
 * Generate Test Tenant Data using Wrangler D1
 *
 * This script creates test tenants with leases and work orders
 * using wrangler d1 execute commands
 *
 * Usage:
 * npx tsx scripts/generate-test-tenants-wrangler.ts
 */

import { execFileSync } from 'child_process';
import { generateId } from '../shared/utils/index.js';

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

function executeD1Query(sql: string): string {
  try {
    // Use execFileSync to avoid shell escaping issues
    const result = execFileSync(
      'npx',
      ['wrangler', 'd1', 'execute', 'leaselab-db', '--remote', '--command', sql],
      {
        encoding: 'utf-8',
        stdio: 'pipe',
        cwd: 'apps/ops' // Run from apps/ops directory
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
        cwd: 'apps/ops'
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
  // Use default site_id
  const siteId = 'default';
  console.log(`✅ Using site ID: ${siteId}`);

  console.log('🔍 Fetching properties and units...');
  const properties = queryD1(`SELECT id, name FROM properties WHERE site_id = '${siteId}' AND is_active = 1`);

  if (properties.length === 0) {
    console.error('❌ No properties found. Please create properties first.');
    process.exit(1);
  }

  console.log(`✅ Found ${properties.length} properties`);

  const units = queryD1(`SELECT id, property_id, unit_number FROM units WHERE site_id = '${siteId}' AND is_active = 1`);

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

    executeD1Query(
      `INSERT INTO tenants (id, site_id, first_name, last_name, email, phone, emergency_contact, emergency_phone, status, created_at, updated_at) VALUES ('${tenantId}', '${siteId}', '${tenant.firstName}', '${tenant.lastName}', '${tenant.email}', '${tenant.phone}', '${tenant.emergencyContact}', '${tenant.emergencyPhone}', '${tenant.status}', '${now}', '${now}')`
    );

    // Create a lease for the tenant
    const leaseId = generateId('lease');
    const startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
    const monthlyRent = 1500 + Math.floor(Math.random() * 1000);

    executeD1Query(
      `INSERT INTO leases (id, site_id, property_id, unit_id, tenant_id, start_date, end_date, monthly_rent, security_deposit, status, created_at, updated_at) VALUES ('${leaseId}', '${siteId}', '${unit.property_id}', '${unit.id}', '${tenantId}', '${startDate}', '${endDate}', ${monthlyRent}, ${monthlyRent}, 'active', '${now}', '${now}')`
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
  const tenantsWithWorkOrders = createdTenants.slice(0, 4);

  for (let i = 0; i < tenantsWithWorkOrders.length; i++) {
    const tenant = tenantsWithWorkOrders[i];
    const workOrder = workOrderTemplates[i];
    const workOrderId = generateId('wo');
    const now = new Date().toISOString();

    executeD1Query(
      `INSERT INTO work_orders (id, site_id, property_id, tenant_id, title, description, category, priority, status, created_at, updated_at) VALUES ('${workOrderId}', '${siteId}', '${tenant.propertyId}', '${tenant.id}', '${workOrder.title}', '${workOrder.description}', '${workOrder.category}', '${workOrder.priority}', '${workOrder.status}', '${now}', '${now}')`
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
