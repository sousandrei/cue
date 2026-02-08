import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/table")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/table"!</div>;
}
