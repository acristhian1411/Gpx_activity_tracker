import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loginWithLaravel, getUserFromToken } from '$lib/server/externalAuth.js';

const COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = (await request.json()) as { email?: string; password?: string; scope?: string };
		const { email, password, scope } = body;

		if (!email || !password) {
			return json({ success: false, error: 'Email and password are required' }, { status: 400 });
		}

		const tokenPayload = await loginWithLaravel({ email, password, scope });

		if (!tokenPayload.access_token) {
			return json({ success: false, error: 'Authentication failed' }, { status: 401 });
		}

		cookies.set(COOKIE_NAME, tokenPayload.access_token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: COOKIE_MAX_AGE
		});

		const user = await getUserFromToken(tokenPayload.access_token).catch(() => null);

		return json({ success: true, user }, { status: 200 });
	} catch (error) {
		const err = error as { status?: number; message?: string };
		return json(
			{ success: false, error: err.message || 'Login failed' },
			{ status: err.status || 401 }
		);
	}
};
