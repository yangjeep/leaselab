// Helper to normalize database input to IDatabase interface
export function normalizeDb(db) {
    // Check if it's already an IDatabase (has query method)
    if ('query' in db && typeof db.query === 'function') {
        return db;
    }
    // It's a D1Database, wrap it
    const d1 = db;
    return {
        async query(sql, params) {
            const stmt = d1.prepare(sql);
            const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
            const result = await bound.all();
            return result.results;
        },
        async queryOne(sql, params) {
            const stmt = d1.prepare(sql);
            const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
            const result = await bound.first();
            return result ?? null;
        },
        async execute(sql, params) {
            const stmt = d1.prepare(sql);
            const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
            const result = await bound.run();
            return {
                success: result.success,
                changes: (result.meta.rows_written || 0),
                lastRowId: result.meta.last_row_id,
            };
        },
        async transaction(fn) {
            return fn(this);
        },
        async batch(statements) {
            const stmts = statements.map(({ sql, params }) => {
                const stmt = d1.prepare(sql);
                return params && params.length > 0 ? stmt.bind(...params) : stmt;
            });
            const results = await d1.batch(stmts);
            return results.map((result) => ({
                success: result.success,
                changes: (result.meta.rows_written || 0),
                lastRowId: result.meta.last_row_id,
            }));
        },
        async close() { },
    };
}
