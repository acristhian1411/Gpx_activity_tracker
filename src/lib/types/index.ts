/**
 * Main types export file for GPX Activity Tracker
 * Centralizes all type definitions for easy importing
 */

// Activity types
export type {
  Activity,
  GPSPoint,
  ActivityStats,
  MonthlyStats,
  ActivityType
} from './activity.js';

// Error types
export type {
  AppError,
  ErrorCode
} from './errors.js';

export {
  ERROR_CODES,
  GPXActivityError
} from './errors.js';

// API types
export type {
  ApiResponse,
  ActivityListResponse,
  ActivityResponse,
  ActivityCreateRequest,
  ActivityCreateResponse,
  StatsResponse,
  UploadResponse,
  MapDataResponse,
  MapExportResponse,
  PaginationParams,
  PaginatedResponse
} from './api.js';