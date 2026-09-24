/**
 * Reading-theme engine with contrast-invariant piecewise interpolation.
 *
 * Based on the design pattern from OpenScriptorium (ISC License):
 * Maps a 0..100 slider value to a (background, foreground) color pair
 * with a hard flip at 50% to ensure high contrast throughout the range.
 *
 * Stop interpolation:
 *   0%   Pure Paper (black on white)
 *   25%  Solarized Light (warm parchment)
 *   50%  Split-half contrast flip
 *   75%  Solarized Dark / Deep Slate
 *   100% High Contrast Dark (white on black)
 */

// Light-side stops (t < 0.5)
export const LIGHT_STOPS = [
	[0.00, [255, 255, 255], [26, 26, 26]],    // pure black on white
	[0.25, [253, 246, 227], [7, 54, 66]],     // Solarized base3 / base02 (parchment)
	[0.50, [238, 232, 213], [101, 123, 131]]  // Solarized base2 / base00 (soft light edge)
];

// Dark-side stops (t >= 0.5)
export const DARK_STOPS = [
	[0.50, [7, 54, 66], [131, 148, 150]],     // Solarized base02 / base0 (soft dark edge)
	[0.75, [0, 43, 54], [147, 161, 161]],     // Solarized base03 / base1 (slate/midnight)
	[1.00, [0, 0, 0], [255, 255, 255]]        // pure white on black
];

// Lemma button stops: deep burgundy on light backgrounds, refined slate/ocean blue on dark
export const LEMMA_BTN_LIGHT_STOPS = [
	[0.00, [140, 24, 40]],   // deep wine / crimson (#8c1828)
	[0.25, [160, 28, 42]],   // rich burgundy (#a01c2a)
	[0.50, [185, 30, 45]]    // warm carmine (#b91e2d)
];

export const LEMMA_BTN_DARK_STOPS = [
	[0.50, [30, 88, 140]],   // deep slate blue (#1e588c)
	[0.75, [36, 105, 162]],  // rich ocean sapphire (#2469a2)
	[1.00, [42, 120, 182]]   // refined steel blue (#2a78b6)
];

// Lookup/Action button stops (inverted contrast: dark fill on light page, light fill on dark page)
export const LOOKUP_BTN_LIGHT_STOPS = [
	[0.00, [15, 23, 42]],    // deep slate black (#0f172a)
	[0.25, [24, 34, 52]],    // rich dark slate ink (#182234)
	[0.50, [35, 48, 68]]     // slate-800 (#233044)
];

export const LOOKUP_BTN_DARK_STOPS = [
	[0.50, [238, 242, 246]],  // light slate / ivory (#eef2f6)
	[0.75, [248, 250, 252]],  // clean light slate (#f8fafc)
	[1.00, [255, 255, 255]]   // pure white (#ffffff)
];

const LINK_LIGHT = [31, 77, 138];  // navy
const LINK_DARK  = [122, 176, 232]; // sky
const ACC_LIGHT  = [107, 52, 16];  // brick
const ACC_DARK   = [212, 165, 116]; // ochre

function lerp(a, b, t) {
	return Math.round(a + (b - a) * t);
}

