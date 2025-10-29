/**
 * Integration tests for Statistics API endpoints
 * Tests the complete statistics API functionality with test database
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { activities } from '$lib/server/db/schema.js';
import type { NewActivity } from '$lib/server/db/types.js';
import { StatsRepository } from '$lib/server/repositories';

// Mock SvelteKit's json function
const mockJson = (data: any, options?: { status?: number }) => ({
  json: () => Promise.resolve(data),
  status: options?.status || 200,
  headers: new Headers()
});

// Mock SvelteKit modules
vi.mock('@sveltejs/kit', () => ({
  json: mockJson
}));

// Test database setup
let testDb: Database.Database;
let db: ReturnType<typeof drizzle>;
let statsRepo: StatsRepository;

describe('Statistics API Integration Tests', () => {
  beforeEach(() => {
    // Create in-memory test database
    testDb = new Database(':memory:');
    db = drizzle(testDb);
    
    // Create tables
    testDb.exec(`
      CREATE TABLE activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'unknown',
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        distance REAL NOT NULL,
        duration INTEGER NOT NULL,
        elevation_gain REAL DEFAULT 0,
        average_speed REAL NOT NULL,
        max_speed REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes
    testDb.exec(`
      CREATE INDEX idx_activities_start_time ON activities(start_time);
    `);

    // Initialize repository with test database
    statsRepo = new StatsRepository();
  });

  afterEach(() => {
    testDb.close();
  });

  describe('GET /api/stats', () => {
    beforeEach(async () => {
      // Create test activities with different dates for monthly comparison
      const testActivities: NewActivity[] = [
        // Current month activities (January 2024)
        {
          name: 'January Run 1',
          type: 'running',
          startTime: '2024-01-15T08:00:00Z',
          endTime: '2024-01-15T08:30:00Z',
          distance: 5000,
          duration: 1800,
          elevationGain: 100,
          averageSpeed: 2.78,
          maxSpeed: 4.17
        },
        {
          name: 'January Bike',
          type: 'cycling',
          startTime: '2024-01-20T18:00:00Z',
          endTime: '2024-01-20T19:30:00Z',
          distance: 20000,
          duration: 5400,
          elevationGain: 300,
          averageSpeed: 3.70,
          maxSpeed: 8.33
        },
        // Previous month activities (December 2023)
        {
          name: 'December Run',
          type: 'running',
          startTime: '2023-12-15T08:00:00Z',
          endTime: '2023-12-15T08:45:00Z',
          distance: 7000,
          duration: 2700,
          elevationGain: 150,
          averageSpeed: 2.59,
          maxSpeed: 3.89
        },
        {
          name: 'December Hike',
          type: 'hiking',
          startTime: '2023-12-10T10:00:00Z',
          endTime: '2023-12-10T14:00:00Z',
          distance: 12000,
          duration: 14400,
          elevationGain: 800,
          averageSpeed: 0.83,
          maxSpeed: 1.67
        }
      ];

      for (const activity of testActivities) {
        await db.insert(activities).values(activity);
      }
    });

    it('should return comprehensive activity statistics', async () => {
      const { GET } = await import('./+server.js');
      const response = await GET({} as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      
      // Check total statistics
      expect(data.data.totalActivities).toBe(4);
      expect(data.data.totalDistance).toBe(44000); // 5000 + 20000 + 7000 + 12000
      expect(data.data.totalDuration).toBe(24300); // 1800 + 5400 + 2700 + 14400
      
      // Check longest activities
      expect(data.data.longestDistanceActivity).toBeDefined();
      expect(data.data.longestDistanceActivity.name).toBe('January Bike');
      expect(data.data.longestDistanceActivity.distance).toBe(20000);
      
      expect(data.data.longestDurationActivity).toBeDefined();
      expect(data.data.longestDurationActivity.name).toBe('December Hike');
      expect(data.data.longestDurationActivity.duration).toBe(14400);
      
      // Check monthly statistics
      expect(data.data.currentMonthStats).toBeDefined();
      expect(data.data.previousMonthStats).toBeDefined();
      
      // Verify date conversion
      expect(data.data.longestDistanceActivity.startTime).toBeInstanceOf(Date);
      expect(data.data.longestDurationActivity.endTime).toBeInstanceOf(Date);
    });

    it('should handle empty database', async () => {
      // Clear all activities
      await db.delete(activities);

      const { GET } = await import('./+server.js');
      const response = await GET({} as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.totalActivities).toBe(0);
      expect(data.data.totalDistance).toBe(0);
      expect(data.data.totalDuration).toBe(0);
      expect(data.data.longestDistanceActivity).toBeUndefined();
      expect(data.data.longestDurationActivity).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      testDb.close();

      const { GET } = await import('./+server.js');
      const response = await GET({} as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
      expect(response.status).toBe(500);
    });

    it('should return proper data structure', async () => {
      const { GET } = await import('./+server.js');
      const response = await GET({} as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('totalActivities');
      expect(data.data).toHaveProperty('totalDistance');
      expect(data.data).toHaveProperty('totalDuration');
      expect(data.data).toHaveProperty('longestDistanceActivity');
      expect(data.data).toHaveProperty('longestDurationActivity');
      expect(data.data).toHaveProperty('currentMonthStats');
      expect(data.data).toHaveProperty('previousMonthStats');
      
      // Check monthly stats structure
      expect(data.data.currentMonthStats).toHaveProperty('activities');
      expect(data.data.currentMonthStats).toHaveProperty('distance');
      expect(data.data.currentMonthStats).toHaveProperty('duration');
      expect(data.data.currentMonthStats).toHaveProperty('month');
    });
  });

  describe('GET /api/stats/monthly', () => {
    beforeEach(async () => {
      // Create activities across multiple months
      const testActivities: NewActivity[] = [
        // January 2024
        {
          name: 'Jan Activity 1',
          type: 'running',
          startTime: '2024-01-15T08:00:00Z',
          endTime: '2024-01-15T08:30:00Z',
          distance: 5000,
          duration: 1800,
          averageSpeed: 2.78
        },
        {
          name: 'Jan Activity 2',
          type: 'cycling',
          startTime: '2024-01-20T18:00:00Z',
          endTime: '2024-01-20T19:00:00Z',
          distance: 15000,
          duration: 3600,
          averageSpeed: 4.17
        },
        // December 2023
        {
          name: 'Dec Activity',
          type: 'running',
          startTime: '2023-12-15T08:00:00Z',
          endTime: '2023-12-15T08:45:00Z',
          distance: 7000,
          duration: 2700,
          averageSpeed: 2.59
        },
        // November 2023
        {
          name: 'Nov Activity',
          type: 'hiking',
          startTime: '2023-11-10T10:00:00Z',
          endTime: '2023-11-10T12:00:00Z',
          distance: 8000,
          duration: 7200,
          averageSpeed: 1.11
        }
      ];

      for (const activity of testActivities) {
        await db.insert(activities).values(activity);
      }
    });

    it('should return monthly statistics with default parameters', async () => {
      const mockRequest = {
        url: new URL('http://localhost/api/stats/monthly')
      };

      const { GET } = await import('./monthly/+server.js');
      const response = await GET({ url: mockRequest.url } as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.monthlyData).toBeDefined();
      expect(data.data.monthlyData).toHaveLength(12); // Default 12 months
      expect(data.data.currentMonth).toBeDefined();
      expect(data.data.previousMonth).toBeDefined();
      expect(data.data.comparison).toBeDefined();
    });

    it('should support custom months parameter', async () => {
      const mockRequest = {
        url: new URL('http://localhost/api/stats/monthly?months=6')
      };

      const { GET } = await import('./monthly/+server.js');
      const response = await GET({ url: mockRequest.url } as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.monthlyData).toHaveLength(6);
    });

    it('should validate months parameter', async () => {
      const mockRequest = {
        url: new URL('http://localhost/api/stats/monthly?months=30')
      };

      const { GET } = await import('./monthly/+server.js');
      const response = await GET({ url: mockRequest.url } as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(response.status).toBe(400);
    });

    it('should validate invalid months parameter', async () => {
      const mockRequest = {
        url: new URL('http://localhost/api/stats/monthly?months=invalid')
      };

      const { GET } = await import('./monthly/+server.js');
      const response = await GET({ url: mockRequest.url } as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(response.status).toBe(400);
    });

    it('should calculate comparison metrics correctly', async () => {
      const mockRequest = {
        url: new URL('http://localhost/api/stats/monthly')
      };

      const { GET } = await import('./monthly/+server.js');
      const response = await GET({ url: mockRequest.url } as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.comparison).toBeDefined();
      expect(data.data.comparison).toHaveProperty('activitiesChange');
      expect(data.data.comparison).toHaveProperty('distanceChange');
      expect(data.data.comparison).toHaveProperty('durationChange');
      expect(data.data.comparison).toHaveProperty('activitiesPercentChange');
      expect(data.data.comparison).toHaveProperty('distancePercentChange');
      expect(data.data.comparison).toHaveProperty('durationPercentChange');
      
      // Check that percentage changes are calculated
      expect(typeof data.data.comparison.activitiesPercentChange).toBe('number');
      expect(typeof data.data.comparison.distancePercentChange).toBe('number');
      expect(typeof data.data.comparison.durationPercentChange).toBe('number');
    });

    it('should return monthly data in chronological order', async () => {
      const mockRequest = {
        url: new URL('http://localhost/api/stats/monthly?months=3')
      };

      const { GET } = await import('./monthly/+server.js');
      const response = await GET({ url: mockRequest.url } as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.monthlyData).toHaveLength(3);
      
      // Check that months are in chronological order (oldest first)
      const months = data.data.monthlyData.map((item: any) => item.month);
      for (let i = 1; i < months.length; i++) {
        expect(months[i] > months[i - 1]).toBe(true);
      }
    });

    it('should handle months with no activities', async () => {
      // Clear all activities
      await db.delete(activities);

      const mockRequest = {
        url: new URL('http://localhost/api/stats/monthly?months=3')
      };

      const { GET } = await import('./monthly/+server.js');
      const response = await GET({ url: mockRequest.url } as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.monthlyData).toHaveLength(3);
      
      // All months should have zero values
      data.data.monthlyData.forEach((monthData: any) => {
        expect(monthData.count).toBe(0);
        expect(monthData.distance).toBe(0);
        expect(monthData.duration).toBe(0);
      });
      
      // Comparison should handle zero values
      expect(data.data.comparison.activitiesChange).toBe(0);
      expect(data.data.comparison.distanceChange).toBe(0);
      expect(data.data.comparison.durationChange).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      testDb.close();

      const mockRequest = {
        url: new URL('http://localhost/api/stats/monthly')
      };

      const { GET } = await import('./monthly/+server.js');
      const response = await GET({ url: mockRequest.url } as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
      expect(response.status).toBe(500);
    });

    it('should calculate percentage changes correctly with zero previous values', async () => {
      // Create activities only in current month
      await db.delete(activities);
      
      const currentMonthActivity: NewActivity = {
        name: 'Current Month Only',
        type: 'running',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 1800000).toISOString(),
        distance: 5000,
        duration: 1800,
        averageSpeed: 2.78
      };

      await db.insert(activities).values(currentMonthActivity);

      const mockRequest = {
        url: new URL('http://localhost/api/stats/monthly')
      };

      const { GET } = await import('./monthly/+server.js');
      const response = await GET({ url: mockRequest.url } as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      
      // When previous month has 0 activities, percentage change should be 100% for positive current values
      if (data.data.currentMonth.activities > 0) {
        expect(data.data.comparison.activitiesPercentChange).toBe(100);
        expect(data.data.comparison.distancePercentChange).toBe(100);
        expect(data.data.comparison.durationPercentChange).toBe(100);
      }
    });
  });

  describe('CORS Support', () => {
    it('should handle OPTIONS requests for stats endpoint', async () => {
      const { OPTIONS } = await import('./+server.js');
      const response = await OPTIONS({} as any);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });

    it('should handle OPTIONS requests for monthly stats endpoint', async () => {
      const { OPTIONS } = await import('./monthly/+server.js');
      const response = await OPTIONS({} as any);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format for stats endpoint', async () => {
      testDb.close();

      const { GET } = await import('./+server.js');
      const response = await GET({} as any);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data.success).toBe(false);
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
      expect(data.error).toHaveProperty('details');
    });

    it('should return consistent error format for monthly stats endpoint', async () => {
      const mockRequest = {
        url: new URL('http://localhost/api/stats/monthly?months=invalid')
      };

      const { GET } = await import('./monthly/+server.js');
      const response = await GET({ url: mockRequest.url } as any);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('error');
      expect(data.success).toBe(false);
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
      expect(data.error).toHaveProperty('details');
    });
  });
});