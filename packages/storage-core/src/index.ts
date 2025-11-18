// Database interfaces and types
export type {
  IDatabase,
  ITransaction,
  QueryResult,
  ExecuteResult,
  DatabaseConfig,
} from './database';

// Cache interfaces and types
export type {
  ICache,
  CachePutOptions,
  CacheGetResult,
  CacheKeyInfo,
  CacheListOptions,
  CacheListResult,
  CacheConfig,
} from './cache';

// Object store interfaces and types
export type {
  IObjectStore,
  ObjectMetadata,
  ObjectPutOptions,
  ObjectGetResult,
  ObjectInfo,
  ObjectListOptions,
  ObjectListResult,
  SignedUrlOptions,
  ObjectStoreConfig,
} from './object-store';

// Factory and registry
export {
  createDatabase,
  createCache,
  createObjectStore,
  createStorageProvider,
  registerDatabaseProvider,
  registerCacheProvider,
  registerObjectStoreProvider,
  getRegistry,
  clearRegistry,
} from './factory';

export type {
  StorageConfig,
  StorageProvider,
  ProviderRegistry,
  DatabaseFactory,
  CacheFactory,
  ObjectStoreFactory,
} from './factory';
