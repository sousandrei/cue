import { expect, rs, test } from "@rstest/core";
import { fireEvent, render, within } from "@testing-library/react";
import { exampleAnalysis } from "@/test/analysis";
import { testStories } from "@/test/stories";
import { Waveform } from "./waveform";
import * as stories from "./waveform.stories";

testStories(stories);
test("supports keyboard seeking without starting playback", () => {
	const seek = rs.fn();
	const { container } = render(
		<Waveform
			analysis={exampleAnalysis}
			position={8}
			duration={32}
			onSeek={seek}
		/>,
	);
	fireEvent.keyDown(
		within(container).getByRole("slider", { name: "Playback position" }),
		{
			key: "ArrowRight",
		},
	);
	expect(seek).toHaveBeenCalled();
	expect(seek.mock.calls[0][0]).toBeCloseTo(10);
});

test("zooms the detail view while keeping the whole song in the overview", () => {
	const seek = rs.fn();
	const { container } = render(
		<Waveform
			analysis={exampleAnalysis}
			position={8}
			duration={32}
			onSeek={seek}
		/>,
	);
	const ui = within(container);
	const detail = ui.getByRole("slider", { name: "Playback position" });
	const overview = ui.getByRole("slider", { name: "Song overview" });
	expect(detail.getAttribute("max")).toBe("16");
	expect(overview.getAttribute("max")).toBe("32");
	fireEvent.click(ui.getByRole("button", { name: "Zoom in waveform" }));
	expect(detail.getAttribute("min")).toBe("4");
	expect(detail.getAttribute("max")).toBe("12");
	expect(overview.getAttribute("max")).toBe("32");
	fireEvent.keyDown(overview, { key: "ArrowLeft" });
	expect(seek.mock.calls[0][0]).toBe(6);
});

test("overview dragging and clicking both seek while paused", () => {
	const seek = rs.fn();
	const { container } = render(
		<Waveform
			analysis={exampleAnalysis}
			position={8}
			duration={32}
			onSeek={seek}
		/>,
	);
	const ui = within(container);
	const viewport = ui.getByTestId("waveform-overview-control");
	const capture = rs
		.spyOn(viewport, "setPointerCapture")
		.mockImplementation(() => {});
	const release = rs
		.spyOn(viewport, "releasePointerCapture")
		.mockImplementation(() => {});
	try {
		const left = viewport.getBoundingClientRect().left ?? 0;
		fireEvent.pointerDown(viewport, {
			clientX: left + 100,
			pointerId: 1,
			button: 0,
		});
		fireEvent.pointerMove(viewport, { clientX: left + 200, pointerId: 1 });
		fireEvent.pointerUp(viewport, { clientX: left + 200, pointerId: 1 });
		expect(seek).toHaveBeenCalledTimes(1);
		fireEvent.pointerDown(viewport, {
			clientX: left + 200,
			pointerId: 2,
			button: 0,
		});
		fireEvent.pointerUp(viewport, {
			clientX: left + 200,
			pointerId: 2,
			button: 0,
		});
		expect(seek).toHaveBeenCalledTimes(2);
	} finally {
		capture.mockRestore();
		release.mockRestore();
	}
});

test("overview clicks and drags also seek during playback", () => {
	const seek = rs.fn();
	const { container } = render(
		<Waveform
			analysis={exampleAnalysis}
			position={8}
			duration={32}
			playing
			onSeek={seek}
		/>,
	);
	const ui = within(container);
	const control = ui.getByTestId("waveform-overview-control");
	const capture = rs
		.spyOn(control, "setPointerCapture")
		.mockImplementation(() => {});
	const release = rs
		.spyOn(control, "releasePointerCapture")
		.mockImplementation(() => {});
	try {
		const left = control.getBoundingClientRect().left;
		fireEvent.pointerDown(control, {
			clientX: left + 500,
			pointerId: 1,
			button: 0,
		});
		fireEvent.pointerUp(control, {
			clientX: left + 500,
			pointerId: 1,
			button: 0,
		});
		expect(seek).toHaveBeenCalledTimes(1);
		fireEvent.pointerDown(control, {
			clientX: left + 500,
			pointerId: 2,
			button: 0,
		});
		fireEvent.pointerMove(control, { clientX: left + 400, pointerId: 2 });
		fireEvent.pointerUp(control, {
			clientX: left + 400,
			pointerId: 2,
			button: 0,
		});
		expect(seek).toHaveBeenCalledTimes(2);
	} finally {
		capture.mockRestore();
		release.mockRestore();
	}
});