function lerpRgb(a, b, t) {
	return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function interpolateColorStops(stops, t) {
	for (let i = 0; i < stops.length - 1; i++) {
		const [t0, c0] = stops[i];
		const [t1, c1] = stops[i + 1];
		if (t >= t0 && t <= t1) {
			const seg = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
			return lerpRgb(c0, c1, seg);
		}
	}
	const last = stops[stops.length - 1];
	return last[1];
}

function rgbCss(c) {
	return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function srgbToLinear(c) {
	c = c / 255;
	return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Convert RGB to DaisyUI OKLCH format string: "L% C H"
 */
function rgbToDaisyOklch([r, g, b]) {
	const lr = srgbToLinear(r);
	const lg = srgbToLinear(g);
	const lb = srgbToLinear(b);

	const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
	const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
	const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

	const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
	const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
	const bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;

	const C = Math.sqrt(a * a + bb * bb);
	let h = Math.atan2(bb, a) * (180 / Math.PI);
	if (h < 0) h += 360;

	return `${(L * 100).toFixed(4)}% ${C.toFixed(6)} ${h.toFixed(6)}`;
}

function interpolateStops(stops, t) {
	for (let i = 0; i < stops.length - 1; i++) {
		const [t0, bg0, fg0] = stops[i];
		const [t1, bg1, fg1] = stops[i + 1];
		if (t >= t0 && t <= t1) {
			const seg = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
			return { bg: lerpRgb(bg0, bg1, seg), fg: lerpRgb(fg0, fg1, seg) };
		}
	}
	const last = stops[stops.length - 1];
	return { bg: last[1], fg: last[2] };
}

/**
 * Returns { bg, fg } for a normalized t (0.0 to 1.0)
 */
export function colorAt(t) {
	return t < 0.5 ? interpolateStops(LIGHT_STOPS, t) : interpolateStops(DARK_STOPS, t);
}

export function getThemeLabel(v) {
	if (v < 15) return 'Pure Light';
	if (v < 35) return 'Warm Light';
	if (v < 50) return 'Muted Light';
	if (v < 65) return 'Muted Dark';
	if (v < 85) return 'Deep Dark';
	return 'High Contrast Dark';
}

export const THEME_STORAGE_KEY = 'biblical_reading_theme';

/**
 * Applies the computed theme colors to CSS custom properties and DaisyUI root variables.
 * @param {number} value - Slider integer from 0 to 100
 */
export function applyReadingTheme(value) {
	if (typeof document === 'undefined') return;

	const clamped = Math.max(0, Math.min(100, Math.round(value)));
	const t = clamped / 100;
	const isDark = clamped >= 50;

	const { bg, fg } = colorAt(t);

	// Secondary ink: pulled 35% from fg toward bg
	const inkSoft = lerpRgb(fg, bg, 0.35);

	// Dividing rule: pulled 12% from bg toward fg
	const rule = lerpRgb(bg, fg, 0.12);

	// Elevated surfaces (base-200): slightly offset from base-100
	const base200 = isDark ? lerpRgb(bg, fg, 0.08) : lerpRgb(bg, fg, 0.035);

	// Higher elevation surface (base-300): for card outlines / borders
	const base300 = isDark ? lerpRgb(bg, fg, 0.16) : lerpRgb(bg, fg, 0.08);

	// Dynamic link and accent colors
	const link = lerpRgb(LINK_LIGHT, LINK_DARK, t);
	const accent = lerpRgb(ACC_LIGHT, ACC_DARK, t);

	const root = document.documentElement;

	// Update HTML dataset theme
	root.setAttribute('data-theme', isDark ? 'dark' : 'light');
	root.style.colorScheme = isDark ? 'dark' : 'light';

	// General CSS variables
	root.style.setProperty('--color-page', rgbCss(bg));
	root.style.setProperty('--color-ink', rgbCss(fg));
	root.style.setProperty('--color-ink-soft', rgbCss(inkSoft));
	root.style.setProperty('--color-rule', rgbCss(rule));
	root.style.setProperty('--color-link', rgbCss(link));
	root.style.setProperty('--color-accent', rgbCss(accent));
	root.style.setProperty('--bg-content', rgbCss(bg));

	// DaisyUI color system variables (OKLCH format)
	root.style.setProperty('--b1', rgbToDaisyOklch(bg));
	root.style.setProperty('--b2', rgbToDaisyOklch(base200));
	root.style.setProperty('--b3', rgbToDaisyOklch(base300));
	root.style.setProperty('--bc', rgbToDaisyOklch(fg));

	// DaisyUI color system fallback variables (RGB format)
	root.style.setProperty('--fallback-b1', rgbCss(bg));
	root.style.setProperty('--fallback-b2', rgbCss(base200));
	root.style.setProperty('--fallback-b3', rgbCss(base300));
	root.style.setProperty('--fallback-bc', rgbCss(fg));

	// Dynamic Lemma Button colors (ensures high contrast against current background)
	const lemmaBtnBg = t < 0.5
		? interpolateColorStops(LEMMA_BTN_LIGHT_STOPS, t)
		: interpolateColorStops(LEMMA_BTN_DARK_STOPS, t);

	const lemmaBtnHover = isDark
		? lerpRgb(lemmaBtnBg, [255, 255, 255], 0.14)
		: lerpRgb(lemmaBtnBg, [0, 0, 0], 0.16);

	const lemmaBtnBorder = isDark
		? lerpRgb(lemmaBtnBg, [255, 255, 255], 0.28)
		: lerpRgb(lemmaBtnBg, [0, 0, 0], 0.2);

	root.style.setProperty('--color-lemma-btn-bg', rgbCss(lemmaBtnBg));
	root.style.setProperty('--color-lemma-btn-hover', rgbCss(lemmaBtnHover));
	root.style.setProperty('--color-lemma-btn-text', '#ffffff');
	root.style.setProperty('--color-lemma-btn-border', rgbCss(lemmaBtnBorder));
	root.style.setProperty(
		'--color-lemma-btn-shadow',
		isDark ? '0 2px 8px rgba(0, 0, 0, 0.6)' : '0 1px 3px rgba(0, 0, 0, 0.25)'
	);

	// Dynamic Lookup Button colors (inverted contrast: dark on light pages, light on dark pages)
	const lookupBtnBg = t < 0.5
		? interpolateColorStops(LOOKUP_BTN_LIGHT_STOPS, t)
		: interpolateColorStops(LOOKUP_BTN_DARK_STOPS, t);

	const lookupBtnText = isDark
		? [15, 23, 42]     // deep dark ink on light button
		: [255, 255, 255]; // crisp white text on dark button

	const lookupBtnHover = isDark
		? lerpRgb(lookupBtnBg, [200, 210, 220], 0.15)
		: lerpRgb(lookupBtnBg, [80, 100, 130], 0.25);

	const lookupBtnBorder = isDark
		? 'rgba(255, 255, 255, 0.35)'
		: 'rgba(0, 0, 0, 0.3)';

	root.style.setProperty('--color-lookup-btn-bg', rgbCss(lookupBtnBg));
	root.style.setProperty('--color-lookup-btn-hover', rgbCss(lookupBtnHover));
	root.style.setProperty('--color-lookup-btn-text', rgbCss(lookupBtnText));
	root.style.setProperty('--color-lookup-btn-border', lookupBtnBorder);
	root.style.setProperty(
		'--color-lookup-btn-shadow',
		isDark ? '0 2px 8px rgba(0, 0, 0, 0.45)' : '0 1px 3px rgba(0, 0, 0, 0.2)'
	);
}

/**
 * Initializes theme from localStorage or system preference.
 * @returns {number} The active theme value (0 to 100)
 */
export function initReadingTheme() {
	if (typeof window === 'undefined') return 25;

	try {
		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		if (stored !== null) {
			const parsed = parseInt(stored, 10);
			if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
				applyReadingTheme(parsed);
				return parsed;
			}
		}

		// Check system preference
		const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
		const defaultVal = prefersDark ? 75 : 25;
		applyReadingTheme(defaultVal);
		return defaultVal;
	} catch {
		applyReadingTheme(25);
		return 25;
	}
}

/**
 * Persists theme value to localStorage.
 */
export function saveReadingTheme(value) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(THEME_STORAGE_KEY, String(value));
	} catch {
		// Ignore local storage write errors
	}
}
