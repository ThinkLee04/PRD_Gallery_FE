import { useVirtualizer } from "@tanstack/react-virtual";
import {
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import { useMe } from "../auth/useMe";
import { usePhoto, useRetryPhoto, useToggleLoved } from "./queries";
import type { GalleryItem } from "./types";
import { VideoThumbnail } from "./VideoThumbnail";

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

type ViewerIconName =
	| "close"
	| "download"
	| "heart"
	| "info"
	| "minus"
	| "next"
	| "previous"
	| "plus"
	| "reset"
	| "trash";

function ViewerIcon({
	name,
	filled = false,
}: {
	name: ViewerIconName;
	filled?: boolean;
}) {
	const paths: Record<ViewerIconName, ReactNode> = {
		close: <path d="m6 6 12 12M18 6 6 18" />,
		download: (
			<>
				<path d="M12 3v12m0 0 5-5m-5 5-5-5" />
				<path d="M5 20h14" />
			</>
		),
		heart: (
			<path
				d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8Z"
				fill={filled ? "currentColor" : "none"}
			/>
		),
		info: (
			<>
				<circle cx="12" cy="12" r="9" />
				<path d="M12 11v6m0-10h.01" />
			</>
		),
		minus: <path d="M6 12h12" />,
		next: <path d="m9 18 6-6-6-6" />,
		previous: <path d="m15 18-6-6 6-6" />,
		plus: <path d="M12 6v12M6 12h12" />,
		reset: (
			<>
				<path d="M4 7v5h5" />
				<path d="M5.5 16a8 8 0 1 0 .5-9l-2 2" />
			</>
		),
		trash: (
			<>
				<path d="M4 7h16m-10 4v6m4-6v6" />
				<path d="m9 7 1-3h4l1 3m3 0-1 14H7L6 7" />
			</>
		),
	};
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="h-5 w-5"
		>
			{paths[name]}
		</svg>
	);
}

