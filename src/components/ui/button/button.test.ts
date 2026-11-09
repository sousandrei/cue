import { page } from "@rstest/browser";
import { expect, test } from "@rstest/core";
import { composeStories } from "@storybook/react";
import axe from "axe-core";
import { testStories } from "@/test/stories";
import * as stories from "./button.stories";

testStories(stories);

test("destructive actions keep AA contrast while hovered on cards and raised surfaces", async () => {
	const { DestructiveSurfaces } = composeStories(stories);
	await DestructiveSurfaces.run();
	for (const name of ["Remove from card", "Remove from dialog"]) {
		// Native pointer movement is required to activate the CSS :hover state.
		await page.getByRole("button", { name }).hover();
		await new Promise<void>((resolve) =>
			requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
		);
		await Promise.allSettled(
			document.getAnimations().map((animation) => animation.finished),
		);
		const results = await axe.run(document.body, {
			runOnly: { type: "rule", values: ["color-contrast"] },
		});
		expect(
			results.violations.map(({ id, nodes }) => ({
				id,
				elements: nodes.map(({ target, failureSummary }) => ({
					target,
					failureSummary,
				})),
			})),
		).toEqual([]);
	}
});
