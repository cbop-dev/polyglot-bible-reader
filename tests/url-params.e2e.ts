import { expect, test } from '@playwright/test';

test.describe('URL parameters initialization', () => {
	test('loads book and chapter specified by URL parameters into UI controls', async ({ page }) => {
		// Navigate with URL parameters specifying Qoh (Ecclesiastes) chapter 1
		await page.goto('/?version=BHS&chapter=1&book=Qoh&grid=BHS,LXX&verse=1&meditate=0');

		const bookButton = page.getByRole('button', { name: 'Select book' });
		const chapterButton = page.getByRole('button', { name: 'Select chapter' });

		// Verify the book button displays 'Qoh' and does not revert to default 'Gen'
		await expect(bookButton).toBeVisible();
		await expect(bookButton).toContainText('Qoh');
		await expect(bookButton).not.toContainText('Gen');

		// Verify chapter button displays '1'
		await expect(chapterButton).toBeVisible();
		await expect(chapterButton).toContainText('1');

		// Wait briefly to ensure no asynchronous task (such as background version selection) reverts the book
		await page.waitForTimeout(500);
		await expect(bookButton).toContainText('Qoh');
	});

	test('displays correct book and chapter in meditation mode when specified in URL', async ({ page }) => {
		await page.goto('/?version=BHS&chapter=1&book=Qoh&grid=BHS,LXX&verse=1&meditate=1');

		// In meditation mode, the header displays an h2 with the book abbreviation and chapter
		const meditationHeading = page.locator('header h2');
		await expect(meditationHeading).toBeVisible();
		await expect(meditationHeading).toContainText('Qoh 1');
		await expect(meditationHeading).not.toContainText('Gen 1');

		// Wait briefly to ensure state remains stable
		await page.waitForTimeout(500);
		await expect(meditationHeading).toContainText('Qoh 1');
	});
});
