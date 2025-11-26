/**
 * Database query result metadata
 */
export interface QueryResult<T> {
  results: T[];
  success: boolean;
  meta?: {
    duration?: number;
    changes?: number;
    last_row_id?: number;
    rows_read?: number;
    rows_written?: number;
  };
}

/**
 * Database execution result for INSERT/UPDATE/DELETE
 */
export interface ExecuteResult {
  success: boolean;
  changes: number;
  lastRowId: number;
  meta?: {
    duration?: number;
    rows_read?: number;
    rows_written?: number;
  };
}

/**
 * Transaction interface for database operations
 */
export interface ITransaction {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>;
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;
}

/**
 * Abstract database interface for relational database operations.
 * Implementations: D1Database, PostgreSQLDatabase, MySQLDatabase
 */
export interface IDatabase {
  /**
   * Execute a SELECT query and return multiple rows
   * @param sql - SQL query string with ? placeholders
   * @param params - Parameters to bind to the query
   * @returns Array of results
   */
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;

  /**
   * Execute a SELECT query and return a single row or null
   * @param sql - SQL query string with ? placeholders
   * @param params - Parameters to bind to the query
   * @returns Single result or null if not found
   */
  queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>;

  /**
   * Execute an INSERT/UPDATE/DELETE statement
   * @param sql - SQL statement with ? placeholders
   * @param params - Parameters to bind to the statement
   * @returns Execution result with changes count and last row ID
   */
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;

  /**
   * Execute multiple statements in a transaction
   * @param fn - Function that receives a transaction and performs operations
   * @returns Result of the transaction function
   */
  transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T>;

  /**
   * Execute a batch of statements
   * @param statements - Array of SQL statements with their params
   * @returns Array of execution results
   */
  batch(statements: Array<{ sql: string; params?: unknown[] }>): Promise<ExecuteResult[]>;

  /**
   * Close the database connection (if applicable)
   */
  close(): Promise<void>;
}

/**
 * Configuration for database providers
 */
export interface DatabaseConfig {
  provider: 'cloudflare-d1' | 'postgresql' | 'mysql' | 'sqlite';

  // Cloudflare D1 specific (type is D1Database from @cloudflare/workers-types)
  d1Binding?: unknown;

  // Standard SQL databases
  connectionString?: string;

  // Connection pool settings
  poolSize?: number;
  idleTimeout?: number;
}
