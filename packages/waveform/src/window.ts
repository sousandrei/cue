export function waveformWindow(
	position: number,
	duration: number,
	span: number,
) {
	const length = Math.min(duration, span);
	const start = Math.max(0, Math.min(position - length / 2, duration - length));
	return { start, end: start + length };
}
