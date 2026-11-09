export function formatTime(seconds: number) {
	const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

interface Beat {
	time: number;
	beat_number: number;
	bpm: number;
}

/** Move one bar while preserving the position within it, including variable-tempo grids. */
export function barSeekTarget(
	position: number,
	direction: -1 | 1,
	beats: readonly Beat[],
) {
	const downbeats = beats.filter((beat) => beat.beat_number === 1);
	if (downbeats.length < 2) {
		const beat = beatAt(beats, position);
		return position + direction * (beat && beat.bpm > 0 ? 240 / beat.bpm : 1);
	}
	let index = -1;
	for (let i = 0; i < downbeats.length && downbeats[i].time <= position; i++)
		index = i;
	index = Math.min(index, downbeats.length - 2);
	const timeAt = (bar: number) => {
		if (bar < 0)
			return downbeats[0].time + bar * (downbeats[1].time - downbeats[0].time);
		if (bar >= downbeats.length) {
			const last = downbeats.length - 1;
			return (
				downbeats[last].time +
				(bar - last) * (downbeats[last].time - downbeats[last - 1].time)
			);
		}
		return downbeats[bar].time;
	};
	const start = timeAt(index);
	const length = timeAt(index + 1) - start;
	if (length <= 0) return position + direction;
	const fraction = (position - start) / length;
	const target = index + direction;
	return timeAt(target) + fraction * (timeAt(target + 1) - timeAt(target));
}

export function waveformWindow(
	position: number,
	duration: number,
	span: number,
) {
	const length = Math.min(duration, span);
	const start = Math.max(0, Math.min(position - length / 2, duration - length));
	return { start, end: start + length };
}

export function beatAt(beats: readonly Beat[], position: number) {
	let current = beats[0];
	for (const beat of beats) {
		if (beat.time > position) break;
		current = beat;
	}
	return current;
}
