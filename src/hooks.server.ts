import { redirect, json } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { getUserFromToken, type ExternalUser } from '$lib/server/externalAuth.js';
import { userRepository, activityRepository } from '$lib/server/repositories';

const COOKIE_NAME = 'auth_token';

const PUBLIC_ROUTES = [
	'/login',
	'/api/auth/login',
	'/api/auth/logout',
	'/api/auth/me',
	'/api/init'
];

function isPublicRoute(pathname: string): boolean {
	return PUBLIC_ROUTES.includes(pathname);
}

function getAuthToken(event: Parameters<Handle>[0]['event']): string | null {
	const cookieToken = event.cookies.get(COOKIE_NAME);
	if (cookieToken) return cookieToken;

	const authHeader = event.request.headers.get('authorization');
	if (authHeader?.toLowerCase().startsWith('bearer ')) {
		return authHeader.slice(7).trim();
	}

	return null;
}

async function resolveLocalUser(externalUser: ExternalUser) {
	if (!externalUser?.email) return null;

	const email = String(externalUser.email).toLowerCase();
	const existing = await userRepository.getByEmail(email);
	const localUser = await userRepository.upsert(externalUser);

	if (!existing) {
		// First login for this user: backfill orphan activities if this is the first user
		const totalUsers = await userRepository.count();
		if (totalUsers === 1) {
			const assigned = await activityRepository.assignOrphansToUser(localUser.id);
			if (assigned > 0) {
				console.log(`Backfilled ${assigned} orphan activities to user ${localUser.id}`);
			}
		}
	}

	return {
		...externalUser,
		id: localUser.id,
		email,
		name: localUser.name ?? externalUser.name ?? email
	};
}

export const handle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;
	const isPublic = isPublicRoute(pathname);
	const token = getAuthToken(event);

	if (!token) {
		event.locals.user = null;

		if (isPublic) return resolve(event);

		if (pathname.startsWith('/api/')) {
			return json(
				{ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
				{ status: 401 }
			);
		}

		throw redirect(302, '/login');
	}

	try {
		const externalUser = await getUserFromToken(token);
		event.locals.user = await resolveLocalUser(externalUser);
	} catch {
		event.locals.user = null;
		event.cookies.delete(COOKIE_NAME, { path: '/' });

		if (isPublic) return resolve(event);

		if (pathname.startsWith('/api/')) {
			return json(
				{ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session' } },
				{ status: 401 }
			);
		}

		throw redirect(302, '/login');
	}

	return resolve(event);
};
