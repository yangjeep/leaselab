import { generateId } from '@leaselab/shared-utils';
// Helper to normalize database input to IDatabase interface
function normalizeDb(db) {
    // Check if it's already an IDatabase (has query method)
    if ('query' in db && typeof db.query === 'function') {
        return db;
    }
    // It's a D1Database, wrap it
    const d1 = db;
    return {
        async query(sql, params) {
            const stmt = d1.prepare(sql);
            const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
            const result = await bound.all();
            return result.results;
        },
        async queryOne(sql, params) {
            const stmt = d1.prepare(sql);
            const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
            const result = await bound.first();
            return result ?? null;
        },
        async execute(sql, params) {
            const stmt = d1.prepare(sql);
            const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
            const result = await bound.run();
            return {
                success: result.success,
                changes: result.meta.changes,
                lastRowId: result.meta.last_row_id,
            };
        },
        async transaction(fn) {
            return fn(this);
        },
        async batch(statements) {
            const stmts = statements.map(({ sql, params }) => {
                const stmt = d1.prepare(sql);
                return params && params.length > 0 ? stmt.bind(...params) : stmt;
            });
            const results = await d1.batch(stmts);
            return results.map((result) => ({
                success: result.success,
                changes: result.meta.changes,
                lastRowId: result.meta.last_row_id,
            }));
        },
        async close() { },
    };
}
// Database helper functions
export async function getLeads(dbInput, siteId, options) {
    const db = normalizeDb(dbInput);
    const { status, propertyId, sortBy = 'created_at', sortOrder = 'desc', limit = 50, offset = 0 } = options || {};
    let query = 'SELECT * FROM leads WHERE site_id = ?';
    const params = [siteId];
    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }
    if (propertyId) {
        query += ' AND property_id = ?';
        params.push(propertyId);
    }
    const orderColumn = sortBy === 'aiScore' ? 'ai_score' : sortBy.replace(/([A-Z])/g, '_$1').toLowerCase();
    query += ` ORDER BY ${orderColumn} ${sortOrder.toUpperCase()} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const results = await db.query(query, params);
    return results.map(mapLeadFromDb);
}
export async function getLeadById(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM leads WHERE id = ? AND site_id = ?', [id, siteId]);
    return result ? mapLeadFromDb(result) : null;
}
export async function createLead(dbInput, siteId, data) {
    const db = normalizeDb(dbInput);
    const id = generateId('lead');
    const now = new Date().toISOString();
    await db.execute(`
    INSERT INTO leads (id, site_id, property_id, first_name, last_name, email, phone, current_address, employment_status, monthly_income, move_in_date, message, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
  `, [
        id,
        siteId,
        data.propertyId,
        data.firstName,
        data.lastName,
        data.email,
        data.phone,
        data.currentAddress || null,
        data.employmentStatus,
        data.monthlyIncome,
        data.moveInDate,
        data.message || null,
        now,
        now
    ]);
    return (await getLeadById(db, siteId, id));
}
export async function updateLead(dbInput, siteId, id, data) {
    const db = normalizeDb(dbInput);
    const updates = [];
    const params = [];
    if (data.status !== undefined) {
        updates.push('status = ?');
        params.push(data.status);
    }
    if (data.aiScore !== undefined) {
        updates.push('ai_score = ?');
        params.push(data.aiScore);
    }
    if (data.aiLabel !== undefined) {
        updates.push('ai_label = ?');
        params.push(data.aiLabel);
    }
    if (updates.length === 0)
        return;
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    await db.execute(`UPDATE leads SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);
}
// Lead Files
export async function getLeadFiles(dbInput, siteId, leadId) {
    const db = normalizeDb(dbInput);
    const results = await db.query('SELECT * FROM lead_files WHERE lead_id = ? AND site_id = ?', [leadId, siteId]);
    return results.map(mapLeadFileFromDb);
}
export async function createLeadFile(dbInput, siteId, data) {
    const db = normalizeDb(dbInput);
    const id = generateId('file');
    const now = new Date().toISOString();
    await db.execute(`
    INSERT INTO lead_files (id, site_id, lead_id, file_type, file_name, file_size, mime_type, r2_key, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, siteId, data.leadId, data.fileType, data.fileName, data.fileSize, data.mimeType, data.r2Key, now]);
    return { ...data, id, uploadedAt: now };
}
// AI Evaluations
export async function getAIEvaluation(dbInput, siteId, leadId) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM lead_ai_evaluations WHERE lead_id = ? AND site_id = ?', [leadId, siteId]);
    return result ? mapAIEvaluationFromDb(result) : null;
}
export async function createAIEvaluation(dbInput, siteId, data) {
    const db = normalizeDb(dbInput);
    const id = generateId('eval');
    const now = new Date().toISOString();
    await db.execute(`
    INSERT INTO lead_ai_evaluations (id, site_id, lead_id, score, label, summary, risk_flags, recommendation, fraud_signals, model_version, evaluated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
        id,
        siteId,
        data.leadId,
        data.score,
        data.label,
        data.summary,
        JSON.stringify(data.riskFlags),
        data.recommendation,
        JSON.stringify(data.fraudSignals),
        data.modelVersion,
        now
    ]);
    return { ...data, id, evaluatedAt: now };
}
// Properties
export async function getProperties(dbInput, siteId, options) {
    const db = normalizeDb(dbInput);
    let query = 'SELECT * FROM properties WHERE site_id = ?';
    const params = [siteId];
    if (options?.isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(options.isActive ? 1 : 0);
    }
    if (options?.propertyType) {
        query += ' AND property_type = ?';
        params.push(options.propertyType);
    }
    if (options?.city) {
        query += ' AND city = ?';
        params.push(options.city);
    }
    query += ' ORDER BY created_at DESC';
    const results = await db.query(query, params);
    return results.map(mapPropertyFromDb);
}
export async function getPropertyById(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM properties WHERE id = ? AND site_id = ?', [id, siteId]);
    return result ? mapPropertyFromDb(result) : null;
}
export async function getPropertyBySlug(dbInput, siteId, slug) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM properties WHERE slug = ? AND site_id = ?', [slug, siteId]);
    return result ? mapPropertyFromDb(result) : null;
}
export async function getPropertyWithUnits(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    const property = await getPropertyById(db, siteId, id);
    if (!property)
        return null;
    const units = await getUnitsByPropertyId(db, siteId, id);
    const images = await getImagesByEntity(db, siteId, 'property', id);
    return {
        ...property,
        units,
        images,
        unitCount: units.length,
        occupiedCount: units.filter(u => u.status === 'occupied').length,
        vacantCount: units.filter(u => u.status === 'available').length,
    };
}
export async function createProperty(dbInput, siteId, data) {
    const db = normalizeDb(dbInput);
    const id = generateId('prop');
    const now = new Date().toISOString();
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + id.slice(0, 8);
    await db.execute(`
    INSERT INTO properties (id, site_id, name, slug, address, city, state, zip_code, property_type, description, year_built, lot_size, amenities, latitude, longitude, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `, [
        id,
        siteId,
        data.name,
        slug,
        data.address,
        data.city,
        data.state,
        data.zipCode,
        data.propertyType,
        data.description || null,
        data.yearBuilt || null,
        data.lotSize || null,
        JSON.stringify(data.amenities || []),
        data.latitude || null,
        data.longitude || null,
        now,
        now
    ]);
    return (await getPropertyById(db, siteId, id));
}
export async function updateProperty(dbInput, siteId, id, data) {
    const db = normalizeDb(dbInput);
    const updates = [];
    const params = [];
    const fieldMap = {
        name: 'name',
        address: 'address',
        city: 'city',
        state: 'state',
        zipCode: 'zip_code',
        propertyType: 'property_type',
        description: 'description',
        yearBuilt: 'year_built',
        lotSize: 'lot_size',
        latitude: 'latitude',
        longitude: 'longitude',
    };
    for (const [key, dbField] of Object.entries(fieldMap)) {
        if (data[key] !== undefined) {
            updates.push(`${dbField} = ?`);
            params.push(data[key]);
        }
    }
    if (data.amenities !== undefined) {
        updates.push('amenities = ?');
        params.push(JSON.stringify(data.amenities));
    }
    if (data.isActive !== undefined) {
        updates.push('is_active = ?');
        params.push(data.isActive ? 1 : 0);
    }
    if (updates.length === 0)
        return;
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    await db.execute(`UPDATE properties SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);
}
export async function deleteProperty(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    await db.execute('DELETE FROM properties WHERE id = ? AND site_id = ?', [id, siteId]);
}
// Listings (for storefront - properties with units)
export async function getPublicListings(dbInput, siteId, filters) {
    const db = normalizeDb(dbInput);
    // Query units with property data joined
    let query = `
    SELECT
      u.id as id,
      u.unit_number,
      u.bedrooms,
      u.bathrooms,
      u.rent_amount as price,
      u.status,
      u.sqft,
      u.features,
      p.id as property_id,
      p.name as title,
      p.slug,
      p.address,
      p.city,
      p.state,
      p.zip_code as zipCode,
      p.description,
      p.amenities,
      p.latitude as lat,
      p.longitude as lng
    FROM units u
    INNER JOIN properties p ON u.property_id = p.id
    WHERE u.site_id = ? AND p.site_id = ?
      AND u.is_active = 1 AND p.is_active = 1
  `;
    const params = [siteId, siteId];
    if (filters?.city) {
        query += ' AND p.city = ?';
        params.push(filters.city);
    }
    if (filters?.status) {
        query += ' AND u.status = ?';
        params.push(filters.status);
    }
    query += ' ORDER BY p.name, u.unit_number';
    const results = await db.query(query, params);
    // Transform to listing format
    return results.map((row) => ({
        id: row.id,
        title: row.title + (row.unit_number !== '1' ? ` - Unit ${row.unit_number}` : ''),
        slug: row.slug,
        price: row.price,
        city: row.city,
        address: row.address,
        status: row.status === 'available' ? 'Available' : row.status === 'occupied' ? 'Rented' : 'Pending',
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        parking: null,
        pets: null,
        description: row.description,
        imageUrl: null,
        images: [],
        lat: row.lat,
        lng: row.lng,
    }));
}
// Units
export async function getUnits(dbInput, siteId, options) {
    const db = normalizeDb(dbInput);
    let query = 'SELECT * FROM units WHERE site_id = ?';
    const params = [siteId];
    if (options?.propertyId) {
        query += ' AND property_id = ?';
        params.push(options.propertyId);
    }
    if (options?.status) {
        query += ' AND status = ?';
        params.push(options.status);
    }
    if (options?.isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(options.isActive ? 1 : 0);
    }
    query += ' ORDER BY unit_number ASC';
    const results = await db.query(query, params);
    return results.map(mapUnitFromDb);
}
export async function getUnitsByPropertyId(dbInput, siteId, propertyId) {
    const db = normalizeDb(dbInput);
    return getUnits(db, siteId, { propertyId });
}
export async function getUnitById(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM units WHERE id = ? AND site_id = ?', [id, siteId]);
    return result ? mapUnitFromDb(result) : null;
}
export async function getUnitWithDetails(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    const unit = await getUnitById(db, siteId, id);
    if (!unit)
        return null;
    const property = await getPropertyById(db, siteId, unit.propertyId);
    const images = await getImagesByEntity(db, siteId, 'unit', id);
    let currentTenant;
    if (unit.currentTenantId) {
        currentTenant = await getTenantById(db, siteId, unit.currentTenantId) || undefined;
    }
    return {
        ...unit,
        property: property || undefined,
        images,
        currentTenant,
    };
}
export async function createUnit(dbInput, siteId, data) {
    const db = normalizeDb(dbInput);
    const id = generateId('unit');
    const now = new Date().toISOString();
    await db.execute(`
    INSERT INTO units (id, site_id, property_id, unit_number, name, bedrooms, bathrooms, sqft, rent_amount, deposit_amount, status, floor, features, available_date, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `, [
        id,
        siteId,
        data.propertyId,
        data.unitNumber,
        data.name || null,
        data.bedrooms,
        data.bathrooms,
        data.sqft || null,
        data.rentAmount,
        data.depositAmount || null,
        data.status || 'available',
        data.floor || null,
        JSON.stringify(data.features || []),
        data.availableDate || null,
        now,
        now
    ]);
    return (await getUnitById(db, siteId, id));
}
export async function updateUnit(dbInput, siteId, id, data) {
    const db = normalizeDb(dbInput);
    const updates = [];
    const params = [];
    const fieldMap = {
        unitNumber: 'unit_number',
        name: 'name',
        bedrooms: 'bedrooms',
        bathrooms: 'bathrooms',
        sqft: 'sqft',
        rentAmount: 'rent_amount',
        depositAmount: 'deposit_amount',
        status: 'status',
        floor: 'floor',
        availableDate: 'available_date',
        currentTenantId: 'current_tenant_id',
    };
    for (const [key, dbField] of Object.entries(fieldMap)) {
        if (data[key] !== undefined) {
            updates.push(`${dbField} = ?`);
            params.push(data[key]);
        }
    }
    if (data.features !== undefined) {
        updates.push('features = ?');
        params.push(JSON.stringify(data.features));
    }
    if (data.isActive !== undefined) {
        updates.push('is_active = ?');
        params.push(data.isActive ? 1 : 0);
    }
    if (updates.length === 0)
        return;
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    await db.execute(`UPDATE units SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);
}
export async function deleteUnit(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    await db.execute('DELETE FROM units WHERE id = ? AND site_id = ?', [id, siteId]);
}
// Unit History
export async function getUnitHistory(dbInput, siteId, unitId) {
    const db = normalizeDb(dbInput);
    const results = await db.query('SELECT * FROM unit_history WHERE unit_id = ? AND site_id = ? ORDER BY created_at DESC', [unitId, siteId]);
    return results.map(mapUnitHistoryFromDb);
}
export async function createUnitHistory(dbInput, siteId, data) {
    const db = normalizeDb(dbInput);
    const id = generateId('hist');
    const now = new Date().toISOString();
    await db.execute(`
    INSERT INTO unit_history (id, site_id, unit_id, event_type, event_data, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
        id,
        siteId,
        data.unitId,
        data.eventType,
        JSON.stringify(data.eventData),
        now
    ]);
    return {
        id,
        unitId: data.unitId,
        eventType: data.eventType,
        eventData: data.eventData,
        createdAt: now,
    };
}
// Images
export async function getImagesByEntity(dbInput, siteId, entityType, entityId) {
    const db = normalizeDb(dbInput);
    const results = await db.query('SELECT * FROM images WHERE entity_type = ? AND entity_id = ? AND site_id = ? ORDER BY sort_order ASC', [entityType, entityId, siteId]);
    return results.map(mapImageFromDb);
}
export async function getImageById(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM images WHERE id = ? AND site_id = ?', [id, siteId]);
    return result ? mapImageFromDb(result) : null;
}
export async function createImage(dbInput, siteId, data) {
    const db = normalizeDb(dbInput);
    const id = generateId('img');
    const now = new Date().toISOString();
    await db.execute(`
    INSERT INTO images (id, site_id, entity_type, entity_id, r2_key, filename, content_type, size_bytes, width, height, sort_order, is_cover, alt_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
        id,
        siteId,
        data.entityType,
        data.entityId,
        data.r2Key,
        data.filename,
        data.contentType,
        data.sizeBytes,
        data.width || null,
        data.height || null,
        data.sortOrder || 0,
        data.isCover ? 1 : 0,
        data.altText || null,
        now
    ]);
    return (await getImageById(db, siteId, id));
}
export async function updateImage(dbInput, siteId, id, data) {
    const db = normalizeDb(dbInput);
    const updates = [];
    const params = [];
    if (data.sortOrder !== undefined) {
        updates.push('sort_order = ?');
        params.push(data.sortOrder);
    }
    if (data.isCover !== undefined) {
        updates.push('is_cover = ?');
        params.push(data.isCover ? 1 : 0);
    }
    if (data.altText !== undefined) {
        updates.push('alt_text = ?');
        params.push(data.altText);
    }
    if (updates.length === 0)
        return;
    params.push(id);
    await db.execute(`UPDATE images SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);
}
export async function deleteImage(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    await db.execute('DELETE FROM images WHERE id = ? AND site_id = ?', [id, siteId]);
}
export async function setCoverImage(dbInput, siteId, entityType, entityId, imageId) {
    const db = normalizeDb(dbInput);
    // Remove cover from all images for this entity
    await db.execute('UPDATE images SET is_cover = 0 WHERE entity_type = ? AND entity_id = ? AND site_id = ?', [entityType, entityId, siteId]);
    // Set the new cover
    await db.execute('UPDATE images SET is_cover = 1 WHERE id = ? AND site_id = ?', [imageId, siteId]);
}
// Work Orders
export async function getWorkOrders(dbInput, siteId, options) {
    const db = normalizeDb(dbInput);
    let query = 'SELECT * FROM work_orders WHERE site_id = ?';
    const params = [siteId];
    if (options?.status) {
        query += ' AND status = ?';
        params.push(options.status);
    }
    if (options?.propertyId) {
        query += ' AND property_id = ?';
        params.push(options.propertyId);
    }
    query += ' ORDER BY created_at DESC';
    const results = await db.query(query, params);
    return results.map(mapWorkOrderFromDb);
}
export async function getWorkOrderById(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM work_orders WHERE id = ? AND site_id = ?', [id, siteId]);
    return result ? mapWorkOrderFromDb(result) : null;
}
export async function createWorkOrder(dbInput, siteId, data) {
    const db = normalizeDb(dbInput);
    const id = generateId('wo');
    const now = new Date().toISOString();
    await db.execute(`
    INSERT INTO work_orders (id, site_id, property_id, tenant_id, title, description, category, priority, status, assigned_to, scheduled_date, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?)
  `, [
        id, siteId, data.propertyId, data.tenantId || null, data.title, data.description, data.category, data.priority,
        data.assignedTo || null, data.scheduledDate || null, data.notes || null, now, now
    ]);
    return (await getWorkOrderById(db, siteId, id));
}
export async function updateWorkOrder(dbInput, siteId, id, data) {
    const db = normalizeDb(dbInput);
    const updates = [];
    const params = [];
    const fields = ['title', 'description', 'category', 'priority', 'status', 'assignedTo', 'scheduledDate', 'notes'];
    for (const field of fields) {
        if (data[field] !== undefined) {
            const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
            updates.push(`${dbField} = ?`);
            params.push(data[field]);
        }
    }
    if (data.status === 'completed') {
        updates.push('completed_at = ?');
        params.push(new Date().toISOString());
    }
    if (updates.length === 0)
        return;
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    await db.execute(`UPDATE work_orders SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);
}
export async function deleteWorkOrder(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    await db.execute('DELETE FROM work_orders WHERE id = ? AND site_id = ?', [id, siteId]);
}
// Tenants
export async function getTenants(dbInput, siteId) {
    const db = normalizeDb(dbInput);
    const results = await db.query('SELECT * FROM tenants WHERE site_id = ? ORDER BY created_at DESC', [siteId]);
    return results.map(mapTenantFromDb);
}
export async function getTenantById(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM tenants WHERE id = ? AND site_id = ?', [id, siteId]);
    return result ? mapTenantFromDb(result) : null;
}
// Users
export async function getUserByEmail(dbInput, siteId, email) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT id, email, name, role, password_hash, site_id, is_super_admin, created_at FROM users WHERE email = ? AND site_id = ?', [email, siteId]);
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
    const result = await db.queryOne('SELECT id, email, name, role, password_hash, site_id, is_super_admin, created_at FROM users WHERE id = ? AND site_id = ?', [id, siteId]);
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
// Mapping functions
function mapLeadFromDb(row) {
    const r = row;
    return {
        id: r.id,
        propertyId: r.property_id,
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        phone: r.phone,
        currentAddress: r.current_address,
        employmentStatus: r.employment_status,
        monthlyIncome: r.monthly_income,
        moveInDate: r.move_in_date,
        message: r.message,
        status: r.status,
        aiScore: r.ai_score,
        aiLabel: r.ai_label,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
function mapLeadFileFromDb(row) {
    const r = row;
    return {
        id: r.id,
        leadId: r.lead_id,
        fileType: r.file_type,
        fileName: r.file_name,
        fileSize: r.file_size,
        mimeType: r.mime_type,
        r2Key: r.r2_key,
        uploadedAt: r.uploaded_at,
    };
}
function mapAIEvaluationFromDb(row) {
    const r = row;
    return {
        id: r.id,
        leadId: r.lead_id,
        score: r.score,
        label: r.label,
        summary: r.summary,
        riskFlags: JSON.parse(r.risk_flags || '[]'),
        recommendation: r.recommendation,
        fraudSignals: JSON.parse(r.fraud_signals || '[]'),
        modelVersion: r.model_version,
        evaluatedAt: r.evaluated_at,
    };
}
function mapPropertyFromDb(row) {
    const r = row;
    return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        address: r.address,
        city: r.city,
        state: r.state,
        zipCode: r.zip_code,
        propertyType: r.property_type,
        description: r.description,
        yearBuilt: r.year_built,
        lotSize: r.lot_size,
        amenities: JSON.parse(r.amenities || '[]'),
        latitude: r.latitude,
        longitude: r.longitude,
        isActive: Boolean(r.is_active),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
function mapUnitFromDb(row) {
    const r = row;
    return {
        id: r.id,
        propertyId: r.property_id,
        unitNumber: r.unit_number,
        name: r.name,
        bedrooms: r.bedrooms,
        bathrooms: r.bathrooms,
        sqft: r.sqft,
        rentAmount: r.rent_amount,
        depositAmount: r.deposit_amount,
        status: r.status,
        floor: r.floor,
        features: JSON.parse(r.features || '[]'),
        availableDate: r.available_date,
        currentTenantId: r.current_tenant_id,
        isActive: Boolean(r.is_active),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
function mapUnitHistoryFromDb(row) {
    const r = row;
    return {
        id: r.id,
        unitId: r.unit_id,
        eventType: r.event_type,
        eventData: JSON.parse(r.event_data || '{}'),
        createdAt: r.created_at,
    };
}
function mapImageFromDb(row) {
    const r = row;
    return {
        id: r.id,
        entityType: r.entity_type,
        entityId: r.entity_id,
        r2Key: r.r2_key,
        filename: r.filename,
        contentType: r.content_type,
        sizeBytes: r.size_bytes,
        width: r.width,
        height: r.height,
        sortOrder: r.sort_order,
        isCover: Boolean(r.is_cover),
        altText: r.alt_text,
        createdAt: r.created_at,
    };
}
function mapWorkOrderFromDb(row) {
    const r = row;
    return {
        id: r.id,
        propertyId: r.property_id,
        tenantId: r.tenant_id,
        title: r.title,
        description: r.description,
        category: r.category,
        priority: r.priority,
        status: r.status,
        assignedTo: r.assigned_to,
        scheduledDate: r.scheduled_date,
        completedAt: r.completed_at,
        notes: r.notes,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
function mapTenantFromDb(row) {
    const r = row;
    return {
        id: r.id,
        leadId: r.lead_id,
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        phone: r.phone,
        emergencyContact: r.emergency_contact,
        emergencyPhone: r.emergency_phone,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
/**
 * Get all site access records for a specific user
 */
export async function getUserSiteAccess(dbInput, userId) {
    const db = normalizeDb(dbInput);
    const rows = await db.query(`SELECT id, user_id as userId, site_id as siteId, granted_at as grantedAt, granted_by as grantedBy
     FROM user_access
     WHERE user_id = ?
     ORDER BY granted_at DESC`, [userId]);
    return rows || [];
}
/**
 * Get all accessible sites for a user (returns site_id list)
 */
export async function getUserAccessibleSites(dbInput, userId) {
    const db = normalizeDb(dbInput);
    const rows = await db.query(`SELECT site_id as siteId, granted_at as grantedAt
     FROM user_access
     WHERE user_id = ?
     ORDER BY site_id`, [userId]);
    return rows || [];
}
/**
 * Check if a user has access to a specific site
 */
export async function userHasAccessToSite(dbInput, userId, siteId) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne(`SELECT COUNT(*) as count
     FROM user_access
     WHERE user_id = ? AND site_id = ?`, [userId, siteId]);
    return (result?.count || 0) > 0;
}
/**
 * Grant site access to a user
 */
export async function grantSiteAccess(dbInput, userId, siteId, grantedBy) {
    const db = normalizeDb(dbInput);
    const id = generateId('uac');
    await db.execute(`INSERT INTO user_access (id, user_id, site_id, granted_by)
     VALUES (?, ?, ?, ?)`, [id, userId, siteId, grantedBy]);
    const access = await db.queryOne(`SELECT id, user_id as userId, site_id as siteId, granted_at as grantedAt, granted_by as grantedBy
     FROM user_access
     WHERE id = ?`, [id]);
    if (!access) {
        throw new Error('Failed to create user access record');
    }
    return access;
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
