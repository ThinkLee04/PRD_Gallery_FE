import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import { useMe } from "../auth/useMe";
import { usePhoto, useRetryPhoto, useToggleLoved } from "./queries";
import type { GalleryItem } from "./types";

function formatDate(
	item: Pick<
		GalleryItem,
		"capturedAt" | "uploadedAt" | "capturedTimezoneOffsetMinutes"
	>,
): string {
	const formatted = new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(item.capturedAt ?? item.uploadedAt));
	if (item.capturedAt === null || item.capturedTimezoneOffsetMinutes === null)
		return formatted;
	const offset = item.capturedTimezoneOffsetMinutes;
	const sign = offset < 0 ? "−" : "+";
	const hours = Math.floor(Math.abs(offset) / 60)
		.toString()
		.padStart(2, "0");
	const minutes = (Math.abs(offset) % 60).toString().padStart(2, "0");
	return `${formatted} (UTC${sign}${hours}:${minutes})`;
}

export function GalleryGrid({
	items,
	hasMore,
	loadMore,
	basePath,
	photoId,
	onRemove,
}: {
	items: GalleryItem[];
	hasMore: boolean;
	loadMore: () => void;
	basePath: string;
	photoId?: string;
	onRemove?: (photoId: string) => void;
}) {
	const parentRef = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(1000);
	const [infoId, setInfoId] = useState<string | null>(null);
	const [assetOverrides, setAssetOverrides] = useState<
		Record<string, GalleryItem["assets"]>
	>({});
	const lastRefresh = useRef<Record<string, number>>({});
	const navigate = useNavigate();
	const toggle = useToggleLoved();
	const retry = useRetryPhoto();
	const me = useMe();
	useEffect(() => {
		const element = parentRef.current;
		if (!element) return;
		const observer = new ResizeObserver(([entry]) => {
			if (entry) setWidth(entry.contentRect.width);
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, []);
	const lanes = width < 640 ? 2 : width < 1024 ? 3 : width < 1536 ? 4 : 5;
	const columnWidth = (width - (lanes - 1) * 8) / lanes;
	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => parentRef.current,
		estimateSize: (index) => columnWidth / (items[index]?.aspectRatio ?? 1) + 8,
		lanes,
		gap: 8,
		overscan: lanes * 3,
		getItemKey: (index) => items[index]?.id ?? index,
	});
	const virtualItems = virtualizer.getVirtualItems();
	const refreshAssets = (photoIdToRefresh: string) => {
		const previous = lastRefresh.current[photoIdToRefresh] ?? 0;
		if (Date.now() - previous < 5000) return;
		lastRefresh.current[photoIdToRefresh] = Date.now();
		void apiFetch<GalleryItem[]>("/v1/photo-assets/urls", {
			method: "POST",
			body: JSON.stringify({ photoIds: [photoIdToRefresh] }),
		}).then(([fresh]) => {
			if (fresh)
				setAssetOverrides((current) => ({
					...current,
					[photoIdToRefresh]: fresh.assets,
				}));
		});
	};
	useEffect(() => {
		const last = virtualItems.at(-1);
		if (last && last.index >= items.length - lanes * 2 && hasMore) loadMore();
	}, [hasMore, items.length, lanes, loadMore, virtualItems]);

	return (
		<>
			<div
				ref={parentRef}
				className="h-[calc(100vh-10rem)] overflow-y-auto px-2 sm:px-4"
			>
				<div
					className="relative"
					style={{ height: virtualizer.getTotalSize() }}
				>
					{virtualItems.map((virtual) => {
						const item = items[virtual.index];
						if (!item) return null;
						const height = columnWidth / (item.aspectRatio ?? 1);
						const showInfo = infoId === item.id;
						const assets = assetOverrides[item.id] ?? item.assets;
						const canRetry =
							item.status === "FAILED" &&
							(me.data?.vault?.role === "OWNER" ||
								item.uploader.id === me.data?.id);
						return (
							<article
								key={item.id}
								className="group absolute overflow-hidden rounded-lg bg-zinc-900 outline-none ring-white focus-within:ring-2"
								style={{
									width: columnWidth,
									height,
									transform: `translate(${virtual.lane * (columnWidth + 8)}px, ${virtual.start}px)`,
								}}
							>
								<button
									type="button"
									onClick={() => navigate(`${basePath}/photo/${item.id}`)}
									className="h-full w-full"
									aria-label={`Open ${item.fileName}`}
								>
									{assets.sm ? (
										<img
											src={assets.sm.url}
											srcSet={`${assets.sm.url} 480w${assets.md ? `, ${assets.md.url} 1280w` : ""}`}
											sizes={`${Math.ceil(columnWidth)}px`}
											loading="lazy"
											onError={() => refreshAssets(item.id)}
											alt=""
											className="h-full w-full object-cover"
										/>
									) : (
										<div className="flex h-full items-center justify-center text-sm text-zinc-500">
											{item.mediaType === "VIDEO"
												? "Video"
												: item.status.replaceAll("_", " ")}
										</div>
									)}
								</button>
								{canRetry ? (
									<button
										type="button"
										onClick={() => retry.mutate(item.id)}
										className="absolute left-2 top-2 rounded-full bg-black/70 px-3 py-2 text-xs"
									>
										Retry
									</button>
								) : null}
								{onRemove ? (
									<button
										type="button"
										onClick={() => onRemove(item.id)}
										className="absolute bottom-2 left-2 rounded-full bg-black/70 px-3 py-2 text-xs opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
									>
										Remove
									</button>
								) : null}
								<div
									className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-12 transition ${showInfo ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"}`}
								>
									<p className="truncate text-sm font-medium">
										{item.fileName}
									</p>
									<div className="mt-1 flex items-center gap-2 text-xs text-zinc-300">
										{item.uploader.avatarUrl ? (
											<img
												src={item.uploader.avatarUrl}
												alt=""
												referrerPolicy="no-referrer"
												className="h-5 w-5 rounded-full"
											/>
										) : (
											<span className="h-5 w-5 rounded-full bg-zinc-700" />
										)}
										<span className="truncate">
											{item.uploader.displayName}
										</span>
										<span>·</span>
										<time>{formatDate(item)}</time>
									</div>
								</div>
								<button
									type="button"
									aria-label={item.loved ? "Remove from Loved" : "Add to Loved"}
									onClick={() =>
										toggle.mutate({ id: item.id, loved: item.loved })
									}
									className={`absolute right-2 top-2 rounded-full bg-black/60 p-2 text-lg ${item.loved ? "text-rose-500" : "text-white"}`}
								>
									{item.loved ? "♥" : "♡"}
								</button>
								<button
									type="button"
									aria-label="Show photo information"
									onClick={() => setInfoId(showInfo ? null : item.id)}
									className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1 text-xs sm:hidden"
								>
									i
								</button>
							</article>
						);
					})}
				</div>
			</div>
			{photoId ? (
				<PhotoViewer photoId={photoId} onClose={() => navigate(basePath)} />
			) : null}
		</>
	);
}

function PhotoViewer({
	photoId,
	onClose,
}: {
	photoId: string;
	onClose: () => void;
}) {
	const photo = usePhoto(photoId);
	const [videoUrl, setVideoUrl] = useState<string | null>(null);
	const data = photo.data;
	useEffect(() => {
		const close = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", close);
		return () => window.removeEventListener("keydown", close);
	}, [onClose]);
	useEffect(() => {
		if (data?.mediaType === "VIDEO" && data.status === "READY") {
			void apiFetch<{ url: string }>(`/v1/photos/${photoId}/original-url`, {
				method: "POST",
				body: JSON.stringify({ purpose: "view" }),
			}).then((result) => setVideoUrl(result.url));
		}
	}, [data?.mediaType, data?.status, photoId]);
	const download = async () => {
		const result = await apiFetch<{ url: string }>(
			`/v1/photos/${photoId}/original-url`,
			{ method: "POST", body: JSON.stringify({ purpose: "download" }) },
		);
		window.location.assign(result.url);
	};
	return (
		<div
			role="dialog"
			aria-modal="true"
			className="fixed inset-0 z-50 flex bg-black/95"
		>
			<button
				type="button"
				onClick={onClose}
				className="absolute left-4 top-4 z-10 rounded-full bg-black/60 px-4 py-2"
			>
				Close
			</button>
			<button
				type="button"
				onClick={() => void download()}
				className="absolute right-4 top-4 z-10 rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
			>
				Download
			</button>
			<div className="flex min-w-0 flex-1 items-center justify-center">
				{data?.mediaType === "VIDEO" && videoUrl ? (
					<video
						src={videoUrl}
						controls
						playsInline
						className="max-h-screen max-w-full"
					>
						<track
							kind="captions"
							srcLang="en"
							label="No captions available"
							src="data:text/vtt,WEBVTT"
						/>
					</video>
				) : data?.display ? (
					<img
						src={data.display.url}
						alt={data.fileName}
						className="max-h-screen max-w-full object-contain"
					/>
				) : (
					<p className="text-zinc-400">
						{photo.isLoading ? "Loading…" : "Preview unavailable"}
					</p>
				)}
			</div>
			{data ? (
				<aside className="hidden w-80 border-l border-white/10 p-6 lg:block">
					<h2 className="break-words font-medium">{data.fileName}</h2>
					<p className="mt-2 text-sm text-zinc-400">{formatDate(data)}</p>
					<p className="mt-4 text-sm">
						Uploaded by {data.uploader.displayName}
					</p>
				</aside>
			) : null}
		</div>
	);
}
