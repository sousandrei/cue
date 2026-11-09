import { WaveformRenderer } from "@cue/waveform";
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
	getPosition?: (frameTime?: number) => number;
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
	const surfaceRef = useRef<HTMLDivElement>(null);
	const markerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rendererRef = useRef<WaveformRenderer | null>(null);
	const redrawRef = useRef<(() => void) | null>(null);
	const animating = Boolean(playing && getPosition);
	// Read current playback/view props without tearing down the frame loop at 10Hz.
	const draw = useEffectEvent(
		(
			width: number,
			height: number,
			frameTime?: number,
			foreground?: boolean,
		) => {
			const renderer = rendererRef.current;
			if (!renderer) return;
			const position = getPosition?.(frameTime);
			const view =
				follow && position !== undefined
					? waveformWindow(position, duration, end - start)
					: { start, end };
			renderer.render({
				points: analysis.waveform,
				beats: analysis.beats,
				waveformDuration: analysis.waveform_duration ?? duration,
				duration,
				...view,
				position: onFrame ? position : undefined,
				width,
				height,
				pixelRatio: window.devicePixelRatio || 1,
				frameTime:
					animating && follow && foreground !== false ? frameTime : undefined,
			});
			if (position !== undefined) onFrame?.(view.start, view.end, position);
		},
	);
	useEffect(() => {
		const surface = surfaceRef.current;
		const canvas = canvasRef.current;
		const marker = markerRef.current;
		if (!surface || !canvas || !marker) return;
		const renderer = new WaveformRenderer(canvas, marker);
		rendererRef.current = renderer;
		let width = surface.clientWidth;
		let height = surface.clientHeight;
		const paint = (frameTime?: number, foreground?: boolean) =>
			draw(width, height, frameTime, foreground);
		redrawRef.current = paint;
		const observer = new ResizeObserver(() => {
			// Measure only on resize, not after the overview's style writes every frame.
			width = surface.clientWidth;
			height = surface.clientHeight;
			if (!animating) paint();
		});
		observer.observe(surface);
		const stopUpdates = animating ? startPlaybackUpdates(paint) : undefined;
		return () => {
			redrawRef.current = null;
			observer.disconnect();
			stopUpdates?.();
			renderer.dispose();
			rendererRef.current = null;
		};
	}, [animating]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: The Effect Event reads these inputs; static canvases redraw only when they change.
	useEffect(() => {
		if (!animating) redrawRef.current?.();
	}, [analysis, duration, start, end, animating, getPosition, follow, onFrame]);
	return (
		<div
			ref={surfaceRef}
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 overflow-hidden"
		>
			<canvas
				ref={canvasRef}
				tabIndex={-1}
				className="absolute left-0 top-0 h-full w-full"
			/>
			<div
				ref={markerRef}
				style={{ display: "none" }}
				className="absolute inset-y-0 left-0 w-0.5 bg-white"
			/>
		</div>
	);
}
