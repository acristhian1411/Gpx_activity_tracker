/**
 * GPX Parser Service
 * Handles GPX file validation, parsing, and metric calculations
 */

// @ts-ignore - gpxparser doesn't have TypeScript definitions
import GPXParser from 'gpxparser';
import type { Activity, GPSPoint, ActivityType } from '../db/types.js';
import { GPXActivityError, ERROR_CODES } from '../../types/errors.js';

export interface ParsedGPXData {
  activity: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>;
  gpsPoints: Omit<GPSPoint, 'id' | 'activityId'>[];
}

export interface GPXValidationResult {
  isValid: boolean;
  error?: string;
  details?: any;
}

export class GPXParserService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_EXTENSIONS = ['.gpx'];

  /**
   * Validates GPX file before processing
   */
  static validateFile(file: File): GPXValidationResult {
    // Check file extension
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!this.ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        isValid: false,
        error: 'Invalid file type. Only .gpx files are allowed.',
        details: { extension, allowedExtensions: this.ALLOWED_EXTENSIONS }
      };
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File too large. Maximum size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB.`,
        details: { fileSize: file.size, maxSize: this.MAX_FILE_SIZE }
      };
    }

    return { isValid: true };
  }

  /**
   * Validates GPX content string
   */
  static validateGPXContent(content: string): GPXValidationResult {
    if (!content || content.trim().length === 0) {
      return {
        isValid: false,
        error: 'GPX file is empty.',
        details: { contentLength: content?.length || 0 }
      };
    }

    // Basic XML structure check
    if (!content.includes('<gpx') || !content.includes('</gpx>')) {
      return {
        isValid: false,
        error: 'Invalid GPX format. Missing required GPX tags.',
        details: { hasGpxTag: content.includes('<gpx'), hasClosingTag: content.includes('</gpx>') }
      };
    }

    return { isValid: true };
  }

  /**
   * Parses GPX file content and extracts activity data
   */
  static async parseGPXContent(content: string, filename?: string, userActivityType?: ActivityType): Promise<ParsedGPXData> {
    try {
      // Validate content first
      const validation = this.validateGPXContent(content);
      if (!validation.isValid) {
        throw new GPXActivityError(
          ERROR_CODES.INVALID_GPX,
          validation.error!,
          validation.details
        );
      }

      // Parse GPX using the library
      const gpx = new GPXParser();
      gpx.parse(content);

      if (!gpx.tracks || gpx.tracks.length === 0) {
        throw new GPXActivityError(
          ERROR_CODES.INVALID_GPX,
          'No tracks found in GPX file.',
          { tracksCount: 0 }
        );
      }

      // Extract the first track (most GPX files have one track)
      const track = gpx.tracks[0];

      if (!track.points || track.points.length === 0) {
        throw new GPXActivityError(
          ERROR_CODES.INVALID_GPX,
          'No track points found in GPX file.',
          { pointsCount: 0 }
        );
      }

      // Get all points from the track
      const allPoints = track.points;

      if (allPoints.length === 0) {
        throw new GPXActivityError(
          ERROR_CODES.INVALID_GPX,
          'No GPS points found in track segments.',
          { pointsCount: 0 }
        );
      }

      // Sort points by time to ensure correct sequence
      allPoints.sort((a: any, b: any) => {
        const timeA = new Date(a.time || 0).getTime();
        const timeB = new Date(b.time || 0).getTime();
        return timeA - timeB;
      });

      // Convert to GPS points (using ISO string for database compatibility)
      let gpsPoints: Omit<any, 'id' | 'activityId'>[] = allPoints.map((point: any, index: number) => ({
        latitude: point.lat,
        longitude: point.lon,
        elevation: point.ele || null,
        timestamp: new Date(point.time).toISOString(),
        sequenceOrder: index
      }));

      // Optimize GPS points for very long activities to avoid database limits
      gpsPoints = this.optimizeGPSPoints(gpsPoints);

      // Calculate metrics
      const metrics = this.calculateMetrics(gpsPoints);

      // Use user-provided activity type or determine from GPX metadata/filename
      const activityType = userActivityType && userActivityType !== 'unknown' 
        ? userActivityType 
        : this.determineActivityType(gpx, filename);

      // Generate activity name using the new format
      const activityName = this.generateActivityName(gpx, filename, activityType, new Date(metrics.startTime));

      const activity: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'> = {
        name: activityName,
        type: activityType,
        startTime: metrics.startTime,
        endTime: metrics.endTime,
        distance: metrics.distance,
        duration: metrics.duration,
        elevationGain: metrics.elevationGain,
        averageSpeed: metrics.averageSpeed,
        maxSpeed: metrics.maxSpeed
      };

      return {
        activity,
        gpsPoints
      };

    } catch (error) {
      if (error instanceof GPXActivityError) {
        throw error;
      }

      throw new GPXActivityError(
        ERROR_CODES.PROCESSING_ERROR,
        `Failed to parse GPX file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error }
      );
    }
  }

  /**
   * Optimizes GPS points for storage and performance
   * Reduces point density for very long activities while preserving accuracy
   */
  private static optimizeGPSPoints(gpsPoints: Omit<GPSPoint, 'id' | 'activityId'>[]): Omit<GPSPoint, 'id' | 'activityId'>[] {
    const MAX_POINTS = 2000; // Maximum number of points to store
    
    if (gpsPoints.length <= MAX_POINTS) {
      console.log(`GPS points (${gpsPoints.length}) within limit, no optimization needed`);
      return gpsPoints;
    }

    console.log(`Optimizing GPS points from ${gpsPoints.length} to ~${MAX_POINTS} points`);

    // Calculate the step size to get approximately MAX_POINTS
    const step = Math.ceil(gpsPoints.length / MAX_POINTS);
    const optimized: Omit<GPSPoint, 'id' | 'activityId'>[] = [];

    // Always include the first point
    optimized.push({ ...gpsPoints[0], sequenceOrder: 0 });

    // Include every nth point
    for (let i = step; i < gpsPoints.length - 1; i += step) {
      optimized.push({ ...gpsPoints[i], sequenceOrder: optimized.length });
    }

    // Always include the last point
    if (gpsPoints.length > 1) {
      optimized.push({ ...gpsPoints[gpsPoints.length - 1], sequenceOrder: optimized.length });
    }

    console.log(`GPS points optimized to ${optimized.length} points (reduction: ${((1 - optimized.length / gpsPoints.length) * 100).toFixed(1)}%)`);
    
    return optimized;
  }

  /**
   * Calculates activity metrics from GPS points
   */
  private static calculateMetrics(gpsPoints: Omit<GPSPoint, 'id' | 'activityId'>[]) {
    if (gpsPoints.length === 0) {
      throw new GPXActivityError(
        ERROR_CODES.PROCESSING_ERROR,
        'Cannot calculate metrics: no GPS points provided'
      );
    }

    const startTime = new Date(gpsPoints[0].timestamp);
    const endTime = new Date(gpsPoints[gpsPoints.length - 1].timestamp);
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // seconds

    let totalDistance = 0;
    let elevationGain = 0;
    let maxSpeed = 0;
    const speeds: number[] = [];

    for (let i = 1; i < gpsPoints.length; i++) {
      const prev = gpsPoints[i - 1];
      const curr = gpsPoints[i];

      // Calculate distance between consecutive points
      const segmentDistance = this.calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
      totalDistance += segmentDistance;

      // Calculate elevation gain
      if (prev.elevation !== null && curr.elevation !== null && prev.elevation !== undefined && curr.elevation !== undefined) {
        const elevationDiff = curr.elevation - prev.elevation;
        if (elevationDiff > 0) {
          elevationGain += elevationDiff;
        }
      }

      // Calculate speed for this segment
      const timeDiff = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000; // seconds
      if (timeDiff > 0) {
        const speed = segmentDistance / timeDiff; // m/s
        speeds.push(speed);
        maxSpeed = Math.max(maxSpeed, speed);
      }
    }

    // Calculate average speed
    const averageSpeed = speeds.length > 0
      ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length
      : totalDistance / duration;

    return {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      distance: totalDistance,
      elevationGain,
      averageSpeed,
      maxSpeed
    };
  }

  /**
   * Calculates distance between two GPS coordinates using Haversine formula
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Converts degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Determines activity type from GPX metadata or filename
   */
  private static determineActivityType(gpx: any, filename?: string): ActivityType {
    // Check GPX metadata first
    if (gpx.metadata?.keywords) {
      const keywords = gpx.metadata.keywords.toLowerCase();
      if (keywords.includes('running') || keywords.includes('run')) return 'running';
      if (keywords.includes('cycling') || keywords.includes('bike')) return 'cycling';
      if (keywords.includes('walking') || keywords.includes('walk')) return 'walking';
      if (keywords.includes('hiking') || keywords.includes('hike')) return 'hiking';
    }

    // Check track name
    if (gpx.tracks?.[0]?.name) {
      const trackName = gpx.tracks[0].name.toLowerCase();
      if (trackName.includes('running') || trackName.includes('run')) return 'running';
      if (trackName.includes('cycling') || trackName.includes('bike')) return 'cycling';
      if (trackName.includes('walking') || trackName.includes('walk')) return 'walking';
      if (trackName.includes('hiking') || trackName.includes('hike')) return 'hiking';
    }

    // Check filename
    if (filename) {
      const name = filename.toLowerCase();
      if (name.includes('running') || name.includes('run')) return 'running';
      if (name.includes('cycling') || name.includes('bike')) return 'cycling';
      if (name.includes('walking') || name.includes('walk')) return 'walking';
      if (name.includes('hiking') || name.includes('hike')) return 'hiking';
    }

    return 'unknown';
  }

  /**
   * Generates a meaningful activity name with format: {Type} {Day} {Date}
   */
  private static generateActivityName(
    gpx: any,
    filename?: string,
    activityType?: ActivityType,
    startTime?: Date
  ): string {
    // Generate name based on activity type and date with new format
    const typeLabel = activityType && activityType !== 'unknown'
      ? activityType.charAt(0).toUpperCase() + activityType.slice(1)
      : 'Activity';

    if (!startTime) {
      return `${typeLabel} - Unknown Date`;
    }

    const dayName = startTime.toLocaleDateString('en-US', { weekday: 'long' });
    const day = startTime.getDate();
    const ordinalSuffix = this.getOrdinalSuffix(day);
    const month = startTime.toLocaleDateString('en-US', { month: 'short' });

    return `${typeLabel} ${dayName} ${day}${ordinalSuffix} ${month}`;
  }

  /**
   * Get ordinal suffix for day (1st, 2nd, 3rd, 4th, etc.)
   */
  private static getOrdinalSuffix(day: number): string {
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
}