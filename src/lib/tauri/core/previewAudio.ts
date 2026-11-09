// A quiet, short synthetic tone for browser previews, independent of remote media.
let url: string | undefined;
export function previewAudioUrl(): string {
	if (url) return url;
	const sampleRate = 8000;
	const samples = sampleRate * 8;
	const buffer = new ArrayBuffer(44 + samples * 2);
	const view = new DataView(buffer);
	const text = (offset: number, value: string) => {
		for (let index = 0; index < value.length; index++)
			view.setUint8(offset + index, value.charCodeAt(index));
	};
	text(0, "RIFF");
	view.setUint32(4, 36 + samples * 2, true);
	text(8, "WAVEfmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * 2, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	text(36, "data");
	view.setUint32(40, samples * 2, true);
	for (let index = 0; index < samples; index++) {
		const fade = Math.min(1, index / 400, (samples - index) / 400);
		view.setInt16(
			44 + index * 2,
			Math.sin((index * 2 * Math.PI * 220) / sampleRate) * 1200 * fade,
			true,
		);
	}
	url = URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
	return url;
}
