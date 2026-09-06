import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../lib/api";

const THUMBNAIL_WIDTH = 960;

export function drawVideoThumbnail(
	canvas: HTMLCanvasElement,
	video: Pick<HTMLVideoElement, "videoWidth" | "videoHeight">,
): boolean {
	if (video.videoWidth <= 0 || video.videoHeight <= 0) return false;
	const scale = Math.min(1, THUMBNAIL_WIDTH / video.videoWidth);
	canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
	canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
	const context = canvas.getContext("2d");
	if (context === null) return false;
	context.drawImage(
		video as HTMLVideoElement,
		0,
		0,
		canvas.width,
		canvas.height,
	);
	return true;
}

export function VideoThumbnail({
	photoId,
	fileName,
}: {
	photoId: string;
	fileName: string;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

	useEffect(() => {
		const controller = new AbortController();
		const video = document.createElement("video");
		let disposed = false;
		let seekTarget = 0;

		video.muted = true;
		video.playsInline = true;
		video.preload = "metadata";
		video.crossOrigin = "anonymous";

		const draw = () => {
			if (
				!disposed &&
				canvasRef.current !== null &&
				drawVideoThumbnail(canvasRef.current, video)
			)
				setState("ready");
		};
		const onMetadata = () => {
			seekTarget =
				Number.isFinite(video.duration) && video.duration > 0.2
					? Math.min(1, video.duration * 0.1)
					: 0;
			if (seekTarget > 0) video.currentTime = seekTarget;
			else if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) draw();
		};
		const onLoadedData = () => {
			if (seekTarget === 0) draw();
		};
		const onError = () => {
			if (!disposed) setState("failed");
		};

		video.addEventListener("loadedmetadata", onMetadata);
		video.addEventListener("loadeddata", onLoadedData);
		video.addEventListener("seeked", draw);
		video.addEventListener("error", onError);

		void apiFetch<{ url: string }>(`/v1/photos/${photoId}/original-url`, {
			method: "POST",
			body: JSON.stringify({ purpose: "view" }),
			signal: controller.signal,
		})
			.then(({ url }) => {
				if (disposed) return;
				video.src = url;
				video.load();
			})
			.catch((error: unknown) => {
				if (
					!disposed &&
					!(error instanceof DOMException && error.name === "AbortError")
				)
					setState("failed");
			});

		return () => {
			disposed = true;
			controller.abort();
			video.pause();
			video.removeAttribute("src");
			video.load();
		};
	}, [photoId]);

	return (
		<div className="relative flex h-full w-full items-center justify-center text-xs text-[#73716b]">
			{state !== "ready" ? (
				<span>
					{state === "failed" ? "Video · open to play" : "Loading preview…"}
				</span>
			) : null}
			<canvas
				ref={canvasRef}
				className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.015] group-focus-within:scale-[1.015] ${state === "ready" ? "opacity-100" : "opacity-0"}`}
			/>
			{state === "ready" ? (
				<span className="pointer-events-none absolute left-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white shadow-sm backdrop-blur-sm">
					<svg
						aria-label={`Video preview for ${fileName}`}
						viewBox="0 0 24 24"
						fill="currentColor"
						className="h-4 w-4 translate-x-px"
					>
						<path d="M8 5v14l11-7z" />
					</svg>
				</span>
			) : null}
		</div>
	);
}
