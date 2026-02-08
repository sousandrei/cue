import { ArrowRight, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DownloadInputProps {
	url: string;
	setUrl: (url: string) => void;
	onAdd: () => void;
	onUpload: () => void;
	loading: boolean;
}

export function DownloadInput({
	url,
	setUrl,
	onAdd,
	onUpload,
	loading,
}: DownloadInputProps) {
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			onAdd();
		}
	};

	return (
		<div className="flex gap-2 items-center">
			<div className="relative group flex-1">
				<div className="absolute -inset-0.5 bg-linear-to-r from-primary/50 to-purple-600/50 rounded-full blur opacity-30"></div>
				<div className="relative flex items-center">
					<Input
						type="text"
						placeholder="https://youtube.com/watch?v=..."
						className="h-14 pl-6 pr-14 text-lg bg-background/95 backdrop-blur-xl border-muted-foreground/20 shadow-xl rounded-full focus-visible:ring-0 focus-visible:border-primary transition-all"
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={loading}
						autoFocus
					/>
					<Button
						size="icon"
						className="absolute right-2 h-10 w-10 rounded-full transition-transform hover:scale-105 active:scale-95"
						onClick={onAdd}
						disabled={!url.trim() || loading}
					>
						{loading ? (
							<Loader2 className="h-5 w-5 animate-spin" />
						) : (
							<ArrowRight className="h-5 w-5" />
						)}
					</Button>
				</div>
			</div>
			<Button
				variant="outline"
				size="icon"
				className="h-14 w-14 rounded-full border-muted-foreground/20 bg-background/95 backdrop-blur-xl shadow-xl hover:bg-accent hover:border-primary transition-all shrink-0"
				onClick={onUpload}
				disabled={loading}
				title="Bulk Import (txt)"
			>
				<Upload className="h-6 w-6" />
			</Button>
		</div>
	);
}
