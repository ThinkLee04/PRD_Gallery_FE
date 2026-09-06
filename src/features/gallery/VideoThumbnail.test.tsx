import { describe, expect, it, vi } from "vitest";
import { drawVideoThumbnail } from "./VideoThumbnail";

describe("drawVideoThumbnail", () => {
	it("draws a bounded canvas thumbnail while preserving video aspect ratio", () => {
		const drawImage = vi.fn();
		const canvas = document.createElement("canvas");
		vi.spyOn(canvas, "getContext").mockReturnValue({ drawImage } as never);
		const video = { videoWidth: 3840, videoHeight: 2160 };

		expect(drawVideoThumbnail(canvas, video)).toBe(true);
		expect(canvas.width).toBe(960);
		expect(canvas.height).toBe(540);
		expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 960, 540);
	});

	it("waits until the video has usable dimensions", () => {
		const canvas = document.createElement("canvas");
		expect(drawVideoThumbnail(canvas, { videoWidth: 0, videoHeight: 0 })).toBe(
			false,
		);
	});
});
