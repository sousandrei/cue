import { expect, rs, test } from "@rstest/core";
import { act, render } from "@testing-library/react";
import { exampleAnalysis } from "@/test/analysis";
import { WaveformCanvas } from "./waveform-canvas";

test("keeps one frame loop across clock updates and reads the latest view and callbacks", () => {
	const focus = rs.spyOn(document, "hasFocus").mockReturnValue(true);
	const frames = new Map<number, FrameRequestCallback>();
	let nextId = 0;
	const request = rs
		.spyOn(window, "requestAnimationFrame")
		.mockImplementation((callback) => {
			const id = ++nextId;
			frames.set(id, callback);
			return id;
		});
	const cancel = rs
		.spyOn(window, "cancelAnimationFrame")
		.mockImplementation((id) => {
			frames.delete(id);
		});
	const observe = rs
		.spyOn(ResizeObserver.prototype, "observe")
		.mockImplementation(() => {});
	const disconnect = rs.spyOn(ResizeObserver.prototype, "disconnect");
	let position = 12;
	const getPosition = () => position;
	const firstFrame = rs.fn();
	const nextFrame = rs.fn();
	const props = {
		analysis: exampleAnalysis,
		duration: 32,
		start: 8,
		end: 16,
		playing: true,
		getPosition,
		follow: true,
		onFrame: firstFrame,
	};
	const frame = () =>
		act(() => {
			const entry = frames.entries().next().value;
			if (!entry) throw new Error("Expected a pending animation frame");
			frames.delete(entry[0]);
			entry[1](performance.now());
		});
	try {
		const view = render(
			<div style={{ position: "relative", width: 1000, height: 80 }}>
				<WaveformCanvas {...props} />
			</div>,
		);
		frame();
		expect(firstFrame).toHaveBeenLastCalledWith(8, 16, 12);
		const requests = request.mock.calls.length;
		position = 20;
		view.rerender(
			<div style={{ position: "relative", width: 1000, height: 80 }}>
				<WaveformCanvas {...props} start={16} end={24} onFrame={nextFrame} />
			</div>,
		);
		expect(request.mock.calls.length).toBe(requests);
		expect(cancel).not.toHaveBeenCalled();
		expect(observe).toHaveBeenCalledTimes(1);
		frame();
		expect(nextFrame).toHaveBeenLastCalledWith(16, 24, 20);
		expect(frames.size).toBe(1);
		view.rerender(
			<div style={{ position: "relative", width: 1000, height: 80 }}>
				<WaveformCanvas
					{...props}
					playing={false}
					start={18}
					end={22}
					onFrame={nextFrame}
				/>
			</div>,
		);
		expect(frames.size).toBe(0);
		expect(nextFrame).toHaveBeenLastCalledWith(18, 22, 20);
		view.unmount();
		expect(disconnect).toHaveBeenCalledTimes(2);
	} finally {
		request.mockRestore();
		cancel.mockRestore();
		observe.mockRestore();
		disconnect.mockRestore();
		focus.mockRestore();
	}
});

test("the static overview skips unrelated renders and redraws on data changes", () => {
	const observe = rs
		.spyOn(ResizeObserver.prototype, "observe")
		.mockImplementation(() => {});
	const clear = rs.spyOn(CanvasRenderingContext2D.prototype, "clearRect");
	try {
		const props = {
			analysis: exampleAnalysis,
			duration: 32,
			start: 0,
			end: 32,
		};
		const view = render(
			<div style={{ position: "relative", width: 1000, height: 32 }}>
				<WaveformCanvas {...props} />
			</div>,
		);
		expect(clear).toHaveBeenCalledTimes(1);
		view.rerender(
			<div style={{ position: "relative", width: 1000, height: 32 }}>
				<WaveformCanvas {...props} />
			</div>,
		);
		expect(clear).toHaveBeenCalledTimes(1);
		view.rerender(
			<div style={{ position: "relative", width: 1000, height: 32 }}>
				<WaveformCanvas
					{...props}
					analysis={{ ...exampleAnalysis, beats: [] }}
				/>
			</div>,
		);
		expect(clear).toHaveBeenCalledTimes(2);
		view.unmount();
	} finally {
		observe.mockRestore();
		clear.mockRestore();
	}
});
