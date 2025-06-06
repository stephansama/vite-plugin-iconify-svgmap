import path from "node:path";

import type { Options } from "./type";

const FILE_PREFIX = "node_modules/";

export const CONFIG_FILENAME = path.resolve(
	FILE_PREFIX + "iconifysvgmap.config.json",
);

export const LOADED_ICONS_FILENAME = path.resolve(
	FILE_PREFIX + "iconifysvgmap.json",
);

export const defaultConfig: Options = {
	outDir: "public",
};
