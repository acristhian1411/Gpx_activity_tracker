import { eq, asc, desc, and, gte, lte, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { gpsPoints } from '../db/schema.js';
import type { GPSPoint, NewGPSPoint } from '../db/types.js';

/**
 * Repository for GPS Point data management
 * Handles all database operations related to GPS points
 */
export class GPSPointRepository {
	/**
	 * Create a new GPS point
	 */
	async create(gpsPointData: NewGPSPoint): Promise<GPSPoint> {
		try {
			const [newGPSPoint] = await db
				.insert(gpsPoints)
				.values(gpsPointData)
				.returning();

			return newGPSPoint;
		} catch (error) {
			throw new Error(`Failed to create GPS point: ${error}`);
		}
	}

	/**
	 * Create multiple GPS points in batch
	 * Processes large datasets in chunks to avoid SQLite parameter limits
	 */
	async createBatch(gpsPointsData: NewGPSPoint[]): Promise<GPSPoint[]> {
		try {
			if (gpsPointsData.length === 0) return [];

			console.log(`Creating batch of ${gpsPointsData.length} GPS points`);

			// Try with larger batch size first, fall back to smaller if needed
			try {
				return await this.createBatchWithSize(gpsPointsData, 100);
			} catch (error) {
				console.warn('Large batch failed, trying smaller batch size:', error);
				return await this.createBatchWithSize(gpsPointsData, 50);
			}
		} catch (error) {
			console.error(`Failed to create GPS points batch: ${error}`);
			throw new Error(`Failed to create GPS points batch: ${error}`);
		}
	}

	/**
	 * Create GPS points with specific batch size
	 */
	private async createBatchWithSize(gpsPointsData: NewGPSPoint[], batchSize: number): Promise<GPSPoint[]> {
		const allCreatedPoints: GPSPoint[] = [];
		const totalBatches = Math.ceil(gpsPointsData.length / batchSize);

		// Process in chunks
		for (let i = 0; i < gpsPointsData.length; i += batchSize) {
			const chunk = gpsPointsData.slice(i, i + batchSize);
			const batchNumber = Math.floor(i / batchSize) + 1;
			
			console.log(`Processing batch ${batchNumber}/${totalBatches} (${chunk.length} points, batch size: ${batchSize})`);
			
			const chunkResults = await db
				.insert(gpsPoints)
				.values(chunk)
				.returning();
			
			allCreatedPoints.push(...chunkResults);
		}

		console.log(`Successfully created ${allCreatedPoints.length} GPS points`);
		return allCreatedPoints;
	}

	/**
	 * Get GPS point by ID
	 */
	async findById(id: number): Promise<GPSPoint | null> {
		try {
			const [gpsPoint] = await db
				.select()
				.from(gpsPoints)
				.where(eq(gpsPoints.id, id))
				.limit(1);

			return gpsPoint || null;
		} catch (error) {
			throw new Error(`Failed to find GPS point by ID: ${error}`);
		}
	}

	/**
	 * Get all GPS points for an activity, ordered by sequence
	 */
	async findByActivityId(activityId: number): Promise<GPSPoint[]> {
		try {
			return await db
				.select()
				.from(gpsPoints)
				.where(eq(gpsPoints.activityId, activityId))
				.orderBy(asc(gpsPoints.sequenceOrder));
		} catch (error) {
			throw new Error(`Failed to find GPS points by activity ID: ${error}`);
		}
	}

	/**
	 * Get GPS points for an activity within a sequence range
	 */
	async findByActivityIdAndSequenceRange(
		activityId: number,
		startSequence: number,
		endSequence: number
	): Promise<GPSPoint[]> {
		try {
			return await db
				.select()
				.from(gpsPoints)
				.where(
					and(
						eq(gpsPoints.activityId, activityId),
						gte(gpsPoints.sequenceOrder, startSequence),
						lte(gpsPoints.sequenceOrder, endSequence)
					)
				)
				.orderBy(asc(gpsPoints.sequenceOrder));
		} catch (error) {
			throw new Error(`Failed to find GPS points by sequence range: ${error}`);
		}
	}

	/**
	 * Get GPS points for an activity within a time range
	 */
	async findByActivityIdAndTimeRange(
		activityId: number,
		startTime: string,
		endTime: string
	): Promise<GPSPoint[]> {
		try {
			return await db
				.select()
				.from(gpsPoints)
				.where(
					and(
						eq(gpsPoints.activityId, activityId),
						gte(gpsPoints.timestamp, startTime),
						lte(gpsPoints.timestamp, endTime)
					)
				)
				.orderBy(asc(gpsPoints.timestamp));
		} catch (error) {
			throw new Error(`Failed to find GPS points by time range: ${error}`);
		}
	}

	/**
	 * Get first GPS point for an activity
	 */
	async findFirstByActivityId(activityId: number): Promise<GPSPoint | null> {
		try {
			const [firstPoint] = await db
				.select()
				.from(gpsPoints)
				.where(eq(gpsPoints.activityId, activityId))
				.orderBy(asc(gpsPoints.sequenceOrder))
				.limit(1);

			return firstPoint || null;
		} catch (error) {
			throw new Error(`Failed to find first GPS point: ${error}`);
		}
	}

	/**
	 * Get last GPS point for an activity
	 */
	async findLastByActivityId(activityId: number): Promise<GPSPoint | null> {
		try {
			const [lastPoint] = await db
				.select()
				.from(gpsPoints)
				.where(eq(gpsPoints.activityId, activityId))
				.orderBy(desc(gpsPoints.sequenceOrder))
				.limit(1);

			return lastPoint || null;
		} catch (error) {
			throw new Error(`Failed to find last GPS point: ${error}`);
		}
	}

	/**
	 * Update a GPS point
	 */
	async update(id: number, updates: Partial<NewGPSPoint>): Promise<GPSPoint | null> {
		try {
			const [updatedGPSPoint] = await db
				.update(gpsPoints)
				.set(updates)
				.where(eq(gpsPoints.id, id))
				.returning();

			return updatedGPSPoint || null;
		} catch (error) {
			throw new Error(`Failed to update GPS point: ${error}`);
		}
	}

	/**
	 * Delete a GPS point
	 */
	async delete(id: number): Promise<boolean> {
		try {
			const result = await db
				.delete(gpsPoints)
				.where(eq(gpsPoints.id, id));

			return result.changes > 0;
		} catch (error) {
			throw new Error(`Failed to delete GPS point: ${error}`);
		}
	}

	/**
	 * Delete all GPS points for an activity
	 */
	async deleteByActivityId(activityId: number): Promise<number> {
		try {
			const result = await db
				.delete(gpsPoints)
				.where(eq(gpsPoints.activityId, activityId));

			return result.changes;
		} catch (error) {
			throw new Error(`Failed to delete GPS points by activity ID: ${error}`);
		}
	}

	/**
	 * Get count of GPS points for an activity
	 */
	async countByActivityId(activityId: number): Promise<number> {
		try {
			const [result] = await db
				.select({ count: count() })
				.from(gpsPoints)
				.where(eq(gpsPoints.activityId, activityId));

			return result.count;
		} catch (error) {
			throw new Error(`Failed to count GPS points by activity ID: ${error}`);
		}
	}

	/**
	 * Get GPS points with elevation data for an activity
	 */
	async findWithElevationByActivityId(activityId: number): Promise<GPSPoint[]> {
		try {
			return await db
				.select()
				.from(gpsPoints)
				.where(
					and(
						eq(gpsPoints.activityId, activityId),
						// Only points with elevation data
						gte(gpsPoints.elevation, 0)
					)
				)
				.orderBy(asc(gpsPoints.sequenceOrder));
		} catch (error) {
			throw new Error(`Failed to find GPS points with elevation: ${error}`);
		}
	}

	/**
	 * Get simplified GPS points for map rendering (every nth point)
	 */
	async findSimplifiedByActivityId(activityId: number, step: number = 5): Promise<GPSPoint[]> {
		try {
			// Get all points first, then filter by step in application
			// This is simpler than complex SQL modulo operations
			const allPoints = await this.findByActivityId(activityId);
			
			// Return every nth point, but always include first and last
			const simplified: GPSPoint[] = [];
			
			if (allPoints.length > 0) {
				simplified.push(allPoints[0]); // Always include first point
				
				for (let i = step; i < allPoints.length - 1; i += step) {
					simplified.push(allPoints[i]);
				}
				
				if (allPoints.length > 1) {
					simplified.push(allPoints[allPoints.length - 1]); // Always include last point
				}
			}
			
			return simplified;
		} catch (error) {
			throw new Error(`Failed to find simplified GPS points: ${error}`);
		}
	}
}

// Create and export singleton instance
export const gpsPointRepository = new GPSPointRepository();