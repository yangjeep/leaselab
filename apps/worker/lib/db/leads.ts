import type { Lead, LeadFile, LeadAIResult, LeadHistory } from '~/shared/types';
import { generateId } from '~/shared/utils';
import type { DatabaseInput } from './helpers';
import { normalizeDb } from './helpers';

// Mapper functions
function mapLeadFromDb(row: unknown): Lead {
    const r = row as Record<string, unknown>;
    return {
        id: r.id as string,
        propertyId: r.property_id as string,
        firstName: r.first_name as string,
        lastName: r.last_name as string,
        email: r.email as string,
        phone: r.phone as string,
        currentAddress: r.current_address as string | undefined,
        employmentStatus: r.employment_status as Lead['employmentStatus'],
        moveInDate: r.move_in_date as string,
        message: r.message as string | undefined,
        status: r.status as Lead['status'],
        aiScore: r.ai_score as number | undefined,
        aiLabel: r.ai_label as Lead['aiLabel'] | undefined,
        landlordNote: r.landlord_note as string | undefined,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
    };
}

function mapLeadWithOccupancyFromDb(row: unknown): Lead & { isUnitOccupied?: boolean; propertyName?: string } {
    const lead = mapLeadFromDb(row);
    const r = row as Record<string, unknown>;
    return {
        ...lead,
        isUnitOccupied: Boolean(r.is_unit_occupied),
        propertyName: r.property_name as string | undefined,
    };
}

function mapLeadFileFromDb(row: unknown): LeadFile {
    const r = row as Record<string, unknown>;
    return {
        id: r.id as string,
        leadId: r.lead_id as string,
        fileType: r.file_type as LeadFile['fileType'],
        fileName: r.file_name as string,
        fileSize: r.file_size as number,
        mimeType: r.mime_type as string,
        r2Key: r.r2_key as string,
        uploadedAt: r.uploaded_at as string,
    };
}

function mapAIEvaluationFromDb(row: unknown): LeadAIResult {
    const r = row as Record<string, unknown>;
    return {
        id: r.id as string,
        leadId: r.lead_id as string,
        score: r.score as number,
        label: r.label as LeadAIResult['label'],
        summary: r.summary as string,
        riskFlags: JSON.parse(r.risk_flags as string || '[]'),
        recommendation: r.recommendation as string,
        fraudSignals: JSON.parse(r.fraud_signals as string || '[]'),
        modelVersion: r.model_version as string,
        evaluatedAt: r.evaluated_at as string,
    };
}

export async function getLeads(dbInput: DatabaseInput, siteId: string, options?: {
    status?: string;
    propertyId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}) {
    const db = normalizeDb(dbInput);
    const { status, propertyId, sortBy = 'created_at', sortOrder = 'desc', limit = 50, offset = 0 } = options || {};

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
    const params: (string | number)[] = [siteId];

    if (status) {
        query += ' AND l.status = ?';
        params.push(status);
    }

    if (propertyId) {
        query += ' AND l.property_id = ?';
        params.push(propertyId);
    }

    // Map sort fields to database columns
    let orderColumn: string;
    if (sortBy === 'aiScore' || sortBy === 'ai_score') {
        orderColumn = 'l.ai_score';
    } else if (sortBy === 'propertyName' || sortBy === 'property_name') {
        orderColumn = 'p.name';
    } else {
        orderColumn = `l.${sortBy.replace(/([A-Z])/g, '_$1').toLowerCase()}`;
    }
    query += ` ORDER BY ${orderColumn} ${sortOrder.toUpperCase()} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const results = await db.query(query, params);
    return results.map(mapLeadWithOccupancyFromDb);
}

export async function getLeadById(dbInput: DatabaseInput, siteId: string, id: string): Promise<Lead | null> {
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

export async function createLead(dbInput: DatabaseInput, siteId: string, data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'aiScore' | 'aiLabel' | 'status'>): Promise<Lead> {
    const db = normalizeDb(dbInput);
    const id = generateId('lead');
    const now = new Date().toISOString();

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
        data.employmentStatus,
        data.moveInDate,
        data.message || null,
        now,
        now
    ]);

    // Record history
    await recordLeadHistory(db, siteId, id, 'lead_created', {
        propertyId: data.propertyId,
        employmentStatus: data.employmentStatus,
        moveInDate: data.moveInDate,
        message: data.message || null
    });

    return (await getLeadById(db, siteId, id))!;
}

export async function updateLead(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<Lead>): Promise<void> {
    const db = normalizeDb(dbInput);
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

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

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await db.execute(`UPDATE leads SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, [...params, siteId]);

    // History event capturing changed fields
    const changed: Record<string, unknown> = {};
    for (let i = 0; i < updates.length - 1; i++) {
        const col = updates[i].split(' = ')[0];
        changed[col] = params[i];
    }
    await recordLeadHistory(db, siteId, id, 'lead_updated', changed);
}

