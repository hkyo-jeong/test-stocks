const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 900 });

  await page.goto('http://localhost:3000');
  await page.fill('#search-input', '삼성');
  await page.click('#search-btn');
  await page.waitForTimeout(700);
  await page.click('#search-results li:last-child'); // 삼성전자
  await page.waitForTimeout(1200);
  await page.click('#watchlist-btn');
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tmp/06-watchlist-scrolled.png' });

  await browser.close();
  console.log('done');
})();
