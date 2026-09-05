import { useCallback } from "react";
import { useMatch } from "react-router-dom";
import { AppShell } from "./AppShell";
import { GalleryGrid } from "./GalleryGrid";
import { useLoved } from "./queries";

export function LovedPage() {
	const photoId = useMatch("/loved/photo/:photoId")?.params.photoId;
	const loved = useLoved();
	const items = loved.data?.pages.flatMap((page) => page.data) ?? [];
	const loadMore = useCallback(() => {
		if (!loved.isFetchingNextPage) void loved.fetchNextPage();
	}, [loved]);
	return (
		<AppShell>
			<main className="pt-5">
				<div className="px-4 pb-5 sm:px-6">
					<p className="text-sm text-rose-400">Private to you</p>
					<h1 className="text-3xl font-semibold">Loved</h1>
				</div>
				<GalleryGrid
					items={items}
					hasMore={Boolean(loved.hasNextPage)}
					loadMore={loadMore}
					basePath="/loved"
					photoId={photoId}
				/>
				{!loved.isLoading && items.length === 0 ? (
					<p className="mt-16 text-center text-zinc-500">
						Photos you love will appear here.
					</p>
				) : null}
			</main>
		</AppShell>
	);
}
