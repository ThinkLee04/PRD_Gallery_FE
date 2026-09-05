import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { apiFetch, apiFetchEnvelope } from "../../lib/api";
import type { Collection, GalleryItem, PhotoDetail } from "./types";

interface GalleryInfiniteData {
	pages: Array<{
		data: GalleryItem[];
		page: { nextCursor: string | null };
	}>;
	pageParams: unknown[];
}

export const collectionKeys = {
	all: ["collections"] as const,
	list: (state: "active" | "archived") => ["collections", { state }] as const,
	detail: (id: string) => ["collection", id] as const,
	photos: (id: string) => ["collection", id, "photos"] as const,
};

export function useCollections(state: "active" | "archived" = "active") {
	return useInfiniteQuery({
		queryKey: collectionKeys.list(state),
		initialPageParam: "",
		queryFn: ({ pageParam }) =>
			apiFetchEnvelope<Collection[]>(
				`/v1/collections?state=${state}&limit=40${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`,
			),
		getNextPageParam: (last) => last.page.nextCursor ?? undefined,
	});
}

export function useCollection(id: string) {
	return useQuery({
		queryKey: collectionKeys.detail(id),
		queryFn: () => apiFetch<Collection>(`/v1/collections/${id}`),
		enabled: id !== "",
	});
}

export function useGallery(collectionId: string) {
	return useInfiniteQuery({
		queryKey: collectionKeys.photos(collectionId),
		initialPageParam: "",
		queryFn: ({ pageParam }) =>
			apiFetchEnvelope<GalleryItem[]>(
				`/v1/collections/${collectionId}/photos?limit=40${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`,
			),
		getNextPageParam: (last) => last.page.nextCursor ?? undefined,
		refetchInterval: (query) =>
			query.state.data?.pages.some((page) =>
				page.data.some(
					(item) => item.status === "PROCESSING" || item.status === "UPLOADED",
				),
			)
				? 3000
				: false,
	});
}

export function useLoved() {
	return useInfiniteQuery({
		queryKey: ["loved"],
		initialPageParam: "",
		queryFn: ({ pageParam }) =>
			apiFetchEnvelope<GalleryItem[]>(
				`/v1/loved?limit=40${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`,
			),
		getNextPageParam: (last) => last.page.nextCursor ?? undefined,
	});
}

export function usePhoto(id: string | undefined) {
	return useQuery({
		queryKey: ["photo", id],
		queryFn: () => apiFetch<PhotoDetail>(`/v1/photos/${id}`),
		enabled: id !== undefined,
	});
}

export function useToggleLoved() {
	const client = useQueryClient();
	return useMutation({
		mutationFn: ({ id, loved }: { id: string; loved: boolean }) =>
			apiFetch<void>(`/v1/photos/${id}/favorite`, {
				method: loved ? "DELETE" : "PUT",
			}),
		onSuccess: (_result, variables) => {
			client.setQueriesData<GalleryInfiniteData>(
				{
					predicate: (query) =>
						query.queryKey[0] === "collection" &&
						query.queryKey[2] === "photos",
				},
				(current) =>
					current
						? {
								...current,
								pages: current.pages.map((page) => ({
									...page,
									data: page.data.map((item) =>
										item.id === variables.id
											? { ...item, loved: !variables.loved }
											: item,
									),
								})),
							}
						: current,
			);
			client.setQueryData<PhotoDetail>(["photo", variables.id], (current) =>
				current ? { ...current, loved: !variables.loved } : current,
			);
			void client.invalidateQueries({ queryKey: ["loved"] });
		},
	});
}

export function useRetryPhoto() {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiFetch(`/v1/photos/${id}/retry`, { method: "POST" }),
		onSuccess: () => {
			void client.invalidateQueries({ queryKey: ["collection"] });
			void client.invalidateQueries({ queryKey: ["loved"] });
		},
	});
}

export function useRemoveFromCollection(collectionId: string) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (photoId: string) =>
			apiFetch<void>(`/v1/collections/${collectionId}/photos/${photoId}`, {
				method: "DELETE",
			}),
		onSuccess: () => {
			void client.invalidateQueries({
				queryKey: collectionKeys.photos(collectionId),
			});
			void client.invalidateQueries({
				queryKey: collectionKeys.detail(collectionId),
			});
		},
	});
}
