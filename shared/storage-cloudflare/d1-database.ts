import type {
  IDatabase,
  ITransaction,
  ExecuteResult,
  DatabaseConfig,
} from '../storage-core';
import { registerDatabaseProvider } from '../storage-core';

/**
 * D1 Database adapter implementing IDatabase interface
 */
export class D1DatabaseAdapter implements IDatabase {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
    const result = await bound.all<T>();
    return result.results;
  }

  async queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
    const result = await bound.first<T>();
    return result ?? null;
  }

  async execute(sql: string, params?: unknown[]): Promise<ExecuteResult> {
    const stmt = this.db.prepare(sql);
    const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
    const result = await bound.run();

    return {
      success: result.success,
      changes: result.meta.changes,
      lastRowId: result.meta.last_row_id,
      meta: {
        duration: result.meta.duration,
        rows_read: result.meta.rows_read,
        rows_written: result.meta.rows_written,
      },
    };
  }

  async transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T> {
    // D1 doesn't have native transaction support in the same way as traditional DBs
    // We can use batch for atomic operations, but for now we'll execute sequentially
    // and wrap in a transaction-like interface
    const tx: ITransaction = {
      query: <U = unknown>(sql: string, params?: unknown[]) => this.query<U>(sql, params),
      queryOne: <U = unknown>(sql: string, params?: unknown[]) => this.queryOne<U>(sql, params),
      execute: (sql: string, params?: unknown[]) => this.execute(sql, params),
    };

    return fn(tx);
  }

  async batch(
    statements: Array<{ sql: string; params?: unknown[] }>
  ): Promise<ExecuteResult[]> {
    const stmts = statements.map(({ sql, params }) => {
      const stmt = this.db.prepare(sql);
      return params && params.length > 0 ? stmt.bind(...params) : stmt;
    });

    const results = await this.db.batch(stmts);

    return results.map((result) => ({
      success: result.success,
      changes: result.meta.changes,
      lastRowId: result.meta.last_row_id,
      meta: {
        duration: result.meta.duration,
        rows_read: result.meta.rows_read,
        rows_written: result.meta.rows_written,
      },
    }));
  }

  async close(): Promise<void> {
    // D1 connections are managed by the runtime, no explicit close needed
  }
}

/**
 * Create a D1 database adapter from configuration
 */
export function createD1Database(config: DatabaseConfig): IDatabase {
  if (!config.d1Binding) {
    throw new Error('D1 binding is required for cloudflare-d1 provider');
  }
  return new D1DatabaseAdapter(config.d1Binding as D1Database);
}

// Register the provider
registerDatabaseProvider('cloudflare-d1', createD1Database);

export { D1DatabaseAdapter as D1Database };
