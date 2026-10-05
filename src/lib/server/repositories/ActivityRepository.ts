import { eq, desc, asc, and, gte, lte, count, isNull } from 'drizzle-orm';
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
	 * Get activity by ID (scoped to a user)
	 */
	async findById(id: number, userId: number): Promise<Activity | null> {
		try {
			const [activity] = await db
				.select()
				.from(activities)
				.where(and(eq(activities.id, id), eq(activities.userId, userId)))
				.limit(1);

			return activity || null;
		} catch (error) {
			throw new Error(`Failed to find activity by ID: ${error}`);
		}
	}

	/**
	 * Get activity by ID with GPS points (scoped to a user)
	 */
	async findByIdWithGPSPoints(id: number, userId: number): Promise<ActivityWithGPSPoints | null> {
		try {
			const activity = await this.findById(id, userId);
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
	 * Get all activities for a user ordered by start time (newest first)
	 */
	async findAll(userId: number, limit?: number, offset?: number): Promise<Activity[]> {
		try {
			const query = db
				.select()
				.from(activities)
				.where(eq(activities.userId, userId))
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
	 * Get activities within a date range (scoped to a user)
	 */
	async findByDateRange(userId: number, startDate: string, endDate: string): Promise<Activity[]> {
		try {
			return await db
				.select()
				.from(activities)
				.where(
					and(
						eq(activities.userId, userId),
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
	 * Get activities by type (scoped to a user)
	 */
	async findByType(userId: number, type: string): Promise<Activity[]> {
		try {
			return await db
				.select()
				.from(activities)
				.where(and(eq(activities.userId, userId), eq(activities.type, type)))
				.orderBy(desc(activities.startTime));
		} catch (error) {
			throw new Error(`Failed to find activities by type: ${error}`);
		}
	}

	/**
	 * Update an activity (scoped to a user)
	 */
	async update(
		id: number,
		userId: number,
		updates: Partial<NewActivity>
	): Promise<Activity | null> {
		try {
			const [updatedActivity] = await db
				.update(activities)
				.set({
					...updates,
					updatedAt: new Date().toISOString()
				})
				.where(and(eq(activities.id, id), eq(activities.userId, userId)))
				.returning();

			return updatedActivity || null;
		} catch (error) {
			throw new Error(`Failed to update activity: ${error}`);
		}
	}

	/**
	 * Delete an activity (scoped to a user; will cascade delete GPS points)
	 */
	async delete(id: number, userId: number): Promise<boolean> {
		try {
			const result = await db
				.delete(activities)
				.where(and(eq(activities.id, id), eq(activities.userId, userId)));

			return result.changes > 0;
		} catch (error) {
			throw new Error(`Failed to delete activity: ${error}`);
		}
	}

	/**
	 * Get total count of activities (scoped to a user)
	 */
	async count(userId: number): Promise<number> {
		try {
			const [result] = await db
				.select({ count: count() })
				.from(activities)
				.where(eq(activities.userId, userId));

			return result.count;
		} catch (error) {
			throw new Error(`Failed to count activities: ${error}`);
		}
	}

	/**
	 * Check if activity exists (scoped to a user)
	 */
	async exists(id: number, userId: number): Promise<boolean> {
		try {
			const activity = await this.findById(id, userId);
			return activity !== null;
		} catch (error) {
			throw new Error(`Failed to check if activity exists: ${error}`);
		}
	}

	/**
	 * Assign activities without an owner (pre-auth data) to the given user.
	 * Used as a one-time backfill for the first user that logs in.
	 */
	async assignOrphansToUser(userId: number): Promise<number> {
		try {
			const result = await db.update(activities).set({ userId }).where(isNull(activities.userId));

			return result.changes;
		} catch (error) {
			throw new Error(`Failed to assign orphan activities to user: ${error}`);
		}
	}
}

// Create and export singleton instance
export const activityRepository = new ActivityRepository();