// Lead Files
export async function getLeadFiles(dbInput: DatabaseInput, siteId: string, leadId: string): Promise<LeadFile[]> {
    const db = normalizeDb(dbInput);
    const results = await db.query('SELECT * FROM lead_files WHERE lead_id = ? AND site_id = ?', [leadId, siteId]);
    return results.map(mapLeadFileFromDb);
}

export async function createLeadFile(dbInput: DatabaseInput, siteId: string, data: Omit<LeadFile, 'id' | 'uploadedAt'>): Promise<LeadFile> {
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
 */
export async function createTempLeadFile(dbInput: DatabaseInput, siteId: string, data: {
    fileType: LeadFile['fileType'];
    fileName: string;
    fileSize: number;
    mimeType: string;
    r2Key: string;
}): Promise<{ id: string; uploadedAt: string }> {
    const db = normalizeDb(dbInput);
    const id = generateId('file');
    const now = new Date().toISOString();

    // Insert with NULL lead_id (temporary file)
    await db.execute(`
    INSERT INTO lead_files (id, site_id, lead_id, file_type, file_name, file_size, mime_type, r2_key, uploaded_at)
    VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)
  `, [id, siteId, data.fileType, data.fileName, data.fileSize, data.mimeType, data.r2Key, now]);

    return { id, uploadedAt: now };
}

/**
 * Associate temporary files with a lead
 * Updates lead_id for temp files and returns the count of files associated
 */
export async function associateFilesWithLead(dbInput: DatabaseInput, siteId: string, leadId: string, fileIds: string[]): Promise<number> {
    if (fileIds.length === 0) return 0;

    const db = normalizeDb(dbInput);
    const placeholders = fileIds.map(() => '?').join(',');

    // Update lead_id for all specified files
    const result = await db.execute(`
    UPDATE lead_files
    SET lead_id = ?
    WHERE id IN (${placeholders})
      AND site_id = ?
      AND lead_id IS NULL
  `, [leadId, ...fileIds, siteId]);

    return (result.meta?.rows_written || 0) as number;
}

/**
 * Count files for a lead (or count temp files if leadId is null)
 */
export async function countLeadFiles(dbInput: DatabaseInput, siteId: string, leadId: string | null = null): Promise<number> {
    const db = normalizeDb(dbInput);
    const query = leadId === null
        ? 'SELECT COUNT(*) as count FROM lead_files WHERE site_id = ? AND lead_id IS NULL'
        : 'SELECT COUNT(*) as count FROM lead_files WHERE site_id = ? AND lead_id = ?';
    const params = leadId === null ? [siteId] : [siteId, leadId];

    const result = await db.queryOne(query, params);
    return (result as any)?.count || 0;
}

// AI Evaluations
export async function getAIEvaluation(dbInput: DatabaseInput, siteId: string, leadId: string): Promise<LeadAIResult | null> {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne('SELECT * FROM lead_ai_evaluations WHERE lead_id = ? AND site_id = ?', [leadId, siteId]);
    return result ? mapAIEvaluationFromDb(result) : null;
}

export async function createAIEvaluation(dbInput: DatabaseInput, siteId: string, data: Omit<LeadAIResult, 'id' | 'evaluatedAt'>): Promise<LeadAIResult> {
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
export async function getLeadHistory(dbInput: DatabaseInput, siteId: string, leadId: string): Promise<LeadHistory[]> {
    const db = normalizeDb(dbInput);
    const rows = await db.query('SELECT * FROM lead_history WHERE lead_id = ? AND site_id = ? ORDER BY created_at DESC', [leadId, siteId]);
    return rows.map(r => ({
        id: (r as any).id as string,
        leadId: (r as any).lead_id as string,
        siteId: (r as any).site_id as string,
        eventType: (r as any).event_type as string,
        eventData: JSON.parse(((r as any).event_data as string) || '{}'),
        createdAt: (r as any).created_at as string,
    }));
}

export async function recordLeadHistory(dbInput: DatabaseInput, siteId: string, leadId: string, eventType: string, eventData: Record<string, unknown>): Promise<void> {
    const db = normalizeDb(dbInput);
    const id = 'lh_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    await db.execute(`
    INSERT INTO lead_history (id, lead_id, site_id, event_type, event_data)
    VALUES (?, ?, ?, ?, ?)
  `, [id, leadId, siteId, eventType, JSON.stringify(eventData)]);
}
