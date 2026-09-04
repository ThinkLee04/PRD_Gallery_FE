import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useMe } from "./useMe";

function Loading() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<p className="text-sm text-zinc-500">Loading…</p>
		</div>
	);
}

/**
 * Route guard (UX only). While the ["me"] query resolves we show a loader so a
 * user arriving fresh from the Google callback is not flashed to the login
 * screen. When logged out, redirect to /login preserving any ?error= param.
 */
export function RequireAuth() {
	const me = useMe();
	const location = useLocation();

	if (me.isLoading) {
		return <Loading />;
	}

	if (me.data === null) {
		return (
			<Navigate to={{ pathname: "/login", search: location.search }} replace />
		);
	}

	return <Outlet />;
}
