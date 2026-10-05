/**
 * Map Export API Routes
 * Handles server-side map image generation and export
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ActivityRepository, GPSPointRepository } from '$lib/server/repositories';
import { ERROR_CODES } from '$lib/types/errors';

const activityRepo = new ActivityRepository();
const gpsPointRepo = new GPSPointRepository();

/**
 * POST /api/map/[id]/export - Export map as image
 * Generates a shareable map image for the specified activity
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
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

    // Parse request body for export options
    let exportOptions: {
      format?: 'png' | 'jpeg';
      quality?: number;
      scale?: number;
      width?: number;
      height?: number;
      trackColor?: string;
      trackWidth?: number;
      showMetadata?: boolean;
      showStartEnd?: boolean;
      backgroundColor?: string;
      mapStyle?: 'streets' | 'satellite' | 'terrain';
    } = {};

    try {
      const body = await request.json();
      exportOptions = body;
    } catch {
      // Use defaults if no body provided
    }

    // Check if activity exists
    const activity = await activityRepo.findById(activityId, locals.user!.id);
    if (!activity) {
      return json({
        success: false,
        error: {
          code: ERROR_CODES.ACTIVITY_NOT_FOUND,
          message: 'Activity not found',
          details: { id: activityId }
        }
      }, { status: 404 });
    }

    // Get GPS points for the activity
    const gpsPoints = await gpsPointRepo.findByActivityId(activityId);
    
    if (gpsPoints.length === 0) {
      return json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'No GPS data available for this activity',
          details: { id: activityId }
        }
      }, { status: 400 });
    }

    // For now, return the configuration that the client can use
    // In a full implementation, this could generate the image server-side
    // using a headless browser or canvas library
    const exportConfig = {
      activity: {
        ...activity,
        startTime: new Date(activity.startTime),
        endTime: new Date(activity.endTime),
        createdAt: new Date(activity.createdAt),
        updatedAt: new Date(activity.updatedAt)
      },
      gpsPoints: gpsPoints.map((point: any) => ({
        ...point,
        timestamp: new Date(point.timestamp)
      })),
      options: {
        format: exportOptions.format || 'png',
        quality: exportOptions.quality || 0.9,
        scale: exportOptions.scale || 2,
        width: exportOptions.width || 800,
        height: exportOptions.height || 600,
        trackColor: exportOptions.trackColor || '#3b82f6',
        trackWidth: exportOptions.trackWidth || 3,
        showMetadata: exportOptions.showMetadata !== false,
        showStartEnd: exportOptions.showStartEnd !== false,
        backgroundColor: exportOptions.backgroundColor || '#ffffff',
        mapStyle: exportOptions.mapStyle || 'streets'
      }
    };

    return json({
      success: true,
      data: {
        imageUrl: `/api/map/${activityId}/export`, // This would be the generated image URL
        imageData: undefined // Would contain base64 data if generated server-side
      },
      message: 'Export configuration prepared. Use client-side generation for now.'
    });

  } catch (error) {
    console.error('Error preparing map export:', error);
    
    return json({
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: 'Failed to prepare map export',
        details: { originalError: error instanceof Error ? error.message : 'Unknown error' }
      }
    }, { status: 500 });
  }
};

/**
 * GET /api/map/[id]/export - Get export configuration
 * Returns the configuration needed for client-side map generation
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
          code: ERROR_CODES.ACTIVITY_NOT_FOUND,
          message: 'Activity not found',
          details: { id: activityId }
        }
      }, { status: 404 });
    }

    // Get export options from query parameters
    const format = (url.searchParams.get('format') as 'png' | 'jpeg') || 'png';
    const quality = parseFloat(url.searchParams.get('quality') || '0.9');
    const scale = parseInt(url.searchParams.get('scale') || '2');
    const width = parseInt(url.searchParams.get('width') || '800');
    const height = parseInt(url.searchParams.get('height') || '600');

    return json({
      success: true,
      data: {
        imageUrl: `/map/${activityId}/generate?format=${format}&quality=${quality}&scale=${scale}&width=${width}&height=${height}`,
        imageData: undefined
      },
      message: 'Export configuration ready'
    });

  } catch (error) {
    console.error('Error getting export configuration:', error);
    
    return json({
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: 'Failed to get export configuration',
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};