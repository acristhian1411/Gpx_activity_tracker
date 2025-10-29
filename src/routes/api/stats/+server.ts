/**
 * Statistics API Routes
 * Handles dashboard statistics and aggregated metrics
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { StatsRepository } from '$lib/server/repositories';
import { ERROR_CODES } from '$lib/types';
import type { StatsResponse } from '$lib/types';
import { initializeDatabase } from '$lib/server/db/migrate.js';

const statsRepo = new StatsRepository();

/**
 * GET /api/stats - Get comprehensive dashboard statistics
 * Returns total stats, personal records, and monthly comparisons
 */
export const GET: RequestHandler = async () => {
  try {
    // Ensure database is initialized
    await initializeDatabase();
    
    const stats = await statsRepo.getActivityStats();

    // Convert database dates to frontend Date objects for activities
    const statsForFrontend = {
      ...stats,
      longestDistanceActivity: stats.longestDistanceActivity ? {
        ...stats.longestDistanceActivity,
        startTime: new Date(stats.longestDistanceActivity.startTime),
        endTime: new Date(stats.longestDistanceActivity.endTime),
        createdAt: new Date(stats.longestDistanceActivity.createdAt),
        updatedAt: new Date(stats.longestDistanceActivity.updatedAt)
      } : undefined,
      longestDurationActivity: stats.longestDurationActivity ? {
        ...stats.longestDurationActivity,
        startTime: new Date(stats.longestDurationActivity.startTime),
        endTime: new Date(stats.longestDurationActivity.endTime),
        createdAt: new Date(stats.longestDurationActivity.createdAt),
        updatedAt: new Date(stats.longestDurationActivity.updatedAt)
      } : undefined
    };

    return json<StatsResponse>({
      success: true,
      data: statsForFrontend
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    
    return json<StatsResponse>({
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: 'Failed to fetch statistics',
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