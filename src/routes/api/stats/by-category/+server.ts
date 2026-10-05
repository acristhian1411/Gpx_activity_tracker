/**
 * Statistics by Category API Routes
 * Handles statistics grouped by activity type
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { StatsRepository } from '../../../../lib/server/repositories/index.js';
import { ERROR_CODES } from '../../../../lib/types/index.js';
import { initializeDatabase } from '../../../../lib/server/db/migrate.js';
import { eq } from 'drizzle-orm';
import { db } from '../../../../lib/server/db/index.js';
import { activities } from '../../../../lib/server/db/schema.js';

const statsRepo = new StatsRepository();

export interface CategoryStats {
  type: string;
  totalActivities: number;
  totalDistance: number;
  totalDuration: number;
  averageDistance: number;
  averageDuration: number;
}

export interface CategoryStatsResponse {
  success: boolean;
  data?: CategoryStats[];
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * GET /api/stats/by-category - Get statistics grouped by activity type
 * Returns stats only for categories that have data
 */
export const GET: RequestHandler = async ({ locals }) => {
  try {
    const userId = locals.user!.id;

    // Ensure database is initialized
    await initializeDatabase();
    
    // First, get all activity types that have data
    const typesWithData = await db
      .selectDistinct({ type: activities.type })
      .from(activities)
      .where(eq(activities.userId, userId));

    if (typesWithData.length === 0) {
      return json({
        success: true,
        data: []
      });
    }

    // Get stats for each type that has data
    const categoryStats: CategoryStats[] = [];
    
    for (const { type } of typesWithData) {
      const stats = await statsRepo.getStatsByType(userId, type);
      
      // Only include if there are actually activities
      if (stats.totalActivities > 0) {
        categoryStats.push({
          type,
          ...stats
        });
      }
    }

    // Sort by total distance descending
    categoryStats.sort((a, b) => b.totalDistance - a.totalDistance);

    return json({
      success: true,
      data: categoryStats
    });

  } catch (error) {
    console.error('Error fetching category statistics:', error);
    
    return json({
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: 'Failed to fetch category statistics',
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