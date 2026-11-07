import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { Page } from "@/components/ui/page";

interface IntakeLayoutProps {
	input: ReactNode;
	queue: ReactNode;
	history: ReactNode;
}

export function IntakeLayout({ input, queue, history }: IntakeLayoutProps) {
	return (
		<Page maxWidth="sm" scrollMode="adaptive">
			<Header />
			<div className="flex flex-1 flex-col gap-6">
				<div className="shrink-0 space-y-6">
					{input}
					{queue}
				</div>
				{/* Bound history independently of its item count; let controls grow naturally. */}
				<div className="flex min-h-48 flex-1 flex-col [contain:size]">
					{history}
				</div>
			</div>
		</Page>
	);
}
