import { expect, rs, test } from "@rstest/core";
import { WaveformRenderer } from "./renderer";
import type { WaveformFrame, WaveformPoint } from "./types";

const points: WaveformPoint[] = Array.from({ length: 512 }, (_, i) => [
	64 + ((i * 53) % 190),
	(i * 79) % 256,
	(i * 137) % 256,
	(i * 23) % 256,
]);
const beats = Array.from({ length: 64 }, (_, i) => ({
	time: i / 2,
	beat_number: (i % 4) + 1,
}));

function fixture(animations = true) {
	const canvas = document.createElement("canvas");
	const marker = document.createElement("div");
	marker.style.display = "none";
	if (!animations)
		Object.defineProperty(canvas, "animate", { value: undefined });
	document.body.append(canvas, marker);
	const renderer = new WaveformRenderer(canvas, marker);
	const frame: WaveformFrame = {
		points,
		beats,
		waveformDuration: 32,
		duration: 32,
		start: 12,
		end: 20,
		position: 16,
		frameTime: Number(document.timeline.currentTime),
		width: 64,
		height: 32,
		pixelRatio: 1,
	};
	return {
		canvas,
		marker,
		renderer,
		frame,
		cleanup() {
			renderer.dispose();
			canvas.remove();
			marker.remove();
		},
	};
}

function xAt(element: HTMLElement, milliseconds: number) {
	for (const animation of element.getAnimations()) {
		animation.pause();
		animation.currentTime = milliseconds;
	}
	return new DOMMatrixReadOnly(getComputedStyle(element).transform).m41;
}

test("texture and playhead interpolate without JavaScript callbacks", () => {
	const f = fixture();
	try {
		f.renderer.render(f.frame);
		const initial = xAt(f.canvas, 0);
		expect(xAt(f.canvas, 1000)).toBeCloseTo(initial - 8);
		expect(xAt(f.marker, 0)).toBeCloseTo(32);
		expect(xAt(f.marker, 1000)).toBeCloseTo(32);
		expect(f.canvas.width).toBeLessThanOrEqual(130);
	} finally {
		f.cleanup();
	}
});

test("hundreds of audio-clock checks neither repaint nor replace animations", () => {
	const f = fixture();
	const draw = rs.spyOn(CanvasRenderingContext2D.prototype, "drawImage");
	try {
		f.renderer.render(f.frame);
		const initial = f.canvas.getAnimations()[0];
		const painted = draw.mock.calls.length;
		for (let i = 1; i <= 240; i++)
			f.renderer.render({
				...f.frame,
				position: 16 + i / 60 + (i % 2 ? 0.001 : -0.001),
				frameTime: (f.frame.frameTime ?? 0) + (i * 1000) / 60,
			});
		expect(f.canvas.getAnimations()[0]).toBe(initial);
		expect(draw.mock.calls.length).toBe(painted);
	} finally {
		draw.mockRestore();
		f.cleanup();
	}
});

test("seeks within the cache reanchor motion without repainting the texture", () => {
	const f = fixture();
	const draw = rs.spyOn(CanvasRenderingContext2D.prototype, "drawImage");
	try {
		f.renderer.render(f.frame);
		const initial = f.canvas.getAnimations()[0];
		const painted = draw.mock.calls.length;
		const initialX = xAt(f.canvas, 0);
		f.renderer.render({ ...f.frame, position: 19 });
		expect(initial.playState).toBe("idle");
		expect(xAt(f.canvas, 0)).toBeCloseTo(initialX - 24);
		expect(draw.mock.calls.length).toBe(painted);
	} finally {
		draw.mockRestore();
		f.cleanup();
	}
});

