/**
 * File Upload API Route
 * Handles GPX file uploads with validation and processing
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GPXParserService } from '$lib/server/services';
import { ActivityRepository, GPSPointRepository } from '$lib/server/repositories';
import { GPXActivityError, ERROR_CODES } from '$lib/types';
import type { UploadResponse } from '$lib/types';
import { initializeDatabase } from '$lib/server/db/migrate.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Ensure database is initialized
    await initializeDatabase();
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('gpx') as File;
    const activityType = formData.get('activityType') as string || 'unknown';

    if (!file) {
      return json<UploadResponse>({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'No file provided',
          details: { field: 'gpx' }
        }
      }, { status: 400 });
    }

    // Validate file
    const validation = GPXParserService.validateFile(file);
    if (!validation.isValid) {
      return json<UploadResponse>({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_GPX,
          message: validation.error!,
          details: validation.details
        }
      }, { status: 400 });
    }

    // Read file content
    const content = await file.text();
    
    // Parse GPX content with user-selected activity type
    const parsedData = await GPXParserService.parseGPXContent(content, file.name, activityType as any);

    // Save to database
    const activityRepo = new ActivityRepository();
    const gpsPointRepo = new GPSPointRepository();

    // Activity data is already in the correct format (strings) from GPXParserService
    const activityForDb = {
      ...parsedData.activity,
      userId: locals.user!.id
    };

    // Create activity
    const createdActivity = await activityRepo.create(activityForDb);
    
    // Create GPS points with proper types (timestamps are already ISO strings)
    const gpsPointsWithActivityId = parsedData.gpsPoints.map(point => ({
      ...point,
      activityId: createdActivity.id
    }));
    
    console.log(`Processing ${gpsPointsWithActivityId.length} GPS points for activity ${createdActivity.id}`);
    
    try {
      await gpsPointRepo.createBatch(gpsPointsWithActivityId);
      console.log(`Successfully created GPS points for activity ${createdActivity.id}`);
    } catch (gpsError) {
      console.error(`Failed to create GPS points for activity ${createdActivity.id}:`, gpsError);
      
      // If GPS point creation fails, we should clean up the activity
      try {
        await activityRepo.delete(createdActivity.id, locals.user!.id);
        console.log(`Cleaned up activity ${createdActivity.id} after GPS point creation failure`);
      } catch (cleanupError) {
        console.error(`Failed to clean up activity ${createdActivity.id}:`, cleanupError);
      }
      
      throw gpsError;
    }

    // Convert database activity back to frontend types (string to Date)
    const activityForFrontend = {
      ...createdActivity,
      startTime: new Date(createdActivity.startTime),
      endTime: new Date(createdActivity.endTime),
      createdAt: new Date(createdActivity.createdAt),
      updatedAt: new Date(createdActivity.updatedAt)
    };

    return json<UploadResponse>({
      success: true,
      data: {
        activity: activityForFrontend,
        message: 'GPX file uploaded and processed successfully'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Upload error:', error);

    if (error instanceof GPXActivityError) {
      return json<UploadResponse>({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      }, { status: 400 });
    }

    // Handle unexpected errors
    return json<UploadResponse>({
      success: false,
      error: {
        code: ERROR_CODES.PROCESSING_ERROR,
        message: 'An unexpected error occurred while processing the file',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};