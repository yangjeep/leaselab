/**
 * Tenant Operations API Routes (/api/ops/tenants/*)
 *
 * Handles:
 * - Bulk operations (export, add tags, email, document sending)
 * - CSV export generation
 * - Tag management (optional)
 * - Audit trail for all bulk actions
 */
import { Hono } from 'hono';
import { getTenants } from '../lib/db/tenants';
import { createBulkAction, updateBulkActionResults, logAuditEntry } from '../lib/db/bulk-actions';
const opsTenantsRoutes = new Hono();
// ==================== CSV EXPORT ====================
/**
 * Generate CSV from tenant data
 */
function generateTenantCSV(tenants) {
    const headers = [
        'Tenant ID',
        'Full Name',
        'Email',
        'Phone',
        'Property Name',
        'Unit Number',
        'Status',
        'Move-in Date',
        'Emergency Contact',
        'Emergency Phone',
        'Created Date',
    ];
    const rows = tenants.map((tenant) => [
        tenant.id,
        `${tenant.firstName} ${tenant.lastName}`,
        tenant.email,
        tenant.phone || 'N/A',
        tenant.property?.name || 'N/A',
        tenant.unit?.unitNumber || 'N/A',
        tenant.status,
        tenant.moveInDate || 'N/A',
        tenant.emergencyContact || 'N/A',
        tenant.emergencyPhone || 'N/A',
        tenant.createdAt,
    ]);
    // Escape CSV fields (handle commas and quotes)
    const escapeCsvField = (field) => {
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    const csvLines = [
        headers.map(escapeCsvField).join(','),
        ...rows.map((row) => row.map(escapeCsvField).join(',')),
    ];
    return csvLines.join('\n');
}
// ==================== BULK OPERATIONS ====================
/**
 * POST /api/ops/tenants/bulk
 * Perform bulk operations on multiple tenants
 *
 * Request body:
 * {
 *   tenant_ids: string[],
 *   action: 'export' | 'add_tag' | 'send_email' | 'send_document',
 *   params: {
 *     tags?: string[],
 *     export_format?: 'csv' | 'excel',
 *     email_template_id?: string,
 *     document_id?: string
 *   }
 * }
 */
opsTenantsRoutes.post('/tenants/bulk', async (c) => {
    try {
        const siteId = c.get('siteId');
        const userId = c.get('userId');
        if (!siteId || !userId) {
            return c.json({ error: 'Missing siteId or userId' }, 401);
        }
        const body = await c.req.json();
        const { tenant_ids, action, params = {} } = body;
        // Validation
        if (!tenant_ids || !Array.isArray(tenant_ids) || tenant_ids.length === 0) {
            return c.json({ error: 'Invalid tenant_ids: must be non-empty array' }, 400);
        }
        if (tenant_ids.length > 100) {
            return c.json({ error: 'Maximum 100 tenants per bulk action' }, 400);
        }
        const validActions = ['export', 'add_tag', 'send_email', 'send_document'];
        if (!validActions.includes(action)) {
            return c.json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }, 400);
        }
        // Fetch all tenants
        const allTenants = await getTenants(c.env.DB, siteId, {});
        const selectedTenants = allTenants.filter((tenant) => tenant_ids.includes(tenant.id));
        if (selectedTenants.length !== tenant_ids.length) {
            return c.json({ error: 'Some tenants not found' }, 404);
        }
        // Handle export action separately (no database changes)
        if (action === 'export') {
            const csvData = generateTenantCSV(selectedTenants);
            // Create bulk action record for audit trail
            const bulkActionId = await createBulkAction(c.env.DB, userId, 'tenant_export', tenant_ids.length, { export_format: params.export_format || 'csv' });
            await updateBulkActionResults(c.env.DB, bulkActionId, tenant_ids.length, 0);
            // Log audit entry
            await logAuditEntry(c.env.DB, {
                entityType: 'tenant',
                entityId: 'bulk',
                action: 'export',
                performedBy: userId,
                bulkActionId,
                changes: { tenant_count: tenant_ids.length, format: params.export_format || 'csv' },
            });
            // Return CSV data as downloadable content
            return new Response(csvData, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="tenants-export-${new Date().toISOString().split('T')[0]}.csv"`,
                },
            });
        }
        // Create bulk action record
        const bulkActionId = await createBulkAction(c.env.DB, userId, `tenant_${action}`, tenant_ids.length, params);
        // Execute bulk action
        const results = [];
        let successCount = 0;
        let failureCount = 0;
        for (const tenantId of tenant_ids) {
            try {
                const tenant = selectedTenants.find((t) => t.id === tenantId);
                if (!tenant) {
                    throw new Error(`Tenant ${tenantId} not found`);
                }
                switch (action) {
                    case 'add_tag': {
                        if (!params.tags || !Array.isArray(params.tags) || params.tags.length === 0) {
                            throw new Error('tags parameter required for add_tag action');
                        }
                        // TODO: Implement tag storage when tenant_tags table is added
                        // For now, just log the action
                        console.log(`[STUB] Adding tags to tenant ${tenantId}:`, params.tags);
                        await logAuditEntry(c.env.DB, {
                            entityType: 'tenant',
                            entityId: tenantId,
                            action: 'add_tag',
                            performedBy: userId,
                            bulkActionId,
                            changes: {
                                tags: params.tags,
                                note: 'Tag storage not yet implemented',
                            },
                        });
                        results.push({
                            tenant_id: tenantId,
                            status: 'success',
                            message: 'Tags will be applied when tag system is implemented',
                        });
                        successCount++;
                        break;
                    }
                    case 'send_email': {
                        // TODO: Integrate with email system (Feature #1 from 202601-next-batch)
                        console.log(`[STUB] Sending email to tenant ${tenantId}`);
                        await logAuditEntry(c.env.DB, {
                            entityType: 'tenant',
                            entityId: tenantId,
                            action: 'send_email',
                            performedBy: userId,
                            bulkActionId,
                            changes: {
                                email_template: params.email_template_id,
                                note: 'Email system not yet configured',
                            },
                        });
                        results.push({
                            tenant_id: tenantId,
                            status: 'failed',
                            error: 'Email system not yet configured',
                        });
                        failureCount++;
                        break;
                    }
                    case 'send_document': {
                        // TODO: Integrate with document delivery system
                        console.log(`[STUB] Sending document to tenant ${tenantId}`);
                        await logAuditEntry(c.env.DB, {
                            entityType: 'tenant',
                            entityId: tenantId,
                            action: 'send_document',
                            performedBy: userId,
                            bulkActionId,
                            changes: {
                                document_id: params.document_id,
                                note: 'Document system not yet configured',
                            },
                        });
                        results.push({
                            tenant_id: tenantId,
                            status: 'failed',
                            error: 'Document system not yet configured',
                        });
                        failureCount++;
                        break;
                    }
                }
            }
            catch (error) {
                console.error(`Error processing tenant ${tenantId}:`, error);
                results.push({
                    tenant_id: tenantId,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                failureCount++;
            }
        }
        // Update bulk action results
        await updateBulkActionResults(c.env.DB, bulkActionId, successCount, failureCount);
        return c.json({
            bulk_action_id: bulkActionId,
            success_count: successCount,
            failure_count: failureCount,
            results,
        });
    }
    catch (error) {
        console.error('Error in bulk tenant operation:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
export default opsTenantsRoutes;
