/**
 * Lease Operations API Routes (/api/ops/leases/*)
 *
 * Handles:
 * - Bulk operations (status updates, export, email, document generation)
 * - Status transition validation
 * - CSV export generation
 * - Audit trail for all bulk actions
 */
import { Hono } from 'hono';
import { getLeases, updateLease } from '../lib/db/leases';
import { createBulkAction, updateBulkActionResults, logAuditEntry } from '../lib/db/bulk-actions';
const opsLeasesRoutes = new Hono();
// ==================== LEASE STATUS TRANSITIONS ====================
/**
 * Valid lease status transitions
 */
const VALID_TRANSITIONS = {
    'draft': ['pending_signature', 'terminated'],
    'pending_signature': ['signed', 'draft', 'terminated'],
    'signed': ['active', 'terminated'],
    'active': ['expiring_soon', 'terminated'],
    'expiring_soon': ['active', 'expired', 'terminated'],
    'expired': ['terminated'],
    'terminated': [], // Terminal state - no transitions allowed
};
/**
 * Validate if a status transition is allowed
 */
function isValidStatusTransition(currentStatus, newStatus) {
    if (currentStatus === newStatus)
        return true; // Allow same status (no-op)
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
}
// ==================== CSV EXPORT ====================
/**
 * Generate CSV from lease data
 */
function generateLeaseCSV(leases) {
    const headers = [
        'Lease ID',
        'Tenant Name',
        'Tenant Email',
        'Property Name',
        'Unit Number',
        'Start Date',
        'End Date',
        'Monthly Rent',
        'Security Deposit',
        'Status',
        'Signed Date',
        'Created Date',
    ];
    const rows = leases.map((lease) => [
        lease.id,
        lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}` : 'N/A',
        lease.tenant?.email || 'N/A',
        lease.property?.name || 'N/A',
        lease.unit?.unitNumber || 'Entire Property',
        lease.startDate,
        lease.endDate,
        lease.monthlyRent,
        lease.securityDeposit,
        lease.status,
        lease.signedAt || 'Not signed',
        lease.createdAt,
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
 * POST /api/ops/leases/bulk
 * Perform bulk operations on multiple leases
 *
 * Request body:
 * {
 *   lease_ids: string[],
 *   action: 'update_status' | 'export' | 'send_email' | 'generate_documents',
 *   params: {
 *     new_status?: string,
 *     reason?: string,
 *     export_format?: 'csv' | 'excel',
 *     email_template_id?: string,
 *     document_template?: string
 *   }
 * }
 */
opsLeasesRoutes.post('/leases/bulk', async (c) => {
    try {
        const siteId = c.get('siteId');
        const userId = c.get('userId');
        if (!siteId || !userId) {
            return c.json({ error: 'Missing siteId or userId' }, 401);
        }
        const body = await c.req.json();
        const { lease_ids, action, params = {} } = body;
        // Validation
        if (!lease_ids || !Array.isArray(lease_ids) || lease_ids.length === 0) {
            return c.json({ error: 'Invalid lease_ids: must be non-empty array' }, 400);
        }
        if (lease_ids.length > 100) {
            return c.json({ error: 'Maximum 100 leases per bulk action' }, 400);
        }
        const validActions = ['update_status', 'export', 'send_email', 'generate_documents'];
        if (!validActions.includes(action)) {
            return c.json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }, 400);
        }
        // Fetch all leases
        const allLeases = await getLeases(c.env.DB, siteId);
        const selectedLeases = allLeases.filter((lease) => lease_ids.includes(lease.id));
        if (selectedLeases.length !== lease_ids.length) {
            return c.json({ error: 'Some leases not found' }, 404);
        }
        // Handle export action separately (no database changes)
        if (action === 'export') {
            const csvData = generateLeaseCSV(selectedLeases);
            // Create bulk action record for audit trail
            const bulkActionId = await createBulkAction(c.env.DB, userId, 'lease_export', lease_ids.length, { export_format: params.export_format || 'csv' });
            await updateBulkActionResults(c.env.DB, bulkActionId, lease_ids.length, 0);
            // Log audit entry
            await logAuditEntry(c.env.DB, {
                entityType: 'lease',
                entityId: 'bulk',
                action: 'export',
                performedBy: userId,
                bulkActionId,
                changes: { lease_count: lease_ids.length, format: params.export_format || 'csv' },
            });
            // Return CSV data as downloadable content
            return new Response(csvData, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="leases-export-${new Date().toISOString().split('T')[0]}.csv"`,
                },
            });
        }
        // Create bulk action record
        const bulkActionId = await createBulkAction(c.env.DB, userId, `lease_${action}`, lease_ids.length, params);
        // Execute bulk action
        const results = [];
        let successCount = 0;
        let failureCount = 0;
        for (const leaseId of lease_ids) {
            try {
                const lease = selectedLeases.find((l) => l.id === leaseId);
                switch (action) {
                    case 'update_status': {
                        if (!params.new_status) {
                            throw new Error('new_status parameter required for update_status action');
                        }
                        // Validate status transition
                        if (!isValidStatusTransition(lease.status, params.new_status)) {
                            throw new Error(`Invalid status transition from "${lease.status}" to "${params.new_status}". Allowed transitions: ${VALID_TRANSITIONS[lease.status]?.join(', ') || 'none'}`);
                        }
                        // Update lease status
                        await updateLease(c.env.DB, siteId, leaseId, {
                            status: params.new_status,
                        });
                        // Log audit entry
                        await logAuditEntry(c.env.DB, {
                            entityType: 'lease',
                            entityId: leaseId,
                            action: 'update_status',
                            performedBy: userId,
                            bulkActionId,
                            changes: {
                                old_status: lease.status,
                                new_status: params.new_status,
                                reason: params.reason || 'Bulk status update',
                            },
                        });
                        results.push({ lease_id: leaseId, status: 'success' });
                        successCount++;
                        break;
                    }
                    case 'send_email': {
                        // TODO: Integrate with email system (Feature #1 from 202601-next-batch)
                        console.log(`[STUB] Sending email to lease ${leaseId}`);
                        await logAuditEntry(c.env.DB, {
                            entityType: 'lease',
                            entityId: leaseId,
                            action: 'send_email',
                            performedBy: userId,
                            bulkActionId,
                            changes: {
                                email_template: params.email_template_id,
                                note: 'Email system not yet configured',
                            },
                        });
                        results.push({
                            lease_id: leaseId,
                            status: 'failed',
                            error: 'Email system not yet configured',
                        });
                        failureCount++;
                        break;
                    }
                    case 'generate_documents': {
                        // TODO: Integrate with document generation system
                        console.log(`[STUB] Generating document for lease ${leaseId}`);
                        await logAuditEntry(c.env.DB, {
                            entityType: 'lease',
                            entityId: leaseId,
                            action: 'generate_documents',
                            performedBy: userId,
                            bulkActionId,
                            changes: {
                                document_template: params.document_template,
                                note: 'Document system not yet configured',
                            },
                        });
                        results.push({
                            lease_id: leaseId,
                            status: 'failed',
                            error: 'Document system not yet configured',
                        });
                        failureCount++;
                        break;
                    }
                }
            }
            catch (error) {
                console.error(`Error processing lease ${leaseId}:`, error);
                results.push({
                    lease_id: leaseId,
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
        console.error('Error in bulk lease operation:', error);
        return c.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});
export default opsLeasesRoutes;
