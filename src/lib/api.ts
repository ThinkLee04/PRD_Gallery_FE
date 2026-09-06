// API client for the Paradise's Gallery SPA.
//
// Same-origin by default: in dev the Vite proxy forwards /auth and /v1 to the
// API (http://localhost:3000); in production Caddy serves this build and proxies
// the same paths. Set VITE_API_BASE_URL to an absolute origin only when the API
// is served from a different origin. Only public config lives here.
//
// Session cookies (HttpOnly) are sent with credentials: "include". A 401 on
// /v1/me is interpreted as "logged out" by callers, not surfaced as an error.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

/** Entry point for the Google OAuth flow — a browser navigation, not a fetch. */
export const LOGIN_URL = `${BASE_URL}/auth/google`;

export class ApiError extends Error {
	readonly code: string;
	readonly status: number;

	constructor(code: string, message: string, status: number) {
		super(message);
		this.name = "ApiError";
		this.code = code;
		this.status = status;
	}
}

export interface Envelope<T> {
	data?: T;
	page?: { nextCursor: string | null };
	error?: { code?: string; message?: string };
}

export async function apiFetchEnvelope<T>(
	path: string,
	init: RequestInit = {},
): Promise<{ data: T; page: { nextCursor: string | null } }> {
	const response = await fetch(`${BASE_URL}${path}`, {
		credentials: "include",
		...init,
		headers: {
			...(init.body != null ? { "content-type": "application/json" } : {}),
			...(init.headers as Record<string, string> | undefined),
		},
	});
	const envelope = (await response
		.json()
		.catch(() => null)) as Envelope<T> | null;
	if (!response.ok)
		throw new ApiError(
			envelope?.error?.code ?? "INTERNAL_ERROR",
			envelope?.error?.message ??
				`Request failed with status ${response.status}.`,
			response.status,
		);
	return {
		data: envelope?.data as T,
		page: envelope?.page ?? { nextCursor: null },
	};
}

/**
 * Fetches a JSON API endpoint and unwraps the { data } envelope. Throws ApiError
 * with the stable backend error code on failure. Returns undefined for 204.
 */
export async function apiFetch<T>(
	path: string,
	init: RequestInit = {},
): Promise<T> {
	const hasJsonBody =
		typeof init.body === "string" ||
		(init.body != null && !(init.body instanceof FormData));

	const response = await fetch(`${BASE_URL}${path}`, {
		credentials: "include",
		...init,
		headers: {
			...(hasJsonBody ? { "content-type": "application/json" } : {}),
			...(init.headers as Record<string, string> | undefined),
		},
	});

	if (response.status === 204) {
		return undefined as T;
	}

	const envelope = (await response
		.json()
		.catch(() => null)) as Envelope<T> | null;
	if (!response.ok) {
		const code = envelope?.error?.code ?? "INTERNAL_ERROR";
		const message =
			envelope?.error?.message ??
			`Request failed with status ${response.status}.`;
		throw new ApiError(code, message, response.status);
	}
	return envelope?.data as T;
}
