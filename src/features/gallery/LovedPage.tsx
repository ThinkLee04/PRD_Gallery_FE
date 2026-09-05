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
			<main>
				<div className="flex min-h-28 items-end px-4 py-6 sm:px-6">
					<div>
						<h1 className="text-2xl font-medium tracking-tight">Loved</h1>
						<p className="mt-1 text-sm text-[#73716b]">Private to you</p>
					</div>
				</div>
				<GalleryGrid
					items={items}
					hasMore={Boolean(loved.hasNextPage)}
					loadMore={loadMore}
					basePath="/loved"
					photoId={photoId}
				/>
				{!loved.isLoading && items.length === 0 ? (
					<p className="mt-20 text-center text-sm text-[#73716b]">
						Photos you love will appear here.
					</p>
				) : null}
			</main>
		</AppShell>
	);
}
