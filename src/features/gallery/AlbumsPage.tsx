import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import { useMe } from "../auth/useMe";
import { AppShell } from "./AppShell";
import { collectionKeys, useCollections } from "./queries";
import type { Collection } from "./types";

function ArrowUpRightIcon() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 20 20"
			className="h-5 w-5 fill-none stroke-current"
			strokeWidth="1.5"
		>
			<path d="M5.5 14.5 14 6m-6.5 0H14v6.5" />
		</svg>
	);
}

function PlusIcon() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 20 20"
			className="h-4 w-4 fill-none stroke-current"
			strokeWidth="1.5"
		>
			<path d="M10 4v12M4 10h12" />
		</svg>
	);
}

function ArchiveIcon() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 20 20"
			className="h-4 w-4 fill-none stroke-current"
			strokeWidth="1.5"
		>
			<path d="M3.5 6.5h13v9h-13zM2.5 3.5h15v3h-15zM8 10h4" />
		</svg>
	);
}

function SearchIcon() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 20 20"
			className="h-4 w-4 fill-none stroke-current"
			strokeWidth="1.5"
		>
			<circle cx="8.5" cy="8.5" r="5" />
			<path d="m12.25 12.25 4 4" />
		</svg>
	);
}

function CalendarIcon() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 20 20"
			className="h-4 w-4 fill-none stroke-current"
			strokeWidth="1.5"
		>
			<rect x="3" y="4.5" width="14" height="12" rx="2" />
			<path d="M6.5 2.5v4m7-4v4M3 8.5h14" />
		</svg>
	);
}

function EmptyAlbumArtwork() {
	return (
		<div className="relative h-full w-full overflow-hidden bg-[#e8e2d8]">
			<div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[#d4bea8]/70 blur-2xl" />
			<div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-[#b9c5b5]/70 blur-2xl" />
			<svg
				aria-hidden="true"
				viewBox="0 0 320 240"
				className="absolute inset-0 h-full w-full fill-none stroke-[#776e63]/35"
				strokeWidth="1"
			>
				<circle cx="247" cy="66" r="27" />
				<path d="m-20 219 99-87 50 43 45-38 166 105" />
				<path d="m-12 238 92-70 47 37 50-38 156 91" />
			</svg>
		</div>
	);
}

function formatEventDate(value: string): string {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "long",
		timeZone: "UTC",
	}).format(new Date(`${value}T00:00:00Z`));
}

function formatUpdated(value: string | undefined): string {
	if (!value) return "Recently created";
	return `Updated ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value))}`;
}

function eventDateValue(value: FormDataEntryValue | null): string | null {
	const raw = String(value ?? "");
	return raw || null;
}

function AlbumsLoading() {
	return (
		<div
			role="status"
			aria-label="Loading albums"
			className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
		>
			{[0, 1, 2, 3, 4, 5].map((item) => (
				<div key={item} className="animate-pulse">
					<div className="aspect-[4/3] rounded-2xl bg-[#e8e5de]" />
					<div className="mt-4 h-5 w-2/3 rounded bg-[#e1ded7]" />
					<div className="mt-3 h-3 w-1/2 rounded bg-[#ebe8e1]" />
				</div>
			))}
			<span className="sr-only">Loading albums…</span>
		</div>
	);
}

