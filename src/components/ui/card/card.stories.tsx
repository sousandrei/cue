import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./card";

const meta = {
	title: "UI/Card",
	component: Card,
	render: (args) => (
		<Card {...args} className="w-80">
			<CardHeader>
				<CardTitle>Your next set</CardTitle>
				<CardDescription>
					A quiet surface for the music that matters.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">
					Keep related content together, with one clear next action.
				</p>
			</CardContent>
			<CardFooter>
				<Button variant="outline">Open collection</Button>
			</CardFooter>
		</Card>
	),
} satisfies Meta<typeof Card>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
export const Active: StoryObj<typeof meta> = { args: { variant: "active" } };
export const Flat: StoryObj<typeof meta> = { args: { variant: "flat" } };
