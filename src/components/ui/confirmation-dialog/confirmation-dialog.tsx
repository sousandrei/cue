import { AlertDialog } from "@base-ui/react/alert-dialog";
import { useRef } from "react";
import { Button } from "../button";

interface ConfirmationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	confirmLabel: string;
	onConfirm: () => void;
	busy?: boolean;
}

export function ConfirmationDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel,
	onConfirm,
	busy = false,
}: ConfirmationDialogProps) {
	const cancelRef = useRef<HTMLButtonElement>(null);
	return (
		<AlertDialog.Root
			open={open}
			onOpenChange={(next) => {
				if (!busy) onOpenChange(next);
			}}
		>
			<AlertDialog.Portal>
				<AlertDialog.Backdrop className="fixed inset-0 z-60 bg-black/65 backdrop-blur-sm transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0" />
				<AlertDialog.Popup
					initialFocus={cancelRef}
					className="fixed top-1/2 left-1/2 z-70 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-5 rounded-2xl bg-surface-raised p-6 text-foreground shadow-[0_24px_80px_-16px_#0009] outline-none transition-[opacity,scale] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0"
				>
					<AlertDialog.Title className="text-xl font-semibold tracking-tight">
						{title}
					</AlertDialog.Title>
					<AlertDialog.Description className="text-sm leading-relaxed text-muted-foreground">
						{description}
					</AlertDialog.Description>
					<div className="flex flex-wrap justify-end gap-2 pt-2">
						<AlertDialog.Close
							render={
								<Button ref={cancelRef} variant="outline" disabled={busy} />
							}
						>
							Cancel
						</AlertDialog.Close>
						<Button variant="destructive" onClick={onConfirm} loading={busy}>
							{confirmLabel}
						</Button>
					</div>
				</AlertDialog.Popup>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
}
