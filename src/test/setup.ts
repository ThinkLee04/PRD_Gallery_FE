import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount rendered components after each test to keep the jsdom DOM clean.
afterEach(() => {
	cleanup();
});
