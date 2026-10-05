/**
 * Activities API Routes
 * Handles CRUD operations for activities
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ActivityRepository } from '$lib/server/repositories';
import { ERROR_CODES, GPXActivityError } from '$lib/types';
import type { ActivityListResponse, ActivityCreateRequest, ActivityCreateResponse } from '$lib/types';

const activityRepo = new ActivityRepository();

/**
 * GET /api/activities - List all activities
 * Returns activities ordered by start time (newest first)
 * Supports optional pagination parameters
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const userId = locals.user!.id;

    // Parse query parameters for pagination
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return json<ActivityListResponse>({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid pagination parameters',
          details: { page, limit }
        }
      }, { status: 400 });
    }

    // Get activities with pagination
    const activities = await activityRepo.findAll(userId, limit, offset);
    const totalCount = await activityRepo.count(userId);
    const totalPages = Math.ceil(totalCount / limit);

    // Convert database dates to frontend Date objects
    const activitiesWithDates = activities.map(activity => ({
      ...activity,
      startTime: new Date(activity.startTime),
      endTime: new Date(activity.endTime),
      createdAt: new Date(activity.createdAt),
      updatedAt: new Date(activity.updatedAt)
    }));

    return json<ActivityListResponse>({
      success: true,
      data: activitiesWithDates,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching activities:', error);
    
    return json<ActivityListResponse>({
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: 'Failed to fetch activities',
        details: { originalError: error instanceof Error ? error.message : 'Unknown error' }
      }
    }, { status: 500 });
  }
};

/**
 * POST /api/activities - Create new activity
 * Note: This is primarily for manual activity creation
 * GPX uploads should use /api/upload endpoint
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const body: ActivityCreateRequest = await request.json();

    // Basic validation - most fields will be calculated from GPX data
    if (!body.name || body.name.trim().length === 0) {
      return json<ActivityCreateResponse>({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Activity name is required',
          details: { field: 'name' }
        }
      }, { status: 400 });
    }

    // For manual activity creation, we need minimum required fields
    const activityData = {
      userId: locals.user!.id,
      name: body.name.trim(),
      type: body.type || 'unknown',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      distance: 0,
      duration: 0,
      elevationGain: 0,
      averageSpeed: 0,
      maxSpeed: 0
    };

    const createdActivity = await activityRepo.create(activityData);

    // Convert database activity to frontend format
    const activityForFrontend = {
      ...createdActivity,
      startTime: new Date(createdActivity.startTime),
      endTime: new Date(createdActivity.endTime),
      createdAt: new Date(createdActivity.createdAt),
      updatedAt: new Date(createdActivity.updatedAt)
    };

    return json<ActivityCreateResponse>({
      success: true,
      data: activityForFrontend,
      message: 'Activity created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating activity:', error);

    if (error instanceof GPXActivityError) {
      return json<ActivityCreateResponse>({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      }, { status: 400 });
    }

    return json<ActivityCreateResponse>({
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: 'Failed to create activity',
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