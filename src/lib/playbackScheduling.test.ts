import { afterEach, beforeEach, expect, rs, test } from "@rstest/core";
import { startPlaybackUpdates } from "./playbackScheduling";

const native = rs.hoisted(() => ({
	enabled: false,
	subscriptions: 0,
	unsubscriptions: 0,
	focusQueries: 0,
	delaySubscription: false,
	completeSubscription: undefined as (() => void) | undefined,
	handler: undefined as ((event: { payload: boolean }) => void) | undefined,
	resolveFocus: undefined as ((focused: boolean) => void) | undefined,
}));
rs.mock("@tauri-apps/api/core", () => ({ isTauri: () => native.enabled }));
rs.mock("@tauri-apps/api/window", () => ({
	getCurrentWindow: () => ({
		onFocusChanged(handler: (event: { payload: boolean }) => void) {
			native.subscriptions++;
			return new Promise<() => void>((resolve) => {
				const complete = () => {
					native.handler = handler;
					resolve(() => {
						native.unsubscriptions++;
					});
				};
				if (native.delaySubscription) native.completeSubscription = complete;
				else complete();
			});
		},
		isFocused: () => {
			native.focusQueries++;
			return new Promise<boolean>((resolve) => {
				native.resolveFocus = resolve;
			});
		},
	}),
}));
const stops: (() => void)[] = [];
beforeEach(() => {
	rs.useFakeTimers();
});
afterEach(() => {
	for (const stop of stops.splice(0)) stop();
	rs.useRealTimers();
	rs.restoreAllMocks();
	native.enabled = false;
	native.subscriptions = 0;
	native.unsubscriptions = 0;
	native.focusQueries = 0;
	native.delaySubscription = false;
	native.completeSubscription = undefined;
	native.handler = undefined;
	native.resolveFocus = undefined;
});
function clock() {
	const focus = rs.spyOn(document, "hasFocus").mockReturnValue(true);
	const visibility = rs
		.spyOn(document, "visibilityState", "get")
		.mockReturnValue("visible");
	const frames = new Map<number, FrameRequestCallback>();
	let id = 0;
	rs.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
		frames.set(++id, callback);
		return id;
	});
	rs.spyOn(window, "cancelAnimationFrame").mockImplementation((frame) => {
		frames.delete(frame);
	});
	return { frames, visibility, focus };
}

test("switches from display frames to 5Hz timers on blur and refreshes immediately on focus", () => {
	const { frames } = clock();
	const update = rs.fn();
	const stop = startPlaybackUpdates(update);
	stops.push(stop);
	expect(frames.size).toBe(1);
	window.dispatchEvent(new Event("blur"));
	expect(frames.size).toBe(0);
	const backgroundCalls = update.mock.calls.length;
	rs.advanceTimersByTime(1000);
	expect(update.mock.calls.length - backgroundCalls).toBe(5);
	window.dispatchEvent(new Event("focus"));
	expect(update.mock.calls.length).toBe(backgroundCalls + 6);
	expect(frames.size).toBe(1);
	const resumedCalls = update.mock.calls.length;
	rs.advanceTimersByTime(1000);
	expect(update.mock.calls.length).toBe(resumedCalls);
	stop();
	expect(frames.size).toBe(0);
	rs.advanceTimersByTime(1000);
	expect(update.mock.calls.length).toBe(resumedCalls);
});

test("hidden windows stay throttled even if focus events arrive", () => {
	const { frames, visibility } = clock();
	const update = rs.fn();
	stops.push(startPlaybackUpdates(update));
	visibility.mockReturnValue("hidden");
	document.dispatchEvent(new Event("visibilitychange"));
	window.dispatchEvent(new Event("focus"));
	expect(frames.size).toBe(0);
	const hiddenCalls = update.mock.calls.length;
	rs.advanceTimersByTime(1000);
	expect(update.mock.calls.length - hiddenCalls).toBe(5);
	visibility.mockReturnValue("visible");
	document.dispatchEvent(new Event("visibilitychange"));
	expect(frames.size).toBe(1);
});

