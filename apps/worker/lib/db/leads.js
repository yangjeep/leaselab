import { generateId } from '~/shared/utils';
import { normalizeDb } from './helpers';
// Mapper functions
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
        moveInDate: r.move_in_date,
        message: r.message,
        status: r.status,
        aiScore: r.ai_score,
        aiLabel: r.ai_label,
        landlordNote: r.landlord_note,
        isActive: Boolean(r.is_active ?? 1),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}
function mapLeadWithOccupancyFromDb(row) {
    const lead = mapLeadFromDb(row);
    const r = row;
    return {
        ...lead,
        isUnitOccupied: Boolean(r.is_unit_occupied),
        propertyName: r.property_name,
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
export async function getLeads(dbInput, siteId, options) {
    const db = normalizeDb(dbInput);
    const { status, propertyId, sortBy = 'created_at', sortOrder = 'desc', limit = 50, offset = 0, includeArchived = false } = options || {};
    // Join with units to check if the unit is occupied and properties to get property name
    let query = `
    SELECT
      l.*,
      u.status as unit_status,
      CASE WHEN u.status = 'occupied' THEN 1 ELSE 0 END as is_unit_occupied,
      p.name as property_name
    FROM leads l
    LEFT JOIN units u ON l.unit_id = u.id OR (l.property_id = u.property_id AND u.unit_number = 'Main')
    LEFT JOIN properties p ON l.property_id = p.id
    WHERE l.site_id = ?
  `;
    const params = [siteId];
    // Filter by is_active unless includeArchived is true
    if (!includeArchived) {
        query += ' AND l.is_active = 1';
    }
    if (status) {
        query += ' AND l.status = ?';
        params.push(status);
    }
    if (propertyId) {
        query += ' AND l.property_id = ?';
        params.push(propertyId);
    }
    // Map sort fields to database columns
    // Handle undefined or invalid sortBy values
    const validSortBy = sortBy && sortBy !== 'undefined' ? sortBy : 'created_at';
    let orderColumn;
    if (validSortBy === 'aiScore' || validSortBy === 'ai_score') {
        orderColumn = 'l.ai_score';
    }
    else if (validSortBy === 'propertyName' || validSortBy === 'property_name') {
        orderColumn = 'p.name';
    }
    else {
        orderColumn = `l.${validSortBy.replace(/([A-Z])/g, '_$1').toLowerCase()}`;
    }
    query += ` ORDER BY ${orderColumn} ${sortOrder.toUpperCase()} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const results = await db.query(query, params);
    return results.map(mapLeadWithOccupancyFromDb);
}
export async function getLeadById(dbInput, siteId, id) {
    const db = normalizeDb(dbInput);
    const query = `
    SELECT
      l.*,
      u.status as unit_status,
      CASE WHEN u.status = 'occupied' THEN 1 ELSE 0 END as is_unit_occupied
    FROM leads l
    LEFT JOIN units u ON l.unit_id = u.id OR (l.property_id = u.property_id AND u.unit_number = 'Main')
    WHERE l.id = ? AND l.site_id = ?
    LIMIT 1
  `;
    const result = await db.queryOne(query, [id, siteId]);
    return result ? mapLeadWithOccupancyFromDb(result) : null;
}
export async function createLead(dbInput, siteId, data) {
    const db = normalizeDb(dbInput);
    const id = generateId('lead');
    const now = new Date().toISOString();
    // Check if this is a General Inquiry (employment_status and move_in_date are optional for general inquiries)
    const isGeneralInquiry = data.propertyId === 'general';
    await db.execute(`
    INSERT INTO leads (id, site_id, property_id, first_name, last_name, email, phone, current_address, employment_status, move_in_date, message, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
  `, [
        id,
        siteId,
        data.propertyId,
        data.firstName,
        data.lastName,
        data.email,
        data.phone,
        data.currentAddress || null,
        isGeneralInquiry ? null : data.employmentStatus,
        isGeneralInquiry ? null : data.moveInDate,
        data.message || null,
        now,
        now
    ]);
    // Record history
    const historyData = {
        propertyId: data.propertyId,
        message: data.message || null
    };
    // Only include these fields in history for non-general inquiries
    if (!isGeneralInquiry) {
        historyData.employmentStatus = data.employmentStatus;
        historyData.moveInDate = data.moveInDate;
    }
    await recordLeadHistory(db, siteId, id, 'lead_created', historyData);
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
    if (data.landlordNote !== undefined) {
        updates.push('landlord_note = ?');
        params.push(data.landlordNote || null);
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
    await db.execute(`UPDATE leads SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);
    // History event capturing changed fields
    const changed = {};
    for (let i = 0; i < updates.length - 1; i++) {
        const col = updates[i].split(' = ')[0];
        changed[col] = params[i];
    }
    await recordLeadHistory(db, siteId, id, 'lead_updated', changed);
}
/**
 * Archive a lead (soft delete)
 */
export async function archiveLead(dbInput, siteId, id) {
    await updateLead(dbInput, siteId, id, { isActive: false });
    const db = normalizeDb(dbInput);
    await recordLeadHistory(db, siteId, id, 'lead_archived', {});
}
/**
 * Restore an archived lead
 */
export async function restoreLead(dbInput, siteId, id) {
    await updateLead(dbInput, siteId, id, { isActive: true });
    const db = normalizeDb(dbInput);
    await recordLeadHistory(db, siteId, id, 'lead_restored', {});
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
/**
 * Create a temporary lead file (before lead is associated)
 * Used during the upload workflow where files are uploaded before lead submission
 * Files are staged in staged_files table until associated with a lead
 */
export async function createTempLeadFile(dbInput, siteId, data) {
    const db = normalizeDb(dbInput);
    const id = generateId('file');
    const now = new Date().toISOString();
    // Insert into staging table (will be moved to lead_files when lead is created)
    await db.execute(`
    INSERT INTO staged_files (id, site_id, file_type, file_name, file_size, mime_type, r2_key, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, siteId, data.fileType, data.fileName, data.fileSize, data.mimeType, data.r2Key, now]);
    return { id, uploadedAt: now };
}
/**
 * Associate temporary files with a lead
 * Moves files from staged_files to lead_files and returns the count of files associated
 */
export async function associateFilesWithLead(dbInput, siteId, leadId, fileIds) {
    if (fileIds.length === 0)
        return 0;
    const db = normalizeDb(dbInput);
    const placeholders = fileIds.map(() => '?').join(',');
    // Move files from staged_files to lead_files
    // First, insert into lead_files
    await db.execute(`
    INSERT INTO lead_files (id, site_id, lead_id, file_type, file_name, file_size, mime_type, r2_key, uploaded_at)
    SELECT id, site_id, ?, file_type, file_name, file_size, mime_type, r2_key, uploaded_at
    FROM staged_files
    WHERE id IN (${placeholders})
      AND site_id = ?
  `, [leadId, ...fileIds, siteId]);
    // Then, delete from staged_files
    const result = await db.execute(`
    DELETE FROM staged_files
    WHERE id IN (${placeholders})
      AND site_id = ?
  `, [...fileIds, siteId]);
    return (result.meta?.rows_written || 0);
}
/**
 * Count files for a lead (or count staged files if leadId is null)
 */
export async function countLeadFiles(dbInput, siteId, leadId = null) {
    const db = normalizeDb(dbInput);
    const query = leadId === null
        ? 'SELECT COUNT(*) as count FROM staged_files WHERE site_id = ?'
        : 'SELECT COUNT(*) as count FROM lead_files WHERE site_id = ? AND lead_id = ?';
    const params = leadId === null ? [siteId] : [siteId, leadId];
    const result = await db.queryOne(query, params);
    return result?.count || 0;
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
// Lead history helpers
export async function getLeadHistory(dbInput, siteId, leadId) {
    const db = normalizeDb(dbInput);
    const rows = await db.query('SELECT * FROM lead_history WHERE lead_id = ? AND site_id = ? ORDER BY created_at DESC', [leadId, siteId]);
    return rows.map(r => ({
        id: r.id,
        leadId: r.lead_id,
        siteId: r.site_id,
        eventType: r.event_type,
        eventData: JSON.parse(r.event_data || '{}'),
        createdAt: r.created_at,
    }));
}
export async function recordLeadHistory(dbInput, siteId, leadId, eventType, eventData) {
    const db = normalizeDb(dbInput);
    const id = 'lh_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    await db.execute(`
    INSERT INTO lead_history (id, lead_id, site_id, event_type, event_data)
    VALUES (?, ?, ?, ?, ?)
  `, [id, leadId, siteId, eventType, JSON.stringify(eventData)]);
}
/**
 * Get General Inquiries count (leads with property_id = 'general')
 */
export async function getGeneralInquiriesCount(dbInput, siteId, options) {
    const db = normalizeDb(dbInput);
    const { status, includeArchived = false } = options || {};
    const buildQuery = (capabilities) => {
        let query = `
            SELECT
                COUNT(*) as total_count,
                COUNT(CASE WHEN status IN ('new', 'documents_pending', 'documents_received', 'ai_evaluated', 'screening') THEN 1 END) as pending_count,
                COUNT(CASE WHEN status IN ('approved', 'rejected') THEN 1 END) as resolved_count
            FROM leads
            WHERE site_id = ? AND property_id = 'general'
        `;
        const params = [siteId];
        if (!includeArchived && capabilities.hasLeadIsActive) {
            query += ' AND is_active = 1';
        }
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        return { query, params };
    };
    const capabilities = { hasLeadIsActive: true };
    const tryQuery = async () => {
        const { query, params } = buildQuery(capabilities);
        return db.queryOne(query, params);
    };
    let result;
    try {
        result = await tryQuery();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('no such column: is_active')) {
            capabilities.hasLeadIsActive = false;
            result = await tryQuery();
        }
        else {
            throw error;
        }
    }
    const row = result;
    return {
        totalCount: Number(row?.total_count) || 0,
        pendingCount: Number(row?.pending_count) || 0,
        resolvedCount: Number(row?.resolved_count) || 0,
    };
}
