import { Loader2, Plus, Upload } from "lucide-react";
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
		<div className="w-full max-w-xl mx-auto relative group">
			<div className="relative flex items-center">
				<Input
					type="text"
					placeholder="Paste link"
					className="h-16 pl-6 pr-32 text-lg bg-card/50 text-foreground border-transparent shadow-none rounded-2xl focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/20 transition-all placeholder:text-muted-foreground/50"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					onKeyDown={handleKeyDown}
					disabled={loading}
					autoFocus
				/>
				<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
					<Button
						size="icon"
						variant="ghost"
						className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
						onClick={onUpload}
						disabled={loading}
						title="Bulk Import"
					>
						<Upload className="h-5 w-5" />
						<span className="sr-only">Upload</span>
					</Button>
					<Button
						size="icon"
						className="h-12 w-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-none"
						onClick={onAdd}
						disabled={!url.trim() || loading}
					>
						{loading ? (
							<Loader2 className="h-6 w-6 animate-spin" />
						) : (
							<Plus className="h-6 w-6" />
						)}
						<span className="sr-only">Add</span>
					</Button>
				</div>
			</div>
		</div>
	);
}
