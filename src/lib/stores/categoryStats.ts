/**
 * Category statistics store for dashboard data management
 */

import { writable, derived } from 'svelte/store';
import { formatters } from '../utils/formatters.js';

export interface CategoryStats {
  type: string;
  totalActivities: number;
  totalDistance: number;
  totalDuration: number;
  averageDistance: number;
  averageDuration: number;
}

// Store for raw category statistics data
export const categoryStatsData = writable<CategoryStats[]>([]);

// Store for loading state
export const categoryStatsLoading = writable<boolean>(false);

// Store for error state
export const categoryStatsError = writable<string | null>(null);

// Derived store for formatted category statistics
export const formattedCategoryStats = derived(categoryStatsData, ($categoryStatsData) => {
  if (!$categoryStatsData || $categoryStatsData.length === 0) return [];

  return $categoryStatsData.map(stats => ({
    type: stats.type,
    displayName: formatters.formatActivityType(stats.type),
    totalActivities: stats.totalActivities.toString(),
    totalDistance: formatters.formatDistance(stats.totalDistance),
    totalDuration: formatters.formatDuration(stats.totalDuration),
    averageDistance: formatters.formatDistance(stats.averageDistance),
    averageDuration: formatters.formatDuration(stats.averageDuration),
    // Add icon based on activity type
    icon: getActivityIcon(stats.type)
  }));
});

/**
 * Get icon for activity type
 */
function getActivityIcon(type: string): string {
  switch (type) {
    case 'running': return '🏃‍♂️';
    case 'cycling': return '🚴‍♂️';
    case 'walking': return '🚶‍♂️';
    case 'hiking': return '🥾';
    default: return '🏃‍♂️';
  }
}

/**
 * Fetch category statistics from the API
 */
export async function fetchCategoryStats(): Promise<void> {
  categoryStatsLoading.set(true);
  categoryStatsError.set(null);

  try {
    const response = await fetch('/api/stats/by-category');
    const result = await response.json();

    if (result.success && result.data) {
      categoryStatsData.set(result.data);
    } else {
      categoryStatsError.set(result.error?.message || 'Failed to fetch category statistics');
    }
  } catch (error) {
    console.error('Error fetching category stats:', error);
    categoryStatsError.set('Failed to fetch category statistics');
  } finally {
    categoryStatsLoading.set(false);
  }
}

/**
 * Reset category statistics store
 */
export function resetCategoryStats(): void {
  categoryStatsData.set([]);
  categoryStatsLoading.set(false);
  categoryStatsError.set(null);
}