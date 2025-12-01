import type { IDatabase } from '~/shared/storage-core';
import type { D1Database } from '@cloudflare/workers-types';

// Database type that accepts both D1Database and IDatabase for backward compatibility
export type DatabaseInput = D1Database | IDatabase;

// Helper to normalize database input to IDatabase interface
export function normalizeDb(db: DatabaseInput): IDatabase {
    // Check if it's already an IDatabase (has query method)
    if ('query' in db && typeof db.query === 'function') {
        return db as IDatabase;
    }

    // It's a D1Database, wrap it
    const d1 = db as D1Database;
    return {
        async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
            const stmt = d1.prepare(sql);
            const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
            const result = await bound.all<T>();
            return result.results;
        },
        async queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null> {
            const stmt = d1.prepare(sql);
            const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
            const result = await bound.first<T>();
            return result ?? null;
        },
        async execute(sql: string, params?: unknown[]) {
            const stmt = d1.prepare(sql);
            const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
            const result = await bound.run();
            return {
                success: result.success,
                changes: (result.meta.rows_written || 0) as number,
                lastRowId: result.meta.last_row_id,
            };
        },
        async transaction<T>(fn: (tx: IDatabase) => Promise<T>): Promise<T> {
            return fn(this);
        },
        async batch(statements: Array<{ sql: string; params?: unknown[] }>) {
            const stmts = statements.map(({ sql, params }) => {
                const stmt = d1.prepare(sql);
                return params && params.length > 0 ? stmt.bind(...params) : stmt;
            });
            const results = await d1.batch(stmts);
            return results.map((result) => ({
                success: result.success,
                changes: (result.meta.rows_written || 0) as number,
                lastRowId: result.meta.last_row_id,
            }));
        },
        async close() { },
    };
}
