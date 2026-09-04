import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "../features/auth/HomePage";
import { LoginPage } from "../features/auth/LoginPage";
import { RequireAuth } from "../features/auth/RequireAuth";

/**
 * App routing. Guards are UX only — the backend is the authorization boundary.
 * The Google callback lands on "/" (APP_BASE_URL) with the session cookie; the
 * ["me"] query decides whether we show the home page or the login page.
 */
export function App() {
	return (
		<Routes>
			<Route path="/login" element={<LoginPage />} />
			<Route element={<RequireAuth />}>
				<Route path="/" element={<HomePage />} />
			</Route>
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
