import { defineConfig } from "tsup";

export default defineConfig({
	dts: true,
	external: ["virtual:iconify-svgmap"],
	entry: ["src/cli.ts", "src/index.ts", "src/get.ts"],
	sourcemap: true,
	splitting: false,
	target: "esnext",
	format: ["esm", "cjs"],
	tsconfig: "tsconfig.json",
});
