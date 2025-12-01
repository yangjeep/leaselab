import { normalizeDb } from './helpers';
export async function getUserByEmail(dbInput, siteId, email) {
    const db = normalizeDb(dbInput);
    // Note: We don't filter by site_id here - users should be able to login from any domain
    // Their assigned site_id determines what data they can access
    const result = await db.queryOne('SELECT id, email, name, role, password_hash, site_id, is_super_admin, created_at FROM users WHERE email = ?', [email]);
    if (!result)
        return null;
    const row = result;
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        passwordHash: row.password_hash,
        siteId: row.site_id,
        isSuperAdmin: Boolean(row.is_super_admin),
        createdAt: row.created_at,
        updatedAt: row.created_at,
    };
}
export async function getUserById(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    // Note: We don't filter by site_id here - users should be able to login from any domain
    // Their assigned site_id determines what data they can access
    const result = await db.queryOne('SELECT id, email, name, role, password_hash, site_id, is_super_admin, created_at FROM users WHERE id = ?', [id]);
    if (!result)
        return null;
    const row = result;
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        passwordHash: row.password_hash,
        siteId: row.site_id,
        isSuperAdmin: Boolean(row.is_super_admin),
        createdAt: row.created_at,
        updatedAt: row.created_at,
    };
}
export async function getUsers(dbInput) {
    const db = normalizeDb(dbInput);
    const results = await db.query(`
    SELECT id, email, name, role, password_hash, site_id, is_super_admin, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
  `);
    return results.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        passwordHash: row.password_hash,
        siteId: row.site_id,
        isSuperAdmin: Boolean(row.is_super_admin),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }));
}
export async function createUser(dbInput, data) {
    const db = normalizeDb(dbInput);
    // Check if user with this email already exists
    const existingUser = await db.queryOne('SELECT id FROM users WHERE email = ?', [data.email]);
    if (existingUser) {
        throw new Error('A user with this email already exists');
    }
    const id = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();
    await db.execute(`INSERT INTO users (id, email, name, password_hash, role, site_id, is_super_admin, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        id,
        data.email,
        data.name,
        data.passwordHash,
        data.role,
        data.siteId,
        data.isSuperAdmin ? 1 : 0,
        now,
        now,
    ]);
    return {
        id,
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        role: data.role,
        siteId: data.siteId,
        isSuperAdmin: data.isSuperAdmin || false,
        createdAt: now,
        updatedAt: now,
    };
}
export async function updateUserPassword(dbInput, siteId, userId, passwordHash) {
    const db = normalizeDb(dbInput);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ? AND site_id = ?', [passwordHash, userId, siteId]);
}
export async function updateUserProfile(dbInput, siteId, userId, data) {
    const db = normalizeDb(dbInput);
    // If email is being updated, check for uniqueness
    if (data.email) {
        const existingUser = await db.queryOne('SELECT id FROM users WHERE email = ? AND id != ? AND site_id = ?', [data.email, userId, siteId]);
        if (existingUser) {
            throw new Error('Email already in use by another account');
        }
    }
    const updates = [];
    const params = [];
    if (data.name !== undefined) {
        updates.push('name = ?');
        params.push(data.name);
    }
    if (data.email !== undefined) {
        updates.push('email = ?');
        params.push(data.email);
    }
    if (updates.length === 0)
        return;
    params.push(userId);
    await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);
}
export async function updateUserRole(dbInput, siteId, userId, role) {
    const db = normalizeDb(dbInput);
    // Enforce site isolation - only allow role updates for users in the requesting site
    await db.execute('UPDATE users SET role = ? WHERE id = ? AND site_id = ?', [role, userId, siteId]);
}
/**
 * Get site access records for a user
 */
export async function getUserSiteAccess(dbInput, userId) {
    const db = normalizeDb(dbInput);
    const results = await db.query(`SELECT site_id as siteId, role, granted_at as grantedAt
     FROM user_access
     WHERE user_id = ?`, [userId]);
    return results;
}
/**
 * Get all accessible sites for a user (including via super admin status or direct access)
 */
export async function getUserAccessibleSites(dbInput, userId) {
    const db = normalizeDb(dbInput);
    // Check if user is super admin
    const user = await db.queryOne(`SELECT is_super_admin FROM users WHERE id = ?`, [userId]);
    if (user?.is_super_admin) {
        // Super admins have access to all sites
        // There is no dedicated sites table in the current schema.
        // Use active site API tokens to enumerate available site IDs.
        const allSites = await db.query(`SELECT DISTINCT site_id FROM site_api_tokens WHERE is_active = 1`);
        return allSites.map(site => ({
            siteId: site.site_id,
            role: 'super_admin',
            grantedAt: new Date().toISOString() // Dynamic access
        }));
    }
    // Return user's explicitly granted site access
    const access = await db.query(`SELECT site_id as siteId, role, granted_at as grantedAt
     FROM user_access
     WHERE user_id = ?`, [userId]);
    return access;
}
/**
 * Check if a user has access to a specific site
 */
export async function userHasAccessToSite(dbInput, userId, siteId) {
    const db = normalizeDb(dbInput);
    // Check super admin status
    const user = await db.queryOne(`SELECT is_super_admin FROM users WHERE id = ?`, [userId]);
    if (user?.is_super_admin) {
        return true;
    }
    // Check direct site access
    const access = await db.queryOne(`SELECT 1 FROM user_access WHERE user_id = ? AND site_id = ?`, [userId, siteId]);
    return Boolean(access);
}
/**
 * Grant site access to a user
 */
export async function grantSiteAccess(dbInput, userId, siteId, role = 'admin', grantedBy) {
    const db = normalizeDb(dbInput);
    // Check if access already exists
    const existing = await db.queryOne(`SELECT 1 FROM user_access WHERE user_id = ? AND site_id = ?`, [userId, siteId]);
    if (existing) {
        // Update existing access
        await db.execute(`UPDATE user_access SET role = ? WHERE user_id = ? AND site_id = ?`, [role, userId, siteId]);
    }
    else {
        // Insert new access
        const id = `ua_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
        await db.execute(`INSERT INTO user_access (id, user_id, site_id, role, granted_by, created_at, granted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, userId, siteId, role, grantedBy || null, new Date().toISOString(), new Date().toISOString()]);
    }
}
/**
 * Revoke site access from a user
 */
export async function revokeSiteAccess(dbInput, userId, siteId) {
    const db = normalizeDb(dbInput);
    await db.execute(`DELETE FROM user_access
     WHERE user_id = ? AND site_id = ?`, [userId, siteId]);
}
/**
 * Check if a user is a super admin
 */
export async function isUserSuperAdmin(dbInput, userId) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne(`SELECT is_super_admin
     FROM users
     WHERE id = ?`, [userId]);
    return Boolean(result?.is_super_admin);
}
/**
 * Set/unset super admin status for a user
 */
export async function setSuperAdminStatus(dbInput, userId, isSuperAdmin) {
    const db = normalizeDb(dbInput);
    await db.execute(`UPDATE users
     SET is_super_admin = ?
     WHERE id = ?`, [isSuperAdmin ? 1 : 0, userId]);
}
