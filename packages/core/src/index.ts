import type { IconifyJSON } from "@iconify/types";
import type { Plugin, ResolvedConfig } from "vite";

import fs from "node:fs";
import path from "node:path";

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

export default function createPlugin(options?: Options): Plugin {
	let config: ResolvedConfig;
	let inMemoryCollections: Record<string, IconifyJSON> = {};

	fs.writeFileSync(path.resolve(CONFIG_FILENAME), JSON.stringify(options));

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
							fs.readFileSync(
								path.resolve(LOADED_ICONS_FILENAME),
								{
									encoding: "utf8",
									flag: "as+",
								},
							) || "{}",
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
