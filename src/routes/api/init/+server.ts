/**
 * Database Initialization API Route
 * Manually triggers database table creation
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { initializeDatabase, checkTablesExist } from '$lib/server/db/migrate.js';
import { ERROR_CODES } from '$lib/types';

export const POST: RequestHandler = async () => {
  try {
    console.log('Manual database initialization requested');

    const tablesExistBefore = await checkTablesExist();
    console.log('Tables exist before initialization:', tablesExistBefore);

    await initializeDatabase();

    const tablesExistAfter = await checkTablesExist();
    console.log('Tables exist after initialization:', tablesExistAfter);

    return json({
      success: true,
      message: 'Database initialized successfully',
      data: {
        tablesExistedBefore: tablesExistBefore,
        tablesExistNow: tablesExistAfter
      }
    });

  } catch (error) {
    console.error('Database initialization failed:', error);

    return json({
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: 'Failed to initialize database',
        details: { originalError: error instanceof Error ? error.message : 'Unknown error' }
      }
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async () => {
  try {
    const tablesExist = await checkTablesExist();

    return json({
      success: true,
      data: {
        tablesExist,
        message: tablesExist ? 'Database is properly initialized' : 'Database needs initialization'
      }
    });

  } catch (error) {
    console.error('Database check failed:', error);

    return json({
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: 'Failed to check database status',
        details: { originalError: error instanceof Error ? error.message : 'Unknown error' }
      }
    }, { status: 500 });
  }
};