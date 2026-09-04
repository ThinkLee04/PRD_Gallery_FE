import { useLogout } from "./useLogout";
import { useMe } from "./useMe";

/**
 * Minimal authenticated landing page for the auth slice. Vaults/photos come in
 * later slices; this only proves the session (me) and sign-out work.
 */
export function HomePage() {
	const me = useMe();
	const logout = useLogout();
	const user = me.data;

	if (me.isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-sm text-zinc-500">Loading…</p>
			</div>
		);
	}

	if (user == null) {
		return null; // RequireAuth redirects to /login.
	}

	return (
		<main className="min-h-screen bg-zinc-50">
			<header className="border-b border-zinc-200 bg-white">
				<div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
					<h1 className="text-lg font-semibold text-zinc-900">Photo Vault</h1>
					<button
						type="button"
						onClick={() => logout.mutate()}
						disabled={logout.isPending}
						className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60"
					>
						{logout.isPending ? "Signing out…" : "Sign out"}
					</button>
				</div>
			</header>

			<section className="mx-auto max-w-3xl px-4 py-10">
				<div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
					{user.avatarUrl !== null ? (
						<img
							src={user.avatarUrl}
							alt=""
							className="h-14 w-14 rounded-full"
							referrerPolicy="no-referrer"
						/>
					) : (
						<div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-lg font-semibold text-zinc-600">
							{user.displayName.charAt(0).toUpperCase() ||
								user.email.charAt(0).toUpperCase()}
						</div>
					)}
					<div>
						<p className="text-lg font-semibold text-zinc-900">
							{user.displayName || "Signed in"}
						</p>
						<p className="text-sm text-zinc-600">{user.email}</p>
					</div>
				</div>
				<p className="mt-4 text-sm text-zinc-500">
					You&apos;re signed in. Vault features are coming next.
				</p>
			</section>
		</main>
	);
}
