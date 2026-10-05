import { eq, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import type { User, NewUser } from '../db/types.js';
import type { ExternalUser } from '../externalAuth.js';

/**
 * Repository for local user records backed by the external auth service
 */
export class UserRepository {
	/**
	 * Find a user by email
	 */
	async getByEmail(email: string): Promise<User | null> {
		try {
			const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
			return user || null;
		} catch (error) {
			throw new Error(`Failed to find user by email: ${error}`);
		}
	}

	/**
	 * Find a user by id
	 */
	async findById(id: number): Promise<User | null> {
		try {
			const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
			return user || null;
		} catch (error) {
			throw new Error(`Failed to find user by id: ${error}`);
		}
	}

	/**
	 * Create a new local user
	 */
	async create(data: Omit<NewUser, 'id'>): Promise<User> {
		try {
			const [user] = await db.insert(users).values(data).returning();
			return user;
		} catch (error) {
			throw new Error(`Failed to create user: ${error}`);
		}
	}

	/**
	 * Ensure a local user exists for the given external auth user and return it.
	 * Creates a new record when missing, or refreshes name/externalId when present.
	 */
	async upsert(externalUser: ExternalUser): Promise<User> {
		const email = String(externalUser.email).toLowerCase();
		let user = await this.getByEmail(email);

		if (!user) {
			user = await this.create({
				email,
				name: externalUser.name ?? email,
				externalId: externalUser.id != null ? String(externalUser.id) : null
			});
			return user;
		}

		const name = externalUser.name ?? user.name ?? email;
		const externalId = externalUser.id != null ? String(externalUser.id) : user.externalId;

		if (name !== user.name || externalId !== user.externalId) {
			const [updated] = await db
				.update(users)
				.set({ name, externalId })
				.where(eq(users.id, user.id))
				.returning();
			return updated;
		}

		return user;
	}

	/**
	 * Total number of local users
	 */
	async count(): Promise<number> {
		try {
			const [result] = await db.select({ count: count() }).from(users);
			return result.count;
		} catch (error) {
			throw new Error(`Failed to count users: ${error}`);
		}
	}
}

// Create and export singleton instance
export const userRepository = new UserRepository();
