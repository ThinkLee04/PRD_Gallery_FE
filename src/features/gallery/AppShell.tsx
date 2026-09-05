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
	const firstName = me.data?.displayName.trim().split(/\s+/)[0] || "Account";
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
			<header className="sticky top-0 z-40 border-b border-[#e6e3dc] bg-[#f7f6f2]/95">
				<div className="flex h-12 items-center px-4 sm:px-6">
					<nav
						aria-label="Primary"
						className="flex flex-1 items-center gap-2 text-sm"
					>
						<NavLink
							to="/albums"
							className={({ isActive }) =>
								`border px-3 py-1.5 transition-colors ${isActive ? "border-[#c9c5bc] bg-[#fdfcf8] text-[#1c1c1a]" : "border-[#e6e3dc] text-[#73716b] hover:border-[#c9c5bc] hover:bg-[#efede7] hover:text-[#1c1c1a]"}`
							}
						>
							Albums
						</NavLink>
						<NavLink
							to="/loved"
							className={({ isActive }) =>
								`border px-3 py-1.5 transition-colors ${isActive ? "border-[#c9c5bc] bg-[#fdfcf8] text-[#1c1c1a]" : "border-[#e6e3dc] text-[#73716b] hover:border-[#c9c5bc] hover:bg-[#efede7] hover:text-[#1c1c1a]"}`
							}
						>
							Loved
						</NavLink>
					</nav>
					{onUpload || actions ? (
						<div className="mr-5 hidden items-center gap-4 text-xs sm:flex">
							{onUpload ? (
								<button
									type="button"
									onClick={onUpload}
									className="border-b border-[#1c1c1a] py-1 font-medium"
								>
									Upload
								</button>
							) : null}
							{actions}
						</div>
					) : null}
					<details className="group relative">
						<summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-[#53514c] marker:hidden">
							{me.data?.avatarUrl ? (
								<img
									src={me.data.avatarUrl}
									alt=""
									referrerPolicy="no-referrer"
									className="h-6 w-6 rounded-full"
								/>
							) : (
								<span className="h-6 w-6 rounded-full bg-[#ddd9d0]" />
							)}
							<span className="hidden sm:inline">{firstName}</span>
						</summary>
						<div className="absolute right-0 mt-3 w-56 border border-[#d8d4cb] bg-[#fdfcf8] p-2 text-sm">
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
				{onUpload || actions ? (
					<div className="flex h-10 items-center justify-start gap-4 border-t border-[#ece9e2] px-4 text-xs sm:hidden">
						{onUpload ? (
							<button
								type="button"
								onClick={onUpload}
								className="border-b border-[#1c1c1a] py-1 font-medium"
							>
								Upload
							</button>
						) : null}
						{actions}
					</div>
				) : null}
			</header>
			{children}
		</div>
	);
}
