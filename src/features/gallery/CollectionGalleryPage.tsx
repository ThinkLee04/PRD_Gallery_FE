import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useMatch, useParams } from "react-router-dom";
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
	const upload = useUploadFiles(collectionId, (name, value) =>
		setProgress((current) => ({ ...current, [name]: value })),
	);
	const remove = useRemoveFromCollection(collectionId);
	const items = gallery.data?.pages.flatMap((page) => page.data) ?? [];
	useEffect(() => {
		if (
			gallery.error instanceof ApiError &&
			gallery.error.code === "CONFLICT"
		) {
			void queryClient.resetQueries({
				queryKey: collectionKeys.photos(collectionId),
			});
		}
	}, [collectionId, gallery.error, queryClient]);
	const loadMore = useCallback(() => {
		if (!gallery.isFetchingNextPage) void gallery.fetchNextPage();
	}, [gallery]);
	return (
		<AppShell>
			<main className="pt-5">
				<div className="flex items-end justify-between px-4 pb-5 sm:px-6">
					<div>
						<p className="text-sm text-zinc-500">Album</p>
						<h1 className="text-3xl font-semibold">
							{collection.data?.name ?? "Loading…"}
						</h1>
					</div>
					{collection.data?.canManage ? (
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => setEditing((value) => !value)}
								className="rounded-full border border-white/20 px-4 py-2 text-sm"
							>
								Edit
							</button>
							<label className="cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-medium text-black">
								Upload
								<input
									type="file"
									multiple
									accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime"
									className="sr-only"
									onChange={(event) => {
										const files = Array.from(event.target.files ?? []);
										if (files.length) upload.mutate(files);
										event.currentTarget.value = "";
									}}
								/>
							</label>
						</div>
					) : null}
				</div>
				{editing && collection.data ? (
					<form
						className="mx-4 mb-5 grid max-w-xl gap-2 rounded-2xl bg-white/5 p-4"
						onSubmit={(event) => {
							event.preventDefault();
							const form = new FormData(event.currentTarget);
							edit.mutate({
								name: String(form.get("name")),
								description: String(form.get("description")) || null,
							});
						}}
					>
						<input
							name="name"
							required
							maxLength={120}
							defaultValue={collection.data.name}
							className="rounded-xl bg-white/10 px-4 py-2 outline-none focus:ring-2"
						/>
						<textarea
							name="description"
							maxLength={2000}
							defaultValue={collection.data.description ?? ""}
							placeholder="Description"
							className="rounded-xl bg-white/10 px-4 py-2 outline-none focus:ring-2"
						/>
						<button
							type="submit"
							className="justify-self-start rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
						>
							Save changes
						</button>
					</form>
				) : null}
				{Object.keys(progress).length > 0 && upload.isPending ? (
					<div className="mx-4 mb-3 text-xs text-zinc-400">
						Uploading{" "}
						{Object.entries(progress).filter(([, value]) => value < 1).length ||
							"and processing"}
						…
					</div>
				) : null}
				{upload.isError ? (
					<p role="alert" className="mx-4 mb-3 text-sm text-rose-400">
						{upload.error instanceof Error
							? upload.error.message
							: "Upload failed."}
					</p>
				) : null}
				{gallery.isError &&
				!(
					gallery.error instanceof ApiError && gallery.error.code === "CONFLICT"
				) ? (
					<p role="alert" className="mx-4 mb-3 text-sm text-rose-400">
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
						collection.data?.canManage ? (id) => remove.mutate(id) : undefined
					}
				/>
				{!gallery.isLoading && items.length === 0 ? (
					<p className="mt-16 text-center text-zinc-500">
						This album is ready for its first memory.
					</p>
				) : null}
			</main>
		</AppShell>
	);
}
