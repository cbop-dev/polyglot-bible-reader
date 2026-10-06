import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HotkeyManager } from './hotkeyManager';
import type { HotkeyAction } from '$lib/config/hotkeys';
import type { ReaderState } from '$lib/stores/readerState.svelte';

describe('HotkeyManager', () => {
	let manager: HotkeyManager;
	let mockState: any;

	beforeEach(() => {
		mockState = {
			meditationMode: false,
			hotkeysEnabled: true,
			showHotkeyHelp: false,
			nextChapter: vi.fn(),
			prevChapter: vi.fn(),
			closeAllPopups: vi.fn()
		};
	});

	function createKeyEvent(key: string, options: Partial<KeyboardEvent> = {}): KeyboardEvent {
		return {
			key,
			code: key,
			ctrlKey: false,
			metaKey: false,
			altKey: false,
			shiftKey: false,
			repeat: false,
			target: null,
			preventDefault: vi.fn(),
			...options
		} as unknown as KeyboardEvent;
	}

	it('triggers action on single key match (case-insensitive for letters)', () => {
		const actionFn = vi.fn();
		const customActions: HotkeyAction[] = [
			{
				id: 'test-action',
				name: 'Test',
				description: 'Test action',
				category: 'View',
				keys: ['m'],
				action: actionFn
			}
		];
		manager = new HotkeyManager(customActions);

		// Lowercase
		const handledLower = manager.handleKeyDown(createKeyEvent('m'), mockState as any);
		expect(handledLower).toBe(true);
		expect(actionFn).toHaveBeenCalledTimes(1);

		// Uppercase
		const handledUpper = manager.handleKeyDown(createKeyEvent('M'), mockState as any);
		expect(handledUpper).toBe(true);
		expect(actionFn).toHaveBeenCalledTimes(2);
	});

	it('supports alternative keys (aliases)', () => {
		const nextChapterFn = vi.fn();
		const customActions: HotkeyAction[] = [
			{
				id: 'next-chapter',
				name: 'Next Chapter',
				description: 'Next',
				category: 'Navigation',
				keys: [']', 'ArrowRight'],
				action: nextChapterFn
			}
		];
		manager = new HotkeyManager(customActions);

		manager.handleKeyDown(createKeyEvent(']'), mockState as any);
		expect(nextChapterFn).toHaveBeenCalledTimes(1);

		manager.handleKeyDown(createKeyEvent('ArrowRight'), mockState as any);
		expect(nextChapterFn).toHaveBeenCalledTimes(2);
	});

	it('does not trigger single key action when Ctrl/Meta/Alt modifiers are held', () => {
		const actionFn = vi.fn();
		const customActions: HotkeyAction[] = [
			{
				id: 'test',
				name: 'Test',
				description: 'Test',
				category: 'General',
				keys: ['m'],
				action: actionFn
			}
		];
		manager = new HotkeyManager(customActions);

		const ctrlEvent = createKeyEvent('m', { ctrlKey: true });
		expect(manager.handleKeyDown(ctrlEvent, mockState as any)).toBe(false);
		expect(actionFn).not.toHaveBeenCalled();

		const metaEvent = createKeyEvent('m', { metaKey: true });
		expect(manager.handleKeyDown(metaEvent, mockState as any)).toBe(false);
		expect(actionFn).not.toHaveBeenCalled();

		const altEvent = createKeyEvent('m', { altKey: true });
		expect(manager.handleKeyDown(altEvent, mockState as any)).toBe(false);
		expect(actionFn).not.toHaveBeenCalled();
	});

	it('ignores keystrokes when focus is inside an input or textarea', () => {
		const actionFn = vi.fn();
		const customActions: HotkeyAction[] = [
			{
				id: 'test',
				name: 'Test',
				description: 'Test',
				category: 'View',
				keys: ['m'],
				action: actionFn
			}
		];
		manager = new HotkeyManager(customActions);

		const mockInput = {
			matches: (selector: string) => selector.includes('input'),
			closest: () => true,
			isContentEditable: false
		};

		const event = createKeyEvent('m', { target: mockInput as any });

		expect(manager.handleKeyDown(event, mockState as any)).toBe(false);
		expect(actionFn).not.toHaveBeenCalled();
	});

	it('blurs input element and closes popups when Escape is pressed inside an input', () => {
		manager = new HotkeyManager();
		const blurSpy = vi.fn();
		const mockInput = {
			matches: (selector: string) => selector.includes('input'),
			closest: () => true,
			isContentEditable: false,
			blur: blurSpy
		};

		const event = createKeyEvent('Escape', { target: mockInput as any });

		const handled = manager.handleKeyDown(event, mockState as any);
		expect(handled).toBe(true);
		expect(blurSpy).toHaveBeenCalled();
		expect(mockState.closeAllPopups).toHaveBeenCalled();
	});

	it('does not trigger hotkeys when hotkeysEnabled is false in ReaderState', () => {
		const actionFn = vi.fn();
		const customActions: HotkeyAction[] = [
			{
				id: 'test',
				name: 'Test',
				description: 'Test',
				category: 'View',
				keys: ['m'],
				action: actionFn
			}
		];
		manager = new HotkeyManager(customActions);
		mockState.hotkeysEnabled = false;

		const event = createKeyEvent('m');
		expect(manager.handleKeyDown(event, mockState as any)).toBe(false);
		expect(actionFn).not.toHaveBeenCalled();
	});

	it('calls preventDefault when preventDefault is configured on action', () => {
		const customActions: HotkeyAction[] = [
			{
				id: 'test',
				name: 'Test',
				description: 'Test',
				category: 'General',
				keys: ['ArrowRight'],
				preventDefault: true,
				action: vi.fn()
			}
		];
		manager = new HotkeyManager(customActions);

		const event = createKeyEvent('ArrowRight');

		manager.handleKeyDown(event, mockState as any);
		expect(event.preventDefault).toHaveBeenCalled();
	});

	it('ignores repeated keydown events', () => {
		const actionFn = vi.fn();
		const customActions: HotkeyAction[] = [
			{
				id: 'test',
				name: 'Test',
				description: 'Test',
				category: 'View',
				keys: ['m'],
				action: actionFn
			}
		];
		manager = new HotkeyManager(customActions);

		const repeatEvent = createKeyEvent('m', { repeat: true });
		expect(manager.handleKeyDown(repeatEvent, mockState as any)).toBe(false);
		expect(actionFn).not.toHaveBeenCalled();
	});
});
