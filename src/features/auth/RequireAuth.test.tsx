import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequireAuth } from "./RequireAuth";
import type { Me } from "./types";

// Replace the query hook so we can drive signed-in / signed-out states.
vi.mock("./useMe", () => ({ useMe: vi.fn() }));

import { useMe } from "./useMe";

const mockedUseMe = vi.mocked(useMe);

const USER: Me = {
	id: "u1",
	email: "alice@example.com",
	displayName: "Alice",
	avatarUrl: null,
	approvalStatus: "APPROVED",
	isAdmin: false,
	vault: { id: "v1", name: "Paradise's Gallery", role: "MEMBER" },
};

function renderGuard() {
	return render(
		<MemoryRouter initialEntries={["/"]}>
			<Routes>
				<Route element={<RequireAuth />}>
					<Route path="/" element={<div>Protected content</div>} />
				</Route>
				<Route path="/login" element={<div>Login page</div>} />
			</Routes>
		</MemoryRouter>,
	);
}

describe("RequireAuth (UX guard)", () => {
	beforeEach(() => {
		mockedUseMe.mockReset();
	});

	it("renders the protected outlet for an authenticated user", () => {
		mockedUseMe.mockReturnValue({
			data: USER,
			isLoading: false,
		} as unknown as ReturnType<typeof useMe>);
		renderGuard();
		expect(screen.getByText("Protected content")).toBeTruthy();
	});

	it("redirects to /login for a logged-out user", () => {
		mockedUseMe.mockReturnValue({
			data: null,
			isLoading: false,
		} as unknown as ReturnType<typeof useMe>);
		renderGuard();
		expect(screen.queryByText("Protected content")).toBeNull();
		expect(screen.getByText("Login page")).toBeTruthy();
	});

	it("shows a loader while the session is still resolving", () => {
		mockedUseMe.mockReturnValue({
			data: undefined,
			isLoading: true,
		} as unknown as ReturnType<typeof useMe>);
		renderGuard();
		expect(screen.getByText(/loading/i)).toBeTruthy();
		expect(screen.queryByText("Protected content")).toBeNull();
		expect(screen.queryByText("Login page")).toBeNull();
	});
});
