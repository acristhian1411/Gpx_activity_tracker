/**
 * Monthly Statistics API Routes
 * Handles monthly activity statistics and comparisons
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { StatsRepository } from '$lib/server/repositories';
import { ERROR_CODES } from '$lib/types';
import type { ApiResponse } from '$lib/types';

const statsRepo = new StatsRepository();

interface MonthlyStatsResponse extends ApiResponse<{
  monthlyData: Array<{
    month: string;
    count: number;
    distance: number;
    duration: number;
  }>;
  currentMonth: {
    activities: number;
    distance: number;
    duration: number;
    month: string;
  };
  previousMonth: {
    activities: number;
    distance: number;
    duration: number;
    month: string;
  };
  comparison: {
    activitiesChange: number;
    distanceChange: number;
    durationChange: number;
    activitiesPercentChange: number;
    distancePercentChange: number;
    durationPercentChange: number;
  };
}> {}

/**
 * GET /api/stats/monthly - Get monthly statistics and comparisons
 * Supports optional query parameters for customization
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const userId = locals.user!.id;

    // Parse query parameters
    const monthsParam = url.searchParams.get('months');
    const months = monthsParam ? parseInt(monthsParam) : 12;

    // Validate months parameter
    if (isNaN(months) || months < 1 || months > 24) {
      return json<MonthlyStatsResponse>({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid months parameter. Must be between 1 and 24.',
          details: { months: monthsParam }
        }
      }, { status: 400 });
    }

    // Get monthly data for the specified number of months
    const monthlyData = await statsRepo.getActivityCountByMonth(userId, months);

    // Get current and previous month stats for comparison
    const currentDate = new Date();
    const currentMonth = formatMonth(currentDate);
    const previousMonth = formatMonth(getPreviousMonth(currentDate));

    const [currentMonthStats, previousMonthStats] = await Promise.all([
      statsRepo.getMonthlyStats(userId, currentMonth),
      statsRepo.getMonthlyStats(userId, previousMonth)
    ]);

    // Calculate comparison metrics
    const comparison = {
      activitiesChange: currentMonthStats.activities - previousMonthStats.activities,
      distanceChange: currentMonthStats.distance - previousMonthStats.distance,
      durationChange: currentMonthStats.duration - previousMonthStats.duration,
      activitiesPercentChange: previousMonthStats.activities > 0 
        ? ((currentMonthStats.activities - previousMonthStats.activities) / previousMonthStats.activities) * 100 
        : currentMonthStats.activities > 0 ? 100 : 0,
      distancePercentChange: previousMonthStats.distance > 0 
        ? ((currentMonthStats.distance - previousMonthStats.distance) / previousMonthStats.distance) * 100 
        : currentMonthStats.distance > 0 ? 100 : 0,
      durationPercentChange: previousMonthStats.duration > 0 
        ? ((currentMonthStats.duration - previousMonthStats.duration) / previousMonthStats.duration) * 100 
        : currentMonthStats.duration > 0 ? 100 : 0
    };

    return json<MonthlyStatsResponse>({
      success: true,
      data: {
        monthlyData,
        currentMonth: currentMonthStats,
        previousMonth: previousMonthStats,
        comparison
      }
    });

  } catch (error) {
    console.error('Error fetching monthly statistics:', error);
    
    return json<MonthlyStatsResponse>({
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: 'Failed to fetch monthly statistics',
        details: { originalError: error instanceof Error ? error.message : 'Unknown error' }
      }
    }, { status: 500 });
  }
};

/**
 * Helper: Format date as YYYY-MM
 */
function formatMonth(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Helper: Get previous month date
 */
function getPreviousMonth(date: Date): Date {
  const previousMonth = new Date(date);
  previousMonth.setMonth(date.getMonth() - 1);
  return previousMonth;
}

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