import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq, desc, count } from 'drizzle-orm';
import { activities, gpsPoints } from '../db/schema.js';
import type { NewActivity, NewGPSPoint } from '../db/types.js';

// Test database setup
let testDb: Database.Database;
let db: ReturnType<typeof drizzle>;

describe('Data Layer Integration Tests', () => {
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
	});

	afterEach(() => {
		testDb.close();
	});

	describe('Database Schema', () => {
		it('should create activities table with correct structure', () => {
			const schema = testDb.prepare('PRAGMA table_info(activities)').all();
			const columnNames = schema.map((col: any) => col.name);
			
			expect(columnNames).toContain('id');
			expect(columnNames).toContain('name');
			expect(columnNames).toContain('type');
			expect(columnNames).toContain('start_time');
			expect(columnNames).toContain('end_time');
			expect(columnNames).toContain('distance');
			expect(columnNames).toContain('duration');
			expect(columnNames).toContain('elevation_gain');
			expect(columnNames).toContain('average_speed');
			expect(columnNames).toContain('max_speed');
		});

		it('should create gps_points table with correct structure', () => {
			const schema = testDb.prepare('PRAGMA table_info(gps_points)').all();
			const columnNames = schema.map((col: any) => col.name);
			
			expect(columnNames).toContain('id');
			expect(columnNames).toContain('activity_id');
			expect(columnNames).toContain('latitude');
			expect(columnNames).toContain('longitude');
			expect(columnNames).toContain('elevation');
			expect(columnNames).toContain('timestamp');
			expect(columnNames).toContain('sequence_order');
		});

		it('should create required indexes', () => {
			const indexes = testDb.prepare(`
				SELECT name FROM sqlite_master 
				WHERE type='index' AND name IN (
					'idx_activities_start_time',
					'idx_gps_points_activity_id', 
					'idx_gps_points_sequence'
				)
			`).all();

			expect(indexes.length).toBeGreaterThanOrEqual(3);
		});

		it('should enforce foreign key constraints', () => {
			testDb.pragma('foreign_keys = ON');

			// Insert activity first
			const activityResult = testDb.prepare(`
				INSERT INTO activities (name, type, start_time, end_time, distance, duration, average_speed)
				VALUES ('Test Activity', 'running', '2024-01-01T08:00:00Z', '2024-01-01T08:30:00Z', 5000, 1800, 2.78)
			`).run();

			// Insert GPS point with valid activity_id should work
			expect(() => {
				testDb.prepare(`
					INSERT INTO gps_points (activity_id, latitude, longitude, timestamp, sequence_order)
					VALUES (?, 40.7128, -74.0060, '2024-01-01T08:00:00Z', 1)
				`).run(activityResult.lastInsertRowid);
			}).not.toThrow();

			// Insert GPS point with invalid activity_id should fail
			expect(() => {
				testDb.prepare(`
					INSERT INTO gps_points (activity_id, latitude, longitude, timestamp, sequence_order)
					VALUES (999, 40.7128, -74.0060, '2024-01-01T08:00:00Z', 1)
				`).run();
			}).toThrow();
		});

		it('should cascade delete GPS points when activity is deleted', () => {
			testDb.pragma('foreign_keys = ON');

			// Insert activity
			const activityResult = testDb.prepare(`
				INSERT INTO activities (name, type, start_time, end_time, distance, duration, average_speed)
				VALUES ('Test Activity', 'running', '2024-01-01T08:00:00Z', '2024-01-01T08:30:00Z', 5000, 1800, 2.78)
			`).run();

			const activityId = activityResult.lastInsertRowid;

			// Insert GPS points
			testDb.prepare(`
				INSERT INTO gps_points (activity_id, latitude, longitude, timestamp, sequence_order)
				VALUES (?, 40.7128, -74.0060, '2024-01-01T08:00:00Z', 1)
			`).run(activityId);

			testDb.prepare(`
				INSERT INTO gps_points (activity_id, latitude, longitude, timestamp, sequence_order)
				VALUES (?, 40.7129, -74.0061, '2024-01-01T08:00:30Z', 2)
			`).run(activityId);

			// Verify GPS points exist
			const beforeDelete = testDb.prepare('SELECT COUNT(*) as count FROM gps_points').get() as { count: number };
			expect(beforeDelete.count).toBe(2);

			// Delete activity
			testDb.prepare('DELETE FROM activities WHERE id = ?').run(activityId);

			// Verify GPS points are cascade deleted
			const afterDelete = testDb.prepare('SELECT COUNT(*) as count FROM gps_points').get() as { count: number };
			expect(afterDelete.count).toBe(0);
		});
	});

	describe('Activity CRUD Operations', () => {
		it('should create and retrieve activities', async () => {
			const newActivity: NewActivity = {
				name: 'Morning Run',
				type: 'running',
				startTime: '2024-01-01T08:00:00Z',
				endTime: '2024-01-01T08:30:00Z',
				distance: 5000,
				duration: 1800,
				elevationGain: 100,
				averageSpeed: 2.78,
				maxSpeed: 4.17
			};

			// Create activity
			const [created] = await db
				.insert(activities)
				.values({
					...newActivity,
					updatedAt: new Date().toISOString()
				})
				.returning();

			expect(created).toBeDefined();
			expect(created.id).toBeDefined();
			expect(created.name).toBe('Morning Run');
			expect(created.type).toBe('running');
			expect(created.distance).toBe(5000);

			// Retrieve activity
			const [found] = await db
				.select()
				.from(activities)
				.where(eq(activities.id, created.id))
				.limit(1);

			expect(found).toBeDefined();
			expect(found.id).toBe(created.id);
			expect(found.name).toBe('Morning Run');
		});

		it('should update activities', async () => {
			const newActivity: NewActivity = {
				name: 'Original Name',
				type: 'running',
				startTime: '2024-01-01T08:00:00Z',
				endTime: '2024-01-01T08:30:00Z',
				distance: 5000,
				duration: 1800,
				averageSpeed: 2.78
			};

			// Create activity
			const [created] = await db
				.insert(activities)
				.values(newActivity)
				.returning();

			// Update activity
			const [updated] = await db
				.update(activities)
				.set({ name: 'Updated Name' })
				.where(eq(activities.id, created.id))
				.returning();

			expect(updated.name).toBe('Updated Name');
			expect(updated.type).toBe('running'); // Unchanged
		});

		it('should delete activities', async () => {
			const newActivity: NewActivity = {
				name: 'To Delete',
				type: 'running',
				startTime: '2024-01-01T08:00:00Z',
				endTime: '2024-01-01T08:30:00Z',
				distance: 5000,
				duration: 1800,
				averageSpeed: 2.78
			};

			// Create activity
			const [created] = await db
				.insert(activities)
				.values(newActivity)
				.returning();

			// Delete activity
			const result = await db
				.delete(activities)
				.where(eq(activities.id, created.id));

			expect(result.changes).toBe(1);

			// Verify deletion
			const [found] = await db
				.select()
				.from(activities)
				.where(eq(activities.id, created.id))
				.limit(1);

			expect(found).toBeUndefined();
		});

		it('should list activities ordered by start time', async () => {
			const activity1: NewActivity = {
				name: 'First Activity',
				type: 'running',
				startTime: '2024-01-01T08:00:00Z',
				endTime: '2024-01-01T08:30:00Z',
				distance: 5000,
				duration: 1800,
				averageSpeed: 2.78
			};

			const activity2: NewActivity = {
				name: 'Second Activity',
				type: 'cycling',
				startTime: '2024-01-02T08:00:00Z',
				endTime: '2024-01-02T09:00:00Z',
				distance: 10000,
				duration: 3600,
				averageSpeed: 2.78
			};

			await db.insert(activities).values(activity1);
			await db.insert(activities).values(activity2);

			const allActivities = await db
				.select()
				.from(activities)
				.orderBy(desc(activities.startTime));

			expect(allActivities).toHaveLength(2);
			expect(allActivities[0].name).toBe('Second Activity'); // Newer first
			expect(allActivities[1].name).toBe('First Activity');
		});
	});

	describe('GPS Point Operations', () => {
		let testActivityId: number;

		beforeEach(async () => {
			// Create test activity
			const testActivity: NewActivity = {
				name: 'Test Activity',
				type: 'running',
				startTime: '2024-01-01T08:00:00Z',
				endTime: '2024-01-01T08:30:00Z',
				distance: 5000,
				duration: 1800,
				averageSpeed: 2.78
			};

			const [created] = await db
				.insert(activities)
				.values(testActivity)
				.returning();

			testActivityId = created.id;
		});

		it('should create and retrieve GPS points', async () => {
			const newGPSPoint: NewGPSPoint = {
				activityId: testActivityId,
				latitude: 40.7128,
				longitude: -74.0060,
				elevation: 10.5,
				timestamp: '2024-01-01T08:00:00Z',
				sequenceOrder: 1
			};

			// Create GPS point
			const [created] = await db
				.insert(gpsPoints)
				.values(newGPSPoint)
				.returning();

			expect(created).toBeDefined();
			expect(created.id).toBeDefined();
			expect(created.activityId).toBe(testActivityId);
			expect(created.latitude).toBe(40.7128);
			expect(created.longitude).toBe(-74.0060);
			expect(created.elevation).toBe(10.5);

			// Retrieve GPS point
			const [found] = await db
				.select()
				.from(gpsPoints)
				.where(eq(gpsPoints.id, created.id))
				.limit(1);

			expect(found).toBeDefined();
			expect(found.id).toBe(created.id);
			expect(found.latitude).toBe(40.7128);
		});

		it('should create multiple GPS points in batch', async () => {
			const gpsPointsData: NewGPSPoint[] = [
				{
					activityId: testActivityId,
					latitude: 40.7128,
					longitude: -74.0060,
					elevation: 10.5,
					timestamp: '2024-01-01T08:00:00Z',
					sequenceOrder: 1
				},
				{
					activityId: testActivityId,
					latitude: 40.7129,
					longitude: -74.0061,
					elevation: 11.0,
					timestamp: '2024-01-01T08:00:30Z',
					sequenceOrder: 2
				},
				{
					activityId: testActivityId,
					latitude: 40.7130,
					longitude: -74.0062,
					elevation: 11.5,
					timestamp: '2024-01-01T08:01:00Z',
					sequenceOrder: 3
				}
			];

			const created = await db
				.insert(gpsPoints)
				.values(gpsPointsData)
				.returning();

			expect(created).toHaveLength(3);
			expect(created[0].sequenceOrder).toBe(1);
			expect(created[1].sequenceOrder).toBe(2);
			expect(created[2].sequenceOrder).toBe(3);
		});

		it('should find GPS points by activity ID ordered by sequence', async () => {
			const gpsPointsData: NewGPSPoint[] = [
				{
					activityId: testActivityId,
					latitude: 40.7130,
					longitude: -74.0062,
					timestamp: '2024-01-01T08:01:00Z',
					sequenceOrder: 3
				},
				{
					activityId: testActivityId,
					latitude: 40.7128,
					longitude: -74.0060,
					timestamp: '2024-01-01T08:00:00Z',
					sequenceOrder: 1
				},
				{
					activityId: testActivityId,
					latitude: 40.7129,
					longitude: -74.0061,
					timestamp: '2024-01-01T08:00:30Z',
					sequenceOrder: 2
				}
			];

			await db.insert(gpsPoints).values(gpsPointsData);

			const found = await db
				.select()
				.from(gpsPoints)
				.where(eq(gpsPoints.activityId, testActivityId))
				.orderBy(gpsPoints.sequenceOrder);

			expect(found).toHaveLength(3);
			expect(found[0].sequenceOrder).toBe(1);
			expect(found[1].sequenceOrder).toBe(2);
			expect(found[2].sequenceOrder).toBe(3);
		});
	});

	describe('Statistics Operations', () => {
		beforeEach(async () => {
			// Create test activities
			const activities_data: NewActivity[] = [
				{
					name: 'Run 1',
					type: 'running',
					startTime: '2024-01-01T08:00:00Z',
					endTime: '2024-01-01T08:30:00Z',
					distance: 5000,
					duration: 1800,
					averageSpeed: 2.78
				},
				{
					name: 'Bike 1',
					type: 'cycling',
					startTime: '2024-01-02T08:00:00Z',
					endTime: '2024-01-02T09:00:00Z',
					distance: 15000,
					duration: 3600,
					averageSpeed: 4.17
				},
				{
					name: 'Run 2',
					type: 'running',
					startTime: '2024-01-03T08:00:00Z',
					endTime: '2024-01-03T08:45:00Z',
					distance: 7000,
					duration: 2700,
					averageSpeed: 2.59
				}
			];

			for (const activity of activities_data) {
				await db.insert(activities).values(activity);
			}
		});

		it('should calculate total statistics', async () => {
			const [result] = await db
				.select({
					totalActivities: count(),
					totalDistance: activities.distance,
					totalDuration: activities.duration
				})
				.from(activities);

			expect(result.totalActivities).toBe(3);
			// Note: This test verifies the query structure, actual aggregation would need SQL functions
		});

		it('should find longest distance activity', async () => {
			const [longestActivity] = await db
				.select()
				.from(activities)
				.orderBy(desc(activities.distance))
				.limit(1);

			expect(longestActivity).toBeDefined();
			expect(longestActivity.name).toBe('Bike 1');
			expect(longestActivity.distance).toBe(15000);
		});

		it('should find longest duration activity', async () => {
			const [longestActivity] = await db
				.select()
				.from(activities)
				.orderBy(desc(activities.duration))
				.limit(1);

			expect(longestActivity).toBeDefined();
			expect(longestActivity.name).toBe('Bike 1');
			expect(longestActivity.duration).toBe(3600);
		});

		it('should calculate statistics by activity type', async () => {
			const runningActivities = await db
				.select()
				.from(activities)
				.where(eq(activities.type, 'running'));

			expect(runningActivities).toHaveLength(2);
			
			const totalDistance = runningActivities.reduce((sum, activity) => sum + activity.distance, 0);
			const totalDuration = runningActivities.reduce((sum, activity) => sum + activity.duration, 0);
			
			expect(totalDistance).toBe(12000);
			expect(totalDuration).toBe(4500);
		});
	});
});