import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FolderPickerProps {
	id: string;
	value: string;
	onChange: (value: string) => void;
	label?: string;
	placeholder?: string;
}

export function FolderPicker({
	id,
	value,
	onChange,
	label,
	placeholder = "Select a folder...",
}: FolderPickerProps) {
	const handlePick = async () => {
		try {
			const selected = await open({
				directory: true,
				multiple: false,
				defaultPath: value || undefined,
			});
			if (selected && typeof selected === "string") {
				onChange(selected);
			}
		} catch (error) {
			console.error("Failed to pick folder:", error);
		}
	};

	return (
		<div className="space-y-2">
			{label && (
				<label
					htmlFor={id}
					className="text-sm font-medium text-muted-foreground ml-1"
				>
					{label}
				</label>
			)}
			<div className="flex gap-2">
				<Input
					id={id}
					value={value}
					readOnly
					placeholder={placeholder}
					className="bg-background/50 border-border/50"
				/>
				<Button
					variant="outline"
					size="icon"
					onClick={handlePick}
					className="shrink-0 border-border/50 hover:bg-accent hover:border-primary transition-all"
				>
					<FolderOpen className="w-4 h-4" />
				</Button>
			</div>
		</div>
	);
}
