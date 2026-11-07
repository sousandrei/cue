import type { Meta, StoryObj } from "@storybook/react";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./table";

function Example() {
	return (
		<Table>
			<TableCaption>Sample track metadata</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead>Track</TableHead>
					<TableHead>Artist</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<TableRow>
					<TableCell>Midnight Signal</TableCell>
					<TableCell>Studio fixture</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	);
}
const meta = { title: "UI/Table", component: Example } satisfies Meta<
	typeof Example
>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
