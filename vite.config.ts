import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit()
	],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
		__APP_REPO__: JSON.stringify(pkg.repository?.url || pkg.repository || 'https://github.com/cbop-dev/polyglot-bible-reader')
	}
});
