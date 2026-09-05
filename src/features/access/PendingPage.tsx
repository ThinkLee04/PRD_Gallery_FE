import { Navigate } from "react-router-dom";
import { useLogout } from "../auth/useLogout";
import { useMe } from "../auth/useMe";

export function PendingPage() {
	const me = useMe();
	const logout = useLogout();
	if (me.data?.approvalStatus === "APPROVED")
		return <Navigate to="/albums" replace />;
	return (
		<main className="flex min-h-screen items-center justify-center bg-[#f7f6f2] px-5 text-[#1c1c1a]">
			<section className="w-full max-w-md border-y border-[#e6e3dc] py-10 text-center">
				<p className="text-xs text-[#73716b]">Private access</p>
				<h1 className="mt-3 text-2xl font-medium">Waiting for approval</h1>
				<p className="mt-3 text-sm leading-6 text-[#73716b]">
					You’re signed in as {me.data?.email}. An administrator needs to
					confirm your access before the shared albums become available.
				</p>
				<button
					type="button"
					onClick={() => void me.refetch()}
					className="mt-6 border-b border-[#1c1c1a] py-1 text-sm font-medium"
				>
					Check again
				</button>
				<button
					type="button"
					onClick={() => logout.mutate()}
					className="ml-6 text-sm text-[#73716b] hover:text-[#1c1c1a]"
				>
					Sign out
				</button>
			</section>
		</main>
	);
}
