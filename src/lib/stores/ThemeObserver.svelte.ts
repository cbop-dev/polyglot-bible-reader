import { browser } from '$app/environment';

export const BREAKPOINTS = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)'
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS | 'base';

export function createBreakpointObserver() {
  let active = $state<Breakpoint>('base');

  if (browser) {
    const queries = (Object.keys(BREAKPOINTS) as Array<keyof typeof BREAKPOINTS>)
      .reverse()
      .map((key) => ({
        key,
        mql: window.matchMedia(BREAKPOINTS[key])
      }));

    const update = () => {
      const match = queries.find((q) => q.mql.matches);
      active = match ? match.key : 'base';
    };

    update();

    for (const { mql } of queries) {
      mql.addEventListener('change', update);
    }
  }

  return {
    get current() {
      return active;
    }
  };
}

export const size = createBreakpointObserver();

function observeTheme() {
	let theTheme = $state<string | null>(null);

	
	const html = document.documentElement;

	const update = () => {
		theTheme = html.getAttribute('data-theme');
	};

	const observer = new MutationObserver(update);

	observer.observe(html, {
		attributes: true,
		attributeFilter: ['data-theme']
	});

	// Read the initial value
	update();

	return {
		get value() {
			return theTheme;
		}
	};
}

export const theme=observeTheme();