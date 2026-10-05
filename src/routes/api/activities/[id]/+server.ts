/**
 * Individual Activity API Routes
 * Handles operations on specific activities by ID
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ActivityRepository } from '$lib/server/repositories';
import { ERROR_CODES, GPXActivityError } from '$lib/types';
import type { ActivityResponse } from '$lib/types';

const activityRepo = new ActivityRepository();

/**
 * GET /api/activities/[id] - Get specific activity
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const activityId = parseInt(params.id);
    
    if (isNaN(activityId)) {
      return json<ActivityResponse>({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid activity ID',
          details: { id: params.id }
        }
      }, { status: 400 });
    }

    const activity = await activityRepo.findById(activityId, locals.user!.id);
    
    if (!activity) {
      return json<ActivityResponse>({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Activity not found',
          details: { id: activityId }
        }
      }, { status: 404 });
    }

    // Convert database dates to frontend Date objects
    const activityWithDates = {
      ...activity,
      startTime: new Date(activity.startTime),
      endTime: new Date(activity.endTime),
      createdAt: new Date(activity.createdAt),
      updatedAt: new Date(activity.updatedAt)
    };

    return json<ActivityResponse>({
      success: true,
      data: activityWithDates
    });

  } catch (error) {
    console.error('Error fetching activity:', error);
    
    return json<ActivityResponse>({
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: 'Failed to fetch activity',
        details: { originalError: error instanceof Error ? error.message : 'Unknown error' }
      }
    }, { status: 500 });
  }
};

/**
 * DELETE /api/activities/[id] - Delete specific activity
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
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

    // Delete the activity (this will cascade delete GPS points)
    await activityRepo.delete(activityId, locals.user!.id);

    return json({
      success: true,
      message: 'Activity deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting activity:', error);
    
    if (error instanceof GPXActivityError) {
      return json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      }, { status: 400 });
    }

    return json({
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: 'Failed to delete activity',
        details: { originalError: error instanceof Error ? error.message : 'Unknown error' }
      }
    }, { status: 500 });
  }
};

/**
 * PATCH /api/activities/[id] - Update specific activity
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
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

    // Parse request body
    const updates = await request.json();
    
    // Validate updates
    const allowedFields = ['name', 'type'];
    const validUpdates: any = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        validUpdates[field] = updates[field];
      }
    }

    // Validate name if provided
    if (validUpdates.name !== undefined) {
      if (typeof validUpdates.name !== 'string' || validUpdates.name.trim().length === 0) {
        return json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Activity name must be a non-empty string',
            details: { name: validUpdates.name }
          }
        }, { status: 400 });
      }
      validUpdates.name = validUpdates.name.trim();
    }

    // Validate type if provided
    if (validUpdates.type !== undefined) {
      const validTypes = ['running', 'cycling', 'walking', 'hiking', 'unknown'];
      if (!validTypes.includes(validUpdates.type)) {
        return json({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid activity type',
            details: { type: validUpdates.type, validTypes }
          }
        }, { status: 400 });
      }
    }

    // Check if activity exists
    const existingActivity = await activityRepo.findById(activityId, locals.user!.id);
    if (!existingActivity) {
      return json({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Activity not found',
          details: { id: activityId }
        }
      }, { status: 404 });
    }

    // Update the activity
    const updatedActivity = await activityRepo.update(activityId, locals.user!.id, validUpdates);

    if (!updatedActivity) {
      return json({
        success: false,
        error: {
          code: ERROR_CODES.DATABASE_ERROR,
          message: 'Failed to update activity',
          details: { id: activityId }
        }
      }, { status: 500 });
    }

    // Convert database dates to frontend Date objects
    const activityWithDates = {
      ...updatedActivity,
      startTime: new Date(updatedActivity.startTime),
      endTime: new Date(updatedActivity.endTime),
      createdAt: new Date(updatedActivity.createdAt),
      updatedAt: new Date(updatedActivity.updatedAt)
    };

    return json<ActivityResponse>({
      success: true,
      data: activityWithDates
    });

  } catch (error) {
    console.error('Error updating activity:', error);
    
    if (error instanceof GPXActivityError) {
      return json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      }, { status: 400 });
    }

    return json({
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: 'Failed to update activity',
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
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};