import type { Meta, StoryObj } from "@storybook/react";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "@/test/story";
import { FloatingDock } from "./navigation";

function Example() {
	const [router] = useState(() => {
		const root = createRootRoute({
			component: () => (
				<>
					<main className="p-8">
						<h1 className="text-xl font-semibold">Navigation preview</h1>
						<Outlet />
					</main>
					<FloatingDock />
				</>
			),
		});
		const children = ["/", "/library", "/config"].map((path) =>
			createRoute({
				getParentRoute: () => root,
				path,
				component: () => (
					<p className="mt-2 text-muted-foreground">
						Choose a destination below.
					</p>
				),
			}),
		);
		return createRouter({
			routeTree: root.addChildren(children),
			history: createMemoryHistory({ initialEntries: ["/"] }),
		});
	});
	return <RouterProvider router={router} />;
}
const meta = {
	title: "Layout/Navigation",
	component: Example,
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Example>;
export default meta;
export const Navigate: StoryObj<typeof meta> = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(
			await canvas.findByRole("link", { name: "Collection" }),
		);
		await waitFor(() =>
			expect(canvas.getByRole("link", { name: "Collection" })).toHaveAttribute(
				"aria-current",
				"page",
			),
		);
	},
};
