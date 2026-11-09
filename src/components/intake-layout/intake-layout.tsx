import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { Page } from "@/components/ui/page";
import { cn } from "@/lib/utils";

interface IntakeLayoutProps {
	input: ReactNode;
	queue: ReactNode;
	history: ReactNode;
	historyEmpty?: boolean;
}

export function IntakeLayout({
	input,
	queue,
	history,
	historyEmpty = false,
}: IntakeLayoutProps) {
	return (
		<Page maxWidth="sm" scrollMode="adaptive">
			<Header />
			<div className="flex flex-1 flex-col gap-6">
				<div className="shrink-0 space-y-6">
					{input}
					{queue}
				</div>
				{/* Empty history stays compact; populated history scrolls independently. */}
				<div
					className={cn(
						"flex flex-col",
						historyEmpty ? "shrink-0" : "min-h-48 flex-1 [contain:size]",
					)}
				>
					{history}
				</div>
			</div>
		</Page>
	);
}
