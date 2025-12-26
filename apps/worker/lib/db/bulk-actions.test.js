/**
 * Unit tests for bulk-actions.ts
 * Tests database operations for bulk actions and audit trail
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBulkAction, updateBulkActionResults, getBulkActionById, getBulkActionsByUser, logAuditEntry, } from './bulk-actions';
describe('bulk-actions database functions', () => {
    let mockD1;
    beforeEach(() => {
        mockD1 = {
            prepare: vi.fn(),
            batch: vi.fn(),
            execute: vi.fn().mockResolvedValue(undefined),
            query: vi.fn().mockResolvedValue([]),
            queryOne: vi.fn().mockResolvedValue(null),
        };
    });
    describe('createBulkAction', () => {
        it('should create a bulk action record and return ID', async () => {
            const bulkActionId = await createBulkAction(mockD1, 'user_123', 'reject', 5, { reason: 'Not qualified' });
            expect(typeof bulkActionId).toBe('string');
            expect(bulkActionId).toHaveLength(21); // nanoid default length
            expect(mockD1.execute).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO bulk_actions'), expect.arrayContaining([
                bulkActionId,
                'user_123',
                'reject',
                5,
                expect.stringContaining('Not qualified'),
            ]));
        });
    });
    describe('updateBulkActionResults', () => {
        it('should update success and failure counts', async () => {
            await updateBulkActionResults(mockD1, 'bulk_123', 3, 2);
            expect(mockD1.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE bulk_actions'), [3, 2, 'bulk_123']);
        });
    });
    describe('getBulkActionById', () => {
        it('should return null if bulk action not found', async () => {
            mockD1.queryOne = vi.fn().mockResolvedValue(null);
            const result = await getBulkActionById(mockD1, 'bulk_123');
            expect(result).toBeNull();
        });
        it('should return bulk action when found', async () => {
            const mockBulkAction = {
                id: 'bulk_123',
                performed_by: 'user_123',
                action_type: 'reject',
                application_count: 5,
                success_count: 3,
                failure_count: 2,
                params: JSON.stringify({ reason: 'Not qualified' }),
                created_at: '2025-12-24T00:00:00Z',
            };
            mockD1.queryOne = vi.fn().mockResolvedValue(mockBulkAction);
            const result = await getBulkActionById(mockD1, 'bulk_123');
            expect(result).toEqual({
                id: 'bulk_123',
                performedBy: 'user_123',
                actionType: 'reject',
                applicationCount: 5,
                successCount: 3,
                failureCount: 2,
                params: { reason: 'Not qualified' },
                createdAt: '2025-12-24T00:00:00Z',
            });
        });
    });
    describe('getBulkActionsByUser', () => {
        it('should return empty array when no bulk actions found', async () => {
            mockD1.query = vi.fn().mockResolvedValue([]);
            const result = await getBulkActionsByUser(mockD1, 'user_123');
            expect(result).toEqual([]);
        });
        it('should return bulk actions for user', async () => {
            const mockBulkActions = [
                {
                    id: 'bulk_1',
                    performed_by: 'user_123',
                    action_type: 'reject',
                    application_count: 5,
                    success_count: 5,
                    failure_count: 0,
                    params: JSON.stringify({ reason: 'Test' }),
                    created_at: '2025-12-24T00:00:00Z',
                },
                {
                    id: 'bulk_2',
                    performed_by: 'user_123',
                    action_type: 'move_to_stage',
                    application_count: 3,
                    success_count: 2,
                    failure_count: 1,
                    params: JSON.stringify({ stage: 'screening' }),
                    created_at: '2025-12-23T00:00:00Z',
                },
            ];
            mockD1.query = vi.fn().mockResolvedValue(mockBulkActions);
            const result = await getBulkActionsByUser(mockD1, 'user_123', 20);
            expect(result).toHaveLength(2);
            expect(result[0].actionType).toBe('reject');
            expect(result[1].actionType).toBe('move_to_stage');
        });
        it('should use default limit of 20', async () => {
            mockD1.query = vi.fn().mockResolvedValue([]);
            await getBulkActionsByUser(mockD1, 'user_123');
            expect(mockD1.query).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(['user_123', 20]));
        });
    });
    describe('logAuditEntry', () => {
        it('should create an audit log entry', async () => {
            await logAuditEntry(mockD1, {
                entityType: 'application',
                entityId: 'app_123',
                action: 'reject',
                performedBy: 'user_123',
                changes: { status: 'rejected' },
            });
            expect(mockD1.execute).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO audit_log'), expect.arrayContaining([
                expect.any(String), // audit ID
                'application',
                'app_123',
                'reject',
                'user_123',
                null, // no bulk action ID
                expect.stringContaining('rejected'),
            ]));
        });
        it('should link to bulk action when provided', async () => {
            await logAuditEntry(mockD1, {
                entityType: 'application',
                entityId: 'app_123',
                action: 'reject',
                performedBy: 'user_123',
                bulkActionId: 'bulk_123',
                changes: { status: 'rejected' },
            });
            expect(mockD1.execute).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO audit_log'), expect.arrayContaining([
                expect.any(String),
                'application',
                'app_123',
                'reject',
                'user_123',
                'bulk_123', // bulk action ID included
                expect.any(String),
            ]));
        });
    });
});
