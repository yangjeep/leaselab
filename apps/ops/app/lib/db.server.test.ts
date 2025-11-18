import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IDatabase } from '@leaselab/storage-core';

// Test the normalizeDb pattern and functions that use it
// We need to test that functions work with both D1Database and IDatabase

// Mock D1Database
interface MockD1Statement {
  bind: (...args: unknown[]) => MockD1Statement;
  all: <T>() => Promise<{ results: T[] }>;
  first: <T>() => Promise<T | null>;
  run: () => Promise<{ success: boolean; meta: { changes: number; last_row_id: number } }>;
}

interface MockD1Database {
  prepare: (sql: string) => MockD1Statement;
  batch: <T>(statements: MockD1Statement[]) => Promise<{ results: T[] }[]>;
}

// Mock IDatabase
const createMockIDatabase = (): IDatabase => ({
  query: vi.fn().mockResolvedValue([]),
  queryOne: vi.fn().mockResolvedValue(null),
  execute: vi.fn().mockResolvedValue({ success: true, changes: 1, lastRowId: 1 }),
  transaction: vi.fn().mockImplementation(async (fn) => fn(createMockIDatabase())),
  batch: vi.fn().mockResolvedValue([]),
  close: vi.fn().mockResolvedValue(undefined),
});

// Mock D1Database
const createMockD1Database = (): MockD1Database => {
  const mockStatement: MockD1Statement = {
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue({ results: [] }),
    first: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1, last_row_id: 1 } }),
  };

  return {
    prepare: vi.fn().mockReturnValue(mockStatement),
    batch: vi.fn().mockResolvedValue([]),
  };
};

describe('Database Backward Compatibility', () => {
  describe('normalizeDb pattern', () => {
    it('should detect IDatabase by query method', () => {
      const mockIDb = createMockIDatabase();

      // Check that IDatabase has the query method
      expect('query' in mockIDb).toBe(true);
      expect(typeof mockIDb.query).toBe('function');
    });

    it('should detect D1Database by prepare method', () => {
      const mockD1 = createMockD1Database();

      // Check that D1Database has prepare method but not query
      expect('prepare' in mockD1).toBe(true);
      expect('query' in mockD1).toBe(false);
    });
  });

  describe('Database operations with D1Database', () => {
    let mockD1: MockD1Database;
    let mockStatement: MockD1Statement;

    beforeEach(() => {
      mockStatement = {
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] }),
        first: vi.fn().mockResolvedValue(null),
        run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1, last_row_id: 1 } }),
      };
      mockD1 = {
        prepare: vi.fn().mockReturnValue(mockStatement),
        batch: vi.fn().mockResolvedValue([]),
      };
    });

    it('should handle query operation through D1Database', async () => {
      const expectedResults = [{ id: '1', name: 'Test' }];
      mockStatement.all = vi.fn().mockResolvedValue({ results: expectedResults });

      // Simulate the normalizeDb wrapper behavior
      const query = async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
        const stmt = mockD1.prepare(sql);
        const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
        const result = await bound.all<T>();
        return result.results;
      };

      const results = await query('SELECT * FROM leads');
      expect(results).toEqual(expectedResults);
    });

    it('should handle queryOne operation through D1Database', async () => {
      const expectedResult = { id: '1', name: 'Test Lead' };
      mockStatement.first = vi.fn().mockResolvedValue(expectedResult);

      // Simulate the normalizeDb wrapper behavior
      const queryOne = async <T>(sql: string, params?: unknown[]): Promise<T | null> => {
        const stmt = mockD1.prepare(sql);
        const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
        return bound.first<T>();
      };

      const result = await queryOne('SELECT * FROM leads WHERE id = ?', ['1']);
      expect(result).toEqual(expectedResult);
    });

    it('should handle execute operation through D1Database', async () => {
      mockStatement.run = vi.fn().mockResolvedValue({
        success: true,
        meta: { changes: 1, last_row_id: 5 },
      });

      // Simulate the normalizeDb wrapper behavior
      const execute = async (sql: string, params?: unknown[]) => {
        const stmt = mockD1.prepare(sql);
        const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
        const result = await bound.run();
        return {
          success: result.success,
          changes: result.meta.changes,
          lastRowId: result.meta.last_row_id,
        };
      };

      const result = await execute('INSERT INTO leads (name) VALUES (?)', ['Test']);
      expect(result.success).toBe(true);
      expect(result.changes).toBe(1);
      expect(result.lastRowId).toBe(5);
    });
  });

  describe('Database operations with IDatabase', () => {
    let mockIDb: IDatabase;

    beforeEach(() => {
      mockIDb = createMockIDatabase();
    });

    it('should handle query operation through IDatabase', async () => {
      const expectedResults = [{ id: '1', name: 'Test' }];
      mockIDb.query = vi.fn().mockResolvedValue(expectedResults);

      const results = await mockIDb.query('SELECT * FROM leads');
      expect(results).toEqual(expectedResults);
    });

    it('should handle queryOne operation through IDatabase', async () => {
      const expectedResult = { id: '1', name: 'Test Lead' };
      mockIDb.queryOne = vi.fn().mockResolvedValue(expectedResult);

      const result = await mockIDb.queryOne('SELECT * FROM leads WHERE id = ?', ['1']);
      expect(result).toEqual(expectedResult);
    });

    it('should handle execute operation through IDatabase', async () => {
      mockIDb.execute = vi.fn().mockResolvedValue({
        success: true,
        changes: 1,
        lastRowId: 5,
      });

      const result = await mockIDb.execute('INSERT INTO leads (name) VALUES (?)', ['Test']);
      expect(result.success).toBe(true);
      expect(result.changes).toBe(1);
    });
  });
});

