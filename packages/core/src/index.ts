import type { IconifyJSON } from "@iconify/types";
import type { Plugin, ResolvedConfig } from "vite";

import { loadCollectionFromFS } from "@iconify/utils/lib/loader/fs";
import { iconToSVG } from "@iconify/utils/lib/svg/build";
import { iconToHTML } from "@iconify/utils/lib/svg/html";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PLUGIN_NAME = "vite-plugin-iconify-svgmap";
const virtualModuleId = "virtual:iconify-svgmap";
const resolvedVirtualModuleId = "\0" + virtualModuleId;

const js = String.raw;

export type Options = Partial<{
	iconifyRootDirectory: URL;
	outDir?: string;
}>;

const cacheFilename = path.resolve(
	"node_modules/.vite/deps/iconifysvgmap.json",
);

export async function getIcon(pack: string, name: string) {
	const current = fs.readFileSync(cacheFilename, {
		encoding: "utf-8",
		flag: "as+",
	});

	const currentRepresentation = JSON.parse(current || "{}");
	const newPack = currentRepresentation[pack]?.includes(name)
		? currentRepresentation[pack]
		: [
				...(currentRepresentation[pack]
					? currentRepresentation[pack]
					: []),
				name,
			];

	const newRepresentation = { ...currentRepresentation, [pack]: newPack };

	fs.writeFileSync(cacheFilename, JSON.stringify(newRepresentation));
	return `/${pack}.svg#${name}`;
}

export default function createPlugin(options?: Options): Plugin {
	let config: ResolvedConfig;
	let inMemoryCollections: Record<string, IconifyJSON> = {};

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
			const text = fs.readFileSync(
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

			inMemoryCollections = allIcons.reduce(
				(prev, [name, value]) => ({ ...prev, [name]: value }),
				{},
			);

			return js`export default {};`;
		},

		async buildEnd() {
			const usageRaw = fs.readFileSync(cacheFilename, {
				encoding: "utf-8",
				flag: "as+",
			});
			const usage = JSON.parse(usageRaw || "{}");

			for (const pack of Object.keys(usage)) {
				const usedIcons = usage[pack];
				const collection = inMemoryCollections[pack];
				if (!collection) continue;

				const source = generateSprite(collection, usedIcons || []);

				this.emitFile({
					type: "asset",
					fileName: `${pack}.svg`,
					source,
				});
			}
		},

		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				for (const pack of Object.keys(inMemoryCollections)) {
					console.log(pack);
					if (req.url === `/${pack}.svg`) {
						const loaded = JSON.parse(
							fs.readFileSync(cacheFilename, {
								encoding: "utf8",
								flag: "as+",
							}) || "{}",
						);
						res.setHeader("Content-Type", "image/svg+xml");
						const data = generateSprite(
							inMemoryCollections[pack],
							loaded[pack] || [],
						);
						return res.end(data);
					}
				}

				return next();
			});
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

function generateSprite(packIcons: IconifyJSON, loaded: string[]) {
	let str = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n`;
	for (const icon of loaded) {
		const data = packIcons.icons[icon];
		const svg = iconToSVG(data);
		const html = iconToHTML(svg.body, svg.attributes);
		str += html
			.replaceAll("svg", "symbol")
			.replace(/xmlns=\S+/, `id="${icon}"`)
			.replace(/width=\S+/, "")
			.replace(/height=\S+/, "");
	}
	str += `\n</svg>`;
	return str;
}

async function tryGetHash(path: URL): Promise<string | void> {
	try {
		const text = fs.readFileSync(path, { encoding: "utf-8" });
		return text.split("\n", 3)[1].replace("// ", "");
	} catch {
		console.error("unable to get hash");
	}
}