export function GalleryGrid({
	items,
	hasMore,
	loadMore,
	basePath,
	photoId,
	onRemove,
	onScrollPositionChange,
	fillViewport = false,
}: {
	items: GalleryItem[];
	hasMore: boolean;
	loadMore: () => void;
	basePath: string;
	photoId?: string;
	onRemove?: (photoId: string) => void;
	onScrollPositionChange?: (scrollTop: number) => void;
	fillViewport?: boolean;
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
	const lanes = width < 520 ? 2 : width < 900 ? 3 : width < 1320 ? 4 : 5;
	const gap = width < 640 ? 4 : 6;
	const columnWidth = (width - (lanes - 1) * gap) / lanes;
	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => parentRef.current,
		estimateSize: (index) => columnWidth / (items[index]?.aspectRatio ?? 1),
		lanes,
		gap,
		overscan: lanes * 3,
		getItemKey: (index) => items[index]?.id ?? index,
	});
	const virtualItems = virtualizer.getVirtualItems();
	const refreshAssets = (id: string) => {
		if (Date.now() - (lastRefresh.current[id] ?? 0) < 5000) return;
		lastRefresh.current[id] = Date.now();
		void apiFetch<GalleryItem[]>("/v1/photo-assets/urls", {
			method: "POST",
			body: JSON.stringify({ photoIds: [id] }),
		}).then(([fresh]) => {
			if (fresh)
				setAssetOverrides((current) => ({ ...current, [id]: fresh.assets }));
		});
	};
	useEffect(() => {
		const last = virtualItems.at(-1);
		if (last && last.index >= items.length - lanes * 2 && hasMore) loadMore();
	}, [hasMore, items.length, lanes, loadMore, virtualItems]);
	const closeViewer = useCallback(() => {
		if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
		else navigate(basePath, { replace: true });
	}, [basePath, navigate]);

	return (
		<>
			<section
				ref={parentRef}
				className={`${fillViewport ? "-mt-16 h-[100dvh] sm:-mt-[4.25rem]" : "h-[calc(100dvh-7rem)]"} overflow-y-auto px-1`}
				aria-label="Photo gallery"
				onScroll={(event) =>
					onScrollPositionChange?.(event.currentTarget.scrollTop)
				}
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
							item.status === "FAILED" && Boolean(me.data?.vault);
						return (
							<article
								key={item.id}
								className="group absolute overflow-hidden rounded-[4px] bg-[#e5e2db] ring-1 ring-black/5"
								style={{
									width: columnWidth,
									height,
									transform: `translate(${virtual.lane * (columnWidth + gap)}px, ${virtual.start}px)`,
								}}
							>
								<button
									type="button"
									onClick={() => navigate(`${basePath}/photo/${item.id}`)}
									className="media-focus h-full w-full"
									aria-label={`Open ${item.fileName}`}
								>
									{assets.sm ? (
										<img
											src={assets.sm.url}
											srcSet={`${assets.sm.url} 480w${assets.md ? `, ${assets.md.url} 1280w` : ""}`}
											sizes={`${Math.ceil(columnWidth)}px`}
											loading="lazy"
											decoding="async"
											onError={() => refreshAssets(item.id)}
											alt=""
											className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.015] group-focus-within:scale-[1.015]"
										/>
									) : item.mediaType === "VIDEO" && item.status === "READY" ? (
										<VideoThumbnail
											photoId={item.id}
											fileName={item.fileName}
										/>
									) : (
										<div className="flex h-full items-center justify-center text-xs text-[#73716b]">
											{item.status.replaceAll("_", " ").toLowerCase()}
										</div>
									)}
								</button>
								{canRetry ? (
									<button
										type="button"
										onClick={() => retry.mutate(item.id)}
										aria-label="Retry processing"
										title="Retry processing"
										className={`media-focus absolute left-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-sm hover:bg-black/75 ${onRemove ? "top-14" : "top-2"}`}
									>
										<ViewerIcon name="reset" />
									</button>
								) : null}
								<div
									className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-3 pt-12 text-white transition-opacity duration-300 ${showInfo ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"}`}
								>
									<p className="truncate text-sm font-medium">
										{item.fileName}
									</p>
									<p className="mt-0.5 truncate text-xs text-white/75">
										{formatDate(item)}
									</p>
									<div className="mt-2 flex items-center text-xs">
										<span className="flex min-w-0 items-center gap-2 text-white/85">
											{item.uploader.avatarUrl ? (
												<img
													src={item.uploader.avatarUrl}
													alt=""
													referrerPolicy="no-referrer"
													className="h-5 w-5 rounded-full"
												/>
											) : (
												<span className="h-5 w-5 rounded-full bg-white/25" />
											)}
											<span className="truncate">
												{item.uploader.displayName}
											</span>
										</span>
									</div>
								</div>
								<button
									type="button"
									aria-label={item.loved ? "Remove from Loved" : "Add to Loved"}
									onClick={() =>
										toggle.mutate({ id: item.id, loved: item.loved })
									}
									title={item.loved ? "Remove from Loved" : "Add to Loved"}
									className={`media-focus pointer-events-none absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50 opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/75 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 ${item.loved ? "text-[#e66a71]" : "text-white"}`}
								>
									<ViewerIcon name="heart" filled={item.loved} />
								</button>
								<button
									type="button"
									aria-expanded={showInfo}
									aria-label="Show photo information"
									onClick={() => setInfoId(showInfo ? null : item.id)}
									title="Photo information"
									className={`media-focus absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-sm sm:hidden ${showInfo ? "bg-white/20" : ""}`}
								>
									<ViewerIcon name="info" />
								</button>
								{onRemove ? (
									<button
										type="button"
										onClick={() => onRemove(item.id)}
										aria-label="Remove from album"
										title="Remove from album"
										className={`media-focus absolute left-2 top-2 h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-sm transition-opacity hover:bg-black/75 ${showInfo ? "flex" : "hidden sm:flex sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"}`}
									>
										<ViewerIcon name="trash" />
									</button>
								) : null}
							</article>
						);
					})}
				</div>
			</section>
			{photoId ? (
				<PhotoViewer
					photoId={photoId}
					items={items}
					basePath={basePath}
					onClose={closeViewer}
				/>
			) : null}
		</>
	);
}

