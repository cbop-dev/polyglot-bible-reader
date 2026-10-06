import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

function acceptRangesPlugin(): Plugin {
	return {
		name: 'accept-ranges-plugin',
		configureServer(server) {
			server.middlewares.use((_req, res, next) => {
				res.setHeader('Accept-Ranges', 'bytes');
				next();
			});
		},
		configurePreviewServer(server) {
			server.middlewares.use((_req, res, next) => {
				res.setHeader('Accept-Ranges', 'bytes');
				next();
			});
		}
	};
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		acceptRangesPlugin()
	],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
		__APP_REPO__: JSON.stringify(pkg.repository?.url || pkg.repository || 'https://github.com/cbop-dev/polyglot-bible-reader')
	}
});
