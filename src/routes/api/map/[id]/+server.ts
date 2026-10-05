/**
 * Map Data API Routes
 * Handles map-related operations for activities
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ActivityRepository, GPSPointRepository } from '$lib/server/repositories';
import { ERROR_CODES } from '$lib/types/errors';
import type { MapDataResponse } from '$lib/types/api';

const activityRepo = new ActivityRepository();
const gpsPointRepo = new GPSPointRepository();

/**
 * GET /api/map/[id] - Get map data for activity
 * Returns GPS points and activity metadata for map rendering
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
  try {
    const activityId = parseInt(params.id);
    
    if (isNaN(activityId)) {
      return json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid activity ID',
          details: { id: params.id }
        }
      }, { status: 400 });
    }

    // Check if activity exists
    const activity = await activityRepo.findById(activityId, locals.user!.id);
    if (!activity) {
      return json({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Activity not found',
          details: { id: activityId }
        }
      }, { status: 404 });
    }

    // Get simplification parameter from query string
    const simplifyParam = url.searchParams.get('simplify');
    const simplify = simplifyParam ? parseInt(simplifyParam) : 5; // Default to every 5th point

    // Get GPS points (simplified for performance)
    let gpsPoints;
    if (simplify > 1) {
      gpsPoints = await gpsPointRepo.findSimplifiedByActivityId(activityId, simplify);
    } else {
      gpsPoints = await gpsPointRepo.findByActivityId(activityId);
    }

    // Convert database dates to frontend Date objects for GPS points
    const gpsPointsWithDates = gpsPoints.map(point => ({
      ...point,
      timestamp: new Date(point.timestamp)
    }));

    // Convert activity dates
    const activityWithDates = {
      ...activity,
      startTime: new Date(activity.startTime || ''),
      endTime: new Date(activity.endTime || ''),
      createdAt: new Date(activity.createdAt || ''),
      updatedAt: new Date(activity.updatedAt || '')
    };

    return json({
      success: true,
      data: {
        activity: activityWithDates,
        gpsPoints: gpsPointsWithDates,
        metadata: {
          totalPoints: gpsPoints.length,
          simplified: simplify > 1,
          simplificationFactor: simplify
        }
      }
    });

  } catch (error) {
    console.error('Error fetching map data:', error);
    
    return json({
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: 'Failed to fetch map data',
        details: { originalError: error instanceof Error ? error.message : 'Unknown error' }
      }
    }, { status: 500 });
  }
};

// Handle OPTIONS for CORS if needed
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};