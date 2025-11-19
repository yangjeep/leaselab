#!/usr/bin/env node

/**
 * Hash password using the same algorithm as auth.server.ts
 * Usage: node scripts/hash-password.js <password>
 */

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/hash-password.js <password>');
  process.exit(1);
}

hashPassword(password).then(hash => {
  console.log('\nPassword Hash:');
  console.log(hash);
  console.log('\nSQL to insert admin user:');
  console.log(`INSERT INTO users (id, email, password_hash, name, role, created_at)`);
  console.log(`VALUES ('user_admin', 'admin@leaselab.io', '${hash}', 'Admin', 'admin', datetime('now'));`);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
