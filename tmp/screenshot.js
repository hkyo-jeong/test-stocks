const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 900 });

  await page.goto('http://localhost:3000');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tmp/01-initial.png' });

  await page.fill('#search-input', '삼성');
  await page.click('#search-btn');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'tmp/02-search.png' });

  await page.click('#search-results li:first-child');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tmp/03-stock.png' });

  await page.click('#watchlist-btn');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'tmp/04-watchlist.png' });

  await page.click('.period-tab[data-period="W"]');
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'tmp/05-weekly.png' });

  await browser.close();
  console.log('screenshots saved to tmp/');
})();
