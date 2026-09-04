import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./useAuthError";

describe("authErrorMessage", () => {
	it("returns null for absent or empty errors", () => {
		expect(authErrorMessage(null)).toBeNull();
		expect(authErrorMessage("")).toBeNull();
	});

	it("maps known backend error codes", () => {
		expect(authErrorMessage("access_denied")).toMatch(/denied/i);
		expect(authErrorMessage("auth_failed")).toMatch(/try again/i);
		expect(authErrorMessage("server_error")).toMatch(/something went wrong/i);
	});

	it("falls back to a generic message for unknown codes", () => {
		expect(authErrorMessage("unexpected_thing")).toMatch(/try again/i);
	});
});
