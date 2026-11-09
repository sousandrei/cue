import { Slider } from "@base-ui/react/slider";
import { Loader2, Music2, Pause, Play, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AudioPlayerState } from "@/hooks/useAudioPlayer";

export function formatTime(seconds: number) {
	const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

interface PlayerProps extends AudioPlayerState {
	onToggle: () => void;
	onSeek: (position: number) => void;
	onVolumeChange: (volume: number) => void;
	onClose: () => void;
}

function PlayerSlider({
	label,
	value,
	max,
	step,
	disabled,
	valueText,
	onChange,
}: {
	label: string;
	value: number;
	max: number;
	step: number;
	disabled?: boolean;
	valueText: string;
	onChange: (value: number) => void;
}) {
	return (
		<Slider.Root
			value={value}
			min={0}
			max={max}
			step={step}
			disabled={disabled}
			onValueChange={onChange}
			className="min-w-0 flex-1 data-disabled:opacity-40"
		>
			<Slider.Control className="flex h-7 w-full touch-none items-center select-none cursor-pointer">
				<Slider.Track className="relative h-1.5 w-full rounded-full bg-muted">
					<Slider.Indicator className="rounded-full bg-primary" />
					<Slider.Thumb
						aria-label={label}
						aria-valuetext={valueText}
						className="size-3 rounded-full bg-primary shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-3 focus-visible:ring-offset-card"
					/>
				</Slider.Track>
			</Slider.Control>
		</Slider.Root>
	);
}

export function Player({
	song,
	playing,
	loading,
	position,
	duration,
	volume,
	error,
	onToggle,
	onSeek,
	onVolumeChange,
	onClose,
}: PlayerProps) {
	return (
		<section
			aria-label="Track player"
			className="shrink-0 rounded-xl border border-border bg-card px-4 py-3"
		>
			<div className="flex min-w-0 items-center gap-3">
				<Button
					size="icon"
					variant={song ? "default" : "outline"}
					disabled={!song}
					onClick={onToggle}
					aria-label={
						playing ? "Pause track" : error ? "Retry playback" : "Play track"
					}
				>
					{loading ? (
						<Loader2 className="animate-spin" aria-hidden="true" />
					) : playing ? (
						<Pause aria-hidden="true" />
					) : (
						<Play aria-hidden="true" />
					)}
				</Button>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium">
						{song?.title ?? "Listen to your collection"}
					</p>
					<p className="truncate text-xs text-muted-foreground">
						{song?.artist ?? "Load a track from the table, then press play."}
					</p>
				</div>
				<div className="flex w-20 items-center gap-2 sm:w-28">
					<Volume2
						className="size-4 shrink-0 text-muted-foreground"
						aria-hidden="true"
					/>
					<PlayerSlider
						label="Volume"
						value={volume}
						max={1}
						step={0.01}
						valueText={`${Math.round(volume * 100)}%`}
						onChange={onVolumeChange}
					/>
				</div>
				{song ? (
					<Button
						variant="ghost"
						size="icon"
						aria-label="Close player and stop playback"
						onClick={onClose}
					>
						<X aria-hidden="true" />
					</Button>
				) : (
					<Music2 className="size-4 text-muted-foreground" aria-hidden="true" />
				)}
			</div>
			<div className="mt-2 flex items-center gap-3">
				<span className="w-10 text-xs tabular-nums text-muted-foreground">
					{formatTime(position)}
				</span>
				<PlayerSlider
					label="Playback position"
					value={Math.min(position, duration || 0)}
					max={duration || 1}
					step={0.1}
					disabled={!song || !duration}
					valueText={`${formatTime(position)} of ${formatTime(duration)}`}
					onChange={onSeek}
				/>
				<span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
					{formatTime(duration)}
				</span>
			</div>
			{error && (
				<p role="alert" className="mt-1 text-xs text-destructive">
					{error}
				</p>
			)}
			{loading && (
				<p role="status" className="sr-only">
					Loading audio…
				</p>
			)}
		</section>
	);
}
