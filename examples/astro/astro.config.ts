import { defineConfig } from "astro/config";
import iconifySvgmap from "vite-plugin-iconify-svgmap";
import Inspect from "vite-plugin-inspect";

// https://astro.build/config
export default defineConfig({
	vite: {
		plugins: [
			Inspect(),
			iconifySvgmap({
				iconifyRootDirectory: new URL("../ui/", import.meta.url),
			}),
		],
	},
});
