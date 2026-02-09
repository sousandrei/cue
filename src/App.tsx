import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
	async function greet() {
		const msg = await invoke("greet", { name });
		alert(msg);
	}

	return (
		<main className="bg-background text-foreground h-screen w-screen flex items-center justify-center">
			<button type="button" onClick={greet}>
				Greet
			</button>
		</main>
	);
}

export default App;
