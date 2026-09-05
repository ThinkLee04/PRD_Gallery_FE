import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import { AppShell } from "./AppShell";
import { collectionKeys, useCollections } from "./queries";
import type { Collection } from "./types";

export function AlbumsPage() {
	const [archived, setArchived] = useState(false);
	const [creating, setCreating] = useState(false);
	const query = useCollections(archived ? "archived" : "active");
	const client = useQueryClient();
	const create = useMutation({
		mutationFn: (name: string) =>
			apiFetch<Collection>("/v1/collections", {
				method: "POST",
				body: JSON.stringify({ name }),
			}),
		onSuccess: () => {
			setCreating(false);
			void client.invalidateQueries({ queryKey: collectionKeys.all });
		},
	});
	const archive = useMutation({
		mutationFn: ({ id, restore }: { id: string; restore: boolean }) =>
			apiFetch(`/v1/collections/${id}/${restore ? "restore" : "archive"}`, {
				method: "POST",
			}),
		onSuccess: () =>
			void client.invalidateQueries({ queryKey: collectionKeys.all }),
	});
	const albums = query.data?.pages.flatMap((page) => page.data) ?? [];
	return (
		<AppShell>
			<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
				<div className="flex items-end justify-between gap-4">
					<div>
						<p className="text-sm text-zinc-500">Shared space</p>
						<h1 className="text-4xl font-semibold tracking-tight">
							{archived ? "Archived albums" : "Albums"}
						</h1>
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => setArchived(!archived)}
							className="rounded-full border border-white/20 px-4 py-2 text-sm"
						>
							{archived ? "Active albums" : "Archive"}
						</button>
						{!archived ? (
							<button
								type="button"
								onClick={() => setCreating(true)}
								className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
							>
								New album
							</button>
						) : null}
					</div>
				</div>
				{creating ? (
					<form
						className="mt-6 flex max-w-lg gap-2"
						onSubmit={(event) => {
							event.preventDefault();
							const form = new FormData(event.currentTarget);
							create.mutate(String(form.get("name")));
						}}
					>
						<input
							name="name"
							required
							maxLength={120}
							placeholder="Album name"
							className="min-w-0 flex-1 rounded-xl bg-white/10 px-4 py-3 outline-none ring-white focus:ring-2"
						/>
						<button
							type="submit"
							className="rounded-xl bg-white px-5 text-black"
						>
							Create
						</button>
					</form>
				) : null}
				<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{albums.map((album) => (
						<article
							key={album.id}
							className="group rounded-2xl border border-white/10 bg-zinc-900 p-5 transition hover:border-white/30"
						>
							{archived ? (
								<div>
									<div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-950" />
									<h2 className="mt-4 text-lg font-medium">{album.name}</h2>
									<p className="text-sm text-zinc-500">
										{album.photoCount} media
									</p>
								</div>
							) : (
								<Link to={`/albums/${album.id}`} className="block">
									<div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-950" />
									<h2 className="mt-4 text-lg font-medium">{album.name}</h2>
									<p className="text-sm text-zinc-500">
										{album.photoCount} media
									</p>
								</Link>
							)}
							{album.canManage ? (
								<button
									type="button"
									onClick={() =>
										archive.mutate({ id: album.id, restore: archived })
									}
									className="mt-4 text-xs text-zinc-400 hover:text-white"
								>
									{archived ? "Restore" : "Archive"}
								</button>
							) : null}
						</article>
					))}
				</div>
				{query.hasNextPage ? (
					<button
						type="button"
						onClick={() => void query.fetchNextPage()}
						className="mt-8 rounded-full border border-white/20 px-4 py-2"
					>
						Load more
					</button>
				) : null}
				{!query.isLoading && albums.length === 0 ? (
					<p className="mt-16 text-center text-zinc-500">No albums here yet.</p>
				) : null}
			</main>
		</AppShell>
	);
}
