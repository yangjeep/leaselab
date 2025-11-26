import { describe, it, expect, beforeEach, vi } from 'vitest';
import { D1DatabaseAdapter, createD1Database } from './d1-database';

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

describe('D1DatabaseAdapter', () => {
  let mockD1: MockD1Database;
  let mockStatement: MockD1Statement;

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
  });

  describe('query', () => {
    it('should execute query and return results', async () => {
      const expectedResults = [{ id: 1, name: 'test' }];
      mockStatement.all = vi.fn().mockResolvedValue({
        results: expectedResults,
        success: true,
        meta: { changes: 0, last_row_id: 0, duration: 1 },
      });

      const adapter = new D1DatabaseAdapter(mockD1 as unknown as D1Database);
      const results = await adapter.query('SELECT * FROM users');

      expect(mockD1.prepare).toHaveBeenCalledWith('SELECT * FROM users');
      expect(results).toEqual(expectedResults);
    });

    it('should bind parameters to query', async () => {
      const adapter = new D1DatabaseAdapter(mockD1 as unknown as D1Database);
      await adapter.query('SELECT * FROM users WHERE id = ?', [1]);

      expect(mockStatement.bind).toHaveBeenCalledWith(1);
    });

    it('should handle empty parameters', async () => {
      const adapter = new D1DatabaseAdapter(mockD1 as unknown as D1Database);
      await adapter.query('SELECT * FROM users');

      expect(mockStatement.bind).not.toHaveBeenCalled();
    });
  });

  describe('queryOne', () => {
    it('should return first result', async () => {
      const expectedResult = { id: 1, name: 'test' };
      mockStatement.first = vi.fn().mockResolvedValue(expectedResult);

      const adapter = new D1DatabaseAdapter(mockD1 as unknown as D1Database);
      const result = await adapter.queryOne('SELECT * FROM users WHERE id = ?', [1]);

      expect(result).toEqual(expectedResult);
    });

    it('should return null when no results', async () => {
      mockStatement.first = vi.fn().mockResolvedValue(null);

      const adapter = new D1DatabaseAdapter(mockD1 as unknown as D1Database);
      const result = await adapter.queryOne('SELECT * FROM users WHERE id = ?', [999]);

      expect(result).toBeNull();
    });
  });

  describe('execute', () => {
    it('should execute statement and return result', async () => {
      mockStatement.run = vi.fn().mockResolvedValue({
        results: [],
        success: true,
        meta: { changes: 1, last_row_id: 5, duration: 1, rows_read: 0, rows_written: 1 },
      });

      const adapter = new D1DatabaseAdapter(mockD1 as unknown as D1Database);
      const result = await adapter.execute('INSERT INTO users (name) VALUES (?)', ['test']);

      expect(result).toMatchObject({
        success: true,
        changes: 1,
        lastRowId: 5,
      });
      expect(result.meta).toBeDefined();
      expect(result.meta?.duration).toBe(1);
    });
  });

  describe('batch', () => {
    it('should execute multiple statements', async () => {
      mockD1.batch = vi.fn().mockResolvedValue([
        { results: [], success: true, meta: { changes: 1, last_row_id: 1, duration: 1 } },
        { results: [], success: true, meta: { changes: 1, last_row_id: 2, duration: 1 } },
      ]);

      const adapter = new D1DatabaseAdapter(mockD1 as unknown as D1Database);
      const results = await adapter.batch([
        { sql: 'INSERT INTO users (name) VALUES (?)', params: ['user1'] },
        { sql: 'INSERT INTO users (name) VALUES (?)', params: ['user2'] },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].changes).toBe(1);
      expect(results[1].changes).toBe(1);
    });
  });

  describe('transaction', () => {
    it('should execute function within transaction context', async () => {
      const adapter = new D1DatabaseAdapter(mockD1 as unknown as D1Database);
      const result = await adapter.transaction(async (tx) => {
        await tx.execute('INSERT INTO users (name) VALUES (?)', ['test']);
        return 'done';
      });

      expect(result).toBe('done');
    });
  });

  describe('close', () => {
    it('should resolve without error', async () => {
      const adapter = new D1DatabaseAdapter(mockD1 as unknown as D1Database);
      await expect(adapter.close()).resolves.toBeUndefined();
    });
  });
});

describe('createD1Database', () => {
  it('should create adapter from config', () => {
    const mockD1 = { prepare: vi.fn() };
    const adapter = createD1Database({
      provider: 'cloudflare-d1',
      d1Binding: mockD1,
    });

    expect(adapter).toBeInstanceOf(D1DatabaseAdapter);
  });

  it('should throw error when d1Binding is missing', () => {
    expect(() => createD1Database({ provider: 'cloudflare-d1' })).toThrow(
      'D1 binding is required for cloudflare-d1 provider'
    );
  });
});
