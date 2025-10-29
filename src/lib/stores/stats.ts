/**
 * Statistics store for dashboard data management
 */

import { writable, derived } from 'svelte/store';
import type { ActivityStats } from '$lib/types';
import { formatDistance, formatDuration, calculatePercentageChange } from '$lib/utils/formatters';

// Store for raw statistics data
export const statsData = writable<ActivityStats | null>(null);

// Store for loading state
export const statsLoading = writable<boolean>(false);

// Store for error state
export const statsError = writable<string | null>(null);

// Derived store for formatted statistics
export const formattedStats = derived(statsData, ($statsData) => {
	if (!$statsData) return null;

	const distanceChange = calculatePercentageChange(
		$statsData.currentMonthStats.distance,
		$statsData.previousMonthStats.distance
	);

	const activitiesChange = calculatePercentageChange(
		$statsData.currentMonthStats.activities,
		$statsData.previousMonthStats.activities
	);

	const durationChange = calculatePercentageChange(
		$statsData.currentMonthStats.duration,
		$statsData.previousMonthStats.duration
	);

	return {
		totalDistance: formatDistance($statsData.totalDistance),
		totalActivities: $statsData.totalActivities.toString(),
		totalDuration: formatDuration($statsData.totalDuration),
		longestDistance: $statsData.longestDistanceActivity 
			? formatDistance($statsData.longestDistanceActivity.distance)
			: 'No activities',
		longestDuration: $statsData.longestDurationActivity
			? formatDuration($statsData.longestDurationActivity.duration)
			: 'No activities',
		currentMonthDistance: formatDistance($statsData.currentMonthStats.distance),
		currentMonthActivities: $statsData.currentMonthStats.activities.toString(),
		currentMonthDuration: formatDuration($statsData.currentMonthStats.duration),
		distanceChange,
		activitiesChange,
		durationChange,
		hasActivities: $statsData.totalActivities > 0
	};
});

/**
 * Fetch statistics from the API
 */
export async function fetchStats(): Promise<void> {
	statsLoading.set(true);
	statsError.set(null);

	try {
		const response = await fetch('/api/stats');
		const result = await response.json();

		if (result.success && result.data) {
			// Convert date strings back to Date objects
			const data = result.data;
			if (data.longestDistanceActivity) {
				data.longestDistanceActivity.startTime = new Date(data.longestDistanceActivity.startTime);
				data.longestDistanceActivity.endTime = new Date(data.longestDistanceActivity.endTime);
				data.longestDistanceActivity.createdAt = new Date(data.longestDistanceActivity.createdAt);
				data.longestDistanceActivity.updatedAt = new Date(data.longestDistanceActivity.updatedAt);
			}
			if (data.longestDurationActivity) {
				data.longestDurationActivity.startTime = new Date(data.longestDurationActivity.startTime);
				data.longestDurationActivity.endTime = new Date(data.longestDurationActivity.endTime);
				data.longestDurationActivity.createdAt = new Date(data.longestDurationActivity.createdAt);
				data.longestDurationActivity.updatedAt = new Date(data.longestDurationActivity.updatedAt);
			}
			
			statsData.set(data);
		} else {
			statsError.set(result.error?.message || 'Failed to fetch statistics');
		}
	} catch (error) {
		console.error('Error fetching stats:', error);
		statsError.set('Failed to fetch statistics');
	} finally {
		statsLoading.set(false);
	}
}

/**
 * Reset statistics store
 */
export function resetStats(): void {
	statsData.set(null);
	statsLoading.set(false);
	statsError.set(null);
}