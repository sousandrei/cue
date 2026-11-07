import { access, readdir } from "node:fs/promises";
import path from "node:path";

const missing = [];
let checked = 0;
async function exists(file) {
	try {
		await access(file);
		return true;
	} catch {
		return false;
	}
}
async function walk(directory) {
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const folder = path.join(directory, entry.name);
		await walk(folder);
		// Updater is a headless side-effect coordinator, not a rendered component.
		if (
			entry.name === "updater" ||
			!(await exists(path.join(folder, "index.ts")))
		)
			continue;
		checked++;
		if (!(await exists(path.join(folder, `${entry.name}.stories.tsx`))))
			missing.push(`${folder}: missing stories`);
		if (
			!(await exists(path.join(folder, `${entry.name}.test.ts`))) &&
			!(await exists(path.join(folder, `${entry.name}.test.tsx`)))
		)
			missing.push(`${folder}: missing colocated test`);
	}
}
await walk("src/components");
if (missing.length) {
	console.error(missing.join("\n"));
	process.exitCode = 1;
} else {
	console.log(
		`Verified stories and colocated tests for ${checked} component folders.`,
	);
}
