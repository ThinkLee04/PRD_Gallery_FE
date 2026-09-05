import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, apiFetchEnvelope } from "./api";

function stubFetch(response: {
	status: number;
	body?: unknown;
}): ReturnType<typeof vi.fn> {
	const fn = vi.fn(async () => {
		if (response.status === 204) {
			return new Response(null, { status: 204 });
		}
		return new Response(JSON.stringify(response.body), {
			status: response.status,
			headers: { "content-type": "application/json" },
		});
	});
	vi.stubGlobal("fetch", fn);
	return fn;
}

describe("apiFetch", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("sends credentials and unwraps the { data } envelope", async () => {
		const fetchMock = stubFetch({
			status: 200,
			body: { data: { id: "u1", email: "a@b.c" } },
		});
		const result = await apiFetch<{ id: string; email: string }>("/v1/me");
		expect(result).toEqual({ id: "u1", email: "a@b.c" });
		const [url, init] = fetchMock.mock.calls[0] ?? [];
		expect(url).toBe("/v1/me");
		expect((init as RequestInit).credentials).toBe("include");
	});

	it("throws ApiError with the backend code for an error envelope", async () => {
		stubFetch({
			status: 401,
			body: {
				error: { code: "UNAUTHENTICATED", message: "Authentication required." },
			},
		});
		await expect(apiFetch("/v1/me")).rejects.toMatchObject({
			name: "ApiError",
			code: "UNAUTHENTICATED",
			status: 401,
		});
	});

	it("returns undefined for a 204 response", async () => {
		stubFetch({ status: 204 });
		await expect(
			apiFetch<void>("/auth/logout", { method: "POST" }),
		).resolves.toBeUndefined();
	});

	it("preserves pagination metadata for infinite queries", async () => {
		stubFetch({
			status: 200,
			body: { data: [{ id: "p1" }], page: { nextCursor: "opaque" } },
		});
		await expect(
			apiFetchEnvelope<Array<{ id: string }>>("/v1/loved"),
		).resolves.toEqual({
			data: [{ id: "p1" }],
			page: { nextCursor: "opaque" },
		});
	});

	it("treats an unexpected non-JSON error as INTERNAL_ERROR", async () => {
		const fn = vi.fn(async () => new Response("boom", { status: 500 }));
		vi.stubGlobal("fetch", fn);
		await expect(apiFetch("/v1/me")).rejects.toBeInstanceOf(ApiError);
		await expect(apiFetch("/v1/me")).rejects.toMatchObject({
			code: "INTERNAL_ERROR",
		});
	});
});
