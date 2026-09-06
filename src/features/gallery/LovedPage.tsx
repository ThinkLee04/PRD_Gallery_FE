import { useCallback, useState } from "react";
import { useMatch } from "react-router-dom";
import { AppShell } from "./AppShell";
import { GalleryGrid } from "./GalleryGrid";
import { useLoved } from "./queries";

export function LovedPage() {
	const photoId = useMatch("/loved/photo/:photoId")?.params.photoId;
	const [lovedHeaderVisible, setLovedHeaderVisible] = useState(true);
	const loved = useLoved();
	const items = loved.data?.pages.flatMap((page) => page.data) ?? [];
	const loadMore = useCallback(() => {
		if (!loved.isFetchingNextPage) void loved.fetchNextPage();
	}, [loved]);
	return (
		<AppShell>
			<main>
				{lovedHeaderVisible ? (
					<header className="border-b border-[#e6e3dc] bg-[#f7f6f2] px-4 pb-5 pt-2 sm:px-6 sm:pb-6 sm:pt-3">
						<div className="min-w-0 max-w-4xl">
							<h1 className="text-base font-medium leading-tight tracking-tight">
								Loved
							</h1>
							<p className="mt-1.5 max-w-2xl text-xs leading-5 text-[#73716b]">
								Private to you
							</p>
						</div>
					</header>
				) : null}
				{loved.isError ? (
					<p role="alert" className="mx-4 mb-4 text-sm text-[#a53e45] sm:mx-6">
						Unable to load your loved photos.
					</p>
				) : null}
				<GalleryGrid
					items={items}
					hasMore={Boolean(loved.hasNextPage)}
					loadMore={loadMore}
					basePath="/loved"
					photoId={photoId}
					fillViewport={!lovedHeaderVisible}
					onScrollPositionChange={(scrollTop) =>
						setLovedHeaderVisible(scrollTop <= 8)
					}
				/>
				{loved.isLoading ? (
					<div className="grid grid-cols-2 gap-1 px-1 sm:grid-cols-3 lg:grid-cols-4">
						{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
							<div
								key={item}
								className="aspect-[4/3] animate-pulse bg-[#e7e4dd]"
							/>
						))}
					</div>
				) : null}
				{!loved.isLoading && items.length === 0 ? (
					<div className="px-4 py-24 text-center">
						<p className="text-sm text-[#73716b]">
							Photos you love will appear here.
						</p>
					</div>
				) : null}
			</main>
		</AppShell>
	);
}