test("React clock updates also fall from 10Hz to 5Hz without leaving a foreground timer", () => {
	clock();
	const update = rs.fn();
	stops.push(startPlaybackUpdates(update, 100));
	const initial = update.mock.calls.length;
	rs.advanceTimersByTime(1000);
	expect(update.mock.calls.length - initial).toBe(10);
	window.dispatchEvent(new Event("blur"));
	const blurred = update.mock.calls.length;
	rs.advanceTimersByTime(1000);
	expect(update.mock.calls.length - blurred).toBe(5);
	window.dispatchEvent(new Event("focus"));
	const focused = update.mock.calls.length;
	rs.advanceTimersByTime(1000);
	expect(update.mock.calls.length - focused).toBe(10);
});

test("shares native focus events and ignores a stale initial focus query", async () => {
	const { frames } = clock();
	native.enabled = true;
	const stopWaveform = startPlaybackUpdates(rs.fn());
	const stopClock = startPlaybackUpdates(rs.fn(), 100);
	stops.push(stopWaveform, stopClock);
	expect(native.subscriptions).toBe(1);
	await Promise.resolve();
	native.handler?.({ payload: false });
	expect(frames.size).toBe(0);
	native.resolveFocus?.(true);
	await Promise.resolve();
	expect(frames.size).toBe(0);
	native.handler?.({ payload: true });
	expect(frames.size).toBe(1);
	stopWaveform();
	expect(native.unsubscriptions).toBe(0);
	stopClock();
	expect(native.unsubscriptions).toBe(1);
});

test("a focus change during an update cannot create duplicate background timers", () => {
	const { frames } = clock();
	let calls = 0;
	stops.push(
		startPlaybackUpdates(() => {
			calls++;
			if (calls === 2) window.dispatchEvent(new Event("blur"));
		}),
	);
	const entry = frames.entries().next().value;
	if (!entry) throw new Error("Expected a foreground frame");
	frames.delete(entry[0]);
	entry[1](performance.now());
	expect(frames.size).toBe(0);
	const backgroundCalls = calls;
	rs.advanceTimersByTime(1000);
	expect(calls - backgroundCalls).toBe(5);
});

for (const focused of [true, false]) {
	test(`resamples focus after delayed native registration when focus becomes ${focused}`, async () => {
		const { frames, focus } = clock();
		focus.mockReturnValue(!focused);
		native.enabled = true;
		native.delaySubscription = true;
		const update = rs.fn();
		stops.push(startPlaybackUpdates(update));
		await Promise.resolve();
		expect(native.focusQueries).toBe(0);
		// This event arrives before the native listener exists.
		focus.mockReturnValue(focused);
		window.dispatchEvent(new Event(focused ? "focus" : "blur"));
		native.completeSubscription?.();
		await Promise.resolve();
		expect(native.focusQueries).toBe(1);
		native.resolveFocus?.(focused);
		await Promise.resolve();
		expect(frames.size).toBe(focused ? 1 : 0);
		const calls = update.mock.calls.length;
		rs.advanceTimersByTime(1000);
		expect(update.mock.calls.length - calls).toBe(focused ? 0 : 5);
	});
}

test("cleans up a late native subscription without querying focus after disposal", async () => {
	const { frames } = clock();
	native.enabled = true;
	native.delaySubscription = true;
	const update = rs.fn();
	const stop = startPlaybackUpdates(update);
	stops.push(stop);
	stop();
	native.completeSubscription?.();
	await Promise.resolve();
	expect(native.unsubscriptions).toBe(1);
	expect(native.focusQueries).toBe(0);
	expect(frames.size).toBe(0);
	const calls = update.mock.calls.length;
	rs.advanceTimersByTime(1000);
	expect(update.mock.calls.length).toBe(calls);
});
