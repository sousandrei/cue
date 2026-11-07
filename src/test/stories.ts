import { describe, expect, test } from "@rstest/core";
import { composeStories } from "@storybook/react";
import axe from "axe-core";

/** Run every CSF export through Storybook's render + play lifecycle, then axe. */
export function testStories(module: Parameters<typeof composeStories>[0]) {
	const stories = composeStories(module) as Record<
		string,
		{ run: () => Promise<void> }
	>;
	describe(module.default.title ?? "Stories", () => {
		for (const [name, story] of Object.entries(stories)) {
			test(name, async () => {
				await story.run();
				// Check the settled UI rather than sampling text halfway through an entrance.
				await new Promise<void>((resolve) =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				);
				await Promise.allSettled(
					document
						.getAnimations()
						.filter(
							(animation) =>
								animation.effect?.getComputedTiming().iterations !== Infinity,
						)
						.map((animation) => animation.finished),
				);
				const results = await axe.run(document.body, {
					runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
				});
				expect(
					results.violations.map(({ id, nodes }) => ({
						id,
						elements: nodes.map((n) => n.target),
					})),
				).toEqual([]);
			});
		}
	});
}
