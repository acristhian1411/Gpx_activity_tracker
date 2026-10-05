/**
 * Repository layer exports
 * Provides centralized access to all data access repositories
 */

// Repository classes
export { ActivityRepository, activityRepository } from './ActivityRepository.js';
export { GPSPointRepository, gpsPointRepository } from './GPSPointRepository.js';
export { StatsRepository, statsRepository } from './StatsRepository.js';
export { UserRepository, userRepository } from './UserRepository.js';

// Import instances for the repositories object
import { activityRepository } from './ActivityRepository.js';
import { gpsPointRepository } from './GPSPointRepository.js';
import { statsRepository } from './StatsRepository.js';
import { userRepository } from './UserRepository.js';

// Repository instances for convenience
export const repositories = {
	activity: activityRepository,
	gpsPoint: gpsPointRepository,
	stats: statsRepository,
	user: userRepository
} as const;

// Repository types
export type Repositories = typeof repositories;