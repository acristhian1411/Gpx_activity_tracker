import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import { env } from '$env/dynamic/private';
import { initializeDatabase } from './migrate.js';

/**
 * Database connection singleton
 */
class DatabaseConnection {
	private static instance: DatabaseConnection;
	private _db: ReturnType<typeof drizzle> | null = null;
	private _client: Database.Database | null = null;

	private constructor() {}

	public static getInstance(): DatabaseConnection {
		if (!DatabaseConnection.instance) {
			DatabaseConnection.instance = new DatabaseConnection();
		}
		return DatabaseConnection.instance;
	}

	/**
	 * Get database instance, creating connection if needed
	 */
	public getDb() {
		if (!this._db) {
			this.connect();
		}
		return this._db!;
	}

	/**
	 * Get raw SQLite client
	 */
	public getClient() {
		if (!this._client) {
			this.connect();
		}
		return this._client!;
	}

	/**
	 * Establish database connection
	 */
	private connect() {
		const databaseUrl = env.DATABASE_URL || 'local.db';
		
		try {
			this._client = new Database(databaseUrl);
			
			// Enable foreign keys
			this._client.pragma('foreign_keys = ON');
			
			// Set journal mode to WAL for better performance
			this._client.pragma('journal_mode = WAL');
			
			// Set synchronous mode to NORMAL for better performance
			this._client.pragma('synchronous = NORMAL');
			
			this._db = drizzle(this._client, { schema });
			
			console.log(`Database connected: ${databaseUrl}`);
			
			// Initialize database tables if they don't exist
			initializeDatabase().catch(error => {
				console.error('Failed to initialize database:', error);
			});
			
		} catch (error) {
			console.error('Failed to connect to database:', error);
			throw new Error(`Database connection failed: ${error}`);
		}
	}

	/**
	 * Close database connection
	 */
	public close() {
		if (this._client) {
			this._client.close();
			this._client = null;
			this._db = null;
			console.log('Database connection closed');
		}
	}

	/**
	 * Test database connection
	 */
	public async testConnection(): Promise<boolean> {
		try {
			const db = this.getDb();
			// Simple query to test connection
			await db.select().from(schema.activities).limit(1);
			return true;
		} catch (error) {
			console.error('Database connection test failed:', error);
			return false;
		}
	}
}

// Export singleton instance
export const dbConnection = DatabaseConnection.getInstance();

// Export database instance for convenience
export const db = dbConnection.getDb();