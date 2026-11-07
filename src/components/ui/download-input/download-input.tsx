import { Upload } from "lucide-react";
import { Button } from "../button";
import { DownloadButton } from "../download-button";
import { Field, FieldDescription, FieldLabel } from "../field";
import { Input } from "../input";

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
	return (
		<form
			className="rounded-xl border border-border bg-card p-5 sm:p-6"
			onSubmit={(event) => {
				event.preventDefault();
				if (url.trim() && !loading) onAdd();
			}}
			aria-label="Add music"
		>
			<Field>
				<FieldLabel>Track or playlist link</FieldLabel>
				<Input
					inputMode="url"
					placeholder="Paste a YouTube or SoundCloud link"
					className="h-12"
					value={url}
					onChange={(event) => setUrl(event.target.value)}
					disabled={loading}
				/>
				<FieldDescription>
					Add a track, or import a text file of links.
				</FieldDescription>
			</Field>
			<div className="mt-5 flex flex-wrap items-center justify-between gap-3">
				<Button variant="ghost" onClick={onUpload} disabled={loading}>
					<Upload aria-hidden="true" />
					Import links
				</Button>
				<DownloadButton
					type="submit"
					loading={loading}
					disabled={!url.trim()}
				/>
			</div>
		</form>
	);
}
