import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useLogout } from "../auth/useLogout";
import { useMe } from "../auth/useMe";

export function AppShell({ children }: { children: ReactNode }) {
	const me = useMe();
	const logout = useLogout();
	return (
		<div className="min-h-screen bg-[#0a0a0b] text-white">
			<header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-xl">
				<div className="flex h-16 items-center gap-6 px-4 sm:px-6">
					<NavLink
						to="/albums"
						className="text-lg font-semibold tracking-tight"
					>
						Photo Vault
					</NavLink>
					<nav className="flex flex-1 gap-1 text-sm text-zinc-400">
						<NavLink
							to="/albums"
							className={({ isActive }) =>
								`rounded-full px-4 py-2 ${isActive ? "bg-white text-black" : "hover:text-white"}`
							}
						>
							Albums
						</NavLink>
						<NavLink
							to="/loved"
							className={({ isActive }) =>
								`rounded-full px-4 py-2 ${isActive ? "bg-white text-black" : "hover:text-white"}`
							}
						>
							Loved
						</NavLink>
						{me.data?.isAdmin ? (
							<NavLink
								to="/admin/access"
								className={({ isActive }) =>
									`rounded-full px-4 py-2 ${isActive ? "bg-white text-black" : "hover:text-white"}`
								}
							>
								Access
							</NavLink>
						) : null}
					</nav>
					<button
						type="button"
						onClick={() => logout.mutate()}
						className="text-sm text-zinc-400 hover:text-white"
					>
						Sign out
					</button>
				</div>
			</header>
			{children}
		</div>
	);
}
