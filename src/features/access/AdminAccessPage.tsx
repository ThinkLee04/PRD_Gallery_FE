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

function Avatar({ url, name }: { url: string | null; name: string }) {
	return url ? (
		<img
			src={url}
			alt=""
			className="h-9 w-9 rounded-full"
			referrerPolicy="no-referrer"
		/>
	) : (
		<span
			aria-hidden="true"
			className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dfdcd4] text-xs"
		>
			{name.trim().charAt(0).toUpperCase()}
		</span>
	);
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
		onSuccess: () => {
			void client.invalidateQueries({ queryKey: ["admin", "pending-users"] });
		},
	});
	if (me.data && !me.data.isAdmin) return <Navigate to="/albums" replace />;
	const pending = users.data?.pages.flatMap((page) => page.data) ?? [];
	return (
		<AppShell>
			<main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
				<header className="border-b border-[#e6e3dc] pb-5">
					<h1 className="text-2xl font-medium tracking-tight">
						Access management
					</h1>
					<p className="mt-1 text-sm text-[#73716b]">
						Approve people you know before they enter the shared vault.
					</p>
				</header>
				<section className="mt-10" aria-labelledby="pending-heading">
					<div className="flex items-baseline justify-between border-b border-[#d8d4cb] pb-3">
						<h2 id="pending-heading" className="font-medium">
							Pending requests
						</h2>
						{pending.length > 0 ? (
							<span className="text-xs text-[#73716b]">
								{pending.length} waiting
							</span>
						) : null}
					</div>
					<div className="divide-y divide-[#e6e3dc]">
						{pending.map((user) => (
							<div
								key={user.id}
								className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-4 sm:grid-cols-[auto_minmax(0,1fr)_180px_auto]"
							>
								<Avatar
									url={user.avatarUrl}
									name={user.displayName || user.email}
								/>
								<div className="min-w-0">
									<p className="truncate text-sm font-medium">
										{user.displayName || "New user"}
									</p>
									<p className="truncate text-xs text-[#73716b]">
										{user.email}
									</p>
								</div>
								<time className="hidden text-xs text-[#73716b] sm:block">
									{new Intl.DateTimeFormat(undefined, {
										dateStyle: "medium",
										timeStyle: "short",
									}).format(new Date(user.createdAt))}
								</time>
								<button
									type="button"
									disabled={approve.isPending}
									onClick={() => {
										if (
											window.confirm(
												`Approve ${user.displayName || user.email} as a vault member?`,
											)
										)
											approve.mutate(user.id);
									}}
									className="border-b border-[#1c1c1a] py-1 text-sm font-medium disabled:opacity-50"
								>
									Approve
								</button>
							</div>
						))}
						{users.isLoading ? (
							<p className="py-8 text-sm text-[#73716b]">Loading requests…</p>
						) : null}
						{users.isError ? (
							<p role="alert" className="py-5 text-sm text-[#a53e45]">
								Unable to load access requests.
							</p>
						) : null}
						{!users.isLoading && pending.length === 0 ? (
							<p className="py-8 text-sm text-[#73716b]">
								No pending requests.
							</p>
						) : null}
					</div>
					{users.hasNextPage ? (
						<button
							type="button"
							onClick={() => void users.fetchNextPage()}
							className="mt-5 border-b border-[#1c1c1a] py-1 text-sm"
						>
							Load more
						</button>
					) : null}
				</section>
				<section className="mt-12" aria-labelledby="members-heading">
					<h2
						id="members-heading"
						className="border-b border-[#d8d4cb] pb-3 font-medium"
					>
						Approved members
					</h2>
					{me.data ? (
						<div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-4">
							<Avatar url={me.data.avatarUrl} name={me.data.displayName} />
							<div className="min-w-0">
								<p className="truncate text-sm font-medium">
									{me.data.displayName}
								</p>
								<p className="truncate text-xs text-[#73716b]">
									{me.data.email}
								</p>
							</div>
							<span className="text-xs text-[#73716b]">
								{me.data.vault?.role === "OWNER" ? "Owner" : "Member"}
							</span>
						</div>
					) : null}
					<p className="border-t border-[#e6e3dc] pt-3 text-xs text-[#918e87]">
						Member management beyond approval is not available yet.
					</p>
				</section>
			</main>
		</AppShell>
	);
}
