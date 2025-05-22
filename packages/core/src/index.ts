import type { IconifyJSON } from "@iconify/types";
import type { Plugin, ResolvedConfig } from "vite";

import { loadCollectionFromFS } from "@iconify/utils/lib/loader/fs";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const PLUGIN_NAME = "vite-plugin-iconify-svgmap";
const virtualModuleId = "virtual:iconify-svgmap";
const resolvedVirtualModuleId = "\0" + virtualModuleId;

const js = String.raw;

export type Options = Partial<{
	iconifyRootDirectory: URL;
}>;

export default function createPlugin(options?: Options): Plugin {
	let config: ResolvedConfig;
	let collections: Record<string, IconifyJSON>;

	return {
		name: PLUGIN_NAME,
		configResolved(resolvedConfig) {
			config = resolvedConfig;
		},

		resolveId(id) {
			if (id === virtualModuleId) {
				return resolvedVirtualModuleId;
			}
		},

		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				// req.
			});
		},

		async load(id) {
			if (id !== resolvedVirtualModuleId) return;
			const text = await readFile(
				new URL("./package.json", options?.iconifyRootDirectory),
				{ encoding: "utf8" },
			);
			const { dependencies = {}, devDependencies = {} } =
				JSON.parse(text);
			const packages: string[] = [
				...Object.keys(dependencies),
				...Object.keys(devDependencies),
			];
			const collections = packages
				.filter((name) => name.startsWith("@iconify-json/"))
				.map((name) => name.replace("@iconify-json/", ""));

			const allIcons: [string, IconifyJSON | undefined][] =
				await Promise.all(
					collections.map(async (collection) => [
						collection,
						await loadCollectionFromFS(
							collection,
							true,
							"@iconify-json",
							options?.iconifyRootDirectory?.toString(),
						),
					]),
				);
			const obj = allIcons.reduce(
				(prev, [name, value]) => ({ ...prev, [name]: value }),
				{},
			);
			console.log(obj);

			return js`export default ${JSON.stringify(obj)};`;
		},
	};
}

export function collectionHash(collections: IconifyJSON[]) {
	const hash = createHash("sha256");

	for (const collection of collections) {
		hash.update(collection.prefix);
		hash.update(
			Object.keys(collection.icons)
				.concat(Object.keys(collection.aliases ?? {}))
				.sort()
				.join(","),
		);
	}

	return hash.digest("hex");
}

async function tryGetHash(path: URL): Promise<string | void> {
	try {
		const text = await readFile(path, { encoding: "utf-8" });
		return text.split("\n", 3)[1].replace("// ", "");
	} catch {
		console.error("unable to get hash");
	}
}
