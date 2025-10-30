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
export function formatDate(date: Date | string): string {
	const dateObj = date instanceof Date ? date : new Date(date);
	return dateObj.toLocaleDateString('es-PY', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

/**
 * Generate activity name with format: {Type} {Day} {Date}
 * Example: "Cycling Sunday 26th Oct"
 */
export function generateActivityName(activityType: string, date: Date): string {
	const typeLabel = activityType.charAt(0).toUpperCase() + activityType.slice(1);
	
	const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
	
	const day = date.getDate();
	const ordinalSuffix = getOrdinalSuffix(day);
	
	const month = date.toLocaleDateString('en-US', { month: 'short' });
	
	return `${typeLabel} ${dayName} ${day}${ordinalSuffix} ${month}`;
}

/**
 * Get ordinal suffix for day (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinalSuffix(day: number): string {
	if (day >= 11 && day <= 13) {
		return 'th';
	}
	
	switch (day % 10) {
		case 1: return 'st';
		case 2: return 'nd';
		case 3: return 'rd';
		default: return 'th';
	}
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

/**
 * Format time for display
 */
export function formatTime(date: Date | string): string {
	const dateObj = date instanceof Date ? date : new Date(date);
	return dateObj.toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit'
	});
}

/**
 * Format elevation from meters
 */
export function formatElevation(meters: number): string {
	return `${Math.round(meters)} m`;
}

/**
 * Format pace from speed (m/s to min/km)
 */
export function formatPace(metersPerSecond: number): string {
	if (metersPerSecond === 0) return '0:00 /km';
	
	const kmh = metersPerSecond * 3.6;
	const minPerKm = 60 / kmh;
	const minutes = Math.floor(minPerKm);
	const seconds = Math.round((minPerKm - minutes) * 60);
	
	return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
}

// Export all formatters as a single object for easier importing
export const formatters = {
	formatDistance,
	formatDuration,
	formatSpeed,
	formatPace,
	formatDate,
	formatTime,
	formatElevation,
	formatActivityType,
	formatMonthName,
	calculatePercentageChange,
	generateActivityName
};