import { useVirtualizer } from "@tanstack/react-virtual";
import {
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
	const lanes = width < 520 ? 2 : width < 900 ? 3 : width < 1320 ? 4 : 5;
	const gap = width < 640 ? 4 : 6;
	const columnWidth = (width - (lanes - 1) * gap) / lanes;
	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => parentRef.current,
		estimateSize: (index) =>
			columnWidth / (items[index]?.aspectRatio ?? 1) + gap,
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
				className="h-[calc(100dvh-7rem)] overflow-y-auto px-1"
				aria-label="Photo gallery"
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
								className="group absolute overflow-hidden rounded-[2px] bg-[#e5e2db]"
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
											className="h-full w-full object-cover"
										/>
									) : (
										<div className="flex h-full items-center justify-center text-xs text-[#73716b]">
											{item.mediaType === "VIDEO"
												? "Video · open to play"
												: item.status.replaceAll("_", " ").toLowerCase()}
										</div>
									)}
								</button>
								{canRetry ? (
									<button
										type="button"
										onClick={() => retry.mutate(item.id)}
										className="absolute left-2 top-2 bg-black/75 px-2 py-1 text-xs text-white"
									>
										Retry processing
									</button>
								) : null}
								<div
									className={`pointer-events-none absolute inset-x-0 bottom-0 bg-black/75 p-3 text-white transition-opacity ${showInfo ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"}`}
								>
									<p className="truncate text-sm font-medium">
										{item.fileName}
									</p>
									<p className="mt-0.5 truncate text-xs text-white/75">
										{formatDate(item)}
									</p>
									<div className="mt-2 flex items-center gap-2 text-xs">
										<span className="flex min-w-0 flex-1 items-center gap-2">
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
										<span
											className={
												item.loved ? "text-[#e66a71]" : "text-white/80"
											}
										>
											{item.loved ? "Loved" : "Love"}
										</span>
									</div>
								</div>
								<button
									type="button"
									aria-label={item.loved ? "Remove from Loved" : "Add to Loved"}
									onClick={() =>
										toggle.mutate({ id: item.id, loved: item.loved })
									}
									className={`absolute right-2 top-2 min-h-8 bg-black/70 px-2 text-sm ${item.loved ? "text-[#e66a71]" : "text-white"}`}
								>
									{item.loved ? "♥" : "♡"}
								</button>
								<button
									type="button"
									aria-expanded={showInfo}
									aria-label="Show photo information"
									onClick={() => setInfoId(showInfo ? null : item.id)}
									className="absolute bottom-2 right-2 min-h-8 bg-black/70 px-2 text-xs text-white sm:hidden"
								>
									Info
								</button>
								{onRemove && showInfo ? (
									<button
										type="button"
										onClick={() => onRemove(item.id)}
										className="absolute bottom-2 left-2 bg-black/75 px-2 py-1 text-xs text-white"
									>
										Remove from album
									</button>
								) : null}
								{onRemove ? (
									<button
										type="button"
										onClick={() => onRemove(item.id)}
										className="absolute bottom-2 left-2 hidden bg-black/75 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:block group-hover:opacity-100 group-focus-within:block group-focus-within:opacity-100 sm:block"
									>
										Remove from album
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
			className="fixed inset-0 z-50 flex bg-[#111] text-white"
		>
			<div
				className={`absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-black/65 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-sm transition-opacity ${controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
			>
				<button type="button" onClick={onClose} className="media-focus py-1">
					Close
				</button>
				<div className="flex items-center gap-5">
					{data ? (
						<button
							type="button"
							onClick={() => toggle.mutate({ id: data.id, loved: data.loved })}
							className={`media-focus py-1 ${data.loved ? "text-[#e66a71]" : ""}`}
						>
							{data.loved ? "Loved" : "Love"}
						</button>
					) : null}
					<button
						type="button"
						onClick={() => setShowInfo((value) => !value)}
						aria-expanded={showInfo}
						className="media-focus py-1"
					>
						Info
					</button>
					<button
						type="button"
						onClick={() => void download()}
						disabled={!data}
						className="media-focus py-1 disabled:opacity-40"
					>
						Download
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
					className={`absolute bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center border border-white/15 bg-black/70 text-sm transition-opacity ${controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
				>
					<legend className="sr-only">Image zoom controls</legend>
					<button
						type="button"
						onClick={() => changeZoom(-0.25)}
						disabled={zoom <= 1}
						aria-label="Zoom out"
						className="media-focus min-h-10 min-w-10 text-lg disabled:opacity-35"
					>
						âˆ’
					</button>
					<button
						type="button"
						onClick={resetZoom}
						aria-label="Reset zoom"
						className="media-focus min-h-10 min-w-16 border-x border-white/15 px-2 text-xs tabular-nums"
					>
						{Math.round(zoom * 100)}%
					</button>
					<button
						type="button"
						onClick={() => changeZoom(0.25)}
						disabled={zoom >= 4}
						aria-label="Zoom in"
						className="media-focus min-h-10 min-w-10 text-lg disabled:opacity-35"
					>
						+
					</button>
				</fieldset>
			) : null}
			{previous ? (
				<button
					type="button"
					onClick={() =>
						navigate(`${basePath}/photo/${previous.id}`, { replace: true })
					}
					className={`media-focus absolute left-3 top-1/2 z-10 bg-black/65 px-3 py-2 text-sm transition-opacity ${controlsVisible ? "opacity-100" : "opacity-0"}`}
				>
					Previous
				</button>
			) : null}
			{next ? (
				<button
					type="button"
					onClick={() =>
						navigate(`${basePath}/photo/${next.id}`, { replace: true })
					}
					className={`media-focus absolute right-3 top-1/2 z-10 bg-black/65 px-3 py-2 text-sm transition-opacity ${controlsVisible ? "opacity-100" : "opacity-0"}`}
				>
					Next
				</button>
			) : null}
			{data ? (
				<div
					className={`absolute inset-x-0 bottom-0 z-20 bg-black/65 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-center text-sm transition-opacity ${controlsVisible || showInfo ? "opacity-100" : "pointer-events-none opacity-0"}`}
				>
					<p className="truncate">
						{data.fileName} · {formatDate(data)}
					</p>
					<div className="mt-1 flex items-center justify-center gap-2 text-xs text-white/70">
						{data.uploader.avatarUrl ? (
							<img
								src={data.uploader.avatarUrl}
								alt=""
								referrerPolicy="no-referrer"
								className="h-5 w-5 rounded-full"
							/>
						) : null}
						<span>{data.uploader.displayName}</span>
					</div>
					{showInfo ? (
						<p className="mt-2 text-xs text-white/55">
							{data.width && data.height
								? `${data.width} × ${data.height}`
								: "Dimensions unavailable"}{" "}
							· {data.mediaType === "VIDEO" ? "Video" : "Image"}
						</p>
					) : null}
				</div>
			) : null}
		</div>
	);
}
