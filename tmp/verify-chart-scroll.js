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
  await page.waitForTimeout(1200);
  await page.click('#card-005930');
  await page.waitForTimeout(1200);

  const before = await page.evaluate(() => ({
    barCount: mainChart.data.labels.length,
    firstLabel: mainChart.data.labels[0],
    scrollWidth: document.getElementById('chart-wrapper').scrollWidth,
    clientWidth: document.getElementById('chart-wrapper').clientWidth,
    scrollLeft: document.getElementById('chart-wrapper').scrollLeft,
  }));
  console.log('일봉 초기 상태:', before);

  // 왼쪽 끝으로 스크롤 → 과거 데이터 로드 트리거
  await page.evaluate(() => {
    const w = document.getElementById('chart-wrapper');
    w.scrollLeft = 0;
    w.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(2000);

  const after = await page.evaluate(() => ({
    barCount: mainChart.data.labels.length,
    firstLabel: mainChart.data.labels[0],
    scrollWidth: document.getElementById('chart-wrapper').scrollWidth,
    scrollLeft: document.getElementById('chart-wrapper').scrollLeft,
  }));
  console.log('왼쪽 끝 스크롤 후:', after);

  await page.screenshot({ path: 'tmp/17-chart-scrolled-left.png' });

  // 한번 더 스크롤해서 추가로 더 로드되는지 확인
  await page.evaluate(() => {
    const w = document.getElementById('chart-wrapper');
    w.scrollLeft = 0;
    w.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(2000);
  const after2 = await page.evaluate(() => ({
    barCount: mainChart.data.labels.length,
    firstLabel: mainChart.data.labels[0],
  }));
  console.log('두번째 스크롤 후:', after2);

  // 1분봉에서도 확인
  await page.click('.period-tab[data-period="1m"]');
  await page.waitForTimeout(1200);
  const m1before = await page.evaluate(() => ({
    barCount: mainChart.data.labels.length,
    firstLabel: mainChart.data.labels[0],
  }));
  console.log('1분봉 초기:', m1before);

  await page.evaluate(() => {
    const w = document.getElementById('chart-wrapper');
    w.scrollLeft = 0;
    w.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(2000);
  const m1after = await page.evaluate(() => ({
    barCount: mainChart.data.labels.length,
    firstLabel: mainChart.data.labels[0],
  }));
  console.log('1분봉 과거 로드 후:', m1after);

  await browser.close();
  console.log('done');
})();
