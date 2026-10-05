import { env } from '$env/dynamic/private';

export interface ExternalUser {
	id: number | string;
	name?: string;
	email: string;
	[key: string]: unknown;
}

export interface TokenPayload {
	access_token: string;
	refresh_token?: string;
	expires_in?: number;
	token_type?: string;
	[key: string]: unknown;
}

interface CacheEntry {
	user: ExternalUser;
	expiresAt: number;
}

const userInfoCache = new Map<string, CacheEntry>();

function getAuthConfig() {
	const authBaseUrl = (env.AUTH_BASE_URL || 'http://localhost').trim();
	const authTokenUrl = (env.AUTH_TOKEN_URL || `${authBaseUrl}/oauth/token`).trim();
	const authUserInfoUrl = (env.AUTH_USERINFO_URL || `${authBaseUrl}/api/user`).trim();

	return {
		authTokenUrl,
		authUserInfoUrl,
		authClientId: (env.AUTH_CLIENT_ID || '').trim(),
		authClientSecret: (env.AUTH_CLIENT_SECRET || '').trim(),
		authScope: env.AUTH_SCOPE || '',
		userInfoCacheTtlMs: Number(env.AUTH_USERINFO_CACHE_TTL_MS || 30000)
	};
}

function trimTrailingSlash(value: string): string {
	return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getCacheEntry(token: string): CacheEntry | null {
	const entry = userInfoCache.get(token);
	if (!entry) return null;

	if (entry.expiresAt < Date.now()) {
		userInfoCache.delete(token);
		return null;
	}

	return entry;
}

function setCacheEntry(token: string, user: ExternalUser): void {
	const { userInfoCacheTtlMs } = getAuthConfig();
	userInfoCache.set(token, { user, expiresAt: Date.now() + userInfoCacheTtlMs });
}

function assertOAuthClientConfigured(): void {
	const { authClientId, authClientSecret } = getAuthConfig();
	if (!authClientId || !authClientSecret) {
		throw new Error(
			'Auth service is not configured: AUTH_CLIENT_ID and AUTH_CLIENT_SECRET are required'
		);
	}
}

function toConnectionError(url: string, error: unknown): Error {
	const cause = (error as { cause?: { code?: string } })?.cause;
	const code = cause?.code || (error as { code?: string })?.code || 'UNKNOWN';
	const err = new Error(
		`No se pudo conectar con el servidor de autenticación (${url}): ${code}`
	) as Error & { status?: number };
	err.status = 502;
	return err;
}

export async function loginWithLaravel({
	email,
	password,
	scope
}: {
	email: string;
	password: string;
	scope?: string;
}): Promise<TokenPayload> {
	assertOAuthClientConfigured();
	const { authTokenUrl, authClientId, authClientSecret, authScope } = getAuthConfig();

	const body = new URLSearchParams({
		grant_type: 'password',
		client_id: String(authClientId),
		client_secret: authClientSecret,
		username: email,
		password,
		scope: scope ?? authScope
	});

	let response: Response;
	try {
		response = await fetch(authTokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json'
			},
			body: body.toString()
		});
	} catch (error) {
		throw toConnectionError(authTokenUrl, error);
	}

	const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
	if (!response.ok) {
		const message =
			data.error_description || data.message || data.error || 'Login failed against auth service';
		const err = new Error(String(message)) as Error & { status?: number };
		err.status = response.status;
		throw err;
	}

	return data as unknown as TokenPayload;
}

export async function getUserFromToken(token: string): Promise<ExternalUser> {
	const { authUserInfoUrl } = getAuthConfig();

	const cached = getCacheEntry(token);
	if (cached) return cached.user;

	let response: Response;
	try {
		response = await fetch(trimTrailingSlash(authUserInfoUrl), {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${token}`
			}
		});
	} catch (error) {
		throw toConnectionError(authUserInfoUrl, error);
	}

	const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
	if (!response.ok) {
		const message = data.message || data.error || 'Invalid token';
		const err = new Error(String(message)) as Error & { status?: number };
		err.status = response.status;
		throw err;
	}

	const user = data as unknown as ExternalUser;
	setCacheEntry(token, user);
	return user;
}
