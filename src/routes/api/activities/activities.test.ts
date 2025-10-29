/**
 * Integration tests for Activities API endpoints
 * Tests the complete API functionality with test database
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { activities, gpsPoints } from '$lib/server/db/schema.js';
import type { NewActivity, NewGPSPoint } from '$lib/server/db/types.js';
import { ActivityRepository, GPSPointRepository } from '$lib/server/repositories';

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
let activityRepo: ActivityRepository;
let gpsPointRepo: GPSPointRepository;

describe('Activities API Integration Tests', () => {
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
    
    testDb.exec(`
      CREATE TABLE gps_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activity_id INTEGER NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        elevation REAL,
        timestamp TEXT NOT NULL,
        sequence_order INTEGER NOT NULL,
        FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
      );
    `);
    
    // Create indexes
    testDb.exec(`
      CREATE INDEX idx_activities_start_time ON activities(start_time);
      CREATE INDEX idx_gps_points_activity_id ON gps_points(activity_id);
      CREATE INDEX idx_gps_points_sequence ON gps_points(activity_id, sequence_order);
    `);

    // Initialize repositories with test database
    activityRepo = new ActivityRepository();
    gpsPointRepo = new GPSPointRepository();
    
    // Mock the database connection in repositories
    // Note: This would need proper dependency injection in real implementation
  });

  afterEach(() => {
    testDb.close();
  });

  describe('GET /api/activities', () => {
    beforeEach(async () => {
      // Create test activities
      const testActivities: NewActivity[] = [
        {
          name: 'Morning Run',
          type: 'running',
          startTime: '2024-01-03T08:00:00Z',
          endTime: '2024-01-03T08:30:00Z',
          distance: 5000,
          duration: 1800,
          elevationGain: 100,
          averageSpeed: 2.78,
          maxSpeed: 4.17
        },
        {
          name: 'Evening Bike',
          type: 'cycling',
          startTime: '2024-01-02T18:00:00Z',
          endTime: '2024-01-02T19:00:00Z',
          distance: 15000,
          duration: 3600,
          elevationGain: 200,
          averageSpeed: 4.17,
          maxSpeed: 8.33
        },
        {
          name: 'Weekend Hike',
          type: 'hiking',
          startTime: '2024-01-01T10:00:00Z',
          endTime: '2024-01-01T14:00:00Z',
          distance: 8000,
          duration: 14400,
          elevationGain: 500,
          averageSpeed: 0.56,
          maxSpeed: 1.39
        }
      ];

      for (const activity of testActivities) {
        await db.insert(activities).values(activity);
      }
    });

    it('should return all activities ordered by start time (newest first)', async () => {
      const mockRequest = {
        url: new URL('http://localhost/api/activities')
      };

      // Import and test the GET handler
      const { GET } = await import('./+server.js');
      const response = await GET({ url: mockRequest.url } as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(3);
      
      // Check ordering (newest first)
      expect(data.data[0].name).toBe('Morning Run');
      expect(data.data[1].name).toBe('Evening Bike');
      expect(data.data[2].name).toBe('Weekend Hike');
      
      // Check data structure
      expect(data.data[0]).toHaveProperty('id');
      expect(data.data[0]).toHaveProperty('name');
      expect(data.data[0]).toHaveProperty('type');
      expect(data.data[0]).toHaveProperty('distance');
      expect(data.data[0]).toHaveProperty('duration');
      expect(data.data[0].startTime).toBeInstanceOf(Date);
      expect(data.data[0].endTime).toBeInstanceOf(Date);
    });

    it('should support pagination', async () => {
      const mockRequest = {
        url: new URL('http://localhost/api/activities?page=1&limit=2')
      };

      const { GET } = await import('./+server.js');
      const response = await GET({ url: mockRequest.url } as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(2);
      expect(data.pagination.total).toBe(3);
      expect(data.pagination.totalPages).toBe(2);
      expect(data.pagination.hasNext).toBe(true);
      expect(data.pagination.hasPrev).toBe(false);
    });

    it('should validate pagination parameters', async () => {
      const mockRequest = {
        url: new URL('http://localhost/api/activities?page=0&limit=200')
      };

      const { GET } = await import('./+server.js');
      const response = await GET({ url: mockRequest.url } as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(response.status).toBe(400);
    });

    it('should handle empty activity list', async () => {
      // Clear all activities
      await db.delete(activities);

      const mockRequest = {
        url: new URL('http://localhost/api/activities')
      };

      const { GET } = await import('./+server.js');
      const response = await GET({ url: mockRequest.url } as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(0);
      expect(data.pagination.total).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      // Close database to simulate error
      testDb.close();

      const mockRequest = {
        url: new URL('http://localhost/api/activities')
      };

      const { GET } = await import('./+server.js');
      const response = await GET({ url: mockRequest.url } as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/activities', () => {
    it('should create a new activity with valid data', async () => {
      const activityData = {
        name: 'Test Activity',
        type: 'running'
      };

      const mockRequest = {
        json: () => Promise.resolve(activityData)
      };

      const { POST } = await import('./+server.js');
      const response = await POST({ request: mockRequest } as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.name).toBe('Test Activity');
      expect(data.data.type).toBe('running');
      expect(data.data.id).toBeDefined();
      expect(data.message).toContain('created successfully');
      expect(response.status).toBe(201);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        type: 'running'
        // Missing name
      };

      const mockRequest = {
        json: () => Promise.resolve(invalidData)
      };

      const { POST } = await import('./+server.js');
      const response = await POST({ request: mockRequest } as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('name is required');
      expect(response.status).toBe(400);
    });

    it('should handle empty or whitespace-only names', async () => {
      const invalidData = {
        name: '   ',
        type: 'running'
      };

      const mockRequest = {
        json: () => Promise.resolve(invalidData)
      };

      const { POST } = await import('./+server.js');
      const response = await POST({ request: mockRequest } as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(response.status).toBe(400);
    });

    it('should default activity type to unknown', async () => {
      const activityData = {
        name: 'Test Activity'
        // No type specified
      };

      const mockRequest = {
        json: () => Promise.resolve(activityData)
      };

      const { POST } = await import('./+server.js');
      const response = await POST({ request: mockRequest } as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.type).toBe('unknown');
    });

    it('should handle database errors during creation', async () => {
      testDb.close();

      const activityData = {
        name: 'Test Activity',
        type: 'running'
      };

      const mockRequest = {
        json: () => Promise.resolve(activityData)
      };

      const { POST } = await import('./+server.js');
      const response = await POST({ request: mockRequest } as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/activities/[id]', () => {
    let testActivityId: number;
    let testGPSPoints: NewGPSPoint[];

    beforeEach(async () => {
      // Create test activity
      const testActivity: NewActivity = {
        name: 'Test Activity',
        type: 'running',
        startTime: '2024-01-01T08:00:00Z',
        endTime: '2024-01-01T08:30:00Z',
        distance: 5000,
        duration: 1800,
        elevationGain: 100,
        averageSpeed: 2.78,
        maxSpeed: 4.17
      };

      const [created] = await db.insert(activities).values(testActivity).returning();
      testActivityId = created.id;

      // Create test GPS points
      testGPSPoints = [
        {
          activityId: testActivityId,
          latitude: 40.7128,
          longitude: -74.0060,
          elevation: 10.0,
          timestamp: '2024-01-01T08:00:00Z',
          sequenceOrder: 0
        },
        {
          activityId: testActivityId,
          latitude: 40.7129,
          longitude: -74.0061,
          elevation: 11.0,
          timestamp: '2024-01-01T08:00:30Z',
          sequenceOrder: 1
        }
      ];

      await db.insert(gpsPoints).values(testGPSPoints);
    });

    it('should return activity by ID', async () => {
      const mockRequest = {
        params: { id: testActivityId.toString() },
        url: new URL('http://localhost/api/activities/' + testActivityId)
      };

      const { GET } = await import('./[id]/+server.js');
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.id).toBe(testActivityId);
      expect(data.data.name).toBe('Test Activity');
      expect(data.data.startTime).toBeInstanceOf(Date);
    });

    it('should return activity with GPS points when requested', async () => {
      const mockRequest = {
        params: { id: testActivityId.toString() },
        url: new URL('http://localhost/api/activities/' + testActivityId + '?includeGPS=true')
      };

      const { GET } = await import('./[id]/+server.js');
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.activity).toBeDefined();
      expect(data.data.gpsPoints).toBeDefined();
      expect(data.data.gpsPoints).toHaveLength(2);
      expect(data.data.gpsPoints[0].latitude).toBe(40.7128);
      expect(data.data.gpsPoints[0].timestamp).toBeInstanceOf(Date);
    });

    it('should validate activity ID parameter', async () => {
      const mockRequest = {
        params: { id: 'invalid' },
        url: new URL('http://localhost/api/activities/invalid')
      };

      const { GET } = await import('./[id]/+server.js');
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent activity', async () => {
      const mockRequest = {
        params: { id: '999999' },
        url: new URL('http://localhost/api/activities/999999')
      };

      const { GET } = await import('./[id]/+server.js');
      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ACTIVITY_NOT_FOUND');
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/activities/[id]', () => {
    let testActivityId: number;

    beforeEach(async () => {
      const testActivity: NewActivity = {
        name: 'To Delete',
        type: 'running',
        startTime: '2024-01-01T08:00:00Z',
        endTime: '2024-01-01T08:30:00Z',
        distance: 5000,
        duration: 1800,
        averageSpeed: 2.78
      };

      const [created] = await db.insert(activities).values(testActivity).returning();
      testActivityId = created.id;

      // Add GPS points to test cascade deletion
      const gpsPointsData: NewGPSPoint[] = [
        {
          activityId: testActivityId,
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: '2024-01-01T08:00:00Z',
          sequenceOrder: 0
        }
      ];

      await db.insert(gpsPoints).values(gpsPointsData);
    });

    it('should delete activity successfully', async () => {
      const mockRequest = {
        params: { id: testActivityId.toString() }
      };

      const { DELETE } = await import('./[id]/+server.js');
      const response = await DELETE(mockRequest as any);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.message).toContain('deleted successfully');

      // Verify activity is deleted
      const [found] = await db
        .select()
        .from(activities)
        .where(eq(activities.id, testActivityId))
        .limit(1);

      expect(found).toBeUndefined();

      // Verify GPS points are cascade deleted
      const foundGPS = await db
        .select()
        .from(gpsPoints)
        .where(eq(gpsPoints.activityId, testActivityId));

      expect(foundGPS).toHaveLength(0);
    });

    it('should validate activity ID for deletion', async () => {
      const mockRequest = {
        params: { id: 'invalid' }
      };

      const { DELETE } = await import('./[id]/+server.js');
      const response = await DELETE(mockRequest as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(response.status).toBe(400);
    });

    it('should return 404 when deleting non-existent activity', async () => {
      const mockRequest = {
        params: { id: '999999' }
      };

      const { DELETE } = await import('./[id]/+server.js');
      const response = await DELETE(mockRequest as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ACTIVITY_NOT_FOUND');
      expect(response.status).toBe(404);
    });

    it('should handle database errors during deletion', async () => {
      testDb.close();

      const mockRequest = {
        params: { id: testActivityId.toString() }
      };

      const { DELETE } = await import('./[id]/+server.js');
      const response = await DELETE(mockRequest as any);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
      expect(response.status).toBe(500);
    });
  });

  describe('CORS Support', () => {
    it('should handle OPTIONS requests for activities endpoint', async () => {
      const { OPTIONS } = await import('./+server.js');
      const response = await OPTIONS({} as any);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('should handle OPTIONS requests for individual activity endpoint', async () => {
      const { OPTIONS } = await import('./[id]/+server.js');
      const response = await OPTIONS({} as any);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('DELETE');
    });
  });
});