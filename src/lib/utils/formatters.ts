/**
 * Utility functions for formatting data in the UI
 */

/**
 * Format distance from meters to human-readable format
 */
export function formatDistance(meters: number): string {
	if (meters >= 1000) {
		return `${(meters / 1000).toFixed(1)} km`;
	}
	return `${Math.round(meters)} m`;
}

/**
 * Format duration from seconds to human-readable format
 */
export function formatDuration(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remainingSeconds = seconds % 60;

	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	} else if (minutes > 0) {
		return `${minutes}m ${Math.round(remainingSeconds)}s`;
	} else {
		return `${Math.round(remainingSeconds)}s`;
	}
}

/**
 * Format speed from m/s to km/h
 */
export function formatSpeed(metersPerSecond: number): string {
	const kmh = metersPerSecond * 3.6;
	return `${kmh.toFixed(1)} km/h`;
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): {
	percentage: number;
	trend: 'up' | 'down' | 'neutral';
	formatted: string;
} {
	if (previous === 0) {
		return {
			percentage: current > 0 ? 100 : 0,
			trend: current > 0 ? 'up' : 'neutral',
			formatted: current > 0 ? '100%' : '0%'
		};
	}

	const percentage = ((current - previous) / previous) * 100;
	const trend = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral';
	
	return {
		percentage: Math.abs(percentage),
		trend,
		formatted: `${Math.abs(percentage).toFixed(1)}%`
	};
}

/**
 * Format activity type for display
 */
export function formatActivityType(type: string): string {
	return type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

/**
 * Format month name from YYYY-MM format
 */
export function formatMonthName(monthString: string): string {
	const [year, month] = monthString.split('-');
	const date = new Date(parseInt(year), parseInt(month) - 1);
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long'
	});
}