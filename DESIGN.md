# Cue UI

Cue is a music-library workstation for DJs. The primary theme is dark: charcoal,
slate-violet layers and clear lavender actions, inspired by the legibility and
tonal separation of Discord. Music and tasks remain the content; decoration must
not compete with track names, progress, or controls.

## Foundation

- Keep the library in `src/components/ui`. Import individual modules. Interactive
  primitives come from Base UI; cards and tables use semantic HTML where Base UI
  has no corresponding primitive. TanStack Table owns table state and rendering.
- Tailwind v4 maps semantic colors to the variables in `src/root.css`. Surfaces
  step from background to card to raised; violet means action or selection, mint
  means success, amber means attention, and rose means destructive or failed.
- Use Inter for controls and content. Use tabular numerals for progress and counts.
  Body and control labels stay readable; metadata is quieter without disappearing.
- Buttons are 36px high, compact actions 32px, primary intake actions 44px. Inputs
  are 40px. Controls have visible focus, names, and intentional disabled states.
- Containers use 12px corners, inputs/buttons 8px, and small tags use pill shapes.
  Cards group content, rather than wrapping every section in another card.

## Motion

Motion is part of Cue's character. Use a short tactile press for controls, a
spring-following active navigation marker, staged queue entries, and a smooth
scale/blur entrance for dialogs. Let a task's stages establish its rhythm. Avoid
unrelated perpetual pulsing and do not delay an action until animation finishes.

## Composition and testing

Stories live beside the component. Show default, disabled, busy, empty, long-text,
and error states where relevant. Name illustrative music data as fixtures.

`src/test/story.ts` supplies Storybook's instrumented interaction helpers in the
preview. Rstest aliases it to `tests/story-runtime.ts`, so the same CSF `play`
functions use Rstest assertions and spies in Chromium. `src/test/stories.ts` composes
the stories, runs the complete lifecycle, and checks WCAG A/AA with axe. Keep
application tests on this same runner; do not add a second test framework.

Run `bun run storybook`, `bun run test:storybook`, and `bun run storybook:build`.

Each component folder contains its implementation, public `index.ts`, CSF stories,
and a colocated `.test.ts` entry. Add `testStories(stories)` to that entry to run
all its examples through the shared harness. Rstest discovers these entries
automatically. A component-specific test can use the same runner alongside them.
