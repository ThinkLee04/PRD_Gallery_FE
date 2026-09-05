import { Navigate } from "react-router-dom";
import { LOGIN_URL } from "../../lib/api";
import { useAuthError } from "./useAuthError";
import { useMe } from "./useMe";

function Loading() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-[#f7f6f2]">
			<p className="text-sm text-[#73716b]">Loading…</p>
		</div>
	);
}

export function LoginPage() {
	const me = useMe();
	const { message } = useAuthError();
	if (me.isLoading) return <Loading />;
	if (me.data !== null) return <Navigate to="/" replace />;
	return (
		<main className="flex min-h-screen items-center justify-center bg-[#f7f6f2] px-5 text-[#1c1c1a]">
			<div className="w-full max-w-sm border-y border-[#e6e3dc] py-10">
				<h1 className="text-2xl font-medium">Your shared memories</h1>
				<p className="mt-3 text-sm leading-6 text-[#73716b]">
					Sign in to enter this private photo collection.
				</p>
				{message !== null ? (
					<div
						role="alert"
						className="mt-4 border-l-2 border-[#c84d54] bg-[#f3e8e7] px-3 py-2 text-sm text-[#8f353b]"
					>
						{message}
					</div>
				) : null}
				<a
					href={LOGIN_URL}
					className="mt-7 flex w-full items-center justify-center border border-[#1c1c1a] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[#1c1c1a] hover:text-white"
				>
					Sign in with Google
				</a>
			</div>
		</main>
	);
}
