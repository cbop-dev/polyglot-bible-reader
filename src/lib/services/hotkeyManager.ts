import type { ReaderState } from '$lib/stores/readerState.svelte';
import { READER_HOTKEYS, type HotkeyAction } from '$lib/config/hotkeys';

export class HotkeyManager {
	private actions: HotkeyAction[];

	constructor(actions: HotkeyAction[] = READER_HOTKEYS) {
		this.actions = actions;
	}

	getActions(): HotkeyAction[] {
		return this.actions;
	}

	setActions(actions: HotkeyAction[]): void {
		this.actions = actions;
	}

	isInputElement(target: EventTarget | null): boolean {
		if (!target) return false;
		const el = target as any;
		if (el.isContentEditable) return true;
		if (typeof el.matches === 'function' && el.matches('input, textarea, select, [contenteditable="true"]')) {
			return true;
		}
		if (typeof el.closest === 'function') {
			return Boolean(el.closest('input, textarea, select, [contenteditable="true"]'));
		}
		return false;
	}

	isModifierMatch(bindingParts: string[], event: KeyboardEvent): boolean {
		const isMac =
			typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
		const modActive = isMac ? event.metaKey : event.ctrlKey;

		const reqMod =
			bindingParts.includes('mod') ||
			bindingParts.includes('ctrl') ||
			bindingParts.includes('meta');
		const reqAlt = bindingParts.includes('alt');
		const reqShift = bindingParts.includes('shift');

		if (reqMod !== modActive) return false;
		if (reqAlt !== event.altKey) return false;
		if (reqShift !== event.shiftKey) return false;

		return true;
	}

	matchesBinding(binding: string, event: KeyboardEvent): boolean {
		const hasCombination = binding.includes('+');

		if (hasCombination) {
			const parts = binding.toLowerCase().split('+');
			const targetKey = parts[parts.length - 1];

			if (!this.isModifierMatch(parts.slice(0, -1), event)) {
				return false;
			}

			return (
				event.key.toLowerCase() === targetKey ||
				event.code.toLowerCase() === targetKey.toLowerCase()
			);
		}

		// Single key binding (no modifiers like Ctrl, Meta, Alt allowed)
		if (event.ctrlKey || event.metaKey || event.altKey) {
			return false;
		}

		// Exact match (e.g. '?' or '[') or case-insensitive match (e.g. 'm' / 'M' or 'ArrowLeft')
		return (
			event.key === binding ||
			event.key.toLowerCase() === binding.toLowerCase()
		);
	}

	handleKeyDown(event: KeyboardEvent, state: ReaderState): boolean {
		if (!state.hotkeysEnabled) return false;

		// Guard: Do not trigger hotkeys when typing in input, textarea, select or contenteditable
		if (this.isInputElement(event.target)) {
			if (event.key === 'Escape') {
				if (typeof (event.target as any)?.blur === 'function') {
					(event.target as any).blur();
				}
				state.closeAllPopups();
				return true;
			}
			return false;
		}

		// Ignore repeated keydown events from holding key down
		if (event.repeat) return false;

		for (const action of this.actions) {
			if (action.enabled && !action.enabled(state)) {
				continue;
			}

			const matched = action.keys.some((keyBinding) => this.matchesBinding(keyBinding, event));

			if (matched) {
				if (action.preventDefault) {
					event.preventDefault();
				}
				action.action(state, event);
				return true;
			}
		}

		return false;
	}
}

export const hotkeyManager = new HotkeyManager();
