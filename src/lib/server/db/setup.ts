import { initializeDatabase, getDatabaseStats } from './init.js';

/**
 * Setup database on application startup
 * This should be called when the application starts
 */
export async function setupDatabase(): Promise<void> {
	try {
		console.log('Setting up database...');
		
		// Initialize database with schema
		await initializeDatabase();
		
		// Get and log database statistics
		const stats = await getDatabaseStats();
		console.log('Database setup completed:', {
			activities: stats.activitiesCount,
			gpsPoints: stats.gpsPointsCount,
			size: stats.databaseSize
		});
		
	} catch (error) {
		console.error('Database setup failed:', error);
		throw error;
	}
}

/**
 * Health check for database
 */
export async function checkDatabaseHealth(): Promise<{
	healthy: boolean;
	stats?: Awaited<ReturnType<typeof getDatabaseStats>>;
	error?: string;
}> {
	try {
		const stats = await getDatabaseStats();
		return {
			healthy: true,
			stats: stats
		};
	} catch (error) {
		return {
			healthy: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}