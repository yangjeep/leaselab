export type { IDatabase, ITransaction, QueryResult, ExecuteResult, DatabaseConfig, } from './database';
export type { ICache, CachePutOptions, CacheGetResult, CacheKeyInfo, CacheListOptions, CacheListResult, CacheConfig, } from './cache';
export type { IObjectStore, ObjectMetadata, ObjectPutOptions, ObjectGetResult, ObjectInfo, ObjectListOptions, ObjectListResult, SignedUrlOptions, ObjectStoreConfig, } from './object-store';
export { createDatabase, createCache, createObjectStore, createStorageProvider, registerDatabaseProvider, registerCacheProvider, registerObjectStoreProvider, getRegistry, clearRegistry, } from './factory';
export type { StorageConfig, StorageProvider, ProviderRegistry, DatabaseFactory, CacheFactory, ObjectStoreFactory, } from './factory';
//# sourceMappingURL=index.d.ts.map