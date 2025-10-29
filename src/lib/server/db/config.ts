/**
 * Database configuration constants
 */
export const DB_CONFIG = {
	// File size limits
	MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
	
	// Query limits
	DEFAULT_PAGE_SIZE: 20,
	MAX_PAGE_SIZE: 100,
	
	// Activity types
	ACTIVITY_TYPES: [
		'running',
		'cycling', 
		'walking',
		'hiking',
		'unknown'
	] as const,
	
	// GPS point batch size for processing
	GPS_BATCH_SIZE: 1000,
	
	// Database connection settings
	CONNECTION_TIMEOUT: 30000, // 30 seconds
	
	// Migration settings
	MIGRATIONS_FOLDER: 'drizzle'
} as const;

export type ActivityType = typeof DB_CONFIG.ACTIVITY_TYPES[number];