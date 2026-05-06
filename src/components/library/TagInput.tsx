import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { TagBadge } from "./TagBadge";

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
	const containerRef = useRef<HTMLButtonElement>(null);

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

	// Close editing if user clicks outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				onBlur?.();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [onBlur]);

	useEffect(() => {
		if (autoFocus) {
			inputRef.current?.focus();
		}
	}, [autoFocus]);

	return (
		<button
			ref={containerRef}
			type="button"
			className="flex flex-wrap gap-1.5 p-1 items-center border border-input bg-background/50 rounded-md w-full focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary/20 transition-all cursor-text text-left min-h-[36px]"
			onClick={() => {
				if (selectedIndex === null) inputRef.current?.focus();
			}}
		>
			{tags.map((tag, index) => (
				<button
					key={tag}
					type="button"
					className={cn(
						"outline-none rounded-full transition-all",
						selectedIndex === index
							? "ring-2 ring-primary ring-offset-1 ring-offset-background"
							: "",
					)}
					onClick={(e) => {
						e.stopPropagation();
						setSelectedIndex(index);
					}}
					aria-label={`Select ${tag} tag`}
					aria-pressed={selectedIndex === index}
				>
					<TagBadge tag={tag} onRemove={() => handleRemoveTag(index)} />
				</button>
			))}
			<input
				ref={inputRef}
				type="text"
				value={inputValue}
				onChange={(e) => {
					setSelectedIndex(null);
					setInputValue(e.target.value);
				}}
				onKeyDown={handleKeyDown}
				placeholder={tags.length === 0 ? "Add tags..." : ""}
				className="flex-1 bg-transparent border-none outline-none text-xs min-w-[80px] placeholder:text-muted-foreground/50 h-7 px-1"
			/>
		</button>
	);
}
