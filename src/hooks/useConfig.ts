import { useEffect, useState } from "react";
import type { Config } from "@/lib/tauri/core/types";
import { useTauri } from "@/lib/tauri/TauriProvider";

export function useConfig() {
	const tauri = useTauri();
	const [config, setConfig] = useState<Config | null>(null);

	useEffect(() => {
		tauri.getConfig().then(setConfig).catch(console.error);

		const unlisten = tauri.listen("config://update", (event) => {
			setConfig(event.payload);
		});

		return () => {
			unlisten.then((f) => f());
		};
	}, [tauri]);

	return { config };
}
