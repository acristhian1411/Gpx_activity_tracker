import { integer, sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const activities = sqliteTable(
	'activities',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		type: text('type').notNull().default('unknown'),
		startTime: text('start_time').notNull(),
		endTime: text('end_time').notNull(),
		distance: real('distance').notNull(), // in meters
		duration: integer('duration').notNull(), // in seconds
		elevationGain: real('elevation_gain').default(0), // in meters
		averageSpeed: real('average_speed').notNull(), // in m/s
		maxSpeed: real('max_speed').default(0), // in m/s
		createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
		updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
	},
	(table) => ({
		startTimeIdx: index('idx_activities_start_time').on(table.startTime)
	})
);

export const gpsPoints = sqliteTable(
	'gps_points',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		activityId: integer('activity_id')
			.notNull()
			.references(() => activities.id, { onDelete: 'cascade' }),
		latitude: real('latitude').notNull(),
		longitude: real('longitude').notNull(),
		elevation: real('elevation'),
		timestamp: text('timestamp').notNull(),
		sequenceOrder: integer('sequence_order').notNull()
	},
	(table) => ({
		activityIdIdx: index('idx_gps_points_activity_id').on(table.activityId),
		sequenceIdx: index('idx_gps_points_sequence').on(table.activityId, table.sequenceOrder)
	})
);
