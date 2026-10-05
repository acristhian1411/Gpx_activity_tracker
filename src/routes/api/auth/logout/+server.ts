import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const COOKIE_NAME = 'auth_token';

export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete(COOKIE_NAME, { path: '/' });
	return json({ success: true });
};
