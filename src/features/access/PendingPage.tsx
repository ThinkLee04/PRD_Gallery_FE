import { Navigate } from "react-router-dom";
import { useLogout } from "../auth/useLogout";
import { useMe } from "../auth/useMe";

export function PendingPage() {
	const me = useMe();
	const logout = useLogout();
	if (me.data?.approvalStatus === "APPROVED")
		return <Navigate to="/albums" replace />;
	return (
		<main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
			<section className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
				<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/10 text-2xl">
					⌛
				</div>
				<h1 className="mt-5 text-2xl font-semibold">Waiting for approval</h1>
				<p className="mt-3 text-sm leading-6 text-zinc-400">
					You’re signed in as {me.data?.email}. An administrator needs to
					confirm your access before the shared albums become available.
				</p>
				<button
					type="button"
					onClick={() => void me.refetch()}
					className="mt-6 rounded-full bg-white px-5 py-2 text-sm font-medium text-black"
				>
					Check again
				</button>
				<button
					type="button"
					onClick={() => logout.mutate()}
					className="ml-3 text-sm text-zinc-500 hover:text-white"
				>
					Sign out
				</button>
			</section>
		</main>
	);
}
