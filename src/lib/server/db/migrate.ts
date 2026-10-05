/**
 * Database migration utility
 * Applies the database schema to create tables
 */

import { dbConnection } from './connection.js';

/**
 * Run database migrations to create tables
 */
export async function runMigrations(): Promise<void> {
	const client = dbConnection.getClient();
	
	try {
		console.log('Running database migrations...');
		
		// Create users table
		client.exec(`
			CREATE TABLE IF NOT EXISTS users (
				id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
				email TEXT NOT NULL UNIQUE,
				name TEXT,
				external_id TEXT,
				created_at TEXT DEFAULT CURRENT_TIMESTAMP
			);
		`);
		
		// Create activities table
		client.exec(`
			CREATE TABLE IF NOT EXISTS activities (
				id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
				user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
				name TEXT NOT NULL,
				type TEXT DEFAULT 'unknown' NOT NULL,
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
		
		// Add user_id column to existing activities table if missing
		const activityColumns = client.prepare(`PRAGMA table_info(activities)`).all() as Array<{ name: string }>;
		if (!activityColumns.some((column) => column.name === 'user_id')) {
			console.log('Adding user_id column to activities table...');
			client.exec(`
				ALTER TABLE activities ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
			`);
		}
		
		// Create index for activities start_time
		client.exec(`
			CREATE INDEX IF NOT EXISTS idx_activities_start_time ON activities (start_time);
		`);
		
		// Create index for activities user_id
		client.exec(`
			CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities (user_id);
		`);
		
		// Create gps_points table
		client.exec(`
			CREATE TABLE IF NOT EXISTS gps_points (
				id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
				activity_id INTEGER NOT NULL,
				latitude REAL NOT NULL,
				longitude REAL NOT NULL,
				elevation REAL,
				timestamp TEXT NOT NULL,
				sequence_order INTEGER NOT NULL,
				FOREIGN KEY (activity_id) REFERENCES activities(id) ON UPDATE NO ACTION ON DELETE CASCADE
			);
		`);
		
		// Create indexes for gps_points
		client.exec(`
			CREATE INDEX IF NOT EXISTS idx_gps_points_activity_id ON gps_points (activity_id);
		`);
		
		client.exec(`
			CREATE INDEX IF NOT EXISTS idx_gps_points_sequence ON gps_points (activity_id, sequence_order);
		`);
		
		console.log('Database migrations completed successfully');
		
	} catch (error) {
		console.error('Migration failed:', error);
		throw new Error(`Failed to run migrations: ${error}`);
	}
}

/**
 * Check if tables exist
 */
export async function checkTablesExist(): Promise<boolean> {
	const client = dbConnection.getClient();
	
	try {
		const result = client.prepare(`
			SELECT name FROM sqlite_master 
			WHERE type='table' AND name IN ('activities', 'gps_points', 'users')
		`).all();
		
		return result.length === 3;
	} catch (error) {
		console.error('Error checking tables:', error);
		return false;
	}
}

/**
 * Initialize database if needed
 * Migrations are idempotent (CREATE IF NOT EXISTS + column-existence checks),
 * so they always run to ensure the schema is up to date.
 */
export async function initializeDatabase(): Promise<void> {
	await runMigrations();
}