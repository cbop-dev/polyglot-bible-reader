import { base } from '$app/paths';
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
		const workerUrl = new URL(`${base}/sqlite/sqlite.worker.js`, window.location.href).toString();
		const wasmUrl = new URL(`${base}/sqlite/sql-wasm.wasm`, window.location.href).toString();
		const configUrl = new URL(`${base}/db/config.json?t=${Date.now()}`, window.location.href).toString();

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
