import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
import { ApiError, apiFetch } from "../../lib/api";
import { AppShell } from "./AppShell";
import { GalleryGrid } from "./GalleryGrid";
import {
	collectionKeys,
	useCollection,
	useGallery,
	useRemoveFromCollection,
} from "./queries";
import { useUploadFiles } from "./uploads";

export function CollectionGalleryPage() {
	const { collectionId = "" } = useParams();
	const photoId = useMatch("/albums/:collectionId/photo/:photoId")?.params
		.photoId;
	const collection = useCollection(collectionId);
	const gallery = useGallery(collectionId);
	const [progress, setProgress] = useState<Record<string, number>>({});
	const [editing, setEditing] = useState(false);
	const fileInput = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const edit = useMutation({
		mutationFn: (body: { name: string; description: string | null }) =>
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
	const loadMore = useCallback(() => {
		if (!gallery.isFetchingNextPage) void gallery.fetchNextPage();
	}, [gallery]);
	const selectFiles = (files: FileList | null) => {
		const selected = Array.from(files ?? []);
		if (selected.length) upload.mutate(selected);
	};
	const albumActions = collection.data?.canManage ? (
		<details className="relative">
			<summary className="cursor-pointer list-none border-b border-transparent py-1 text-[#53514c] hover:border-[#53514c]">
				More
			</summary>
			<div className="absolute right-0 z-50 mt-3 w-44 border border-[#d8d4cb] bg-[#fdfcf8] p-2">
				<button
					type="button"
					onClick={() => setEditing(true)}
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
	) : undefined;

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
				<header className="px-4 py-5 sm:px-6">
					<div className="min-w-0">
						<h1 className="truncate text-lg font-medium tracking-tight">
							{collection.data?.name ?? "Loading…"}
						</h1>
						{collection.data?.description ? (
							<p className="mt-1 max-w-2xl text-sm leading-6 text-[#73716b]">
								{collection.data.description}
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

				{Object.keys(progress).length > 0 && upload.isPending ? (
					<div className="border-y border-[#e6e3dc] px-4 py-3 text-xs text-[#73716b] sm:px-6">
						Uploading{" "}
						{Object.entries(progress).filter(([, value]) => value < 1).length ||
							"and processing"}
						…
					</div>
				) : null}
				{upload.isError ? (
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
			</main>
		</AppShell>
	);
}