function AlbumCard({
	album,
	archived,
	currentUserId,
	onRestore,
	restoring,
}: {
	album: Collection;
	archived: boolean;
	currentUserId: string | undefined;
	onRestore: () => void;
	restoring: boolean;
}) {
	const creator =
		album.createdByUserId === currentUserId
			? "You"
			: album.creatorName || "Vault member";
	const cover = (
		<>
			{album.cover ? (
				<img
					src={album.cover.url}
					alt=""
					loading="lazy"
					decoding="async"
					className={`h-full w-full object-cover transition duration-500 ease-out ${archived ? "saturate-[.65]" : "group-hover:scale-[1.025]"}`}
				/>
			) : (
				<EmptyAlbumArtwork />
			)}
			<div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
			<span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
				{album.photoCount} {album.photoCount === 1 ? "photo" : "photos"}
			</span>
		</>
	);

	return (
		<article className="group min-w-0">
			{archived ? (
				<div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#e8e5de]">
					{cover}
				</div>
			) : (
				<Link
					to={`/albums/${album.id}`}
					aria-label={`Open ${album.name}`}
					className="media-focus relative block aspect-[4/3] overflow-hidden rounded-2xl bg-[#e8e5de] shadow-[0_1px_0_rgba(0,0,0,0.04)]"
				>
					{cover}
				</Link>
			)}
			<div className="pt-4">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						{archived ? (
							<h2 className="truncate text-lg font-medium tracking-[-0.02em] text-[#272522]">
								{album.name}
							</h2>
						) : (
							<Link to={`/albums/${album.id}`} className="block rounded-sm">
								<h2 className="truncate text-lg font-medium tracking-[-0.02em] text-[#272522] transition-colors group-hover:text-[#76604d]">
									{album.name}
								</h2>
							</Link>
						)}
						<p className="mt-1 text-sm text-[#77736c]">
							{album.eventDate
								? formatEventDate(album.eventDate)
								: formatUpdated(album.updatedAt)}
						</p>
					</div>
					{archived && album.canManage ? (
						<button
							type="button"
							onClick={onRestore}
							disabled={restoring}
							className="rounded-full border border-[#d8d3ca] bg-white/60 px-3 py-1.5 text-xs font-medium transition-colors hover:border-[#aaa39a] hover:bg-white disabled:opacity-50"
						>
							{restoring ? "Restoring…" : "Restore"}
						</button>
					) : archived ? null : (
						<span className="mt-0.5 text-[#807b73] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
							<ArrowUpRightIcon />
						</span>
					)}
				</div>
				{album.description ? (
					<p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-[#66625c]">
						{album.description}
					</p>
				) : null}
				<div
					className={`${album.description ? "mt-4" : "mt-5"} flex items-center gap-2 text-xs text-[#918c84]`}
				>
					{album.creatorAvatarUrl ? (
						<img
							src={album.creatorAvatarUrl}
							alt=""
							referrerPolicy="no-referrer"
							className="h-5 w-5 rounded-full object-cover"
						/>
					) : (
						<span className="grid h-5 w-5 place-items-center rounded-full bg-[#e1ddd5] text-[9px] font-semibold text-[#706b64]">
							{creator.charAt(0).toUpperCase()}
						</span>
					)}
					<span>Created by {creator}</span>
				</div>
			</div>
		</article>
	);
}

export function AlbumsPage() {
	const [archived, setArchived] = useState(false);
	const [creating, setCreating] = useState(false);
	const [search, setSearch] = useState("");
	const [dateFrom, setDateFrom] = useState<string | null>(null);
	const [dateTo, setDateTo] = useState<string | null>(null);
	const deferredSearch = useDeferredValue(search.trim());
	const query = useCollections(archived ? "archived" : "active", {
		search: deferredSearch,
		dateFrom,
		dateTo,
	});
	const me = useMe();
	const client = useQueryClient();
	const create = useMutation({
		mutationFn: (body: {
			name: string;
			description: string | null;
			eventDate: string | null;
		}) =>
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
	const filtersActive =
		search.trim() !== "" || dateFrom !== null || dateTo !== null;

	useEffect(() => {
		if (!creating) return;
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !create.isPending) setCreating(false);
		};
		document.addEventListener("keydown", closeOnEscape);
		return () => document.removeEventListener("keydown", closeOnEscape);
	}, [creating, create.isPending]);

	const openCreate = () => {
		create.reset();
		setCreating(true);
	};

	return (
		<AppShell>
			<main className="mx-auto w-full max-w-[1280px] px-4 pb-20 pt-10 sm:px-6 sm:pt-16 lg:px-10">
				<header className="border-b border-[#dedad2] pb-9 sm:pb-12">
					<div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
						<div>
							<p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6f58]">
								Paradise's Gallery
							</p>
							<h1 className="max-w-3xl text-4xl font-medium tracking-[-0.045em] text-[#24221f] sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
								{archived ? "Albums tucked away" : "Every story, all together"}
							</h1>
							<p className="mt-4 max-w-xl text-sm leading-6 text-[#706c65] sm:text-base">
								{archived
									? "Archived albums stay safe here until you’re ready to bring them back."
									: "Gather the moments that belong together, then share and revisit them anytime."}
							</p>
						</div>
						{!archived ? (
							<button
								type="button"
								onClick={openCreate}
								className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-[#292724] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#4a433c] sm:self-auto"
							>
								<PlusIcon /> New album
							</button>
						) : null}
					</div>
				</header>

				<nav
					aria-label="Album views and filters"
					className="mb-8 mt-6 flex flex-col gap-3 sm:mb-10 lg:flex-row lg:items-center lg:justify-between"
				>
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-1 rounded-full bg-[#ece9e2] p-1 text-sm">
							<button
								type="button"
								onClick={() => setArchived(false)}
								className={`rounded-full px-4 py-2 font-medium transition ${!archived ? "bg-white text-[#292724] shadow-sm" : "text-[#77726b] hover:text-[#292724]"}`}
							>
								Albums
							</button>
							<button
								type="button"
								onClick={() => setArchived(true)}
								className={`flex items-center gap-2 rounded-full px-4 py-2 font-medium transition ${archived ? "bg-white text-[#292724] shadow-sm" : "text-[#77726b] hover:text-[#292724]"}`}
							>
								<ArchiveIcon /> Archive
							</button>
						</div>
						{albums.length > 0 ? (
							<p className="text-sm text-[#8b867e] lg:hidden">
								{albums.length} {albums.length === 1 ? "album" : "albums"}
							</p>
						) : null}
					</div>
					<div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
						<label className="relative block min-w-0 sm:w-64">
							<span className="sr-only">Search albums</span>
							<span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#89837b]">
								<SearchIcon />
							</span>
							<input
								type="search"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								maxLength={120}
								placeholder="Search albums"
								className="h-11 w-full rounded-full border border-[#d7d2c9] bg-white/55 pl-10 pr-4 text-sm placeholder:text-[#9b968e] hover:bg-white/80 focus:border-[#8e877e] focus:bg-white"
							/>
						</label>
						<details className="group relative">
							<summary
								className={`flex h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium marker:hidden hover:bg-white/80 ${dateFrom || dateTo ? "border-[#827262] bg-[#f2ebe3] text-[#5f4e40]" : "border-[#d7d2c9] bg-white/55 text-[#5f5b55]"}`}
							>
								<CalendarIcon /> Date
								{dateFrom || dateTo ? (
									<span className="h-1.5 w-1.5 rounded-full bg-[#9a765a]" />
								) : null}
							</summary>
							<div className="absolute right-0 z-30 mt-2 w-full min-w-72 rounded-2xl border border-[#d7d2c9] bg-[rgba(253,252,248,0.98)] p-4 shadow-lg backdrop-blur-md sm:w-80">
								<p className="text-sm font-medium">Event date</p>
								<p className="mt-1 text-xs text-[#817c74]">
									Show albums whose event date is within this range.
								</p>
								<div className="mt-4 grid grid-cols-2 gap-3">
									<label className="text-xs text-[#706b64]">
										From
										<input
											type="date"
											value={dateFrom ?? ""}
											max={dateTo ?? undefined}
											onChange={(event) =>
												setDateFrom(event.target.value || null)
											}
											className="mt-1.5 w-full rounded-lg border border-[#d8d3ca] bg-white px-2.5 py-2 text-sm"
										/>
									</label>
									<label className="text-xs text-[#706b64]">
										To
										<input
											type="date"
											value={dateTo ?? ""}
											min={dateFrom ?? undefined}
											onChange={(event) =>
												setDateTo(event.target.value || null)
											}
											className="mt-1.5 w-full rounded-lg border border-[#d8d3ca] bg-white px-2.5 py-2 text-sm"
										/>
									</label>
								</div>
								<div className="mt-4 flex items-center justify-between">
									<button
										type="button"
										disabled={!dateFrom && !dateTo}
										onClick={() => {
											setDateFrom(null);
											setDateTo(null);
										}}
										className="text-xs font-medium text-[#777169] hover:text-[#292724] disabled:opacity-40"
									>
										Clear dates
									</button>
									<button
										type="button"
										onClick={(event) =>
											event.currentTarget
												.closest("details")
												?.removeAttribute("open")
										}
										className="rounded-full bg-[#292724] px-4 py-2 text-xs font-medium text-white"
									>
										Done
									</button>
								</div>
							</div>
						</details>
						{albums.length > 0 ? (
							<p className="hidden whitespace-nowrap text-sm text-[#8b867e] lg:block">
								{albums.length} {albums.length === 1 ? "album" : "albums"}
								{query.hasNextPage ? " loaded" : ""}
							</p>
						) : null}
					</div>
				</nav>

				{query.isLoading ? <AlbumsLoading /> : null}
				{!query.isLoading && albums.length > 0 ? (
					<div className="grid gap-x-5 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
						{albums.map((album) => (
							<AlbumCard
								key={album.id}
								album={album}
								archived={archived}
								currentUserId={me.data?.id}
								onRestore={() =>
									archive.mutate({ id: album.id, restore: true })
								}
								restoring={
									archive.isPending && archive.variables?.id === album.id
								}
							/>
						))}
					</div>
				) : null}

				{query.isError ? (
					<div
						role="alert"
						className="rounded-2xl border border-[#e2c9c5] bg-[#f8eeeb] px-5 py-4 text-sm text-[#8f4139]"
					>
						Unable to load albums. Please try again.
					</div>
				) : null}
				{archive.isError ? (
					<p role="alert" className="mt-6 text-sm text-[#a53e45]">
						Unable to restore that album. Please try again.
					</p>
				) : null}
				{query.hasNextPage ? (
					<div className="mt-14 flex justify-center">
						<button
							type="button"
							onClick={() => void query.fetchNextPage()}
							disabled={query.isFetchingNextPage}
							className="rounded-full border border-[#cbc6bd] bg-white/40 px-5 py-2.5 text-sm font-medium transition hover:bg-white disabled:opacity-50"
						>
							{query.isFetchingNextPage ? "Loading…" : "Load more albums"}
						</button>
					</div>
				) : null}

				{!query.isLoading && !query.isError && albums.length === 0 ? (
					<div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center sm:py-24">
						<div className="relative h-24 w-32 rotate-[-3deg] overflow-hidden rounded-xl border-4 border-white shadow-md">
							<EmptyAlbumArtwork />
						</div>
						<h2 className="mt-8 text-xl font-medium tracking-[-0.02em]">
							{filtersActive
								? "No matching albums"
								: archived
									? "Nothing in the archive"
									: "Your first story starts here"}
						</h2>
						<p className="mt-2 text-sm leading-6 text-[#77736c]">
							{filtersActive
								? "Try a different search or clear the date range."
								: archived
									? "Albums you archive will stay safely stored in this space."
									: "Create an album for a trip, a celebration, or the everyday moments worth keeping."}
						</p>
						{filtersActive ? (
							<button
								type="button"
								onClick={() => {
									setSearch("");
									setDateFrom(null);
									setDateTo(null);
								}}
								className="mt-6 rounded-full border border-[#cbc6bd] bg-white/50 px-5 py-2.5 text-sm font-medium hover:bg-white"
							>
								Clear filters
							</button>
						) : !archived ? (
							<button
								type="button"
								onClick={openCreate}
								className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#292724] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#4a433c]"
							>
								<PlusIcon /> Create your first album
							</button>
						) : null}
					</div>
				) : null}
			</main>

			{creating ? (
				<div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
					<button
						type="button"
						aria-label="Close create album dialog"
						onClick={() => setCreating(false)}
						disabled={create.isPending}
						className="absolute inset-0 h-full w-full cursor-default bg-[#211e1a]/35 backdrop-blur-[2px] disabled:opacity-100"
					/>
					<form
						role="dialog"
						aria-modal="true"
						aria-labelledby="create-album-title"
						className="relative w-full max-w-xl rounded-t-[1.75rem] bg-[#fbfaf7] p-6 shadow-2xl sm:rounded-[1.75rem] sm:p-8"
						onSubmit={(event) => {
							event.preventDefault();
							const form = new FormData(event.currentTarget);
							create.mutate({
								name: String(form.get("name")),
								description: String(form.get("description")) || null,
								eventDate: eventDateValue(form.get("eventDate")),
							});
						}}
					>
						<div className="flex items-start justify-between gap-6">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9a765a]">
									New collection
								</p>
								<h2
									id="create-album-title"
									className="mt-2 text-2xl font-medium tracking-[-0.03em]"
								>
									Create an album
								</h2>
								<p className="mt-2 text-sm leading-5 text-[#77736c]">
									Give this story a name. You can add photos once it’s created.
								</p>
							</div>
							<button
								type="button"
								aria-label="Close"
								onClick={() => setCreating(false)}
								disabled={create.isPending}
								className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#efede7] text-xl text-[#625e58] hover:bg-[#e5e1da] disabled:opacity-50"
							>
								<span aria-hidden="true">×</span>
							</button>
						</div>
						<div className="mt-7">
							<label className="block text-sm font-medium" htmlFor="album-name">
								Album name
							</label>
							<input
								id="album-name"
								name="name"
								required
								maxLength={120}
								placeholder="Summer in Hội An"
								className="mt-2 w-full rounded-xl border border-[#d8d3ca] bg-white/70 px-4 py-3 text-sm placeholder:text-[#aaa59d] focus:border-[#777067]"
							/>
						</div>
						<div className="mt-5">
							<label
								className="block text-sm font-medium"
								htmlFor="album-description"
							>
								Description{" "}
								<span className="font-normal text-[#918c84]">optional</span>
							</label>
							<textarea
								id="album-description"
								name="description"
								maxLength={2000}
								rows={3}
								placeholder="A few words about this album…"
								className="mt-2 w-full resize-y rounded-xl border border-[#d8d3ca] bg-white/70 px-4 py-3 text-sm placeholder:text-[#aaa59d] focus:border-[#777067]"
							/>
						</div>
						<div className="mt-5">
							<label
								className="block text-sm font-medium"
								htmlFor="album-event-date"
							>
								Event date{" "}
								<span className="font-normal text-[#918c84]">optional</span>
							</label>
							<input
								id="album-event-date"
								name="eventDate"
								type="date"
								className="mt-2 w-full rounded-xl border border-[#d8d3ca] bg-white/70 px-4 py-3 text-sm focus:border-[#777067] sm:w-auto"
							/>
						</div>
						{create.isError ? (
							<p
								role="alert"
								className="mt-4 rounded-lg bg-[#f8eeeb] px-3 py-2 text-sm text-[#9a433b]"
							>
								{create.error.message}
							</p>
						) : null}
						<div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
							<button
								type="button"
								onClick={() => setCreating(false)}
								disabled={create.isPending}
								className="rounded-full px-5 py-2.5 text-sm font-medium text-[#66615a] hover:bg-[#efede7] disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={create.isPending}
								className="rounded-full bg-[#292724] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#4a433c] disabled:opacity-50"
							>
								{create.isPending ? "Creating…" : "Create album"}
							</button>
						</div>
					</form>
				</div>
			) : null}
		</AppShell>
	);
}
