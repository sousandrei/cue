/** One decoded track in memory. Seeks restart a buffer source without file IO or MP3 decoding. */
export class MemoryAudioPlayer {
	private context: AudioContext | null;
	private output: GainNode | null = null;
	private buffer: AudioBuffer | null = null;
	private voice: { source: AudioBufferSourceNode; gain: GainNode } | null =
		null;
	private offset = 0;
	private startedAt = 0;
	private active = false;
	private generation = 0;
	private playRequest = 0;
	private level = 0.8;
	onEnded?: () => void;

	constructor(context: AudioContext | null = null) {
		this.context = context;
	}
	get duration() {
		return this.buffer?.duration ?? 0;
	}
	get playing() {
		return this.active;
	}
	get position() {
		return Math.min(
			this.duration,
			this.offset +
				(this.active && this.voice && this.context
					? this.context.currentTime - this.startedAt
					: 0),
		);
	}
	private audioContext() {
		if (!this.context || this.context.state === "closed")
			this.context = new AudioContext({ latencyHint: "interactive" });
		if (!this.output) {
			this.output = this.context.createGain();
			this.output.gain.value = this.level;
			this.output.connect(this.context.destination);
		}
		return this.context;
	}
	async load(url: string, signal: AbortSignal) {
		this.reset();
		const generation = this.generation;
		const context = this.audioContext();
		const response = await fetch(url, { signal });
		if (!response.ok) throw new Error("Could not read the local audio file.");
		const bytes = await response.arrayBuffer();
		if (signal.aborted || generation !== this.generation) return;
		const decoded = await context.decodeAudioData(bytes);
		if (signal.aborted || generation !== this.generation) return;
		this.buffer = decoded;
	}
	async play() {
		if (!this.buffer) return;
		const context = this.audioContext();
		const request = ++this.playRequest;
		this.active = true;
		try {
			await context.resume();
		} catch (error) {
			if (request === this.playRequest) this.active = false;
			throw error;
		}
		if (request !== this.playRequest || !this.active || !this.buffer) return;
		if (this.offset >= this.duration) this.offset = 0;
		this.startVoice();
	}
	pause() {
		this.offset = this.position;
		this.active = false;
		this.playRequest++;
		this.retireVoice();
	}
	seek(position: number) {
		if (!this.buffer) return;
		this.offset = Math.max(0, Math.min(position, this.duration));
		if (this.active && this.voice) {
			this.retireVoice();
			if (this.offset < this.duration) this.startVoice();
			else {
				this.active = false;
				this.onEnded?.();
			}
		}
	}
	setVolume(volume: number) {
		this.level = Math.max(0, Math.min(1, volume));
		if (this.output && this.context)
			this.output.gain.setValueAtTime(this.level, this.context.currentTime);
	}
	reset() {
		this.generation++;
		this.pause();
		this.buffer = null;
		this.offset = 0;
	}
	dispose() {
		this.reset();
		this.output?.disconnect();
		this.output = null;
		if (this.context && this.context.state !== "closed")
			void this.context.close();
		this.context = null;
	}
	private startVoice() {
		const context = this.audioContext();
		const source = context.createBufferSource();
		const gain = context.createGain();
		source.buffer = this.buffer;
		source.connect(gain);
		gain.connect(this.output ?? context.destination);
		const now = context.currentTime;
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(1, now + 0.004);
		const voice = { source, gain };
		this.voice = voice;
		this.startedAt = now;
		source.onended = () => {
			source.disconnect();
			gain.disconnect();
			if (this.voice !== voice) return;
			this.voice = null;
			this.active = false;
			this.offset = this.duration;
			this.onEnded?.();
		};
		source.start(now, this.offset);
	}
	private retireVoice() {
		const voice = this.voice;
		this.voice = null;
		if (!voice || !this.context) return;
		const now = this.context.currentTime;
		voice.gain.gain.cancelScheduledValues(now);
		voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
		voice.gain.gain.linearRampToValueAtTime(0, now + 0.004);
		voice.source.stop(now + 0.004);
	}
}
