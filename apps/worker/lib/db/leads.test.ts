/**
 * Unit tests for leads.ts
 * Tests database operations for lead/application management with unit grouping
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';

// Mock the getLeads function before importing
vi.mock('./leads', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./leads')>();
  return {
    ...actual,
    getLeads: vi.fn(),
  };
});

import { getLeadsGroupedByUnit, getLeads } from './leads';

// Mock D1 types
interface MockD1Result<T> {
  results: T[];
  success: boolean;
  meta: {
    changes: number;
    last_row_id: number;
    duration: number;
  };
}

interface MockD1Statement {
  bind: (...args: unknown[]) => MockD1Statement;
  all: <T>() => Promise<MockD1Result<T>>;
  first: <T>() => Promise<T | null>;
  run: () => Promise<MockD1Result<unknown>>;
}

interface MockD1Database {
  prepare: (sql: string) => MockD1Statement;
  batch: <T>(statements: MockD1Statement[]) => Promise<MockD1Result<T>[]>;
}

describe('getLeadsGroupedByUnit', () => {
  let mockD1: MockD1Database;
  let mockStatement: MockD1Statement;

  beforeEach(() => {
    // Reset getLeads mock
    vi.mocked(getLeads).mockReset();

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
  });

  it('should group applications by unit', async () => {
    const mockMappedLeads = [
      {
        id: 'lead_1',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        phone: '555-0001',
        unitId: 'unit_101',
        propertyId: 'prop_1',
        siteId: 'site_1',
        status: 'new' as const,
        employmentStatus: 'employed' as const,
        moveInDate: '2025-02-01',
        aiScore: 85,
        aiLabel: 'A' as const,
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'lead_2',
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob@example.com',
        phone: '555-0002',
        unitId: 'unit_101',
        propertyId: 'prop_1',
        siteId: 'site_1',
        status: 'new' as const,
        employmentStatus: 'employed' as const,
        moveInDate: '2025-02-01',
        aiScore: 75,
        aiLabel: 'B' as const,
        isActive: true,
        createdAt: '2025-01-02T00:00:00Z',
        updatedAt: '2025-01-02T00:00:00Z',
      },
      {
        id: 'lead_3',
        firstName: 'Charlie',
        lastName: 'Brown',
        email: 'charlie@example.com',
        phone: '555-0003',
        unitId: 'unit_102',
        propertyId: 'prop_1',
        siteId: 'site_1',
        status: 'new' as const,
        employmentStatus: 'employed' as const,
        moveInDate: '2025-02-01',
        aiScore: 90,
        aiLabel: 'A' as const,
        isActive: true,
        createdAt: '2025-01-03T00:00:00Z',
        updatedAt: '2025-01-03T00:00:00Z',
      },
    ];

    const mockUnits = [
      {
        id: 'unit_101',
        property_id: 'prop_1',
        unit_number: '101',
        bedrooms: 2,
        bathrooms: 1,
        square_feet: 900,
        monthly_rent: 1500,
        status: 'available',
      },
      {
        id: 'unit_102',
        property_id: 'prop_1',
        unit_number: '102',
        bedrooms: 1,
        bathrooms: 1,
        square_feet: 700,
        monthly_rent: 1200,
        status: 'available',
      },
    ];

    // Mock database leads in raw format (what getLeads would query from DB)
    const mockDbLeads = mockMappedLeads.map(lead => ({
      ...lead,
      first_name: lead.firstName,
      last_name: lead.lastName,
      unit_id: lead.unitId,
      property_id: lead.propertyId,
      site_id: lead.siteId,
      ai_score: lead.aiScore,
      ai_label: lead.aiLabel,
      employment_status: lead.employmentStatus,
      move_in_date: lead.moveInDate,
      is_active: lead.isActive ? 1 : 0,
      created_at: lead.createdAt,
      updated_at: lead.updatedAt,
    }));

    // Use callCount pattern to differentiate queries
    let callCount = 0;
    mockD1.prepare = vi.fn((sql: string) => {
      callCount++;
      if (callCount === 1) {
        // First call - getLeads query
        const leadsStatement = {
          bind: vi.fn().mockReturnThis(),
          all: vi.fn().mockResolvedValue({
            results: mockDbLeads,
            success: true,
            meta: { changes: 0, last_row_id: 0, duration: 1 },
          }),
          first: vi.fn(),
          run: vi.fn(),
        };
        leadsStatement.bind = vi.fn().mockReturnValue(leadsStatement);
        return leadsStatement;
      } else {
        // Second call - units query
        const unitsStatement = {
          bind: vi.fn().mockReturnThis(),
          all: vi.fn().mockResolvedValue({
            results: mockUnits,
            success: true,
            meta: { changes: 0, last_row_id: 0, duration: 1 },
          }),
          first: vi.fn(),
          run: vi.fn(),
        };
        unitsStatement.bind = vi.fn().mockReturnValue(unitsStatement);
        return unitsStatement;
      }
    });

    const result = await getLeadsGroupedByUnit(mockD1 as any, 'site_1', {
      propertyId: 'prop_1',
    });

    // Should have 2 groups (one for each unit)
    expect(result).toHaveLength(2);

    // Check first group (unit_101 with 2 applications)
    expect(result[0].unit?.id).toBe('unit_101');
    expect(result[0].unit?.unitNumber).toBe('101');
    expect(result[0].applications).toHaveLength(2);
    expect(result[0].count).toBe(2);

    // Check second group (unit_102 with 1 application)
    expect(result[1].unit?.id).toBe('unit_102');
    expect(result[1].unit?.unitNumber).toBe('102');
    expect(result[1].applications).toHaveLength(1);
    expect(result[1].count).toBe(1);

    // Verify applications are properly mapped
    expect(result[0].applications[0].id).toBe('lead_1');
    expect(result[0].applications[0].firstName).toBe('Alice');
    expect(result[0].applications[1].id).toBe('lead_2');
    expect(result[1].applications[0].id).toBe('lead_3');
  });

  it('should handle applications without units', async () => {
    const mockLeads = [
      {
        id: 'lead_1',
        first_name: 'Alice',
        last_name: 'Smith',
        email: 'alice@example.com',
        unit_id: 'unit_101',
        property_id: 'prop_1',
        site_id: 'site_1',
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
        property_id: 'prop_1',
        site_id: 'site_1',
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
        property_id: 'prop_1',
        unit_number: '101',
        bedrooms: 2,
        bathrooms: 1,
        square_feet: 900,
        monthly_rent: 1500,
        status: 'available',
      },
    ];

    let callCount = 0;
    mockD1.prepare = vi.fn((sql: string) => {
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
      } else {
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

    const result = await getLeadsGroupedByUnit(mockD1 as any, 'site_1', {
      propertyId: 'prop_1',
    });

    // Should have 2 groups (one for unit_101 and one for no-unit)
    expect(result).toHaveLength(2);

    // First group should be the unit
    expect(result[0].unit?.id).toBe('unit_101');
    expect(result[0].applications).toHaveLength(1);

    // Second group should be the no-unit group
    expect(result[1].unit).toBeNull();
    expect(result[1].applications).toHaveLength(1);
    expect(result[1].applications[0].id).toBe('lead_2');
    expect(result[1].count).toBe(1);
  });

  it('should sort groups by unit number', async () => {
    const mockLeads = [
      {
        id: 'lead_1',
        first_name: 'Alice',
        last_name: 'Smith',
        email: 'alice@example.com',
        unit_id: 'unit_103',
        property_id: 'prop_1',
        site_id: 'site_1',
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
        property_id: 'prop_1',
        site_id: 'site_1',
        status: 'new',
        ai_score: 75,
        ai_label: 'B',
        created_at: '2025-01-02T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      },
      {
        id: 'lead_3',
        first_name: 'Charlie',
        last_name: 'Brown',
        email: 'charlie@example.com',
        unit_id: 'unit_102',
        property_id: 'prop_1',
        site_id: 'site_1',
        status: 'new',
        ai_score: 90,
        ai_label: 'A',
        created_at: '2025-01-03T00:00:00Z',
        updated_at: '2025-01-03T00:00:00Z',
      },
    ];

    const mockUnits = [
      {
        id: 'unit_103',
        property_id: 'prop_1',
        unit_number: '103',
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1200,
        monthly_rent: 2000,
        status: 'available',
      },
      {
        id: 'unit_101',
        property_id: 'prop_1',
        unit_number: '101',
        bedrooms: 2,
        bathrooms: 1,
        square_feet: 900,
        monthly_rent: 1500,
        status: 'available',
      },
      {
        id: 'unit_102',
        property_id: 'prop_1',
        unit_number: '102',
        bedrooms: 1,
        bathrooms: 1,
        square_feet: 700,
        monthly_rent: 1200,
        status: 'available',
      },
    ];

    let callCount = 0;
    mockD1.prepare = vi.fn((sql: string) => {
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
      } else {
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

    const result = await getLeadsGroupedByUnit(mockD1 as any, 'site_1', {
      propertyId: 'prop_1',
    });

    // Groups should be sorted by unit number
    expect(result[0].unit?.unitNumber).toBe('101');
    expect(result[1].unit?.unitNumber).toBe('102');
    expect(result[2].unit?.unitNumber).toBe('103');
  });

  it('should respect status filter', async () => {
    const mockLeads = [
      {
        id: 'lead_1',
        first_name: 'Alice',
        last_name: 'Smith',
        email: 'alice@example.com',
        unit_id: 'unit_101',
        property_id: 'prop_1',
        site_id: 'site_1',
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
        property_id: 'prop_1',
        unit_number: '101',
        bedrooms: 2,
        bathrooms: 1,
        square_feet: 900,
        monthly_rent: 1500,
        status: 'available',
      },
    ];

    let callCount = 0;
    mockD1.prepare = vi.fn((sql: string) => {
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
      } else {
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

    const result = await getLeadsGroupedByUnit(mockD1 as any, 'site_1', {
      propertyId: 'prop_1',
      status: 'approved',
    });

    expect(result).toHaveLength(1);
    expect(result[0].applications).toHaveLength(1);
    expect(result[0].applications[0].status).toBe('approved');
  });

  it('should return empty array when no applications found', async () => {
    mockD1.prepare = vi.fn((sql: string) => {
      return {
        ...mockStatement,
        all: vi.fn().mockResolvedValue({
          results: [],
          success: true,
          meta: { changes: 0, last_row_id: 0, duration: 1 },
        }),
      };
    });

    const result = await getLeadsGroupedByUnit(mockD1 as any, 'site_1', {
      propertyId: 'prop_1',
    });

    expect(result).toHaveLength(0);
  });

  it('should include unit details in grouped response', async () => {
    const mockLeads = [
      {
        id: 'lead_1',
        first_name: 'Alice',
        last_name: 'Smith',
        email: 'alice@example.com',
        unit_id: 'unit_101',
        property_id: 'prop_1',
        site_id: 'site_1',
        status: 'new',
        ai_score: 85,
        ai_label: 'A',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ];

    const mockUnits = [
      {
        id: 'unit_101',
        property_id: 'prop_1',
        unit_number: '2B',
        bedrooms: 2,
        bathrooms: 1.5,
        square_feet: 950,
        monthly_rent: 1650,
        status: 'available',
      },
    ];

    let callCount = 0;
    mockD1.prepare = vi.fn((sql: string) => {
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
      } else {
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

    const result = await getLeadsGroupedByUnit(mockD1 as any, 'site_1', {
      propertyId: 'prop_1',
    });

    expect(result[0].unit).toEqual({
      id: 'unit_101',
      propertyId: 'prop_1',
      unitNumber: '2B',
      bedrooms: 2,
      bathrooms: 1.5,
      squareFeet: 950,
      monthlyRent: 1650,
      status: 'available',
    });
  });

  it('should respect sortBy and sortOrder options', async () => {
    // Mock data should be returned in sorted order (desc by ai_score)
    const mockLeads = [
      {
        id: 'lead_2',
        first_name: 'Bob',
        last_name: 'Johnson',
        email: 'bob@example.com',
        phone: '555-0002',
        unit_id: 'unit_101',
        property_id: 'prop_1',
        site_id: 'site_1',
        status: 'new',
        employment_status: 'employed',
        move_in_date: '2025-02-01',
        ai_score: 90,
        ai_label: 'A',
        is_active: 1,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
      {
        id: 'lead_1',
        first_name: 'Alice',
        last_name: 'Smith',
        email: 'alice@example.com',
        phone: '555-0001',
        unit_id: 'unit_101',
        property_id: 'prop_1',
        site_id: 'site_1',
        status: 'new',
        employment_status: 'employed',
        move_in_date: '2025-02-01',
        ai_score: 70,
        ai_label: 'B',
        is_active: 1,
        created_at: '2025-01-03T00:00:00Z',
        updated_at: '2025-01-03T00:00:00Z',
      },
    ];

    const mockUnits = [
      {
        id: 'unit_101',
        property_id: 'prop_1',
        unit_number: '101',
        bedrooms: 2,
        bathrooms: 1,
        square_feet: 900,
        monthly_rent: 1500,
        status: 'available',
      },
    ];

    let callCount = 0;
    mockD1.prepare = vi.fn((sql: string) => {
      callCount++;
      if (callCount === 1) {
        // First call - getLeads query
        const leadsStatement = {
          bind: vi.fn().mockReturnThis(),
          all: vi.fn().mockResolvedValue({
            results: mockLeads,
            success: true,
            meta: { changes: 0, last_row_id: 0, duration: 1 },
          }),
          first: vi.fn(),
          run: vi.fn(),
        };
        leadsStatement.bind = vi.fn().mockReturnValue(leadsStatement);
        return leadsStatement;
      } else {
        // Second call - units query
        const unitsStatement = {
          bind: vi.fn().mockReturnThis(),
          all: vi.fn().mockResolvedValue({
            results: mockUnits,
            success: true,
            meta: { changes: 0, last_row_id: 0, duration: 1 },
          }),
          first: vi.fn(),
          run: vi.fn(),
        };
        unitsStatement.bind = vi.fn().mockReturnValue(unitsStatement);
        return unitsStatement;
      }
    });

    const result = await getLeadsGroupedByUnit(mockD1 as any, 'site_1', {
      propertyId: 'prop_1',
      sortBy: 'ai_score',
      sortOrder: 'desc',
    });

    expect(result[0].applications).toHaveLength(2);
    // Applications should be sorted by AI score descending (mocked data already in that order)
    expect(result[0].applications[0].aiScore).toBeGreaterThanOrEqual(
      result[0].applications[1].aiScore ?? 0
    );
  });
});
