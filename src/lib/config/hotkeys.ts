import type { ReaderState } from '$lib/stores/readerState.svelte';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';

export type HotkeyCategory = 'Navigation' | 'View' | 'General';

export interface HotkeyAction {
	id: string;
	name: string;
	description: string;
	category: HotkeyCategory;
	keys: string[];
	action: (state: ReaderState, event: KeyboardEvent) => void | Promise<void>;
	enabled?: (state: ReaderState) => boolean;
	preventDefault?: boolean;
}

export const READER_HOTKEYS: HotkeyAction[] = [
	{
		id: 'toggle-meditation',
		name: 'Toggle Meditation Mode',
		description: 'Toggle distraction-free reading mode',
		category: 'View',
		keys: ['m'],
		preventDefault: true,
		action: (state) => {
			state.meditationMode = !state.meditationMode;
		}
	},
	{
		id: 'toggle-grid-header',
		name: 'Toggle Grid Headers',
		description: 'Show or hide the grid column header controls',
		category: 'View',
		keys: ['g'],
		preventDefault: true,
		action: (state) => {
			state.gridHeaderExpanded = !state.gridHeaderExpanded;
		}
	},
	{
		id: 'next-chapter',
		name: 'Next Chapter',
		description: 'Advance to the next chapter in the current book',
		category: 'Navigation',
		keys: [']', 'ArrowRight'],
		preventDefault: true,
		action: async (state) => {
			await state.nextChapter();
		}
	},
	{
		id: 'prev-chapter',
		name: 'Previous Chapter',
		description: 'Go to the previous chapter in the current book',
		category: 'Navigation',
		keys: ['[', 'ArrowLeft'],
		preventDefault: true,
		action: async (state) => {
			await state.prevChapter();
		}
	},
	{
		id: 'close-popups',
		name: 'Close Popups & Modals',
		description: 'Close open dialogs, modals, and dropdown menus',
		category: 'General',
		keys: ['Escape'],
		preventDefault: true,
		action: (state) => {
			state.closeAllPopups();
		}
	},
	{
		id: 'toggle-hotkey-help',
		name: 'Keyboard Shortcuts Help',
		description: 'Show the list of keyboard shortcuts',
		category: 'General',
		keys: ['?'],
		preventDefault: true,
		action: (state) => {
			state.showHotkeyHelp = !state.showHotkeyHelp;
		}
	},
	{
		id: 'open-version-dropdown',
		name: 'Select a Bible Version',
		description: 'Show the list of available Bible versions to chose from',
		category: 'Navigation',
		keys: ['v'],
		preventDefault: true,
		action: (state) => {
			state.versionDropdownOpen = true;
		}
	},
	{
		id: 'open-book-dropdown',
		name: 'Select a book',
		description: 'Show the list of available books for the current Bible version',
		category: 'Navigation',
		keys: ['b'],
		preventDefault: true,
		action: (state) => {
			state.bookDropdownOpen = true;
		}
	},
	{
		id: 'open-chapter-dropdown',
		name: 'Select a chapter',
		description: 'Show the list of verses for the current book.',
		category: 'Navigation',
		keys: ['c'],
		preventDefault: true,
		action: (state) => {
			state.chapterDropdownOpen = true;
		}
	},
	{
		id: 'open-verse-dropdown',
		name: 'Select a verse',
		description: 'Show the list of available verses for the current chapter.',
		category: 'Navigation',
		keys: ['e'],
		preventDefault: true,
		action: (state) => {
			state.verseDropdownOpen = true;
		}
	},
	{
		id: 'cycle-hebrew-mode',
		name: 'Cycle through Hebrew display modes',
		description: 'Cycle through the Hebrew cantillation and vowels markings display options: Both -> vowels only -> consonants only.',
		category: 'View',
		keys: ['h'],
		preventDefault: true,
		action: (state) => {
			state.cycleHebrewMode();
		}
	},
	{
		id: 'toggle-greek-diacritics',
		name: 'Toggle Greek Diacritics',
		description: 'Turn Greek diacritic marks on/off.',
		category: 'View',
		keys: ['k'],
		preventDefault: true,
		action: (state) => {
			state.toggleGreekDiacritics();
		}
	},
	{
		id: 'info-page',
		name: 'View License/Info Page',
		description: 'Open the Sources and License Page',
		category: 'Navigation',
		keys: ['i'],
		preventDefault: true,
		action: (state) => {
			goto(resolve('/')+'sources-and-licenses');
		}
	}

];

/**
 * cycleHebrewMode
 * 
 */
