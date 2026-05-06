import { isTauri } from "@tauri-apps/api/core";
import { createContext, useContext, useMemo } from "react";
import { MockTauriService } from "./core/MockTauriService";
import { RealTauriService } from "./core/RealTauriService";
import type { TauriService } from "./core/types";

const TauriContext = createContext<TauriService | null>(null);

export function TauriProvider({
	children,
	service,
}: { children: React.ReactNode; service?: TauriService }) {
	const tauriService = useMemo(() => {
		if (service) return service;
		return isTauri() ? new RealTauriService() : new MockTauriService();
	}, [service]);

	return (
		<TauriContext.Provider value={tauriService as TauriService}>
			{children}
		</TauriContext.Provider>
	);
}

export function useTauri() {
	const context = useContext(TauriContext);
	if (!context) {
		throw new Error("useTauri must be used within a TauriProvider");
	}
	return context;
}
