#!/usr/bin/env node

import fs from "node:fs";
import { parseArgs } from "node:util";
import { CONFIG_FILENAME, defaultConfig, LOADED_ICONS_FILENAME } from "./const";
import { buildEnd, loadIcons } from "./util";

const {
	values: { config },
} = parseArgs({
	options: {
		config: {
			short: "c",
			type: "string",
			default: CONFIG_FILENAME,
		},
	},
});

const configFile = fs.readFileSync(config, { encoding: "utf8" });
const options = JSON.parse(configFile || "false") || defaultConfig;
const usage = JSON.parse(
	fs.readFileSync(LOADED_ICONS_FILENAME, { encoding: "utf8" }) || "{}",
);

loadIcons(options).then((data) => {
	buildEnd(data, usage, options);
	console.log(usage);
	console.log(configFile);
});
