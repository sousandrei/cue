import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { type Config, getConfig } from "@/lib/tauri-commands";

export function useConfig() {
	const [config, setConfig] = useState<Config | null>(null);

	useEffect(() => {
		getConfig().then(setConfig).catch(console.error);

		const unlisten = listen<Config>("config://update", (event) => {
			setConfig(event.payload);
		});

		return () => {
			unlisten.then((f) => f());
		};
	}, []);

	return { config };
}
