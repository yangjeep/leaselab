import type { IDatabase } from '~/shared/storage-core';
import type { D1Database } from '@cloudflare/workers-types';
export type DatabaseInput = D1Database | IDatabase;
export declare function normalizeDb(db: DatabaseInput): IDatabase;
//# sourceMappingURL=helpers.d.ts.map