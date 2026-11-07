import { Toast } from "@base-ui/react/toast";
import { CheckCircle2, Info, Loader2, TriangleAlert, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button, buttonVariants } from "../button";

export const toastManager = Toast.createToastManager();

type ToastType = "success" | "error" | "warning" | "info" | "loading";
interface ToastOptions {
	id?: string;
	description?: ReactNode;
	duration?: number;
	action?: { label: string; onClick: () => void };
}
function notify(type: ToastType, title: ReactNode, options: ToastOptions = {}) {
	return toastManager.add({
		id: options.id,
		title,
		type,
		description: options.description,
		timeout:
			type === "loading" || options.duration === Infinity
				? 0
				: (options.duration ?? 5000),
		priority: type === "error" ? "high" : "low",
		actionProps: options.action
			? { children: options.action.label, onClick: options.action.onClick }
			: undefined,
	});
}
export const toast = {
	success: (title: ReactNode, options?: ToastOptions) =>
		notify("success", title, options),
	error: (title: ReactNode, options?: ToastOptions) =>
		notify("error", title, options),
	warning: (title: ReactNode, options?: ToastOptions) =>
		notify("warning", title, options),
	info: (title: ReactNode, options?: ToastOptions) =>
		notify("info", title, options),
	loading: (title: ReactNode, options?: ToastOptions) =>
		notify("loading", title, options),
	dismiss: (id?: string) => toastManager.close(id),
};

function ToastList() {
	const { toasts } = Toast.useToastManager();
	return toasts.map((notification) => {
		const Icon =
			notification.type === "loading"
				? Loader2
				: notification.type === "success"
					? CheckCircle2
					: notification.type === "error" || notification.type === "warning"
						? TriangleAlert
						: Info;
		return (
			<Toast.Root
				key={notification.id}
				toast={notification}
				className="relative rounded-xl bg-surface-raised p-4 text-foreground shadow-[0_8px_32px_-8px_#0009] outline-none transition-[opacity,transform] duration-250 data-starting-style:translate-x-8 data-starting-style:opacity-0 data-ending-style:translate-x-8 data-ending-style:opacity-0 data-limited:hidden"
			>
				<Toast.Content className="flex items-start gap-3">
					<Icon
						aria-hidden="true"
						className={`mt-0.5 size-4 shrink-0 ${notification.type === "loading" ? "animate-spin text-primary" : notification.type === "success" ? "text-accent-cool" : notification.type === "error" ? "text-destructive" : "text-primary"}`}
					/>
					<div className="min-w-0 flex-1 space-y-1 pr-5">
						<Toast.Title className="break-words text-sm font-semibold" />
						<Toast.Description className="whitespace-pre-line break-words text-xs leading-relaxed text-muted-foreground" />
						{notification.actionProps && (
							<Toast.Action
								className={buttonVariants({
									variant: "outline",
									size: "sm",
									className: "mt-2",
								})}
							/>
						)}
					</div>
					<Toast.Close
						aria-hidden={false}
						render={
							<Button
								size="icon"
								variant="ghost"
								aria-label="Dismiss notification"
							/>
						}
						className="absolute right-2 top-2 size-7"
					>
						<X aria-hidden="true" />
					</Toast.Close>
				</Toast.Content>
			</Toast.Root>
		);
	});
}

export function ToastProvider({ children }: { children: ReactNode }) {
	return (
		<Toast.Provider toastManager={toastManager} limit={3}>
			{children}
			<Toast.Portal>
				<Toast.Viewport className="fixed right-5 bottom-5 z-80 flex w-88 max-w-[calc(100vw-2.5rem)] flex-col gap-3 outline-none">
					<ToastList />
				</Toast.Viewport>
			</Toast.Portal>
		</Toast.Provider>
	);
}
