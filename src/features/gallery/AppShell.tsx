import { useInfiniteQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { apiFetchEnvelope } from "../../lib/api";
import { useLogout } from "../auth/useLogout";
import { useMe } from "../auth/useMe";

interface PendingUser {
	id: string;
}

export function AppShell({
	children,
	onUpload,
	actions,
}: {
	children: ReactNode;
	onUpload?: () => void;
	actions?: ReactNode;
}) {
	const me = useMe();
	const logout = useLogout();
	const pending = useInfiniteQuery({
		queryKey: ["admin", "pending-users", "nav-count"],
		initialPageParam: "",
		enabled: me.data?.isAdmin === true,
		queryFn: ({ pageParam }) =>
			apiFetchEnvelope<PendingUser[]>(
				`/v1/admin/pending-users?limit=100${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`,
			),
		getNextPageParam: () => undefined,
		staleTime: 30_000,
	});
	const pendingCount = pending.data?.pages[0]?.data.length ?? 0;
	useEffect(() => {
		const closeMenus = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Node)) return;
			for (const menu of document.querySelectorAll<HTMLDetailsElement>(
				"details[open]",
			)) {
				if (!menu.contains(target)) menu.removeAttribute("open");
			}
		};
		document.addEventListener("pointerdown", closeMenus);
		return () => document.removeEventListener("pointerdown", closeMenus);
	}, []);
	return (
		<div className="min-h-screen bg-[#f7f6f2] text-[#1c1c1a]">
			<header className="sticky top-3 z-40 mx-3 mb-3 sm:top-4 sm:mx-4 sm:mb-4">
				<div className="mx-auto flex h-14 max-w-7xl items-center rounded-xl border border-white/70 bg-[rgba(247,246,242,0.8)] px-1 backdrop-blur-md sm:px-4">
					<nav
						aria-label="Primary"
						className="flex shrink-0 items-center gap-1 text-sm sm:gap-2"
					>
						<NavLink
							to="/albums"
							className={({ isActive }) =>
								`flex min-h-10 items-center border-b px-1 sm:px-1.5 ${isActive ? "border-[#1c1c1a] text-[#1c1c1a]" : "border-transparent text-[#64625d] hover:text-[#1c1c1a]"}`
							}
						>
							Albums
						</NavLink>
						<NavLink
							to="/loved"
							className={({ isActive }) =>
								`flex min-h-10 items-center border-b px-1 sm:px-1.5 ${isActive ? "border-[#1c1c1a] text-[#1c1c1a]" : "border-transparent text-[#64625d] hover:text-[#1c1c1a]"}`
							}
						>
							Loved
						</NavLink>
					</nav>
					{actions ? (
						<>
							<span
								aria-hidden="true"
								className="mx-1 hidden h-5 border-l border-[#bdb9b0]/70 sm:block"
							/>
							<div className="min-w-0 flex-1 text-xs sm:text-sm">{actions}</div>
						</>
					) : (
						<div className="flex-1" />
					)}
					{onUpload || actions ? (
						<span
							aria-hidden="true"
							className="mx-1 hidden h-5 border-l border-[#bdb9b0]/70 sm:block"
						/>
					) : null}
					{onUpload ? (
						<button
							type="button"
							onClick={onUpload}
							className="flex min-h-10 shrink-0 items-center border border-[#bdb9b0]/80 px-1.5 text-sm font-medium text-[#2e2d2a] transition-colors hover:bg-white/45 sm:px-3"
						>
							Upload
						</button>
					) : null}
					<details className="group relative ml-0.5 sm:ml-1">
						<summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-1 text-sm text-[#53514c] transition-colors marker:hidden hover:text-[#1c1c1a] sm:px-2">
							{me.data?.avatarUrl ? (
								<img
									src={me.data.avatarUrl}
									alt=""
									referrerPolicy="no-referrer"
									className="hidden h-6 w-6 rounded-full min-[390px]:block"
								/>
							) : (
								<span className="hidden h-6 w-6 rounded-full bg-[#ddd9d0] min-[390px]:block" />
							)}
							<span>Account</span>
						</summary>
						<div className="absolute right-0 mt-2 max-h-[calc(100dvh-5rem)] w-56 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-lg border border-[#d8d4cb] bg-[rgba(253,252,248,0.96)] p-2 text-sm backdrop-blur-md">
							<p className="px-2 pt-2 text-xs text-[#918e87]">Account</p>
							<p className="truncate px-2 py-2 font-medium">
								{me.data?.displayName}
							</p>
							<p className="truncate px-2 pb-2 text-xs text-[#73716b]">
								{me.data?.email}
							</p>
							<NavLink
								to="/loved"
								className="block px-2 py-2 hover:bg-[#efede7]"
							>
								Loved
							</NavLink>
							{me.data?.isAdmin ? (
								<>
									<div className="my-1 border-t border-[#e6e3dc]" />
									<NavLink
										to="/admin/access"
										className="flex justify-between px-2 py-2 hover:bg-[#efede7]"
									>
										<span>Admin access</span>
										{pendingCount > 0 ? (
											<span className="text-[#c84d54]">
												{pendingCount}
												{pendingCount === 100 ? "+" : ""}
											</span>
										) : null}
									</NavLink>
								</>
							) : null}
							<button
								type="button"
								onClick={() => logout.mutate()}
								className="block w-full px-2 py-2 text-left hover:bg-[#efede7]"
							>
								Sign out
							</button>
						</div>
					</details>
				</div>
			</header>
			{children}
		</div>
	);
}