function PhotoViewer({
	photoId,
	items,
	basePath,
	onClose,
}: {
	photoId: string;
	items: GalleryItem[];
	basePath: string;
	onClose: () => void;
}) {
	const photo = usePhoto(photoId);
	const toggle = useToggleLoved();
	const navigate = useNavigate();
	const [videoUrl, setVideoUrl] = useState<string | null>(null);
	const [showInfo, setShowInfo] = useState(false);
	const [controlsVisible, setControlsVisible] = useState(true);
	const [zoom, setZoom] = useState(1);
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const drag = useRef<{
		pointerId: number;
		x: number;
		y: number;
		panX: number;
		panY: number;
	} | null>(null);
	const timer = useRef<number | undefined>(undefined);
	const data = photo.data;
	const index = items.findIndex((item) => item.id === photoId);
	const previous = index > 0 ? items[index - 1] : undefined;
	const next = index >= 0 ? items[index + 1] : undefined;
	const isZoomable = data?.mediaType === "IMAGE" && Boolean(data.display);
	const changeZoom = useCallback((change: number) => {
		setZoom((current) =>
			Math.min(4, Math.max(1, Math.round((current + change) * 4) / 4)),
		);
	}, []);
	const resetZoom = useCallback(() => {
		setZoom(1);
		setPan({ x: 0, y: 0 });
	}, []);
	const revealControls = useCallback(() => {
		setControlsVisible(true);
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => setControlsVisible(false), 3200);
	}, []);
	useEffect(() => {
		if (photoId) resetZoom();
	}, [photoId, resetZoom]);
	useEffect(() => {
		if (zoom === 1) setPan({ x: 0, y: 0 });
	}, [zoom]);
	useEffect(() => {
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		revealControls();
		const keys = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
			if (event.key === "ArrowLeft" && previous)
				navigate(`${basePath}/photo/${previous.id}`, { replace: true });
			if (event.key === "ArrowRight" && next)
				navigate(`${basePath}/photo/${next.id}`, { replace: true });
			if (isZoomable && (event.key === "+" || event.key === "="))
				changeZoom(0.25);
			if (isZoomable && (event.key === "-" || event.key === "_"))
				changeZoom(-0.25);
			if (isZoomable && event.key === "0") resetZoom();
			revealControls();
		};
		window.addEventListener("keydown", keys);
		return () => {
			document.body.style.overflow = originalOverflow;
			window.clearTimeout(timer.current);
			window.removeEventListener("keydown", keys);
		};
	}, [
		basePath,
		changeZoom,
		isZoomable,
		navigate,
		next,
		onClose,
		previous,
		resetZoom,
		revealControls,
	]);
	useEffect(() => {
		setVideoUrl(null);
		if (data?.mediaType === "VIDEO" && data.status === "READY")
			void apiFetch<{ url: string }>(`/v1/photos/${photoId}/original-url`, {
				method: "POST",
				body: JSON.stringify({ purpose: "view" }),
			}).then((result) => setVideoUrl(result.url));
	}, [data?.mediaType, data?.status, photoId]);
	const download = async () => {
		const result = await apiFetch<{ url: string }>(
			`/v1/photos/${photoId}/original-url`,
			{ method: "POST", body: JSON.stringify({ purpose: "download" }) },
		);
		window.location.assign(result.url);
	};
	const startPan = (event: ReactPointerEvent<HTMLImageElement>) => {
		if (zoom <= 1) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		drag.current = {
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			panX: pan.x,
			panY: pan.y,
		};
	};
	const movePan = (event: ReactPointerEvent<HTMLImageElement>) => {
		const start = drag.current;
		if (!start || start.pointerId !== event.pointerId) return;
		setPan({
			x: start.panX + event.clientX - start.x,
			y: start.panY + event.clientY - start.y,
		});
	};
	const stopPan = (event: ReactPointerEvent<HTMLImageElement>) => {
		if (drag.current?.pointerId === event.pointerId) drag.current = null;
	};
	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label={data ? `Viewing ${data.fileName}` : "Photo viewer"}
			onPointerMove={revealControls}
			onPointerDown={revealControls}
			className="fixed inset-0 z-50 flex bg-black/90 text-white backdrop-blur-sm"
		>
			<div
				className={`absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] transition-opacity ${controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
			>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close viewer"
					title="Close"
					className="media-focus flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/35 backdrop-blur-sm hover:bg-white/15"
				>
					<ViewerIcon name="close" />
				</button>
				<div className="flex items-center gap-2">
					{data ? (
						<button
							type="button"
							onClick={() => toggle.mutate({ id: data.id, loved: data.loved })}
							aria-label={data.loved ? "Remove from Loved" : "Add to Loved"}
							title={data.loved ? "Remove from Loved" : "Add to Loved"}
							className={`media-focus flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/35 backdrop-blur-sm hover:bg-white/15 ${data.loved ? "text-[#e66a71]" : ""}`}
						>
							<ViewerIcon name="heart" filled={data.loved} />
						</button>
					) : null}
					<button
						type="button"
						onClick={() => setShowInfo((value) => !value)}
						aria-expanded={showInfo}
						aria-label="Show photo information"
						title="Photo information"
						className={`media-focus flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/35 backdrop-blur-sm hover:bg-white/15 ${showInfo ? "bg-white/20" : ""}`}
					>
						<ViewerIcon name="info" />
					</button>
					<button
						type="button"
						onClick={() => void download()}
						disabled={!data}
						aria-label="Download original"
						title="Download original"
						className="media-focus flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/35 backdrop-blur-sm hover:bg-white/15 disabled:opacity-40"
					>
						<ViewerIcon name="download" />
					</button>
				</div>
			</div>
			<div
				className="flex min-w-0 flex-1 items-center justify-center overflow-hidden px-2 pb-20 pt-16 sm:px-14"
				onWheel={(event) => {
					if (!isZoomable) return;
					event.preventDefault();
					changeZoom(event.deltaY < 0 ? 0.25 : -0.25);
				}}
			>
				{data?.mediaType === "VIDEO" && videoUrl ? (
					<video
						src={videoUrl}
						controls
						playsInline
						className="max-h-full max-w-full"
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
						draggable={false}
						onDoubleClick={() => (zoom === 1 ? changeZoom(1) : resetZoom())}
						onPointerDown={startPan}
						onPointerMove={movePan}
						onPointerUp={stopPan}
						onPointerCancel={stopPan}
						className={`max-h-full max-w-full touch-none select-none object-contain ${zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
						style={{
							transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
							transition: drag.current ? "none" : "transform 150ms ease-out",
						}}
					/>
				) : (
					<p className="text-sm text-white/60">
						{photo.isLoading
							? "Loading…"
							: "Preview unavailable. Download the original to view it."}
					</p>
				)}
			</div>
			{isZoomable ? (
				<fieldset
					className={`absolute bottom-24 right-4 z-30 flex items-center rounded-full border border-white/15 bg-black/55 p-1 text-sm backdrop-blur-sm transition-opacity ${controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
				>
					<legend className="sr-only">Image zoom controls</legend>
					<button
						type="button"
						onClick={() => changeZoom(-0.25)}
						disabled={zoom <= 1}
						aria-label="Zoom out"
						title="Zoom out"
						className="media-focus flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 disabled:opacity-35"
					>
						<ViewerIcon name="minus" />
					</button>
					<span className="min-w-12 text-center text-xs tabular-nums text-white/80">
						{Math.round(zoom * 100)}%
					</span>
					<button
						type="button"
						onClick={resetZoom}
						aria-label="Reset zoom"
						title="Reset zoom"
						className="media-focus flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15"
					>
						<ViewerIcon name="reset" />
					</button>
					<button
						type="button"
						onClick={() => changeZoom(0.25)}
						disabled={zoom >= 4}
						aria-label="Zoom in"
						title="Zoom in"
						className="media-focus flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 disabled:opacity-35"
					>
						<ViewerIcon name="plus" />
					</button>
				</fieldset>
			) : null}
			{previous ? (
				<button
					type="button"
					onClick={() =>
						navigate(`${basePath}/photo/${previous.id}`, { replace: true })
					}
					aria-label="Previous photo"
					title="Previous photo"
					className={`media-focus absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 backdrop-blur-sm transition-opacity hover:bg-black/70 ${controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
				>
					<ViewerIcon name="previous" />
				</button>
			) : null}
			{next ? (
				<button
					type="button"
					onClick={() =>
						navigate(`${basePath}/photo/${next.id}`, { replace: true })
					}
					aria-label="Next photo"
					title="Next photo"
					className={`media-focus absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 backdrop-blur-sm transition-opacity hover:bg-black/70 ${controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
				>
					<ViewerIcon name="next" />
				</button>
			) : null}
			{data ? (
				<div
					className={`absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-6 bg-gradient-to-t from-black/80 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 text-sm transition-opacity sm:px-6 ${controlsVisible || showInfo ? "opacity-100" : "pointer-events-none opacity-0"}`}
				>
					<div className="min-w-0 max-w-[52%] text-left">
						<p className="truncate font-medium">{data.fileName}</p>
						<p className="mt-1 truncate text-xs text-white/65">
							{formatDate(data)}
						</p>
					</div>
					<div className="min-w-0 max-w-[44%] text-right">
						<div className="flex items-center justify-end gap-2 text-xs text-white/70">
							<span className="truncate">{data.uploader.displayName}</span>
							{data.uploader.avatarUrl ? (
								<img
									src={data.uploader.avatarUrl}
									alt=""
									referrerPolicy="no-referrer"
									className="h-6 w-6 shrink-0 rounded-full"
								/>
							) : null}
						</div>
						{showInfo ? (
							<p className="mt-2 truncate text-xs text-white/55">
								{data.width && data.height
									? `${data.width} × ${data.height}`
									: "Dimensions unavailable"}{" "}
								· {data.mediaType === "VIDEO" ? "Video" : "Image"}
							</p>
						) : null}
					</div>
				</div>
			) : null}
		</div>
	);
}
