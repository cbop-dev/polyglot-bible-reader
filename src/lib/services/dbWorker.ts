export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v.?';
import { resolve } from '$app/paths';
import { getBaseurl } from '$lib/utils/ui-utils';
import type { WorkerHttpvfs } from 'sql.js-httpvfs';
import type { SplitFileConfig } from 'sql.js-httpvfs/dist/sqlite.worker';

let workerPromise: Promise<WorkerHttpvfs> | null = null;

/**
 * Returns the singleton sql.js-httpvfs database worker instance.
 * Lazily loads the worker and wasm assets upon first call.
 */
export async function getDbWorker(): Promise<WorkerHttpvfs> {
	if (typeof window === 'undefined') {
		throw new Error('Database worker can only be initialized in the browser environment.');
	}

	if (workerPromise) {
		return workerPromise;
	}

	workerPromise = (async () => {
		const sqlHttpvfs = await import('sql.js-httpvfs');
		const createDbWorker =
			(sqlHttpvfs as any).createDbWorker || (sqlHttpvfs as any).default?.createDbWorker;

		if (!createDbWorker) {
			throw new Error('Failed to load createDbWorker from sql.js-httpvfs');
		}

		// Resolve URLs relative to window.location and SvelteKit base path
		const baseUrl = getBaseurl();
		const workerUrl = new URL('sqlite/sqlite.worker.js', baseUrl).toString();
		const wasmUrl = new URL('sqlite/sql-wasm.wasm', baseUrl).toString();
		const configUrl = new URL(`db/config.json${APP_VERSION ? '?v=' + APP_VERSION : ''}`, baseUrl).toString();

		console.info(`[DB] Initializing sql.js-httpvfs worker:`, { workerUrl, wasmUrl, configUrl });
		const config: SplitFileConfig = {
			from: 'jsonconfig',
			configUrl
		};

		const worker = await createDbWorker([config], workerUrl, wasmUrl);
		console.info(`[DB] sql.js-httpvfs worker initialized successfully.`);
		return worker;
	})();

	return workerPromise;
}

// At the bottom of dbWorker.ts:
if (typeof window !== 'undefined') {
	// Start worker & wasm download immediately on script evaluation
	getDbWorker().catch((err) => console.warn('[DB] Eager init failed:', err));
}