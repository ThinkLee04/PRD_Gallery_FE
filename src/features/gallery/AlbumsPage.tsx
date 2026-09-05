import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import { useMe } from "../auth/useMe";
import { AppShell } from "./AppShell";
import { collectionKeys, useCollections } from "./queries";
import type { Collection } from "./types";

function formatUpdated(value: string | undefined): string {
	if (!value) return "Recently created";
	return `Updated ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value))}`;
}

export function AlbumsPage() {
	const [archived, setArchived] = useState(false);
	const [creating, setCreating] = useState(false);
	const query = useCollections(archived ? "archived" : "active");
	const me = useMe();
	const client = useQueryClient();
	const create = useMutation({
		mutationFn: (body: { name: string; description: string | null }) =>
			apiFetch<Collection>("/v1/collections", {
				method: "POST",
				body: JSON.stringify(body),
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
			<main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
				<header className="flex items-end justify-between gap-6 border-b border-[#e6e3dc] pb-5">
					<div>
						<h1 className="text-2xl font-medium tracking-tight">
							{archived ? "Archived albums" : "Albums"}
						</h1>
						<p className="mt-1 text-sm text-[#73716b]">
							{archived
								? "Albums remain intact and can be restored."
								: me.data?.vault?.name}
						</p>
					</div>
					<div className="flex items-center gap-5 text-sm">
						<button
							type="button"
							onClick={() => setArchived((value) => !value)}
							className="text-[#73716b] underline-offset-4 hover:text-[#1c1c1a] hover:underline"
						>
							{archived ? "View active" : "View archive"}
						</button>
						{!archived ? (
							<button
								type="button"
								onClick={() => setCreating(true)}
								className="border-b border-[#1c1c1a] py-1 font-medium"
							>
								New album
							</button>
						) : null}
					</div>
				</header>

				{creating ? (
					<form
						className="mt-8 max-w-xl border-y border-[#e6e3dc] py-6"
						onSubmit={(event) => {
							event.preventDefault();
							const form = new FormData(event.currentTarget);
							create.mutate({
								name: String(form.get("name")),
								description: String(form.get("description")) || null,
							});
						}}
					>
						<h2 className="text-base font-medium">Create an album</h2>
						<label
							className="mt-5 block text-xs text-[#73716b]"
							htmlFor="album-name"
						>
							Name
						</label>
						<input
							id="album-name"
							name="name"
							required
							maxLength={120}
							className="mt-2 w-full rounded-[4px] border border-[#d8d4cb] bg-[#fdfcf8] px-3 py-2.5"
						/>
						<label
							className="mt-4 block text-xs text-[#73716b]"
							htmlFor="album-description"
						>
							Description <span>(optional)</span>
						</label>
						<textarea
							id="album-description"
							name="description"
							maxLength={2000}
							rows={3}
							className="mt-2 w-full resize-y rounded-[4px] border border-[#d8d4cb] bg-[#fdfcf8] px-3 py-2.5"
						/>
						{create.isError ? (
							<p role="alert" className="mt-3 text-sm text-[#a53e45]">
								{create.error.message}
							</p>
						) : null}
						<div className="mt-5 flex gap-5 text-sm">
							<button
								type="submit"
								disabled={create.isPending}
								className="border-b border-[#1c1c1a] py-1 font-medium disabled:opacity-50"
							>
								{create.isPending ? "Creating…" : "Create album"}
							</button>
							<button
								type="button"
								onClick={() => setCreating(false)}
								className="text-[#73716b]"
							>
								Cancel
							</button>
						</div>
					</form>
				) : null}

				{query.isLoading ? (
					<div
						role="status"
						className="divide-y divide-[#e6e3dc]"
						aria-label="Loading albums"
					>
						{[0, 1, 2].map((item) => (
							<div key={item} className="grid grid-cols-[112px_1fr] gap-5 py-5">
								<div className="aspect-[4/3] animate-pulse bg-[#e9e6df]" />
								<div className="py-2">
									<div className="h-4 w-40 bg-[#e9e6df]" />
									<div className="mt-3 h-3 w-56 bg-[#eeece6]" />
								</div>
							</div>
						))}
					</div>
				) : null}
				<div className="mt-3 divide-y divide-[#e6e3dc]">
					{albums.map((album) => (
						<article
							key={album.id}
							className="group grid grid-cols-[112px_minmax(0,1fr)_auto] items-center gap-5 py-5 sm:grid-cols-[180px_minmax(0,1fr)_auto]"
						>
							{archived ? (
								<div className="aspect-[4/3] bg-[#e8e5de]">
									{album.cover ? (
										<img
											src={album.cover.url}
											alt=""
											className="h-full w-full object-cover opacity-70"
										/>
									) : null}
								</div>
							) : (
								<Link
									to={`/albums/${album.id}`}
									aria-label={`Open ${album.name}`}
									className="aspect-[4/3] overflow-hidden bg-[#e8e5de] transition-colors hover:bg-[#dedbd3]"
								>
									{album.cover ? (
										<img
											src={album.cover.url}
											alt=""
											loading="lazy"
											decoding="async"
											className="h-full w-full object-cover"
										/>
									) : null}
								</Link>
							)}
							<div className="min-w-0">
								{archived ? (
									<h2 className="truncate font-medium">{album.name}</h2>
								) : (
									<Link
										to={`/albums/${album.id}`}
										className="font-medium underline-offset-4 hover:underline"
									>
										<h2 className="truncate">{album.name}</h2>
									</Link>
								)}
								<p className="mt-1 line-clamp-2 text-sm text-[#73716b]">
									{album.description ||
										`${album.photoCount} ${album.photoCount === 1 ? "photo" : "photos"}`}
								</p>
								<p className="mt-3 text-xs text-[#918e87]">
									{album.createdByUserId === me.data?.id
										? "Created by you"
										: `Created by ${album.creatorName || "a vault member"}`}{" "}
									· {formatUpdated(album.updatedAt)}
								</p>
							</div>
							{album.canManage && archived ? (
								<button
									type="button"
									onClick={() =>
										archive.mutate({ id: album.id, restore: true })
									}
									className="text-sm underline-offset-4 hover:underline"
								>
									Restore
								</button>
							) : (
								<span className="hidden text-sm text-[#73716b] sm:block">
									{album.photoCount}
								</span>
							)}
						</article>
					))}
				</div>
				{query.isError ? (
					<p role="alert" className="mt-8 text-sm text-[#a53e45]">
						Unable to load albums. Try again.
					</p>
				) : null}
				{query.hasNextPage ? (
					<button
						type="button"
						onClick={() => void query.fetchNextPage()}
						className="mt-8 border-b border-[#1c1c1a] py-1 text-sm"
					>
						{query.isFetchingNextPage ? "Loading…" : "Load more"}
					</button>
				) : null}
				{!query.isLoading && albums.length === 0 ? (
					<div className="py-24 text-center">
						<p className="text-sm text-[#73716b]">
							{archived ? "No archived albums." : "No albums yet."}
						</p>
						{!archived ? (
							<button
								type="button"
								onClick={() => setCreating(true)}
								className="mt-4 border-b border-[#1c1c1a] py-1 text-sm font-medium"
							>
								Create the first album
							</button>
						) : null}
					</div>
				) : null}
			</main>
		</AppShell>
	);
}
