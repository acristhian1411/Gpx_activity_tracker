import { db } from './connection.js';
import { sql } from 'drizzle-orm';

/**
 * Check if database connection is healthy
 */
export async function checkDatabaseHealth(): Promise<boolean> {
	try {
		await db.get(sql`SELECT 1`);
		return true;
	} catch (error) {
		console.error('Database health check failed:', error);
		return false;
	}
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
	try {
		const activitiesResult = await db.get(sql`SELECT COUNT(*) as count FROM activities`);
		const gpsPointsResult = await db.get(sql`SELECT COUNT(*) as count FROM gps_points`);
		
		return {
			activities: (activitiesResult as any)?.count || 0,
			gpsPoints: (gpsPointsResult as any)?.count || 0,
			healthy: true
		};
	} catch (error) {
		console.error('Error getting database stats:', error);
		return {
			activities: 0,
			gpsPoints: 0,
			healthy: false
		};
	}
}

/**
 * Close database connection gracefully
 */
export function closeDatabaseConnection() {
	// better-sqlite3 connections are closed automatically when the process exits
	// This function is here for consistency and future extensibility
	console.log('Database connection closed');
}