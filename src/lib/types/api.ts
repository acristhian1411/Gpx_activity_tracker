/**
 * API response type definitions for GPX Activity Tracker
 */

import type { Activity, ActivityStats, GPSPoint } from './activity.js';
import type { AppError } from './errors.js';

// Base API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AppError;
  message?: string;
}

// Activity API responses
export interface ActivityListResponse extends ApiResponse<Activity[]> {}

export interface ActivityResponse extends ApiResponse<Activity> {}

export interface ActivityCreateRequest {
  name?: string;
  type?: string;
}

export interface ActivityCreateResponse extends ApiResponse<Activity> {}

// Statistics API responses
export interface StatsResponse extends ApiResponse<ActivityStats> {}

// File upload API responses
export interface UploadResponse extends ApiResponse<{
  activity: Activity;
  message: string;
}> {}

// Map API responses
export interface MapDataResponse extends ApiResponse<{
  activity: Activity;
  gpsPoints: GPSPoint[];
}> {}

export interface MapExportResponse extends ApiResponse<{
  imageUrl: string;
  imageData?: string; // base64 encoded image data
}> {}

// Pagination types for large datasets
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}