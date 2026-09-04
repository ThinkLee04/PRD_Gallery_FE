import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Vite + Vitest configuration.
// Dev proxy keeps the SPA same-origin with the API so HttpOnly cookies flow
// naturally (prod: Caddy serves the build and proxies /v1 + /auth).
export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		port: 5173,
		proxy: {
			"/auth": {
				target: "http://localhost:3000",
				changeOrigin: true,
			},
			"/v1": {
				target: "http://localhost:3000",
				changeOrigin: true,
			},
		},
	},
	test: {
		environment: "jsdom",
		setupFiles: ["./src/test/setup.ts"],
		css: false,
	},
});