test("refills happen before exhausting the texture and animation endpoints stay inside it", () => {
	const f = fixture();
	const draw = rs.spyOn(CanvasRenderingContext2D.prototype, "drawImage");
	try {
		f.renderer.render(f.frame);
		const initial = f.canvas.getAnimations()[0];
		const painted = draw.mock.calls.length;
		f.renderer.render({
			...f.frame,
			position: 23.8,
			frameTime: (f.frame.frameTime ?? 0) + 7800,
		});
		expect(initial.playState).toBe("idle");
		expect(draw.mock.calls.length).toBeGreaterThan(painted);
		const animation = f.canvas.getAnimations()[0];
		if (!animation.effect) throw new Error("Expected texture effect");
		const timing = animation.effect.getTiming();
		expect(Number(timing.duration)).toBeLessThanOrEqual(12000);
		const edge = xAt(f.canvas, Number(timing.duration));
		expect(xAt(f.canvas, 100000)).toBeCloseTo(edge);
		expect(xAt(f.canvas, Number(timing.duration))).toBeGreaterThanOrEqual(
			-(f.canvas.width - f.frame.width),
		);
		expect(f.canvas.width).toBeLessThanOrEqual(130);
	} finally {
		draw.mockRestore();
		f.cleanup();
	}
});

test("zoom, track data, and beat-grid changes invalidate the painted texture", () => {
	const f = fixture();
	const draw = rs.spyOn(CanvasRenderingContext2D.prototype, "drawImage");
	try {
		f.renderer.render(f.frame);
		let painted = draw.mock.calls.length;
		for (const frame of [
			{ ...f.frame, start: 14, end: 18 },
			{ ...f.frame, points: [...points] },
			{ ...f.frame, beats: [] },
			{ ...f.frame, waveformDuration: 30 },
		]) {
			const previous = f.canvas.getAnimations()[0];
			f.renderer.render(frame);
			expect(previous.playState).toBe("idle");
			expect(draw.mock.calls.length).toBeGreaterThan(painted);
			painted = draw.mock.calls.length;
		}
	} finally {
		draw.mockRestore();
		f.cleanup();
	}
});

test("fractional CSS sizes and device-pixel-ratio changes preserve the scrolling scale", () => {
	const f = fixture();
	try {
		f.renderer.render(f.frame);
		const initial = f.canvas.getAnimations()[0];
		const frame = { ...f.frame, width: 64.25, height: 32.25, pixelRatio: 1.5 };
		f.renderer.render(frame);
		expect(initial.playState).toBe("idle");
		const x = xAt(f.canvas, 0);
		expect(xAt(f.canvas, 1000)).toBeCloseTo(x - frame.width / 8);
		expect(xAt(f.marker, 1000)).toBeCloseTo(frame.width / 2);
		expect(f.canvas.width).toBe(2 * Math.round(frame.width * 1.5) + 2);
		const previous = f.canvas.getAnimations()[0];
		f.renderer.render({ ...frame, width: 64.3 });
		expect(previous.playState).toBe("idle");
		expect(xAt(f.marker, 0)).toBeCloseTo(64.3 / 2);
	} finally {
		f.cleanup();
	}
});

test("track edges pin the viewport while the playhead moves", () => {
	const f = fixture();
	try {
		f.renderer.render({ ...f.frame, position: 0 });
		const initial = xAt(f.canvas, 0);
		expect(xAt(f.canvas, 2000)).toBeCloseTo(initial);
		expect(xAt(f.marker, 2000)).toBeCloseTo(16);
		expect(xAt(f.canvas, 5000)).toBeCloseTo(initial - 8);
		f.renderer.render({ ...f.frame, position: 29 });
		const end = xAt(f.canvas, 0);
		expect(xAt(f.canvas, 1000)).toBeCloseTo(end);
		expect(xAt(f.marker, 1000)).toBeCloseTo(48);
	} finally {
		f.cleanup();
	}
});

test("a full-song viewport creates no stationary texture animation", () => {
	const f = fixture();
	try {
		f.renderer.render({ ...f.frame, start: 0, end: 32, position: 0 });
		expect(f.canvas.getAnimations()).toHaveLength(0);
		expect(f.canvas.style.willChange).toBe("");
		expect(xAt(f.marker, 1000)).toBeCloseTo(2);
	} finally {
		f.cleanup();
	}
});

