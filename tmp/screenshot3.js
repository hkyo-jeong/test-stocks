const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1300, height: 900 });

  // localStorage에 관심종목 미리 세팅 (삼성전자, SK하이닉스, NAVER, 카카오, 현대차)
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    localStorage.setItem('watchlist', JSON.stringify([
      { symbol: '005930', name: '삼성전자', market: 'KOSPI' },
      { symbol: '000660', name: 'SK하이닉스', market: 'KOSPI' },
      { symbol: '035420', name: 'NAVER', market: 'KOSPI' },
      { symbol: '035720', name: '카카오', market: 'KOSPI' },
      { symbol: '005380', name: '현대차', market: 'KOSPI' },
      { symbol: '068270', name: '셀트리온', market: 'KOSPI' },
    ]));
  });
  await page.reload();
  await page.waitForTimeout(2500); // 스파크라인 로드 대기

  await page.screenshot({ path: 'tmp/07-multi-grid.png' });

  // 삼성전자 카드 클릭
  await page.click('#card-005930');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'tmp/08-grid-detail.png' });

  // 전체 페이지 스크롤 캡쳐
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  const fullHeight = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewportSize({ width: 1300, height: fullHeight });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tmp/09-full-page.png' });

  await browser.close();
  console.log('done');
})();
