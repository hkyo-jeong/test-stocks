const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1300, height: 1400 });

  page.on('pageerror', (err) => console.log('[pageerror]', err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') console.log('[console error]', msg.text()); });

  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    localStorage.setItem('watchlist', JSON.stringify([{ symbol: '005930', name: '삼성전자', market: 'KOSPI' }]));
  });
  await page.reload();
  await page.waitForTimeout(1500);

  await page.click('#card-005930');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'tmp/13-detail-with-depth.png' });

  // 5분봉 탭 클릭
  await page.click('.period-tab[data-period="5m"]');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'tmp/14-5m-chart.png' });

  // 1분봉 탭 클릭
  await page.click('.period-tab[data-period="1m"]');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'tmp/15-1m-chart.png' });

  const buySellText = await page.textContent('#buysell-legend, .buysell-legend').catch(() => null);
  const buyVal = await page.textContent('#buysell-buy-value');
  const sellVal = await page.textContent('#buysell-sell-value');
  console.log('buy:', buyVal, 'sell:', sellVal);

  const orderbookRows = await page.$$eval('.depth-row', (rows) => rows.length);
  console.log('orderbook rows rendered:', orderbookRows);

  await browser.close();
  console.log('done');
})();
