const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1300, height: 1000 });

  page.on('console', (msg) => console.log('[console]', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));

  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    localStorage.setItem('watchlist', JSON.stringify([
      { symbol: '005930', name: '삼성전자', market: 'KOSPI' },
      { symbol: '000660', name: 'SK하이닉스', market: 'KOSPI' },
    ]));
  });
  await page.reload();
  await page.waitForTimeout(2500);

  await page.screenshot({ path: 'tmp/10-volume-grid.png' });
  const gridVolumeText = await page.textContent('#cv-005930');
  console.log('grid volume text:', gridVolumeText);

  await page.click('#card-005930');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tmp/11-volume-detail.png' });

  const initialVolume = await page.textContent('#volume');
  const initialChartVolume = await page.evaluate(() => {
    const ds = window.__mainChartRef?.data?.datasets?.[1]?.data;
    return ds ? ds[ds.length - 1] : null;
  });
  console.log('detail volume stat:', initialVolume);
  console.log('chart last volume bar (before, via global ref, likely null since not exposed):', initialChartVolume);

  // 폴링 주기(5초) 이상 대기 후 값이 갱신되는지 확인
  await page.waitForTimeout(6000);
  const afterVolume = await page.textContent('#volume');
  console.log('detail volume stat after poll wait:', afterVolume);
  await page.screenshot({ path: 'tmp/12-volume-detail-after-poll.png' });

  await browser.close();
  console.log('done');
})();
