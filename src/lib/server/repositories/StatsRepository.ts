import { sql, eq, and, gte, lte, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { activities } from '../db/schema.js';
import type { Activity, ActivityStats, MonthlyStats } from '../db/types.js';

/**
 * Repository for dashboard statistics
 * Handles all database operations related to activity statistics and aggregations
 */
export class StatsRepository {
	/**
	 * Get comprehensive activity statistics
	 */
	async getActivityStats(userId: number): Promise<ActivityStats> {
		try {
			const currentDate = new Date();
			const currentMonth = this.formatMonth(currentDate);
			const previousMonth = this.formatMonth(this.getPreviousMonth(currentDate));

			const [
				totalStats,
				longestDistanceActivity,
				longestDurationActivity,
				currentMonthStats,
				previousMonthStats
			] = await Promise.all([
				this.getTotalStats(userId),
				this.getLongestDistanceActivity(userId),
				this.getLongestDurationActivity(userId),
				this.getMonthlyStats(userId, currentMonth),
				this.getMonthlyStats(userId, previousMonth)
			]);

			return {
				totalActivities: totalStats.totalActivities,
				totalDistance: totalStats.totalDistance,
				totalDuration: totalStats.totalDuration,
				longestDistanceActivity,
				longestDurationActivity,
				currentMonthStats,
				previousMonthStats
			};
		} catch (error) {
			throw new Error(`Failed to get activity stats: ${error}`);
		}
	}

	/**
	 * Get total statistics across all activities
	 */
	async getTotalStats(userId: number): Promise<{
		totalActivities: number;
		totalDistance: number;
		totalDuration: number;
	}> {
		try {
			const [result] = await db
				.select({
					totalActivities: count(),
					totalDistance: sql<number>`COALESCE(SUM(${activities.distance}), 0)`,
					totalDuration: sql<number>`COALESCE(SUM(${activities.duration}), 0)`
				})
				.from(activities)
				.where(eq(activities.userId, userId));

			return {
				totalActivities: result.totalActivities,
				totalDistance: result.totalDistance || 0,
				totalDuration: result.totalDuration || 0
			};
		} catch (error) {
			throw new Error(`Failed to get total stats: ${error}`);
		}
	}

	/**
	 * Get monthly statistics for a specific month
	 */
	async getMonthlyStats(userId: number, month: string): Promise<MonthlyStats> {
		try {
			const startOfMonth = `${month}-01`;
			const endOfMonth = this.getEndOfMonth(month);

			const [result] = await db
				.select({
					activities: count(),
					distance: sql<number>`COALESCE(SUM(${activities.distance}), 0)`,
					duration: sql<number>`COALESCE(SUM(${activities.duration}), 0)`
				})
				.from(activities)
				.where(
					and(
						eq(activities.userId, userId),
						gte(activities.startTime, startOfMonth),
						lte(activities.startTime, endOfMonth)
					)
				);

			return {
				activities: result.activities,
				distance: result.distance || 0,
				duration: result.duration || 0,
				month
			};
		} catch (error) {
			throw new Error(`Failed to get monthly stats for ${month}: ${error}`);
		}
	}

	/**
	 * Get activity with longest distance
	 */
	async getLongestDistanceActivity(userId: number): Promise<Activity | undefined> {
		try {
			const [activity] = await db
				.select()
				.from(activities)
				.where(eq(activities.userId, userId))
				.orderBy(sql`${activities.distance} DESC`)
				.limit(1);

			return activity;
		} catch (error) {
			throw new Error(`Failed to get longest distance activity: ${error}`);
		}
	}

	/**
	 * Get activity with longest duration
	 */
	async getLongestDurationActivity(userId: number): Promise<Activity | undefined> {
		try {
			const [activity] = await db
				.select()
				.from(activities)
				.where(eq(activities.userId, userId))
				.orderBy(sql`${activities.duration} DESC`)
				.limit(1);

			return activity;
		} catch (error) {
			throw new Error(`Failed to get longest duration activity: ${error}`);
		}
	}

	/**
	 * Get statistics by activity type
	 */
	async getStatsByType(
		userId: number,
		type: string
	): Promise<{
		totalActivities: number;
		totalDistance: number;
		totalDuration: number;
		averageDistance: number;
		averageDuration: number;
	}> {
		try {
			const [result] = await db
				.select({
					totalActivities: count(),
					totalDistance: sql<number>`COALESCE(SUM(${activities.distance}), 0)`,
					totalDuration: sql<number>`COALESCE(SUM(${activities.duration}), 0)`,
					averageDistance: sql<number>`COALESCE(AVG(${activities.distance}), 0)`,
					averageDuration: sql<number>`COALESCE(AVG(${activities.duration}), 0)`
				})
				.from(activities)
				.where(and(eq(activities.userId, userId), eq(activities.type, type)));

			return {
				totalActivities: result.totalActivities,
				totalDistance: result.totalDistance || 0,
				totalDuration: result.totalDuration || 0,
				averageDistance: result.averageDistance || 0,
				averageDuration: result.averageDuration || 0
			};
		} catch (error) {
			throw new Error(`Failed to get stats by type ${type}: ${error}`);
		}
	}

	/**
	 * Get statistics for a date range
	 */
	async getStatsForDateRange(
		userId: number,
		startDate: string,
		endDate: string
	): Promise<{
		totalActivities: number;
		totalDistance: number;
		totalDuration: number;
		averageDistance: number;
		averageDuration: number;
	}> {
		try {
			const [result] = await db
				.select({
					totalActivities: count(),
					totalDistance: sql<number>`COALESCE(SUM(${activities.distance}), 0)`,
					totalDuration: sql<number>`COALESCE(SUM(${activities.duration}), 0)`,
					averageDistance: sql<number>`COALESCE(AVG(${activities.distance}), 0)`,
					averageDuration: sql<number>`COALESCE(AVG(${activities.duration}), 0)`
				})
				.from(activities)
				.where(
					and(
						eq(activities.userId, userId),
						gte(activities.startTime, startDate),
						lte(activities.startTime, endDate)
					)
				);

			return {
				totalActivities: result.totalActivities,
				totalDistance: result.totalDistance || 0,
				totalDuration: result.totalDuration || 0,
				averageDistance: result.averageDistance || 0,
				averageDuration: result.averageDuration || 0
			};
		} catch (error) {
			throw new Error(`Failed to get stats for date range: ${error}`);
		}
	}

	/**
	 * Get recent activities summary (last N activities)
	 */
	async getRecentActivitiesSummary(
		userId: number,
		limit: number = 10
	): Promise<{
		activities: Activity[];
		totalDistance: number;
		totalDuration: number;
		averageDistance: number;
		averageDuration: number;
	}> {
		try {
			const recentActivities = await db
				.select()
				.from(activities)
				.where(eq(activities.userId, userId))
				.orderBy(sql`${activities.startTime} DESC`)
				.limit(limit);

			const totalDistance = recentActivities.reduce(
				(sum: number, activity: Activity) => sum + activity.distance,
				0
			);
			const totalDuration = recentActivities.reduce(
				(sum: number, activity: Activity) => sum + activity.duration,
				0
			);
			const count = recentActivities.length;

			return {
				activities: recentActivities,
				totalDistance,
				totalDuration,
				averageDistance: count > 0 ? totalDistance / count : 0,
				averageDuration: count > 0 ? totalDuration / count : 0
			};
		} catch (error) {
			throw new Error(`Failed to get recent activities summary: ${error}`);
		}
	}

	/**
	 * Get activity count by month for the last N months
	 */
	async getActivityCountByMonth(
		userId: number,
		months: number = 12
	): Promise<
		Array<{
			month: string;
			count: number;
			distance: number;
			duration: number;
		}>
	> {
		try {
			const results: Array<{
				month: string;
				count: number;
				distance: number;
				duration: number;
			}> = [];

			const currentDate = new Date();

			for (let i = 0; i < months; i++) {
				const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
				const month = this.formatMonth(targetDate);
				const monthStats = await this.getMonthlyStats(userId, month);

				results.push({
					month,
					count: monthStats.activities,
					distance: monthStats.distance,
					duration: monthStats.duration
				});
			}

			return results.reverse(); // Return in chronological order
		} catch (error) {
			throw new Error(`Failed to get activity count by month: ${error}`);
		}
	}

	/**
	 * Get personal records (fastest speeds, longest distances, etc.)
	 */
	async getPersonalRecords(userId: number): Promise<{
		fastestAverageSpeed?: Activity;
		fastestMaxSpeed?: Activity;
		longestDistance?: Activity;
		longestDuration?: Activity;
		highestElevationGain?: Activity;
	}> {
		try {
			const [
				fastestAverageSpeed,
				fastestMaxSpeed,
				longestDistance,
				longestDuration,
				highestElevationGain
			] = await Promise.all([
				db
					.select()
					.from(activities)
					.where(eq(activities.userId, userId))
					.orderBy(sql`${activities.averageSpeed} DESC`)
					.limit(1),
				db
					.select()
					.from(activities)
					.where(eq(activities.userId, userId))
					.orderBy(sql`${activities.maxSpeed} DESC`)
					.limit(1),
				db
					.select()
					.from(activities)
					.where(eq(activities.userId, userId))
					.orderBy(sql`${activities.distance} DESC`)
					.limit(1),
				db
					.select()
					.from(activities)
					.where(eq(activities.userId, userId))
					.orderBy(sql`${activities.duration} DESC`)
					.limit(1),
				db
					.select()
					.from(activities)
					.where(eq(activities.userId, userId))
					.orderBy(sql`${activities.elevationGain} DESC`)
					.limit(1)
			]);

			return {
				fastestAverageSpeed: fastestAverageSpeed[0],
				fastestMaxSpeed: fastestMaxSpeed[0],
				longestDistance: longestDistance[0],
				longestDuration: longestDuration[0],
				highestElevationGain: highestElevationGain[0]
			};
		} catch (error) {
			throw new Error(`Failed to get personal records: ${error}`);
		}
	}

	/**
	 * Helper: Format date as YYYY-MM
	 */
	private formatMonth(date: Date): string {
		const year = date.getFullYear();
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		return `${year}-${month}`;
	}

	/**
	 * Helper: Get previous month date
	 */
	private getPreviousMonth(date: Date): Date {
		const previousMonth = new Date(date);
		previousMonth.setMonth(date.getMonth() - 1);
		return previousMonth;
	}

	/**
	 * Helper: Get end of month string
	 */
	private getEndOfMonth(monthString: string): string {
		const [year, month] = monthString.split('-').map(Number);
		const lastDay = new Date(year, month, 0).getDate();
		return `${monthString}-${lastDay.toString().padStart(2, '0')} 23:59:59`;
	}
}

// Create and export singleton instance
export const statsRepository = new StatsRepository();
