import {
	ArrowDownToLine,
	Check,
	Disc3,
	FolderOpen,
	Music2,
	Plus,
	SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { ToastProvider, toast } from "@/components/ui/toast";

export function Studio() {
	const [checked, setChecked] = useState(true);
	return (
		<ToastProvider>
			<div className="min-h-screen bg-background p-6 sm:p-10">
				<div className="mx-auto max-w-6xl">
					<header className="mb-9 flex flex-wrap items-center justify-between gap-5">
						<div className="flex items-center gap-4">
							<span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
								<Disc3 className="size-7" />
							</span>
							<div>
								<h1 className="text-2xl font-semibold tracking-tight">
									Component studio
								</h1>
								<p className="mt-1 text-sm text-muted-foreground">
									Cue's foundations. A little more rhythm, a lot more clarity.
								</p>
							</div>
						</div>
						<Badge variant="outline">Base UI · Tailwind · Rstest</Badge>
					</header>
					<div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
						<Card className="cue-enter">
							<CardHeader>
								<CardTitle>Make the next move.</CardTitle>
								<CardDescription>
									Clear actions, tactile feedback, room to breathe.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="flex flex-wrap gap-3">
									<Button
										onClick={() =>
											toast.success("Added to your queue", {
												description: "Your next track is on its way.",
											})
										}
									>
										<Plus />
										Add to queue
									</Button>
									<Button variant="outline">
										<FolderOpen />
										Open library
									</Button>
									<Button variant="ghost" disabled>
										Unavailable
									</Button>
								</div>
								<Field>
									<FieldLabel>Track or playlist link</FieldLabel>
									<Input placeholder="Paste a YouTube or SoundCloud link" />
									<FieldDescription>
										One track, or your whole next set.
									</FieldDescription>
								</Field>
								<div className="flex flex-wrap items-center gap-3">
									<Badge variant="accent-cool">
										<Check className="mr-1 size-3" />
										Ready
									</Badge>
									<Badge variant="accent-warm">In queue</Badge>
									<Badge variant="destructive">Needs attention</Badge>
									<Badge variant="outline">124 BPM</Badge>
								</div>
							</CardContent>
						</Card>
						<Card className="cue-enter [animation-delay:70ms]">
							<CardHeader>
								<CardTitle>Every stage, in sync.</CardTitle>
								<CardDescription>
									Progress that feels as alive as the music.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-5">
								<div className="flex items-center gap-3">
									<span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
										<Music2 className="size-5" />
									</span>
									<div className="min-w-0 flex-1">
										<p className="truncate font-medium">Midnight Signal</p>
										<p className="text-xs text-muted-foreground">
											Studio fixture · Sample track
										</p>
									</div>
									<span className="text-sm font-semibold tabular-nums text-primary">
										64%
									</span>
								</div>
								<Progress value={64} aria-label="Midnight Signal download" />
								<div className="flex items-center justify-between border-t border-border pt-5">
									<div>
										<label
											htmlFor="studio-updates"
											className="text-sm font-medium"
										>
											Keep things current
										</label>
										<p className="mt-1 text-xs text-muted-foreground">
											Automatic updates, on your terms.
										</p>
									</div>
									<Switch
										id="studio-updates"
										checked={checked}
										onCheckedChange={setChecked}
									/>
								</div>
							</CardContent>
						</Card>
						<Card className="cue-enter [animation-delay:140ms]">
							<CardHeader>
								<CardTitle>Good focus. No loose ends.</CardTitle>
								<CardDescription>
									Dialogs and notifications share the same visual language.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-wrap gap-3">
								<Dialog>
									<DialogTrigger render={<Button variant="outline" />}>
										Preview dialog
									</DialogTrigger>
									<DialogContent>
										<DialogTitle>A place for your music</DialogTitle>
										<DialogDescription>
											Keep every track together in your Cue library.
										</DialogDescription>
										<Field>
											<FieldLabel>Library name</FieldLabel>
											<Input defaultValue="My next set" />
										</Field>
										<DialogFooter>
											<DialogClose render={<Button variant="ghost" />}>
												Cancel
											</DialogClose>
											<DialogClose render={<Button />}>
												Save changes
											</DialogClose>
										</DialogFooter>
									</DialogContent>
								</Dialog>
								<Button
									variant="outline"
									onClick={() =>
										toast.success("Your library is ready", {
											description: "Everything is in the right place.",
										})
									}
								>
									Preview notification
								</Button>
								<Button variant="destructive">Remove track</Button>
							</CardContent>
						</Card>
						<Card className="cue-enter [animation-delay:210ms]">
							<CardHeader>
								<CardTitle>A familiar place to land.</CardTitle>
								<CardDescription>
									Charcoal layers. Lavender focus. A distinctly Cue rhythm.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex flex-wrap gap-2 rounded-xl bg-background p-2">
									<Button
										variant="ghost"
										className="flex-1 bg-primary-subtle text-primary"
									>
										<ArrowDownToLine />
										Intake
									</Button>
									<Button variant="ghost" className="flex-1">
										<Disc3 />
										Collection
									</Button>
									<Button variant="ghost" className="flex-1">
										<SlidersHorizontal />
										Options
									</Button>
								</div>
								<div className="mt-5 flex gap-2" aria-hidden="true">
									{[
										"bg-background",
										"bg-card",
										"bg-surface-raised",
										"bg-muted",
										"bg-primary",
										"bg-accent-cool",
										"bg-accent-warm",
										"bg-destructive",
									].map((color) => (
										<span
											key={color}
											className={`h-8 flex-1 rounded-md ${color}`}
										/>
									))}
								</div>
							</CardContent>
						</Card>
					</div>
					<p className="mt-7 text-xs text-muted-foreground">
						Interactive component preview. Track names are illustrative
						fixtures.
					</p>
				</div>
			</div>
		</ToastProvider>
	);
}
