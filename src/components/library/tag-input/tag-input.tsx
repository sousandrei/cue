import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TagBadge } from "../tag-badge";

interface TagInputProps {
	tags: string[];
	onChange: (tags: string[]) => void;
	onBlur?: () => void;
	autoFocus?: boolean;
}

export function TagInput({ tags, onChange, onBlur, autoFocus }: TagInputProps) {
	const [inputValue, setInputValue] = useState("");
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLFieldSetElement>(null);

	const handleAddTag = () => {
		const trimmedValue = inputValue.trim();
		if (trimmedValue && !tags.includes(trimmedValue)) {
			onChange([...tags, trimmedValue]);
		}
		setInputValue("");
		setSelectedIndex(null);
	};

	const handleRemoveTag = (index: number) => {
		const newTags = [...tags];
		newTags.splice(index, 1);
		onChange(newTags);
		inputRef.current?.focus();

		// Adjust selection after removal
		if (selectedIndex !== null) {
			if (newTags.length === 0) {
				setSelectedIndex(null);
				inputRef.current?.focus();
			} else if (index <= selectedIndex) {
				setSelectedIndex(Math.max(0, selectedIndex - 1));
			}
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		// If we are typing in the input
		if (selectedIndex === null) {
			if (e.key === "Enter") {
				e.preventDefault();
				handleAddTag();
			} else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
				// Select the last tag when backspacing on empty input
				e.preventDefault();
				setSelectedIndex(tags.length - 1);
			} else if (
				e.key === "ArrowLeft" &&
				!inputValue &&
				tags.length > 0 &&
				inputRef.current?.selectionStart === 0
			) {
				// Move focus to tags if cursor is at the start
				e.preventDefault();
				setSelectedIndex(tags.length - 1);
			} else if (e.key === "Escape") {
				inputRef.current?.blur();
			}
			return;
		}

		// If a tag is selected
		if (e.key === "ArrowLeft") {
			e.preventDefault();
			setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
		} else if (e.key === "ArrowRight") {
			e.preventDefault();
			if (selectedIndex === tags.length - 1) {
				setSelectedIndex(null);
				inputRef.current?.focus();
			} else {
				setSelectedIndex((prev) => (prev !== null ? prev + 1 : null));
			}
		} else if (e.key === "Backspace" || e.key === "Delete") {
			e.preventDefault();
			const indexToRemove = selectedIndex;
			handleRemoveTag(indexToRemove);
		} else if (e.key === "Escape") {
			e.preventDefault();
			setSelectedIndex(null);
			inputRef.current?.focus();
		} else if (e.key.length === 1 || e.key === "Enter") {
			// Start typing or press enter -> jump back to input
			setSelectedIndex(null);
			inputRef.current?.focus();
		}
	};

	useEffect(() => {
		if (autoFocus) {
			inputRef.current?.focus();
		}
	}, [autoFocus]);

	return (
		<fieldset
			ref={containerRef}
			aria-label="Track tags"
			className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background p-1.5 focus-within:outline-2 focus-within:outline-ring focus-within:outline-offset-2"
			onBlur={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget)) onBlur?.();
			}}
		>
			{tags.map((tag, index) => (
				<span
					key={tag}
					className={cn(
						"outline-none rounded-full transition-all",
						selectedIndex === index
							? "ring-2 ring-primary ring-offset-1 ring-offset-background"
							: "",
					)}
				>
					<TagBadge tag={tag} onRemove={() => handleRemoveTag(index)} />
				</span>
			))}
			<Input
				ref={inputRef}
				type="text"
				aria-label="Add tag"
				value={inputValue}
				onChange={(e) => {
					setSelectedIndex(null);
					setInputValue(e.target.value);
				}}
				onKeyDown={handleKeyDown}
				placeholder={tags.length === 0 ? "Add tags..." : ""}
				className="h-7 min-w-20 flex-1 border-0 bg-transparent px-1 text-xs focus-visible:outline-none"
			/>
		</fieldset>
	);
}
