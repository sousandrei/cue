import { FolderOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useTauri } from "@/lib/tauri/TauriProvider";

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
	const tauri = useTauri();

	const handlePick = async () => {
		try {
			const selected = await tauri.open({
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
		<Field>
			{label && (
				<FieldLabel
					htmlFor={id}
					className="text-sm font-medium text-muted-foreground ml-1"
				>
					{label}
				</FieldLabel>
			)}
			<div className="flex gap-2">
				<Input id={id} value={value} readOnly placeholder={placeholder} />
				<Button
					variant="outline"
					size="icon"
					aria-label="Choose library folder"
					onClick={handlePick}
					className="shrink-0"
				>
					<FolderOpen className="w-4 h-4" />
				</Button>
			</div>
		</Field>
	);
}
