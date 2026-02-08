import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Music, Rocket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FolderPicker } from "@/components/FolderPicker";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { initializeSetup } from "@/lib/tauri-commands";

export const Route = createFileRoute("/setup")({
	component: SetupWizard,
});

function SetupWizard() {
	const [path, setPath] = useState("");
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const handleFinishSetup = async () => {
		if (!path) return;
		setLoading(true);
		try {
			await initializeSetup(path);
			toast.success("Setup completed successfully!");
			navigate({ to: "/" });
		} catch (error) {
			console.error("Failed to initialize setup:", error);
			toast.error(`Setup failed: ${error}`);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-linear-to-tr from-primary/10 via-background to-purple-600/10 -z-10" />

			<Card className="max-w-md w-full border-primary/20 bg-card/50 backdrop-blur-xl shadow-2xl">
				<CardHeader className="text-center">
					<div className="mx-auto w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mb-4">
						<Rocket className="w-8 h-8 text-primary" />
					</div>
					<CardTitle className="text-2xl font-bold">
						Welcome to Synqed
					</CardTitle>
					<CardDescription>
						Let's get you set up. Choose where you want to store your music
						library.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<FolderPicker
						id="library-location"
						label="Library Location"
						value={path}
						onChange={setPath}
					/>

					<div className="space-y-4 pt-4 text-sm text-muted-foreground">
						<div className="flex items-start gap-3">
							<div className="mt-1 bg-primary/20 p-1 rounded-full">
								<Music className="w-3 h-3 text-primary" />
							</div>
							<p>
								A "Songs" folder and "songs.db" will be created in this
								directory.
							</p>
						</div>
					</div>

					<Button
						className="w-full h-12 text-lg font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
						disabled={!path || loading}
						onClick={handleFinishSetup}
					>
						{loading ? "Setting up..." : "Finish Setup"}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
