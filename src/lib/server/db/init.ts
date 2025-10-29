import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { dbConnection } from './connection.js';
import { activities, gpsPoints } from './schema.js';
import { sql } from 'drizzle-orm';

/**
 * Initialize database with schema and migrations
 */
export async function initializeDatabase(): Promise<void> {
	try {
		console.log('Initializing database...');
		
		const db = dbConnection.getDb();
		const client = dbConnection.getClient();
		
		// Test connection first
		const isConnected = await dbConnection.testConnection();
		if (!isConnected) {
			// If test fails, it might be because tables don't exist yet
			console.log('Database connection test failed, proceeding with initialization...');
		}
		
		// Run migrations if migration files exist
		try {
			console.log('Running database migrations...');
			migrate(db, { migrationsFolder: 'drizzle' });
			console.log('Database migrations completed successfully');
		} catch (migrationError) {
			console.warn('Migration failed or no migrations found:', migrationError);
			console.log('Creating tables manually...');
			
			// Create tables manually if migrations fail
			await createTablesManually();
		}
		
		// Verify tables exist
		await verifyDatabaseSchema();
		
		console.log('Database initialization completed successfully');
		
	} catch (error) {
		console.error('Database initialization failed:', error);
		throw new Error(`Database initialization failed: ${error}`);
	}
}

/**
 * Create database tables manually (fallback if migrations fail)
 */
async function createTablesManually(): Promise<void> {
	const client = dbConnection.getClient();
	
	// Create activities table
	client.exec(`
		CREATE TABLE IF NOT EXISTS activities (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			type TEXT NOT NULL DEFAULT 'unknown',
			start_time TEXT NOT NULL,
			end_time TEXT NOT NULL,
			distance REAL NOT NULL,
			duration INTEGER NOT NULL,
			elevation_gain REAL DEFAULT 0,
			average_speed REAL NOT NULL,
			max_speed REAL DEFAULT 0,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT DEFAULT CURRENT_TIMESTAMP
		);
	`);
	
	// Create gps_points table
	client.exec(`
		CREATE TABLE IF NOT EXISTS gps_points (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			activity_id INTEGER NOT NULL,
			latitude REAL NOT NULL,
			longitude REAL NOT NULL,
			elevation REAL,
			timestamp TEXT NOT NULL,
			sequence_order INTEGER NOT NULL,
			FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
		);
	`);
	
	// Create indexes
	client.exec(`
		CREATE INDEX IF NOT EXISTS idx_activities_start_time ON activities(start_time);
		CREATE INDEX IF NOT EXISTS idx_gps_points_activity_id ON gps_points(activity_id);
		CREATE INDEX IF NOT EXISTS idx_gps_points_sequence ON gps_points(activity_id, sequence_order);
	`);
	
	console.log('Database tables created manually');
}

/**
 * Verify that all required tables and indexes exist
 */
async function verifyDatabaseSchema(): Promise<void> {
	const client = dbConnection.getClient();
	
	// Check if activities table exists
	const activitiesTable = client.prepare(`
		SELECT name FROM sqlite_master 
		WHERE type='table' AND name='activities'
	`).get();
	
	if (!activitiesTable) {
		throw new Error('Activities table was not created');
	}
	
	// Check if gps_points table exists
	const gpsPointsTable = client.prepare(`
		SELECT name FROM sqlite_master 
		WHERE type='table' AND name='gps_points'
	`).get();
	
	if (!gpsPointsTable) {
		throw new Error('GPS points table was not created');
	}
	
	// Check if indexes exist
	const indexes = client.prepare(`
		SELECT name FROM sqlite_master 
		WHERE type='index' AND name IN (
			'idx_activities_start_time',
			'idx_gps_points_activity_id', 
			'idx_gps_points_sequence'
		)
	`).all();
	
	if (indexes.length < 3) {
		console.warn('Some database indexes may be missing');
	}
	
	console.log('Database schema verification completed');
}

/**
 * Reset database (drop all tables and recreate)
 * WARNING: This will delete all data!
 */
export async function resetDatabase(): Promise<void> {
	console.log('WARNING: Resetting database - all data will be lost!');
	
	const client = dbConnection.getClient();
	
	// Drop tables in correct order (child tables first)
	client.exec('DROP TABLE IF EXISTS gps_points;');
	client.exec('DROP TABLE IF EXISTS activities;');
	
	// Recreate tables
	await createTablesManually();
	
	console.log('Database reset completed');
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
	activitiesCount: number;
	gpsPointsCount: number;
	databaseSize: string;
}> {
	const db = dbConnection.getDb();
	const client = dbConnection.getClient();
	
	// Count activities
	const activitiesResult = await db.select({ count: sql<number>`count(*)` }).from(activities);
	const activitiesCount = activitiesResult[0]?.count || 0;
	
	// Count GPS points
	const gpsPointsResult = await db.select({ count: sql<number>`count(*)` }).from(gpsPoints);
	const gpsPointsCount = gpsPointsResult[0]?.count || 0;
	
	// Get database file size
	const sizeResult = client.prepare('PRAGMA page_count').get() as { page_count: number } | undefined;
	const pageSizeResult = client.prepare('PRAGMA page_size').get() as { page_size: number } | undefined;
	
	const totalPages = sizeResult?.page_count || 0;
	const pageSize = pageSizeResult?.page_size || 0;
	const sizeInBytes = totalPages * pageSize;
	const sizeInKB = Math.round(sizeInBytes / 1024);
	
	return {
		activitiesCount,
		gpsPointsCount,
		databaseSize: `${sizeInKB} KB`
	};
}