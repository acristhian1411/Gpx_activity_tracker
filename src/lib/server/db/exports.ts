// Central exports for database module
export { db, type Database } from './index.js';
export { activities, gpsPoints } from './schema.js';
export { initializeDatabase, resetDatabase, getDatabaseStats as getDbStats } from './init.js';
export { initializeDatabase as runMigrations } from './migrate.js';
export { checkDatabaseHealth, getDatabaseStats, closeDatabaseConnection } from './utils.js';
export { DB_CONFIG, type ActivityType } from './config.js';