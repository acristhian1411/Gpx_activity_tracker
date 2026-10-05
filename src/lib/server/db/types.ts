import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { activities, gpsPoints, users } from './schema.js';

// User types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// Activity types
export type Activity = InferSelectModel<typeof activities>;
export type NewActivity = InferInsertModel<typeof activities>;

// GPS Point types
export type GPSPoint = InferSelectModel<typeof gpsPoints>;
export type NewGPSPoint = InferInsertModel<typeof gpsPoints>;

// Activity type enum
export type ActivityType = 'running' | 'cycling' | 'walking' | 'hiking' | 'unknown';

// Statistics interfaces
export interface ActivityStats {
	totalActivities: number;
	totalDistance: number; // in meters
	totalDuration: number; // in seconds
	longestDistanceActivity?: Activity;
	longestDurationActivity?: Activity;
	currentMonthStats: MonthlyStats;
	previousMonthStats: MonthlyStats;
}

export interface MonthlyStats {
	activities: number;
	distance: number; // in meters
	duration: number; // in seconds
	month: string; // YYYY-MM format
}

// API response types
export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

export interface ActivityWithGPSPoints extends Activity {
	gpsPoints: GPSPoint[];
}

// Database error types
export interface DatabaseError {
	code: string;
	message: string;
	details?: any;
}

// Error codes
export const ERROR_CODES = {
	INVALID_GPX: 'INVALID_GPX_FILE',
	FILE_TOO_LARGE: 'FILE_TOO_LARGE',
	DATABASE_ERROR: 'DATABASE_ERROR',
	ACTIVITY_NOT_FOUND: 'ACTIVITY_NOT_FOUND',
	PROCESSING_ERROR: 'PROCESSING_ERROR',
	CONNECTION_ERROR: 'CONNECTION_ERROR'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];