import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const adapterType = process.env.ADAPTER || process.env.BUILD_TARGET || '';
const isGitHub = adapterType === 'gh' || adapterType === 'github';
const isStatic = isGitHub || adapterType === 'static' || adapterType === 'www';

let defaultOutDir = 'build/node';
if (isGitHub) {
	defaultOutDir = 'build/github';
} else if (isStatic) {
	defaultOutDir = 'build/www';
}

const outDir = process.env.BUILD_DIR || defaultOutDir;
const defaultBase = isGitHub ? '/polyglot-bible-reader' : '';
const basePath = process.env.BASE_PATH !== undefined ? process.env.BASE_PATH : defaultBase;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
	},
	onwarn: (warning, handler) => {
		// suppress warnings on `vite dev` and `vite build`; but even without this, things still work
		if (warning.code === "a11y-click-events-have-key-events") return;
		if (warning.code === "a11y-no-static-element-interactions") return;
		handler(warning);
  	},
	kit: {
		adapter: adapter({
			pages: outDir,
			assets: outDir,
			fallback: '404.html',
			precompress: false,
			strict: true
		}),
		paths: {
			base: basePath
		}
	}
};

export default config;
