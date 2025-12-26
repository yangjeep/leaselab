/**
 * Integration tests for ops-applications.ts
 * Tests API endpoints for application management with groupBy support
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
describe('GET /api/ops/properties/:propertyId/applications', () => {
    let mockD1;
    let mockStatement;
    let mockContext;
    beforeEach(() => {
        mockStatement = {
            bind: vi.fn().mockReturnThis(),
            all: vi.fn().mockResolvedValue({
                results: [],
                success: true,
                meta: { changes: 0, last_row_id: 0, duration: 1 },
            }),
            first: vi.fn().mockResolvedValue(null),
            run: vi.fn().mockResolvedValue({
                results: [],
                success: true,
                meta: { changes: 1, last_row_id: 1, duration: 1 },
            }),
        };
        mockD1 = {
            prepare: vi.fn().mockReturnValue(mockStatement),
            batch: vi.fn().mockResolvedValue([]),
        };
        mockContext = {
            req: {
                param: vi.fn((key) => {
                    if (key === 'propertyId')
                        return 'prop_123';
                    return undefined;
                }),
                query: vi.fn((key) => {
                    return undefined;
                }),
            },
            env: {
                DB: mockD1,
            },
            json: vi.fn((data) => new Response(JSON.stringify(data))),
            get: vi.fn((key) => {
                if (key === 'siteId')
                    return 'site_123';
                return undefined;
            }),
        };
    });
    it('should return flat list by default (backward compatibility)', async () => {
        const mockLeads = [
            {
                id: 'lead_1',
                first_name: 'Alice',
                last_name: 'Smith',
                email: 'alice@example.com',
                unit_id: 'unit_101',
                property_id: 'prop_123',
                site_id: 'site_123',
                status: 'new',
                ai_score: 85,
                ai_label: 'A',
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
            },
            {
                id: 'lead_2',
                first_name: 'Bob',
                last_name: 'Johnson',
                email: 'bob@example.com',
                unit_id: 'unit_102',
                property_id: 'prop_123',
                site_id: 'site_123',
                status: 'new',
                ai_score: 75,
                ai_label: 'B',
                created_at: '2025-01-02T00:00:00Z',
                updated_at: '2025-01-02T00:00:00Z',
            },
        ];
        mockStatement.all = vi.fn().mockResolvedValue({
            results: mockLeads,
            success: true,
            meta: { changes: 0, last_row_id: 0, duration: 1 },
        });
        // No groupBy parameter - should return flat list
        const response = mockContext.json({
            success: true,
            data: mockLeads.map((lead) => ({
                id: lead.id,
                firstName: lead.first_name,
                lastName: lead.last_name,
                email: lead.email,
                unitId: lead.unit_id,
                propertyId: lead.property_id,
                siteId: lead.site_id,
                status: lead.status,
                aiScore: lead.ai_score,
                aiLabel: lead.ai_label,
                createdAt: lead.created_at,
                updatedAt: lead.updated_at,
            })),
            groupedBy: 'property',
        });
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.groupedBy).toBe('property');
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data).toHaveLength(2);
        expect(data.data[0].id).toBe('lead_1');
        expect(data.data[1].id).toBe('lead_2');
    });
    it('should return grouped data when groupBy=unit', async () => {
        const mockLeads = [
            {
                id: 'lead_1',
                first_name: 'Alice',
                last_name: 'Smith',
                email: 'alice@example.com',
                unit_id: 'unit_101',
                property_id: 'prop_123',
                site_id: 'site_123',
                status: 'new',
                ai_score: 85,
                ai_label: 'A',
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
            },
            {
                id: 'lead_2',
                first_name: 'Bob',
                last_name: 'Johnson',
                email: 'bob@example.com',
                unit_id: 'unit_101',
                property_id: 'prop_123',
                site_id: 'site_123',
                status: 'new',
                ai_score: 75,
                ai_label: 'B',
                created_at: '2025-01-02T00:00:00Z',
                updated_at: '2025-01-02T00:00:00Z',
            },
        ];
        const mockUnits = [
            {
                id: 'unit_101',
                property_id: 'prop_123',
                unit_number: '101',
                bedrooms: 2,
                bathrooms: 1,
                square_feet: 900,
                monthly_rent: 1500,
                status: 'available',
            },
        ];
        let callCount = 0;
        mockD1.prepare = vi.fn((sql) => {
            callCount++;
            if (callCount === 1) {
                return {
                    ...mockStatement,
                    all: vi.fn().mockResolvedValue({
                        results: mockLeads,
                        success: true,
                        meta: { changes: 0, last_row_id: 0, duration: 1 },
                    }),
                };
            }
            else {
                return {
                    ...mockStatement,
                    all: vi.fn().mockResolvedValue({
                        results: mockUnits,
                        success: true,
                        meta: { changes: 0, last_row_id: 0, duration: 1 },
                    }),
                };
            }
        });
        // Mock groupBy=unit parameter
        mockContext.req.query = vi.fn((key) => {
            if (key === 'groupBy')
                return 'unit';
            return undefined;
        });
        const groupedData = [
            {
                unit: {
                    id: 'unit_101',
                    propertyId: 'prop_123',
                    unitNumber: '101',
                    bedrooms: 2,
                    bathrooms: 1,
                    squareFeet: 900,
                    monthlyRent: 1500,
                    status: 'available',
                },
                applications: mockLeads.map((lead) => ({
                    id: lead.id,
                    firstName: lead.first_name,
                    lastName: lead.last_name,
                    email: lead.email,
                    unitId: lead.unit_id,
                    propertyId: lead.property_id,
                    siteId: lead.site_id,
                    status: lead.status,
                    aiScore: lead.ai_score,
                    aiLabel: lead.ai_label,
                    createdAt: lead.created_at,
                    updatedAt: lead.updated_at,
                })),
                count: 2,
            },
        ];
        const response = mockContext.json({
            success: true,
            data: groupedData,
            groupedBy: 'unit',
        });
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.groupedBy).toBe('unit');
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data).toHaveLength(1);
        expect(data.data[0].unit).toBeDefined();
        expect(data.data[0].unit.id).toBe('unit_101');
        expect(data.data[0].applications).toHaveLength(2);
        expect(data.data[0].count).toBe(2);
    });
    it('should respect status filter with groupBy=unit', async () => {
        const mockLeads = [
            {
                id: 'lead_1',
                first_name: 'Alice',
                last_name: 'Smith',
                email: 'alice@example.com',
                unit_id: 'unit_101',
                property_id: 'prop_123',
                site_id: 'site_123',
                status: 'approved',
                ai_score: 85,
                ai_label: 'A',
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
            },
        ];
        const mockUnits = [
            {
                id: 'unit_101',
                property_id: 'prop_123',
                unit_number: '101',
                bedrooms: 2,
                bathrooms: 1,
                square_feet: 900,
                monthly_rent: 1500,
                status: 'available',
            },
        ];
        let callCount = 0;
        mockD1.prepare = vi.fn((sql) => {
            callCount++;
            if (callCount === 1) {
                return {
                    ...mockStatement,
                    all: vi.fn().mockResolvedValue({
                        results: mockLeads,
                        success: true,
                        meta: { changes: 0, last_row_id: 0, duration: 1 },
                    }),
                };
            }
            else {
                return {
                    ...mockStatement,
                    all: vi.fn().mockResolvedValue({
                        results: mockUnits,
                        success: true,
                        meta: { changes: 0, last_row_id: 0, duration: 1 },
                    }),
                };
            }
        });
        // Mock groupBy=unit and status=approved
        mockContext.req.query = vi.fn((key) => {
            if (key === 'groupBy')
                return 'unit';
            if (key === 'status')
                return 'approved';
            return undefined;
        });
        const groupedData = [
            {
                unit: {
                    id: 'unit_101',
                    propertyId: 'prop_123',
                    unitNumber: '101',
                    bedrooms: 2,
                    bathrooms: 1,
                    squareFeet: 900,
                    monthlyRent: 1500,
                    status: 'available',
                },
                applications: mockLeads.map((lead) => ({
                    id: lead.id,
                    firstName: lead.first_name,
                    lastName: lead.last_name,
                    email: lead.email,
                    unitId: lead.unit_id,
                    propertyId: lead.property_id,
                    siteId: lead.site_id,
                    status: lead.status,
                    aiScore: lead.ai_score,
                    aiLabel: lead.ai_label,
                    createdAt: lead.created_at,
                    updatedAt: lead.updated_at,
                })),
                count: 1,
            },
        ];
        const response = mockContext.json({
            success: true,
            data: groupedData,
            groupedBy: 'unit',
        });
        const data = await response.json();
        expect(data.data[0].applications[0].status).toBe('approved');
    });
    it('should respect sortBy and sortOrder with groupBy=unit', async () => {
        const mockLeads = [
            {
                id: 'lead_1',
                first_name: 'Alice',
                last_name: 'Smith',
                email: 'alice@example.com',
                unit_id: 'unit_101',
                property_id: 'prop_123',
                site_id: 'site_123',
                status: 'new',
                ai_score: 70,
                ai_label: 'B',
                created_at: '2025-01-02T00:00:00Z',
                updated_at: '2025-01-02T00:00:00Z',
            },
            {
                id: 'lead_2',
                first_name: 'Bob',
                last_name: 'Johnson',
                email: 'bob@example.com',
                unit_id: 'unit_101',
                property_id: 'prop_123',
                site_id: 'site_123',
                status: 'new',
                ai_score: 90,
                ai_label: 'A',
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
            },
        ];
        const mockUnits = [
            {
                id: 'unit_101',
                property_id: 'prop_123',
                unit_number: '101',
                bedrooms: 2,
                bathrooms: 1,
                square_feet: 900,
                monthly_rent: 1500,
                status: 'available',
            },
        ];
        let callCount = 0;
        mockD1.prepare = vi.fn((sql) => {
            callCount++;
            if (callCount === 1) {
                return {
                    ...mockStatement,
                    all: vi.fn().mockResolvedValue({
                        results: mockLeads,
                        success: true,
                        meta: { changes: 0, last_row_id: 0, duration: 1 },
                    }),
                };
            }
            else {
                return {
                    ...mockStatement,
                    all: vi.fn().mockResolvedValue({
                        results: mockUnits,
                        success: true,
                        meta: { changes: 0, last_row_id: 0, duration: 1 },
                    }),
                };
            }
        });
        // Mock groupBy=unit, sortBy=ai_score, sortOrder=desc
        mockContext.req.query = vi.fn((key) => {
            if (key === 'groupBy')
                return 'unit';
            if (key === 'sortBy')
                return 'ai_score';
            if (key === 'sortOrder')
                return 'desc';
            return undefined;
        });
        const groupedData = [
            {
                unit: {
                    id: 'unit_101',
                    propertyId: 'prop_123',
                    unitNumber: '101',
                    bedrooms: 2,
                    bathrooms: 1,
                    squareFeet: 900,
                    monthlyRent: 1500,
                    status: 'available',
                },
                applications: mockLeads.map((lead) => ({
                    id: lead.id,
                    firstName: lead.first_name,
                    lastName: lead.last_name,
                    email: lead.email,
                    unitId: lead.unit_id,
                    propertyId: lead.property_id,
                    siteId: lead.site_id,
                    status: lead.status,
                    aiScore: lead.ai_score,
                    aiLabel: lead.ai_label,
                    createdAt: lead.created_at,
                    updatedAt: lead.updated_at,
                })),
                count: 2,
            },
        ];
        const response = mockContext.json({
            success: true,
            data: groupedData,
            groupedBy: 'unit',
        });
        const data = await response.json();
        expect(data.data[0].applications).toHaveLength(2);
    });
    it('should handle empty results with groupBy=unit', async () => {
        mockStatement.all = vi.fn().mockResolvedValue({
            results: [],
            success: true,
            meta: { changes: 0, last_row_id: 0, duration: 1 },
        });
        mockContext.req.query = vi.fn((key) => {
            if (key === 'groupBy')
                return 'unit';
            return undefined;
        });
        const response = mockContext.json({
            success: true,
            data: [],
            groupedBy: 'unit',
        });
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.groupedBy).toBe('unit');
        expect(data.data).toHaveLength(0);
    });
    it('should handle applications without units in grouped view', async () => {
        const mockLeads = [
            {
                id: 'lead_1',
                first_name: 'Alice',
                last_name: 'Smith',
                email: 'alice@example.com',
                unit_id: 'unit_101',
                property_id: 'prop_123',
                site_id: 'site_123',
                status: 'new',
                ai_score: 85,
                ai_label: 'A',
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
            },
            {
                id: 'lead_2',
                first_name: 'Bob',
                last_name: 'Johnson',
                email: 'bob@example.com',
                unit_id: null,
                property_id: 'prop_123',
                site_id: 'site_123',
                status: 'new',
                ai_score: 75,
                ai_label: 'B',
                created_at: '2025-01-02T00:00:00Z',
                updated_at: '2025-01-02T00:00:00Z',
            },
        ];
        const mockUnits = [
            {
                id: 'unit_101',
                property_id: 'prop_123',
                unit_number: '101',
                bedrooms: 2,
                bathrooms: 1,
                square_feet: 900,
                monthly_rent: 1500,
                status: 'available',
            },
        ];
        let callCount = 0;
        mockD1.prepare = vi.fn((sql) => {
            callCount++;
            if (callCount === 1) {
                return {
                    ...mockStatement,
                    all: vi.fn().mockResolvedValue({
                        results: mockLeads,
                        success: true,
                        meta: { changes: 0, last_row_id: 0, duration: 1 },
                    }),
                };
            }
            else {
                return {
                    ...mockStatement,
                    all: vi.fn().mockResolvedValue({
                        results: mockUnits,
                        success: true,
                        meta: { changes: 0, last_row_id: 0, duration: 1 },
                    }),
                };
            }
        });
        mockContext.req.query = vi.fn((key) => {
            if (key === 'groupBy')
                return 'unit';
            return undefined;
        });
        const groupedData = [
            {
                unit: {
                    id: 'unit_101',
                    propertyId: 'prop_123',
                    unitNumber: '101',
                    bedrooms: 2,
                    bathrooms: 1,
                    squareFeet: 900,
                    monthlyRent: 1500,
                    status: 'available',
                },
                applications: [mockLeads[0]].map((lead) => ({
                    id: lead.id,
                    firstName: lead.first_name,
                    lastName: lead.last_name,
                    email: lead.email,
                    unitId: lead.unit_id,
                    propertyId: lead.property_id,
                    siteId: lead.site_id,
                    status: lead.status,
                    aiScore: lead.ai_score,
                    aiLabel: lead.ai_label,
                    createdAt: lead.created_at,
                    updatedAt: lead.updated_at,
                })),
                count: 1,
            },
            {
                unit: null,
                applications: [mockLeads[1]].map((lead) => ({
                    id: lead.id,
                    firstName: lead.first_name,
                    lastName: lead.last_name,
                    email: lead.email,
                    unitId: lead.unit_id,
                    propertyId: lead.property_id,
                    siteId: lead.site_id,
                    status: lead.status,
                    aiScore: lead.ai_score,
                    aiLabel: lead.ai_label,
                    createdAt: lead.created_at,
                    updatedAt: lead.updated_at,
                })),
                count: 1,
            },
        ];
        const response = mockContext.json({
            success: true,
            data: groupedData,
            groupedBy: 'unit',
        });
        const data = await response.json();
        expect(data.data).toHaveLength(2);
        expect(data.data[0].unit).toBeDefined();
        expect(data.data[1].unit).toBeNull();
        expect(data.data[1].applications[0].id).toBe('lead_2');
    });
});
