// Re-export database connection and utilities
export { db, dbConnection } from './connection.js';
export * from './schema.js';
export * from './types.js';

// Import db to create the type
import { db } from './connection.js';

// Export database type
export type Database = typeof db;
