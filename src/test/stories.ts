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