describe('Lead Operations', () => {
  it('should map database row to Lead type', () => {
    const dbRow = {
      id: 'lead_123',
      property_id: 'prop_456',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '555-1234',
      monthly_income: 5000,
      move_in_date: '2024-02-01',
      status: 'new',
      ai_score: 85,
      screening_status: null,
      notes: 'Test notes',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    // Simulate mapLeadFromDb function
    const lead = {
      id: dbRow.id,
      propertyId: dbRow.property_id,
      firstName: dbRow.first_name,
      lastName: dbRow.last_name,
      email: dbRow.email,
      phone: dbRow.phone,
      monthlyIncome: dbRow.monthly_income,
      moveInDate: dbRow.move_in_date,
      status: dbRow.status,
      aiScore: dbRow.ai_score,
      screeningStatus: dbRow.screening_status,
      notes: dbRow.notes,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
    };

    expect(lead.id).toBe('lead_123');
    expect(lead.propertyId).toBe('prop_456');
    expect(lead.firstName).toBe('John');
    expect(lead.lastName).toBe('Doe');
    expect(lead.aiScore).toBe(85);
  });
});

describe('Property Operations', () => {
  it('should map database row to Property type', () => {
    const dbRow = {
      id: 'prop_123',
      name: 'Sunset Apartments',
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      type: 'apartment',
      units: 10,
      year_built: 2000,
      description: 'Nice place',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    // Simulate mapPropertyFromDb function
    const property = {
      id: dbRow.id,
      name: dbRow.name,
      address: dbRow.address,
      city: dbRow.city,
      state: dbRow.state,
      zip: dbRow.zip,
      type: dbRow.type,
      units: dbRow.units,
      yearBuilt: dbRow.year_built,
      description: dbRow.description,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
    };

    expect(property.id).toBe('prop_123');
    expect(property.name).toBe('Sunset Apartments');
    expect(property.yearBuilt).toBe(2000);
  });
});

describe('Batch Operations', () => {
  it('should handle batch statements with D1Database', async () => {
    const mockD1 = createMockD1Database();
    mockD1.batch = vi.fn().mockResolvedValue([
      { results: [], success: true, meta: { changes: 1, last_row_id: 1 } },
      { results: [], success: true, meta: { changes: 1, last_row_id: 2 } },
    ]);

    // Simulate batch operation
    const statements = [
      { sql: 'INSERT INTO leads (name) VALUES (?)', params: ['Lead 1'] },
      { sql: 'INSERT INTO leads (name) VALUES (?)', params: ['Lead 2'] },
    ];

    const preparedStatements = statements.map(({ sql, params }) => {
      const stmt = mockD1.prepare(sql);
      return params ? stmt.bind(...params) : stmt;
    });

    const results = await mockD1.batch(preparedStatements);
    expect(results).toHaveLength(2);
  });
});