test("empty waveform data still animates the beat grid", () => {
	const f = fixture();
	try {
		f.renderer.render({ ...f.frame, points: [], waveformDuration: 0 });
		expect(f.canvas.getAnimations()).toHaveLength(1);
		const context = f.canvas.getContext("2d");
		if (!context) throw new Error("Missing context");
		// Beat at 12 seconds, one pixel after the cached surface's time origin.
		expect(context.getImageData(1, 1, 1, 1).data[3]).toBeGreaterThan(0);
	} finally {
		f.cleanup();
	}
});

test("pause/background drawing removes animation layers and can resume", () => {
	const f = fixture();
	try {
		f.renderer.render(f.frame);
		f.renderer.render({ ...f.frame, frameTime: undefined });
		expect(f.canvas.getAnimations()).toHaveLength(0);
		expect(f.marker.getAnimations()).toHaveLength(0);
		expect(f.marker.style.display).toBe("none");
		expect(f.canvas.style.willChange).toBe("");
		expect(f.canvas.width).toBe(64);
		f.renderer.render(f.frame);
		expect(f.canvas.getAnimations()).toHaveLength(1);
	} finally {
		f.cleanup();
	}
});

test("uses canvas drawing when Web Animations is unavailable", () => {
	const f = fixture(false);
	try {
		f.renderer.render(f.frame);
		expect(f.canvas.getAnimations()).toHaveLength(0);
		expect(f.canvas.width).toBe(64);
		const context = f.canvas.getContext("2d");
		if (!context) throw new Error("Missing context");
		expect(context.getImageData(16, 16, 1, 1).data[3]).toBeGreaterThan(0);
	} finally {
		f.cleanup();
	}
});

test.each([
	{ width: 0 },
	{ height: 0 },
	{ pixelRatio: 0 },
	{ duration: 0 },
	{ start: 20 },
	{ position: Number.NaN },
	{ frameTime: Number.NaN },
	{ width: Number.POSITIVE_INFINITY },
])("clears stale content for invalid or zero-sized frames: %j", (invalid) => {
	const f = fixture();
	try {
		f.renderer.render(f.frame);
		f.renderer.render({ ...f.frame, ...invalid });
		expect(f.canvas.getAnimations()).toHaveLength(0);
		expect(f.marker.getAnimations()).toHaveLength(0);
		expect(f.canvas.width).toBe(0);
		f.renderer.render(f.frame);
		expect(f.canvas.getAnimations()).toHaveLength(1);
	} finally {
		f.cleanup();
	}
});

test("disposal releases both canvas backing stores and all compositor resources", () => {
	const f = fixture();
	const draw = rs.spyOn(CanvasRenderingContext2D.prototype, "drawImage");
	try {
		f.renderer.render(f.frame);
		const texture = draw.mock.calls[0][0] as HTMLCanvasElement;
		f.renderer.dispose();
		f.renderer.dispose();
		expect(texture.width).toBe(0);
		expect(texture.height).toBe(0);
		expect(f.canvas.width).toBe(0);
		expect(f.canvas.height).toBe(0);
		expect(f.canvas.getAnimations()).toHaveLength(0);
		expect(f.marker.getAnimations()).toHaveLength(0);
		expect(f.canvas.style.transform).toBe("");
		expect(f.canvas.style.willChange).toBe("");
		expect(() => f.renderer.render(f.frame)).toThrow("disposed");
	} finally {
		draw.mockRestore();
		f.cleanup();
	}
});

test("long tracks retain viewport-sized textures and bounded animation distances", () => {
	const f = fixture();
	try {
		f.renderer.render({
			...f.frame,
			duration: 36000,
			waveformDuration: 36000,
			position: 10000,
			start: 9996,
			end: 10004,
		});
		const animation = f.canvas.getAnimations()[0];
		if (!animation.effect) throw new Error("Expected texture effect");
		expect(Number(animation.effect.getTiming().duration)).toBeLessThanOrEqual(
			8000,
		);
		expect(f.canvas.width).toBe(130);
		expect(xAt(f.canvas, 100000)).toBeGreaterThanOrEqual(-66);
	} finally {
		f.cleanup();
	}
});
