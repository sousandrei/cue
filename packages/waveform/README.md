# @cue/waveform

Private, dependency-free browser renderer used by Cue's detailed waveform and
song overview. It uses Canvas 2D for painting and the standard Web Animations API
for compositor-driven scrolling. No WebKit flags, private APIs, or plugins.

## Ownership

`WaveformRenderer` owns the canvas backing stores, bounded raster cache, and
texture/playhead animations. The host owns the DOM, playback clock, scheduling,
focus detection, and accessible controls. There are no internal timers or event
listeners. In Cue, Base UI sliders provide keyboard and pointer interaction;
the visual canvas and marker are hidden from assistive technology.

Create one renderer for a canvas and a separate playhead element in a clipped,
positioned viewport. The host styles the canvas as full-height, full-width,
absolutely positioned at the top left, and the marker as a two-pixel-wide vertical
line at the left edge (initially hidden). The renderer owns their inline
`transform`, `will-change`, and canvas `width` styles, plus the marker's `display`.

```ts
import { WaveformRenderer, waveformWindow } from "@cue/waveform";

const renderer = new WaveformRenderer(canvas, marker);

function update(frameTime: number) {
	// Sample the audio clock for this document/rAF timestamp.
	const position = readPlaybackPosition(frameTime);
	renderer.render({
		points,
		beats,
		waveformDuration,
		duration,
		...waveformWindow(position, duration, visibleSeconds),
		position,
		frameTime,
		width,
		height,
		pixelRatio: window.devicePixelRatio,
	});
}

// When the host unmounts or replaces this renderer:
renderer.dispose();
```

All playback and beat times are seconds. `frameTime` is the document animation
timeline timestamp in milliseconds, as supplied by `requestAnimationFrame`.
Width and height are CSS pixels. Samples are uniformly spaced amplitude/RGB
tuples in `[0, 255]`; beat markers must be sorted by time. Treat both arrays as
immutable: replacing either reference invalidates the corresponding cache.

## Rendering policy

- **Foreground playback:** pass `position` and `frameTime`. The viewport follows
  playback, using `end - start` as its visible span. Linear transform animations
  move the prepainted texture and playhead independently of JavaScript callbacks.
  Audio-clock checks reuse these animations unless drift exceeds one 120 Hz
  frame, geometry changes, or the cache needs refilling.
- **Paused, background, or dragging a fixed viewport:** omit `frameTime`.
  Existing compositor animations are canceled and this call paints the supplied
  `start`/`end` window. Cue schedules background calls at 5 FPS and no calls while
  paused, except after a view/data change.
- **Overview:** omit `position` and `frameTime` for a static image without a
  playhead. Cue repaints only on data, geometry, or display-scale changes.
- **Fallback:** if Web Animations is unavailable, `render` paints the requested
  window through Canvas 2D. The host continues providing its usual frame updates.

The raster uses bins anchored to track time, preserving peak heights and colours
across fractional scrolling and cache boundaries. Each canvas is bounded by two
viewport widths plus a sampling border, independently of track length. Refills
start ahead of the visible edge. Animations stop at the edge of cached content if
JavaScript stalls rather than exposing blank space. Fractional CSS dimensions and
device pixel ratios are converted to exact backing-store scales.

Rendering without `frameTime` cancels animations and releases promotion hints.
`dispose()` additionally releases both canvas backing stores; it is idempotent. Do not render a disposed instance. Zero-sized or invalid frames clear
stale content and may be followed by a valid frame.

Compositor promotion and presentation cadence remain browser/system decisions.
Callback FPS does not measure compositor FPS. No 120 FPS guarantee is inferred
from browser tests; visible smoothness is checked in the native application.

## Tests

Run from the repository root:

```sh
bun run test:waveform
WAVEFORM_TEST_BROWSER=webkit bun run test:waveform
WAVEFORM_TEST_BROWSER=firefox bun run test:waveform
```

Install the matching Playwright browser engines first. The default Chromium run
is also included in `bun run test`. CI runs the package in all three engines.
Tests cover actual pixel stability and animation interpolation, clock drift,
seeks, zoom, cache refills, display scaling, track boundaries, fallback drawing,
empty waveforms, invalid geometry, and resource disposal. Cue's component tests
cover foreground/background switching, pause, React updates, keyboard seeking,
dragging, and accessibility with axe.
