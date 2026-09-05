import {
	useInfiniteQuery,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { apiFetch, apiFetchEnvelope } from "../../lib/api";
import { useMe } from "../auth/useMe";
import { AppShell } from "../gallery/AppShell";

interface PendingUser {
	id: string;
	email: string;
	displayName: string;
	avatarUrl: string | null;
	createdAt: string;
}

export function AdminAccessPage() {
	const me = useMe();
	const client = useQueryClient();
	const users = useInfiniteQuery({
		queryKey: ["admin", "pending-users"],
		initialPageParam: "",
		enabled: me.data?.isAdmin === true,
		queryFn: ({ pageParam }) =>
			apiFetchEnvelope<PendingUser[]>(
				`/v1/admin/pending-users?limit=50${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`,
			),
		getNextPageParam: (last) => last.page.nextCursor ?? undefined,
	});
	const approve = useMutation({
		mutationFn: (id: string) =>
			apiFetch(`/v1/admin/users/${id}/approve`, { method: "POST" }),
		onSuccess: () =>
			void client.invalidateQueries({ queryKey: ["admin", "pending-users"] }),
	});
	if (me.data && !me.data.isAdmin) return <Navigate to="/albums" replace />;
	const pending = users.data?.pages.flatMap((page) => page.data) ?? [];
	return (
		<AppShell>
			<main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
				<p className="text-sm text-zinc-500">Administration</p>
				<h1 className="text-3xl font-semibold">Access requests</h1>
				<div className="mt-8 divide-y divide-white/10 rounded-2xl border border-white/10">
					{pending.map((user) => (
						<div key={user.id} className="flex items-center gap-4 p-4">
							{user.avatarUrl ? (
								<img
									src={user.avatarUrl}
									alt=""
									className="h-11 w-11 rounded-full"
									referrerPolicy="no-referrer"
								/>
							) : (
								<div className="h-11 w-11 rounded-full bg-zinc-800" />
							)}
							<div className="min-w-0 flex-1">
								<p className="truncate font-medium">
									{user.displayName || "New user"}
								</p>
								<p className="truncate text-sm text-zinc-500">{user.email}</p>
							</div>
							<button
								type="button"
								onClick={() => approve.mutate(user.id)}
								className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
							>
								Approve
							</button>
						</div>
					))}
					{!users.isLoading && pending.length === 0 ? (
						<p className="p-8 text-center text-zinc-500">
							No pending requests.
						</p>
					) : null}
				</div>
			</main>
		</AppShell>
	);
}
