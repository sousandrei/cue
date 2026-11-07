import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "../input";
import { Field, FieldDescription, FieldLabel } from "./field";

function Example() {
	return (
		<Field className="w-80">
			<FieldLabel>Library name</FieldLabel>
			<Input placeholder="My next set" />
			<FieldDescription>Choose a name that is easy to find.</FieldDescription>
		</Field>
	);
}
const meta = { title: "UI/Field", component: Example } satisfies Meta<
	typeof Example
>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
