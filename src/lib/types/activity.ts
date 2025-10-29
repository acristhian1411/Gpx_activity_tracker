/**
 * Activity-related type definitions for GPX Activity Tracker
 * These types are used for the frontend and API layer
 */

export type ActivityType = 'running' | 'cycling' | 'walking' | 'hiking' | 'unknown';

// Frontend/API Activity interface (with Date objects)
export interface Activity {
  id: number;
  name: string;
  type: ActivityType;
  startTime: Date;
  endTime: Date;
  distance: number; // in meters
  duration: number; // in seconds
  elevationGain: number; // in meters
  averageSpeed: number; // in m/s
  maxSpeed: number; // in m/s
  createdAt: Date;
  updatedAt: Date;
}

// Frontend/API GPS Point interface (with Date objects)
export interface GPSPoint {
  id: number;
  activityId: number;
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp: Date;
  sequenceOrder: number;
}

export interface MonthlyStats {
  activities: number;
  distance: number; // in meters
  duration: number; // in seconds
  month: string; // YYYY-MM format
}

export interface ActivityStats {
  totalActivities: number;
  totalDistance: number; // in meters
  totalDuration: number; // in seconds
  longestDistanceActivity?: Activity;
  longestDurationActivity?: Activity;
  currentMonthStats: MonthlyStats;
  previousMonthStats: MonthlyStats;
}

// Activity with GPS points for detailed views
export interface ActivityWithGPSPoints extends Activity {
  gpsPoints: GPSPoint[];
}