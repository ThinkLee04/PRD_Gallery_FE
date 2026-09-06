import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ApiError, apiFetch } from "../../lib/api";
import { AppShell } from "./AppShell";
import { GalleryGrid } from "./GalleryGrid";
import {
	collectionKeys,
	useCollection,
	useCollectionUploaders,
	useGallery,
	useRemoveFromCollection,
} from "./queries";
import type { GalleryOptions } from "./types";
import { useUploadFiles } from "./uploads";

function eventDateValue(value: FormDataEntryValue | null): string | null {
	const raw = String(value ?? "");
	return raw || null;
}

export function CollectionGalleryPage() {
	const { collectionId = "" } = useParams();
	const photoId = useMatch("/albums/:collectionId/photo/:photoId")?.params
		.photoId;
	const [galleryOptions, setGalleryOptions] = useState<GalleryOptions>({
		sort: "captured_desc",
		media: "all",
		uploaderId: null,
	});
	const collection = useCollection(collectionId);
	const uploaders = useCollectionUploaders(collectionId);
	const gallery = useGallery(collectionId, galleryOptions);
	const [progress, setProgress] = useState<Record<string, number>>({});
	const [uploadPopupOpen, setUploadPopupOpen] = useState(false);
	const [albumHeaderVisible, setAlbumHeaderVisible] = useState(true);
	const [editing, setEditing] = useState(false);
	const [confirmation, setConfirmation] = useState<
		{ action: "archive" } | { action: "remove"; photoId: string } | null
	>(null);
	const fileInput = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const edit = useMutation({
		mutationFn: (body: {
			name: string;
			description: string | null;
			eventDate: string | null;
		}) =>
			apiFetch(`/v1/collections/${collectionId}`, {
				method: "PATCH",
				body: JSON.stringify(body),
			}),
		onSuccess: () => {
			setEditing(false);
			void queryClient.invalidateQueries({
				queryKey: collectionKeys.detail(collectionId),
			});
			void queryClient.invalidateQueries({ queryKey: collectionKeys.all });
		},
	});
	const archive = useMutation({
		mutationFn: () =>
			apiFetch(`/v1/collections/${collectionId}/archive`, { method: "POST" }),
		onSuccess: () => {
			setConfirmation(null);
			void queryClient.invalidateQueries({ queryKey: collectionKeys.all });
			navigate("/albums");
		},
	});
	const upload = useUploadFiles(collectionId, (name, value) =>
		setProgress((current) => ({ ...current, [name]: value })),
	);
	const remove = useRemoveFromCollection(collectionId);
	const items = gallery.data?.pages.flatMap((page) => page.data) ?? [];

	useEffect(() => {
		if (gallery.error instanceof ApiError && gallery.error.code === "CONFLICT")
			void queryClient.resetQueries({
				queryKey: collectionKeys.photos(collectionId),
			});
	}, [collectionId, gallery.error, queryClient]);
	useEffect(() => {
		if (
			galleryOptions.uploaderId !== null &&
			uploaders.data !== undefined &&
			!uploaders.data.some(
				(uploader) => uploader.id === galleryOptions.uploaderId,
			)
		)
			setGalleryOptions((current) => ({ ...current, uploaderId: null }));
	}, [galleryOptions.uploaderId, uploaders.data]);
	const loadMore = useCallback(() => {
		if (!gallery.isFetchingNextPage) void gallery.fetchNextPage();
	}, [gallery]);
	const selectFiles = (files: FileList | null) => {
		const selected = Array.from(files ?? []);
		if (selected.length) {
			setProgress(Object.fromEntries(selected.map((file) => [file.name, 0])));
			setUploadPopupOpen(true);
			upload.mutate(selected);
		}
	};
	const sortLabel =
		galleryOptions.sort === "captured_asc"
			? "Captured ↑"
			: galleryOptions.sort === "captured_desc"
				? "Captured ↓"
				: galleryOptions.sort === "uploaded_asc"
					? "Uploaded ↑"
					: galleryOptions.sort === "uploaded_desc"
						? "Uploaded ↓"
						: galleryOptions.sort === "alphabet_asc"
							? "Alphabet ↑"
							: "Alphabet ↓";
	const mediaLabel =
		galleryOptions.media === "all"
			? "All media"
			: galleryOptions.media === "image"
				? "Photos"
				: "Videos";
	const selectedUploader = uploaders.data?.find(
		(uploader) => uploader.id === galleryOptions.uploaderId,
	);
	const albumActions = (
		<div className="flex items-center justify-end gap-1 sm:justify-start">
			<details className="relative hidden sm:block">
				<summary
					aria-label={`Sort: ${sortLabel}`}
					className={`flex min-h-10 cursor-pointer list-none items-center whitespace-nowrap border-b px-2 text-[#53514c] hover:text-[#1c1c1a] ${galleryOptions.sort !== "captured_desc" ? "border-[#8d8981]" : "border-transparent"}`}
				>
					Sort
				</summary>
				<div className="absolute left-0 z-50 mt-2 max-h-[calc(100dvh-5rem)] w-64 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-lg border border-[#d8d4cb] bg-[rgba(253,252,248,0.96)] p-2 backdrop-blur-md">
					{(
						[
							[
								"captured_asc",
								"Captured date · ASC",
								"Oldest moments first. Uses upload date when capture data is missing.",
							],
							[
								"captured_desc",
								"Captured date · DESC",
								"Newest moments first. Uses upload date when capture data is missing.",
							],
							[
								"uploaded_asc",
								"Uploaded date · ASC",
								"Files added earliest appear first.",
							],
							[
								"uploaded_desc",
								"Uploaded date · DESC",
								"Most recently added files first.",
							],
							["alphabet_asc", "Alphabet · ASC", "Filenames from A to Z."],
							["alphabet_desc", "Alphabet · DESC", "Filenames from Z to A."],
						] as const
					).map(([value, label, description]) => (
						<button
							key={value}
							type="button"
							onClick={(event) => {
								setGalleryOptions((current) => ({ ...current, sort: value }));
								event.currentTarget.closest("details")?.removeAttribute("open");
							}}
							className={`block w-full px-2 py-2 text-left hover:bg-[#efede7] ${galleryOptions.sort === value ? "bg-[#efede7]" : ""}`}
						>
							<span className="block font-medium">{label}</span>
							<span className="mt-0.5 block text-[11px] leading-4 text-[#73716b]">
								{description}
							</span>
						</button>
					))}
				</div>
			</details>
			<details className="relative hidden sm:block">
				<summary
					aria-label={`Uploader: ${selectedUploader?.displayName ?? "All uploaders"}`}
					className={`flex min-h-10 cursor-pointer list-none items-center whitespace-nowrap border-b px-2 text-[#53514c] hover:text-[#1c1c1a] ${galleryOptions.uploaderId !== null ? "border-[#8d8981]" : "border-transparent"}`}
				>
					Uploader
				</summary>
				<div className="absolute left-0 z-50 mt-2 max-h-[calc(100dvh-5rem)] w-56 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-lg border border-[#d8d4cb] bg-[rgba(253,252,248,0.96)] p-2 backdrop-blur-md">
					<button
						type="button"
						onClick={(event) => {
							setGalleryOptions((current) => ({
								...current,
								uploaderId: null,
							}));
							event.currentTarget.closest("details")?.removeAttribute("open");
						}}
						className={`block w-full px-2 py-2 text-left hover:bg-[#efede7] ${galleryOptions.uploaderId === null ? "font-medium" : ""}`}
					>
						All uploaders
					</button>
					{uploaders.data?.map((uploader) => (
						<button
							key={uploader.id}
							type="button"
							onClick={(event) => {
								setGalleryOptions((current) => ({
									...current,
									uploaderId: uploader.id,
								}));
								event.currentTarget.closest("details")?.removeAttribute("open");
							}}
							className={`flex w-full items-center gap-2 px-2 py-2 text-left hover:bg-[#efede7] ${galleryOptions.uploaderId === uploader.id ? "font-medium" : ""}`}
						>
							{uploader.avatarUrl ? (
								<img
									src={uploader.avatarUrl}
									alt=""
									referrerPolicy="no-referrer"
									className="h-6 w-6 rounded-full"
								/>
							) : (
								<span className="h-6 w-6 rounded-full bg-[#ddd9d0]" />
							)}
							<span className="min-w-0 flex-1 truncate">
								{uploader.displayName}
							</span>
							<span className="text-[#918e87]">{uploader.photoCount}</span>
						</button>
					))}
				</div>
			</details>
			<details className="relative hidden sm:block">
				<summary
					aria-label={`Media type: ${mediaLabel}`}
					className={`flex min-h-10 cursor-pointer list-none items-center whitespace-nowrap border-b px-2 text-[#53514c] hover:text-[#1c1c1a] ${galleryOptions.media !== "all" ? "border-[#8d8981]" : "border-transparent"}`}
				>
					Media type
				</summary>
				<div className="absolute left-0 z-50 mt-2 w-40 rounded-lg border border-[#d8d4cb] bg-[rgba(253,252,248,0.96)] p-2 backdrop-blur-md">
					{(
						[
							["all", "Photos & videos"],
							["image", "Photos only"],
							["video", "Videos only"],
						] as const
					).map(([value, label]) => (
						<button
							key={value}
							type="button"
							onClick={(event) => {
								setGalleryOptions((current) => ({ ...current, media: value }));
								event.currentTarget.closest("details")?.removeAttribute("open");
							}}
							className={`block w-full px-2 py-2 text-left hover:bg-[#efede7] ${galleryOptions.media === value ? "font-medium" : ""}`}
						>
							{label}
						</button>
					))}
				</div>
			</details>
			{collection.data?.canManage ? (
				<details className="relative hidden sm:block">
					<summary className="flex min-h-10 cursor-pointer list-none items-center border-b border-transparent px-2 text-[#53514c] hover:text-[#1c1c1a]">
						More
					</summary>
					<div className="absolute right-0 z-50 mt-2 w-44 rounded-lg border border-[#d8d4cb] bg-[rgba(253,252,248,0.96)] p-2 backdrop-blur-md">
						<button
							type="button"
							onClick={(event) => {
								setEditing(true);
								event.currentTarget.closest("details")?.removeAttribute("open");
							}}
							className="block w-full px-2 py-2 text-left hover:bg-[#efede7]"
						>
							Edit details
						</button>
						<button
							type="button"
							onClick={(event) => {
								archive.reset();
								setConfirmation({ action: "archive" });
								event.currentTarget.closest("details")?.removeAttribute("open");
							}}
							className="block w-full px-2 py-2 text-left text-[#a53e45] hover:bg-[#efede7]"
						>
							Archive album
						</button>
					</div>
				</details>
			) : null}
			<details className="relative sm:hidden">
				<summary className="flex min-h-10 cursor-pointer list-none items-center border-b border-transparent px-1 text-[#53514c] hover:text-[#1c1c1a]">
					More
				</summary>
				<div className="fixed left-3 right-3 top-[4.5rem] z-50 max-h-[calc(100dvh-5.25rem)] overflow-y-auto rounded-lg border border-[#d8d4cb] bg-[rgba(253,252,248,0.97)] p-2 text-sm backdrop-blur-md">
					<p className="px-2 pb-1 pt-2 text-xs text-[#918e87]">
						Sort · {sortLabel}
					</p>
					{(
						[
							["captured_asc", "Captured date · ASC"],
							["captured_desc", "Captured date · DESC"],
							["uploaded_asc", "Uploaded date · ASC"],
							["uploaded_desc", "Uploaded date · DESC"],
							["alphabet_asc", "Alphabet · ASC"],
							["alphabet_desc", "Alphabet · DESC"],
						] as const
					).map(([value, label]) => (
						<button
							key={value}
							type="button"
							onClick={(event) => {
								setGalleryOptions((current) => ({ ...current, sort: value }));
								event.currentTarget.closest("details")?.removeAttribute("open");
							}}
							className={`block min-h-11 w-full px-2 py-2 text-left hover:bg-[#efede7] ${galleryOptions.sort === value ? "bg-[#efede7] font-medium" : ""}`}
						>
							{label}
						</button>
					))}
					<div className="my-2 border-t border-[#e6e3dc]" />
					<p className="px-2 pb-1 pt-2 text-xs text-[#918e87]">
						Uploader · {selectedUploader?.displayName ?? "All uploaders"}
					</p>
					<button
						type="button"
						onClick={(event) => {
							setGalleryOptions((current) => ({
								...current,
								uploaderId: null,
							}));
							event.currentTarget.closest("details")?.removeAttribute("open");
						}}
						className={`block min-h-11 w-full px-2 py-2 text-left hover:bg-[#efede7] ${galleryOptions.uploaderId === null ? "bg-[#efede7] font-medium" : ""}`}
					>
						All uploaders
					</button>
					{uploaders.data?.map((uploader) => (
						<button
							key={uploader.id}
							type="button"
							onClick={(event) => {
								setGalleryOptions((current) => ({
									...current,
									uploaderId: uploader.id,
								}));
								event.currentTarget.closest("details")?.removeAttribute("open");
							}}
							className={`flex min-h-11 w-full items-center gap-2 px-2 py-2 text-left hover:bg-[#efede7] ${galleryOptions.uploaderId === uploader.id ? "bg-[#efede7] font-medium" : ""}`}
						>
							{uploader.avatarUrl ? (
								<img
									src={uploader.avatarUrl}
									alt=""
									referrerPolicy="no-referrer"
									className="h-6 w-6 rounded-full"
								/>
							) : (
								<span className="h-6 w-6 rounded-full bg-[#ddd9d0]" />
							)}
							<span className="min-w-0 flex-1 truncate">
								{uploader.displayName}
							</span>
							<span className="text-[#918e87]">{uploader.photoCount}</span>
						</button>
					))}
					<div className="my-2 border-t border-[#e6e3dc]" />
					<p className="px-2 pb-1 pt-2 text-xs text-[#918e87]">
						Media type · {mediaLabel}
					</p>
					{(
						[
							["all", "Photos & videos"],
							["image", "Photos only"],
							["video", "Videos only"],
						] as const
					).map(([value, label]) => (
						<button
							key={value}
							type="button"
							onClick={(event) => {
								setGalleryOptions((current) => ({ ...current, media: value }));
								event.currentTarget.closest("details")?.removeAttribute("open");
							}}
							className={`block min-h-11 w-full px-2 py-2 text-left hover:bg-[#efede7] ${galleryOptions.media === value ? "bg-[#efede7] font-medium" : ""}`}
						>
							{label}
						</button>
					))}
					{collection.data?.canManage ? (
						<>
							<div className="my-2 border-t border-[#e6e3dc]" />
							<p className="px-2 pb-1 pt-2 text-xs text-[#918e87]">Album</p>
							<button
								type="button"
								onClick={(event) => {
									setEditing(true);
									event.currentTarget
										.closest("details")
										?.removeAttribute("open");
								}}
								className="block min-h-11 w-full px-2 py-2 text-left hover:bg-[#efede7]"
							>
								Edit details
							</button>
							<button
								type="button"
								onClick={(event) => {
									archive.reset();
									setConfirmation({ action: "archive" });
									event.currentTarget
										.closest("details")
										?.removeAttribute("open");
								}}
								className="block min-h-11 w-full px-2 py-2 text-left text-[#a53e45] hover:bg-[#efede7]"
							>
								Archive album
							</button>
						</>
					) : null}
				</div>
			</details>
		</div>
	);

	return (
		<AppShell
			onUpload={
				collection.data?.canManage
					? () => fileInput.current?.click()
					: undefined
			}
			actions={albumActions}
		>
			<main>
				{albumHeaderVisible ? (
					<header className="border-b border-[#e6e3dc] bg-[#f7f6f2] px-4 pb-5 pt-2 sm:px-6 sm:pb-6 sm:pt-3">
						<div className="min-w-0 max-w-4xl">
							<h1 className="text-xl font-medium leading-tight tracking-tight sm:text-2xl">
								{collection.data?.name ?? "Loading…"}
							</h1>
							{collection.data?.description ? (
								<p className="mt-2 max-w-2xl text-sm leading-6 text-[#73716b]">
									{collection.data.description}
								</p>
							) : null}
							{collection.data?.eventDate ? (
								<p className="mt-2 text-xs text-[#918e87]">
									{new Intl.DateTimeFormat(undefined, {
										dateStyle: "long",
										timeZone: "UTC",
									}).format(new Date(`${collection.data.eventDate}T00:00:00Z`))}
								</p>
							) : null}
						</div>
					</header>
				) : null}
				<input
					ref={fileInput}
					type="file"
					multiple
					accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime"
					className="sr-only"
					onChange={(event) => {
						selectFiles(event.target.files);
						event.currentTarget.value = "";
					}}
				/>

				{editing && collection.data ? (
					<form
						className="mx-4 mb-6 max-w-xl border-y border-[#e6e3dc] py-5 sm:mx-6"
						onSubmit={(event) => {
							event.preventDefault();
							const form = new FormData(event.currentTarget);
							edit.mutate({
								name: String(form.get("name")),
								description: String(form.get("description")) || null,
								eventDate: eventDateValue(form.get("eventDate")),
							});
						}}
					>
						<label
							htmlFor="edit-album-name"
							className="block text-xs text-[#73716b]"
						>
							Album name
						</label>
						<input
							id="edit-album-name"
							name="name"
							required
							maxLength={120}
							defaultValue={collection.data.name}
							className="mt-2 w-full rounded-[4px] border border-[#d8d4cb] bg-[#fdfcf8] px-3 py-2"
						/>
						<label
							htmlFor="edit-album-description"
							className="mt-4 block text-xs text-[#73716b]"
						>
							Description
						</label>
						<textarea
							id="edit-album-description"
							name="description"
							maxLength={2000}
							rows={3}
							defaultValue={collection.data.description ?? ""}
							className="mt-2 w-full rounded-[4px] border border-[#d8d4cb] bg-[#fdfcf8] px-3 py-2"
						/>
						<label
							htmlFor="edit-album-event-date"
							className="mt-4 block text-xs text-[#73716b]"
						>
							Event date
						</label>
						<input
							id="edit-album-event-date"
							name="eventDate"
							type="date"
							defaultValue={collection.data.eventDate ?? ""}
							className="mt-2 rounded-[4px] border border-[#d8d4cb] bg-[#fdfcf8] px-3 py-2"
						/>
						{edit.isError ? (
							<p role="alert" className="mt-3 text-sm text-[#a53e45]">
								{edit.error.message}
							</p>
						) : null}
						<div className="mt-4 flex gap-5 text-sm">
							<button
								type="submit"
								disabled={edit.isPending}
								className="border-b border-[#1c1c1a] py-1 font-medium"
							>
								{edit.isPending ? "Saving…" : "Save changes"}
							</button>
							<button
								type="button"
								onClick={() => setEditing(false)}
								className="text-[#73716b]"
							>
								Cancel
							</button>
						</div>
					</form>
				) : null}

				{!uploadPopupOpen &&
				Object.keys(progress).length > 0 &&
				upload.isPending ? (
					<div className="border-y border-[#e6e3dc] px-4 py-3 text-xs text-[#73716b] sm:px-6">
						Uploading{" "}
						{Object.entries(progress).filter(([, value]) => value < 1).length ||
							"and processing"}
						…
					</div>
				) : null}
				{!uploadPopupOpen && upload.isError ? (
					<p
						role="alert"
						className="mx-4 mb-4 border-l-2 border-[#c84d54] pl-3 text-sm text-[#a53e45] sm:mx-6"
					>
						{upload.error instanceof Error
							? upload.error.message
							: "Upload failed."}
					</p>
				) : null}
				{gallery.isError &&
				!(
					gallery.error instanceof ApiError && gallery.error.code === "CONFLICT"
				) ? (
					<p role="alert" className="mx-4 mb-4 text-sm text-[#a53e45] sm:mx-6">
						Unable to load this album.
					</p>
				) : null}
				<GalleryGrid
					items={items}
					hasMore={Boolean(gallery.hasNextPage)}
					loadMore={loadMore}
					basePath={`/albums/${collectionId}`}
					photoId={photoId}
					onScrollPositionChange={(scrollTop) =>
						setAlbumHeaderVisible(scrollTop <= 8)
					}
					onRemove={
						collection.data?.canManage
							? (id) => {
									remove.reset();
									setConfirmation({ action: "remove", photoId: id });
								}
							: undefined
					}
				/>
				{gallery.isLoading ? (
					<div className="grid grid-cols-2 gap-1 px-1 sm:grid-cols-3 lg:grid-cols-4">
						{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
							<div
								key={item}
								className="aspect-[4/3] animate-pulse bg-[#e7e4dd]"
							/>
						))}
					</div>
				) : null}
				{!gallery.isLoading && items.length === 0 ? (
					<div className="px-4 py-24 text-center">
						<p className="text-sm text-[#73716b]">
							This album is ready for its first memory.
						</p>
						{collection.data?.canManage ? (
							<button
								type="button"
								onClick={() => fileInput.current?.click()}
								className="mt-4 border-b border-[#1c1c1a] py-1 text-sm font-medium"
							>
								Upload photos
							</button>
						) : null}
					</div>
				) : null}
				{uploadPopupOpen && Object.keys(progress).length > 0 ? (
					<UploadProgressPopup
						progress={progress}
						isPending={upload.isPending}
						error={upload.isError ? upload.error : null}
						onClose={() => setUploadPopupOpen(false)}
					/>
				) : null}
				{confirmation ? (
					<ConfirmDialog
						title={
							confirmation.action === "archive"
								? "Archive this album?"
								: "Remove photo from album?"
						}
						description={
							confirmation.action === "archive"
								? "The album will leave your active albums. Its photos and original files will stay safely in the vault."
								: "This photo will only be removed from this album. Its original file will stay safely in the vault."
						}
						confirmLabel={
							confirmation.action === "archive"
								? "Archive album"
								: "Remove photo"
						}
						tone="danger"
						isPending={
							confirmation.action === "archive"
								? archive.isPending
								: remove.isPending
						}
						error={
							confirmation.action === "archive" && archive.isError
								? archive.error.message
								: confirmation.action === "remove" && remove.isError
									? remove.error.message
									: null
						}
						onCancel={() => {
							archive.reset();
							remove.reset();
							setConfirmation(null);
						}}
						onConfirm={() => {
							if (confirmation.action === "archive") archive.mutate();
							else
								remove.mutate(confirmation.photoId, {
									onSuccess: () => setConfirmation(null),
								});
						}}
					/>
				) : null}
			</main>
		</AppShell>
	);
}

