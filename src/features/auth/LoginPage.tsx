import { Navigate } from "react-router-dom";
import { LOGIN_URL } from "../../lib/api";
import { useAuthError } from "./useAuthError";
import { useMe } from "./useMe";

function Loading() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<p className="text-sm text-zinc-500">Loading…</p>
		</div>
	);
}

/** Google sign-in page shown when the user has no active session. */
export function LoginPage() {
	const me = useMe();
	const { message } = useAuthError();

	if (me.isLoading) {
		return <Loading />;
	}

	if (me.data !== null) {
		return <Navigate to="/" replace />;
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
			<div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
				<h1 className="text-2xl font-semibold text-zinc-900">Photo Vault</h1>
				<p className="mt-2 text-sm text-zinc-600">
					A private photo vault for your trusted circle. Sign in with your
					Google account to continue.
				</p>

				{message !== null ? (
					<div
						role="alert"
						className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
					>
						{message}
					</div>
				) : null}

				<a
					href={LOGIN_URL}
					className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
				>
					<svg
						aria-hidden="true"
						className="h-4 w-4"
						viewBox="0 0 24 24"
						fill="currentColor"
					>
						<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
						<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
						<path d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
						<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z" />
					</svg>
					Sign in with Google
				</a>
			</div>
		</main>
	);
}
