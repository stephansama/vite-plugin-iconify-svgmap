import type { IconifyJSON } from "@iconify/types";
import type { Plugin, ResolvedConfig } from "vite";

import fs from "node:fs";

import pkg from "../package.json";
import {
	CONFIG_FILENAME,
	defaultConfig,
	LOADED_ICONS_FILENAME,
} from "./const.ts";
import { generateSprite, loadIcons } from "./util.ts";

import type { Options } from "./type.ts";

const PLUGIN_NAME = pkg.name;
const virtualModuleId = "virtual:iconify-svgmap";
const resolvedVirtualModuleId = "\0" + virtualModuleId;

const js = String.raw;

export async function getIcon(pack: string, name: string) {
	const current = fs.readFileSync(LOADED_ICONS_FILENAME, {
		encoding: "utf-8",
		flag: "as+",
	});

	const currentRepresentation = JSON.parse(current || "{}");
	const newPack = currentRepresentation[pack]?.includes(name)
		? currentRepresentation[pack]
		: [
				...new Set([
					...(currentRepresentation[pack]
						? currentRepresentation[pack]
						: []),
					name,
				]),
			];

	const newRepresentation = { ...currentRepresentation, [pack]: newPack };

	fs.writeFileSync(LOADED_ICONS_FILENAME, JSON.stringify(newRepresentation));
	return `/${pack}.svg#${name}`;
}

export default function createPlugin(options?: Options): Plugin {
	let config: ResolvedConfig;
	let inMemoryCollections: Record<string, IconifyJSON> = {};

	fs.writeFileSync(CONFIG_FILENAME, JSON.stringify(options));

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

		async load(id) {
			if (id !== resolvedVirtualModuleId) return;
			inMemoryCollections = await loadIcons(options || defaultConfig);

			return js`export default ${JSON.stringify(inMemoryCollections)};`;
		},

		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				for (const pack of Object.keys(inMemoryCollections)) {
					if (req.url === `/${pack}.svg`) {
						const loaded = JSON.parse(
							fs.readFileSync(LOADED_ICONS_FILENAME, {
								encoding: "utf8",
								flag: "as+",
							}) || "{}",
						);
						res.setHeader("Content-Type", "image/svg+xml");
						const sprite = generateSprite(
							inMemoryCollections[pack],
							loaded[pack] || [],
						);
						return res.end(sprite);
					}
				}

				return next();
			});
		},
	};
}
