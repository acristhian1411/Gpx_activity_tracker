import { eq, desc, asc, and, gte, lte, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { activities, gpsPoints } from '../db/schema.js';
import type { Activity, NewActivity, ActivityWithGPSPoints } from '../db/types.js';

/**
 * Repository for Activity CRUD operations
 * Handles all database operations related to activities
 */
export class ActivityRepository {
	/**
	 * Create a new activity
	 */
	async create(activityData: NewActivity): Promise<Activity> {
		try {
			const [newActivity] = await db
				.insert(activities)
				.values({
					...activityData,
					updatedAt: new Date().toISOString()
				})
				.returning();

			return newActivity;
		} catch (error) {
			throw new Error(`Failed to create activity: ${error}`);
		}
	}

	/**
	 * Get activity by ID
	 */
	async findById(id: number): Promise<Activity | null> {
		try {
			const [activity] = await db
				.select()
				.from(activities)
				.where(eq(activities.id, id))
				.limit(1);

			return activity || null;
		} catch (error) {
			throw new Error(`Failed to find activity by ID: ${error}`);
		}
	}

	/**
	 * Get activity by ID with GPS points
	 */
	async findByIdWithGPSPoints(id: number): Promise<ActivityWithGPSPoints | null> {
		try {
			const activity = await this.findById(id);
			if (!activity) return null;

			const points = await db
				.select()
				.from(gpsPoints)
				.where(eq(gpsPoints.activityId, id))
				.orderBy(asc(gpsPoints.sequenceOrder));

			return {
				...activity,
				gpsPoints: points
			};
		} catch (error) {
			throw new Error(`Failed to find activity with GPS points: ${error}`);
		}
	}

	/**
	 * Get all activities ordered by start time (newest first)
	 */
	async findAll(limit?: number, offset?: number): Promise<Activity[]> {
		try {
			const query = db
				.select()
				.from(activities)
				.orderBy(desc(activities.startTime));

			if (limit !== undefined && offset !== undefined) {
				return await query.limit(limit).offset(offset);
			} else if (limit !== undefined) {
				return await query.limit(limit);
			} else if (offset !== undefined) {
				return await query.offset(offset);
			}

			return await query;
		} catch (error) {
			throw new Error(`Failed to find all activities: ${error}`);
		}
	}

	/**
	 * Get activities within a date range
	 */
	async findByDateRange(startDate: string, endDate: string): Promise<Activity[]> {
		try {
			return await db
				.select()
				.from(activities)
				.where(
					and(
						gte(activities.startTime, startDate),
						lte(activities.startTime, endDate)
					)
				)
				.orderBy(desc(activities.startTime));
		} catch (error) {
			throw new Error(`Failed to find activities by date range: ${error}`);
		}
	}

	/**
	 * Get activities by type
	 */
	async findByType(type: string): Promise<Activity[]> {
		try {
			return await db
				.select()
				.from(activities)
				.where(eq(activities.type, type))
				.orderBy(desc(activities.startTime));
		} catch (error) {
			throw new Error(`Failed to find activities by type: ${error}`);
		}
	}

	/**
	 * Update an activity
	 */
	async update(id: number, updates: Partial<NewActivity>): Promise<Activity | null> {
		try {
			const [updatedActivity] = await db
				.update(activities)
				.set({
					...updates,
					updatedAt: new Date().toISOString()
				})
				.where(eq(activities.id, id))
				.returning();

			return updatedActivity || null;
		} catch (error) {
			throw new Error(`Failed to update activity: ${error}`);
		}
	}

	/**
	 * Delete an activity (will cascade delete GPS points)
	 */
	async delete(id: number): Promise<boolean> {
		try {
			const result = await db
				.delete(activities)
				.where(eq(activities.id, id));

			return result.changes > 0;
		} catch (error) {
			throw new Error(`Failed to delete activity: ${error}`);
		}
	}

	/**
	 * Get total count of activities
	 */
	async count(): Promise<number> {
		try {
			const [result] = await db
				.select({ count: count() })
				.from(activities);

			return result.count;
		} catch (error) {
			throw new Error(`Failed to count activities: ${error}`);
		}
	}

	/**
	 * Check if activity exists
	 */
	async exists(id: number): Promise<boolean> {
		try {
			const activity = await this.findById(id);
			return activity !== null;
		} catch (error) {
			throw new Error(`Failed to check if activity exists: ${error}`);
		}
	}
}

// Create and export singleton instance
export const activityRepository = new ActivityRepository();