import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
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
	const [editing, setEditing] = useState(false);
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
		<div className="flex items-center gap-3">
			<details className="relative">
				<summary className="cursor-pointer list-none whitespace-nowrap border-b border-transparent py-1 text-[#53514c] hover:border-[#53514c]">
					<span className="hidden sm:inline">Sort · </span>
					{sortLabel}
				</summary>
				<div className="absolute right-0 z-50 mt-3 max-h-[calc(100dvh-6rem)] w-64 overflow-y-auto border border-[#d8d4cb] bg-[#fdfcf8] p-2 shadow-lg shadow-black/5">
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
			<details className="relative">
				<summary className="cursor-pointer list-none whitespace-nowrap border-b border-transparent py-1 text-[#53514c] hover:border-[#53514c]">
					{selectedUploader?.displayName ?? "All uploaders"}
				</summary>
				<div className="absolute right-0 z-50 mt-3 max-h-72 w-56 overflow-y-auto border border-[#d8d4cb] bg-[#fdfcf8] p-2 shadow-lg shadow-black/5">
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
			<details className="relative">
				<summary className="cursor-pointer list-none whitespace-nowrap border-b border-transparent py-1 text-[#53514c] hover:border-[#53514c]">
					{mediaLabel}
				</summary>
				<div className="absolute right-0 z-50 mt-3 w-40 border border-[#d8d4cb] bg-[#fdfcf8] p-2">
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
				<details className="relative">
					<summary className="cursor-pointer list-none border-b border-transparent py-1 text-[#53514c] hover:border-[#53514c]">
						More
					</summary>
					<div className="absolute right-0 z-50 mt-3 w-44 border border-[#d8d4cb] bg-[#fdfcf8] p-2">
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
							onClick={() => {
								if (
									window.confirm(
										"Archive this album? Its photos will remain in the vault.",
									)
								)
									archive.mutate();
							}}
							className="block w-full px-2 py-2 text-left text-[#a53e45] hover:bg-[#efede7]"
						>
							Archive album
						</button>
					</div>
				</details>
			) : null}
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
				<header className="px-4 py-3 sm:px-6">
					<div className="min-w-0">
						<h1 className="truncate text-base font-medium tracking-tight">
							{collection.data?.name ?? "Loading…"}
						</h1>
						{collection.data?.description ? (
							<p className="mt-1 max-w-2xl text-sm leading-6 text-[#73716b]">
								{collection.data.description}
							</p>
						) : null}
						{collection.data?.eventDate ? (
							<p className="mt-1 text-xs text-[#918e87]">
								{new Intl.DateTimeFormat(undefined, {
									dateStyle: "long",
									timeZone: "UTC",
								}).format(new Date(`${collection.data.eventDate}T00:00:00Z`))}
							</p>
						) : null}
					</div>
				</header>
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
				{remove.isError ? (
					<p
						role="alert"
						className="mx-4 mb-4 border-l-2 border-[#c84d54] pl-3 text-sm text-[#a53e45] sm:mx-6"
					>
						{remove.error instanceof Error
							? remove.error.message
							: "Unable to remove this photo from the album."}
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
					onRemove={
						collection.data?.canManage
							? (id) => {
									if (
										window.confirm(
											"Remove this photo from the album? The original remains in the vault.",
										)
									)
										remove.mutate(id);
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