function UploadProgressPopup({
	progress,
	isPending,
	error,
	onClose,
}: {
	progress: Record<string, number>;
	isPending: boolean;
	error: Error | null;
	onClose: () => void;
}) {
	const files = Object.entries(progress);
	const completed = files.filter(([, value]) => value >= 1).length;
	const overall = files.length
		? Math.round(
				(files.reduce((total, [, value]) => total + value, 0) / files.length) *
					100,
			)
		: 0;
	const title = error
		? "Upload stopped"
		: isPending
			? `Uploading ${completed} of ${files.length}`
			: "Uploads received";

	return (
		<section
			aria-label="Upload progress"
			aria-live="polite"
			className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 border border-[#d8d4cb] bg-[#fdfcf8] sm:left-auto sm:right-5 sm:w-96"
		>
			<header className="flex items-center justify-between border-b border-[#e6e3dc] px-4 py-3">
				<div className="min-w-0">
					<h2 className="text-sm font-medium">{title}</h2>
					<p className="mt-0.5 truncate text-xs text-[#73716b]">
						{error
							? error.message
							: isPending
								? `${overall}% complete`
								: "Thumbnail processing continues in the album."}
					</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="ml-4 text-xs text-[#73716b] underline-offset-4 hover:text-[#1c1c1a] hover:underline"
				>
					{isPending ? "Hide" : "Close"}
				</button>
			</header>
			<div className="max-h-56 divide-y divide-[#ece9e2] overflow-y-auto px-4">
				{files.map(([name, value]) => {
					const percent = Math.round(value * 100);
					return (
						<div key={name} className="py-3">
							<div className="flex items-center justify-between gap-4 text-xs">
								<p className="truncate" title={name}>
									{name}
								</p>
								<span className="shrink-0 text-[#73716b]">
									{percent >= 100 ? "Uploaded" : `${percent}%`}
								</span>
							</div>
							<div
								role="progressbar"
								aria-label={`Upload progress for ${name}`}
								aria-valuemin={0}
								aria-valuemax={100}
								aria-valuenow={percent}
								className="mt-2 h-1 bg-[#e6e3dc]"
							>
								<div
									className={`h-full ${error && percent < 100 ? "bg-[#c84d54]" : "bg-[#1c1c1a]"}`}
									style={{ width: `${percent}%` }}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}
