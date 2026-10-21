import path from "node:path";
import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";
import { defineConfig, esmExternalRequirePlugin } from "vite";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [
		esmExternalRequirePlugin({
			external: [
				...builtinModules,
				...builtinModules.map((moduleName) => `node:${moduleName}`),
			],
		}),
	],
	define: {
		"process.env": "globalThis.process.env",
	},
	build: {
		outDir: path.resolve(currentDir, "../dist"),
		emptyOutDir: true,
		minify: true,
		rollupOptions: {
			input: {
				main: path.resolve(currentDir, "Main.js"),
				Lib: path.resolve(currentDir, "Lib.js"),
			},
			output: {
				format: "es",
				entryFileNames: "[name].mjs",
				chunkFileNames: "[name]-[hash].mjs",
			},
		},
		target: "node24",
	},
});
