import { Slider } from "@base-ui/react/slider";
import { Minus, Plus } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { barSeekTarget, beatAt, formatTime, waveformWindow } from "@/lib/audio";
import type { TrackAnalysis } from "@/lib/tauri/core/types";
import { WaveformCanvas } from "./waveform-canvas";

interface WaveformProps {
	analysis: TrackAnalysis;
	position: number;
	duration: number;
	onSeek: (position: number) => void;
	playing?: boolean;
	getPosition?: (frameTime?: number) => number;
}
const zoomBars = [2, 4, 8, 16, 32];

export function Waveform({
	analysis,
	position,
	duration,
	onSeek,
	playing,
	getPosition,
}: WaveformProps) {
	const [bars, setBars] = useState(8);
	const [frozenStart, setFrozenStart] = useState<number | null>(null);
	const [hoverTime, setHoverTime] = useState<number | null>(null);
	const viewportRef = useRef<HTMLDivElement>(null);
	const overviewDrag = useRef<{
		x: number;
		position: number;
		width: number;
		left: number;
		moved: boolean;
	} | null>(null);
	const overviewPlayheadRef = useRef<HTMLDivElement>(null);
	const beat = beatAt(analysis.beats, position);
	const span = Math.min(
		duration || 1,
		bars * (beat && beat.bpm > 0 ? 240 / beat.bpm : 2),
	);
	const pinnedStart = frozenStart;
	const view =
		pinnedStart === null
			? waveformWindow(position, duration, span)
			: {
					start: Math.max(0, Math.min(pinnedStart, duration - span)),
					end: Math.max(0, Math.min(pinnedStart, duration - span)) + span,
				};

	const onFrame = useCallback(
		(start: number, end: number, time: number) => {
			if (!duration) return;
			if (viewportRef.current) {
				viewportRef.current.style.left = `${(start / duration) * 100}%`;
				viewportRef.current.style.width = `${((end - start) / duration) * 100}%`;
			}
			if (overviewPlayheadRef.current)
				overviewPlayheadRef.current.style.left = `${(time / duration) * 100}%`;
		},
		[duration],
	);
	const onArrowKey = (event: React.KeyboardEvent) => {
		if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
			return;
		event.preventDefault();
		event.stopPropagation();
		onSeek(
			barSeekTarget(
				getPosition?.() ?? position,
				event.key === "ArrowLeft" ? -1 : 1,
				analysis.beats,
			),
		);
	};
	const total = duration || 1;
	return (
		<div className="mt-3 select-none" data-waveform="">
			<div className="mb-1 flex flex-wrap items-center justify-end gap-1 text-[10px] text-muted-foreground">
				<div className="flex items-center gap-2">
					<span className="tabular-nums">
						{hoverTime === null
							? `${formatTime(view.start)} – ${formatTime(view.end)}`
							: formatTime(hoverTime)}
					</span>
					<Button
						size="icon"
						variant="ghost"
						className="size-6"
						aria-label="Zoom out waveform"
						disabled={bars === 32}
						onClick={() => {
							setFrozenStart(null);
							setBars(
								zoomBars[
									Math.min(zoomBars.indexOf(bars) + 1, zoomBars.length - 1)
								],
							);
						}}
					>
						<Minus aria-hidden="true" />
					</Button>
					<span className="w-10 text-center tabular-nums" role="status">
						{bars} bars
					</span>
					<Button
						size="icon"
						variant="ghost"
						className="size-6"
						aria-label="Zoom in waveform"
						disabled={bars === 2}
						onClick={() => {
							setFrozenStart(null);
							setBars(zoomBars[Math.max(zoomBars.indexOf(bars) - 1, 0)]);
						}}
					>
						<Plus aria-hidden="true" />
					</Button>
				</div>
			</div>
			<Slider.Root
				value={Math.max(view.start, Math.min(position, view.end))}
				min={view.start}
				max={Math.max(view.start + 0.001, view.end)}
				step={0.01}
				disabled={!duration}
				onValueChange={onSeek}
				onKeyDownCapture={onArrowKey}
				onValueCommitted={() => setFrozenStart(null)}
			>
				<Slider.Control
					className="relative flex h-20 touch-none cursor-pointer items-center select-none data-dragging:cursor-grabbing"
					onPointerDownCapture={() => setFrozenStart(view.start)}
					onPointerUpCapture={() => setFrozenStart(null)}
					onPointerCancel={() => setFrozenStart(null)}
					onPointerMove={(event) => {
						const rect = event.currentTarget.getBoundingClientRect();
						setHoverTime(
							view.start +
								Math.max(
									0,
									Math.min(1, (event.clientX - rect.left) / rect.width),
								) *
									span,
						);
					}}
					onPointerLeave={() => setHoverTime(null)}
				>
					<Slider.Track className="relative h-full w-full overflow-hidden rounded-md bg-background/50">
						<WaveformCanvas
							analysis={analysis}
							duration={duration}
							start={view.start}
							end={view.end}
							playing={playing}
							getPosition={getPosition}
							follow={frozenStart === null}
							onFrame={onFrame}
						/>
						<Slider.Thumb
							aria-label="Playback position"
							aria-valuetext={`${formatTime(position)} of ${formatTime(duration)}`}
							className={`h-full w-0.5 outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${(playing && getPosition) || position < view.start || position > view.end ? "bg-transparent" : "bg-white"}`}
						/>
					</Slider.Track>
				</Slider.Control>
			</Slider.Root>

			<Slider.Root
				value={Math.min(position, duration || 0)}
				min={0}
				max={total}
				step={0.1}
				disabled={!duration}
				onValueChange={onSeek}
				onKeyDownCapture={onArrowKey}
			>
				<Slider.Control
					data-testid="waveform-overview-control"
					className="relative mt-2 flex h-8 touch-none cursor-pointer items-center select-none active:cursor-grabbing"
					onPointerDownCapture={(event) => {
						if (event.button !== 0) return;
						event.preventDefault();
						event.stopPropagation();
						const rect = event.currentTarget.getBoundingClientRect();
						overviewDrag.current = {
							x: event.clientX,
							position: getPosition?.() ?? position,
							width: rect.width || 1,
							left: rect.left,
							moved: false,
						};
						event.currentTarget.setPointerCapture(event.pointerId);
					}}
					onPointerMoveCapture={(event) => {
						const drag = overviewDrag.current;
						if (!drag) return;
						event.stopPropagation();
						if (Math.abs(event.clientX - drag.x) >= 4) drag.moved = true;
						if (drag.moved)
							onSeek(
								Math.max(
									0,
									Math.min(
										duration,
										drag.position +
											((event.clientX - drag.x) / drag.width) * duration,
									),
								),
							);
					}}
					onPointerUpCapture={(event) => {
						const drag = overviewDrag.current;
						if (!drag) return;
						event.stopPropagation();
						overviewDrag.current = null;
						if (!drag.moved) {
							const time = Math.max(
								0,
								Math.min(
									duration,
									((event.clientX - drag.left) / drag.width) * duration,
								),
							);
							onSeek(time);
						}
						event.currentTarget.releasePointerCapture(event.pointerId);
					}}
					onPointerCancelCapture={() => {
						overviewDrag.current = null;
					}}
				>
					<Slider.Track className="relative h-full w-full overflow-hidden rounded-md bg-background/50">
						<WaveformCanvas
							analysis={analysis}
							duration={duration}
							start={0}
							end={duration}
						/>
						<div
							ref={viewportRef}
							data-testid="waveform-viewport"
							aria-hidden="true"
							className="absolute inset-y-0 z-10 cursor-grab border border-primary/80 bg-primary/15 active:cursor-grabbing"
							style={{
								left: `${(view.start / total) * 100}%`,
								width: `${((view.end - view.start) / total) * 100}%`,
							}}
						/>
						<div
							ref={overviewPlayheadRef}
							aria-hidden="true"
							className="pointer-events-none absolute inset-y-0 w-px bg-white"
							style={{ left: `${(position / total) * 100}%` }}
						/>
						<Slider.Thumb
							aria-label="Song overview"
							aria-valuetext={`${formatTime(position)} of ${formatTime(duration)}`}
							className="h-full w-0.5 bg-transparent outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
						/>
					</Slider.Track>
				</Slider.Control>
			</Slider.Root>
		</div>
	);
}
