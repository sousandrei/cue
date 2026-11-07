import { Plus } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "../button";

export function DownloadButton({
	loading = false,
	children,
	...props
}: ComponentProps<typeof Button>) {
	return (
		<Button size="lg" loading={loading} {...props}>
			{!loading && <Plus aria-hidden="true" />}
			{children ?? (loading ? "Adding to queue…" : "Add to queue")}
		</Button>
	);
}
