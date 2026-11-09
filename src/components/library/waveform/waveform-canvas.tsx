import { useEffect, useEffectEvent, useRef } from "react";
import { waveformWindow } from "@/lib/audio";
import { startPlaybackUpdates } from "@/lib/playbackScheduling";
import type { TrackAnalysis } from "@/lib/tauri/core/types";

interface WaveformCanvasProps {
	analysis: TrackAnalysis;
	duration: number;
	start: number;
	end: number;
	playing?: boolean;
	getPosition?: () => number;
	follow?: boolean;
	onFrame?: (start: number, end: number, position: number) => void;
}

export function WaveformCanvas({
	analysis,
	duration,
	start,
	end,
	playing,
	getPosition,
	follow,
	onFrame,
}: WaveformCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const redrawRef = useRef<(() => void) | null>(null);
	const animating = Boolean(playing && getPosition);
	// Read current playback/view props without tearing down the frame loop at 10Hz.
	const draw = useEffectEvent((width: number, height: number) => {
		const canvas = canvasRef.current;
		if (!canvas || end <= start) return;
		const ratio = window.devicePixelRatio || 1;
		if (
			canvas.width !== Math.round(width * ratio) ||
			canvas.height !== Math.round(height * ratio)
		) {
			canvas.width = Math.round(width * ratio);
			canvas.height = Math.round(height * ratio);
		}
		const context = canvas.getContext("2d");
		if (!context || !width) return;
		context.setTransform(ratio, 0, 0, ratio, 0, 0);
		context.clearRect(0, 0, width, height);
		const position = getPosition?.();
		const view =
			follow && position !== undefined
				? waveformWindow(position, duration, end - start)
				: { start, end };
		const span = view.end - view.start;
		const waveformDuration = analysis.waveform_duration ?? duration;
		const points = analysis.waveform;
		for (let x = 0; x < width; x++) {
			const time = view.start + (x / width) * span;
			const from = Math.floor((time / waveformDuration) * points.length);
			const to = Math.min(
				points.length,
				Math.max(
					from + 1,
					Math.ceil(((time + span / width) / waveformDuration) * points.length),
				),
			);
			let peak = points[from];
			if (!peak) continue;
			for (let index = from + 1; index < to; index++)
				if (points[index][0] > peak[0]) peak = points[index];
			const amplitude = Math.max(1, (peak[0] / 255) * (height - 8));
			context.fillStyle = `rgb(${peak[1]}, ${peak[2]}, ${peak[3]})`;
			context.fillRect(x, (height - amplitude) / 2, 1, amplitude);
		}
		let lastBeatX = -10;
		for (const beat of analysis.beats) {
			if (beat.time < view.start || beat.time > view.end) continue;
			const x = ((beat.time - view.start) / span) * width;
			const downbeat = beat.beat_number === 1;
			if (x - lastBeatX < 3 && !downbeat) continue;
			lastBeatX = x;
			context.fillStyle = downbeat
				? "rgba(255,255,255,0.4)"
				: "rgba(255,255,255,0.18)";
			context.fillRect(x, downbeat ? 0 : height - 6, 1, downbeat ? height : 6);
		}
		if (position !== undefined && onFrame) {
			context.fillStyle = "white";
			context.fillRect(((position - view.start) / span) * width, 0, 2, height);
			onFrame(view.start, view.end, position);
		}
	});
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		let width = canvas.clientWidth;
		let height = canvas.clientHeight;
		const paint = () => draw(width, height);
		redrawRef.current = paint;
		const observer = new ResizeObserver(() => {
			// Measure only on resize, not after the overview's style writes every frame.
			width = canvas.clientWidth;
			height = canvas.clientHeight;
			if (!animating) paint();
		});
		observer.observe(canvas);
		const stopUpdates = animating ? startPlaybackUpdates(paint) : undefined;
		return () => {
			redrawRef.current = null;
			observer.disconnect();
			stopUpdates?.();
		};
	}, [animating]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: The Effect Event reads these inputs; static canvases redraw only when they change.
	useEffect(() => {
		if (!animating) redrawRef.current?.();
	}, [analysis, duration, start, end, animating, getPosition, follow, onFrame]);
	return (
		<canvas
			ref={canvasRef}
			tabIndex={-1}
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 h-full w-full"
		/>
	);
}
