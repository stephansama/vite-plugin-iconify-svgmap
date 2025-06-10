import { defineConfig } from "astro/config";
import { createIntegration } from "vite-plugin-iconify-svgmap";
import Inspect from "vite-plugin-inspect";

// https://astro.build/config
export default defineConfig({
	integrations: [
		createIntegration({
			iconifyRootDirectory: new URL("../ui/", import.meta.url),
			outDir: "dist",
		}),
	],
	vite: {
		plugins: [Inspect()],
	},
});
