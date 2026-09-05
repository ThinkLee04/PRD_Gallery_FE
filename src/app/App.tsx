import { Navigate, Route, Routes } from "react-router-dom";
import { AdminAccessPage } from "../features/access/AdminAccessPage";
import { ApprovedRoute } from "../features/access/ApprovedRoute";
import { PendingPage } from "../features/access/PendingPage";
import { HomePage } from "../features/auth/HomePage";
import { LoginPage } from "../features/auth/LoginPage";
import { RequireAuth } from "../features/auth/RequireAuth";
import { AlbumsPage } from "../features/gallery/AlbumsPage";
import { CollectionGalleryPage } from "../features/gallery/CollectionGalleryPage";
import { LovedPage } from "../features/gallery/LovedPage";

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
				<Route path="/pending" element={<PendingPage />} />
				<Route element={<ApprovedRoute />}>
					<Route path="/albums" element={<AlbumsPage />} />
					<Route
						path="/albums/:collectionId/*"
						element={<CollectionGalleryPage />}
					/>
					<Route path="/loved/*" element={<LovedPage />} />
					<Route path="/admin/access" element={<AdminAccessPage />} />
				</Route>
			</Route>
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
