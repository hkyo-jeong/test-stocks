// ─── API ──────────────────────────────────────────────────────────────────────
const api = {
  async search(q) {
    const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  async getPrice(symbol) {
    const res = await fetch(`/api/stocks/${symbol}`);
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  async getHistory(symbol, period = 'D', count = 60) {
    const res = await fetch(`/api/stocks/${symbol}/history?period=${period}&count=${count}`);
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },
  async getBrokerageInfo() {
    const res = await fetch('/api/stocks/info');
    return res.json();
  },
};

// ─── State ────────────────────────────────────────────────────────────────────
let currentSymbol = null;
let currentPeriod = 'D';
let mainChart = null;
let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
const sparklineCharts = new Map(); // symbol → Chart

// ─── 실시간 폴링 (토스 Open API는 REST만 제공하므로 주기적으로 다시 조회) ───────
const DETAIL_POLL_MS = 5000;
const GRID_POLL_MS = 10000;
let detailPollTimer = null;
let gridPollTimer = null;

// ─── Utils ────────────────────────────────────────────────────────────────────
function fmt(num) {
  if (num == null) return '-';
  return num.toLocaleString('ko-KR');
}
function fmtCap(num) {
  if (num == null) return '-';
  const trillion = 1_000_000_000_000;
  const billion = 100_000_000;
  if (num >= trillion) return `${(num / trillion).toFixed(1)}조`;
  return `${(num / billion).toFixed(0)}억`;
}
function changeClass(v) { return v > 0 ? 'up' : v < 0 ? 'down' : ''; }
function changeSign(v) { return v > 0 ? `+${fmt(v)}` : `${fmt(v)}`; }

// ─── Brokerage Badge ──────────────────────────────────────────────────────────
api.getBrokerageInfo().then(({ brokerage }) => {
  document.getElementById('brokerage-badge').textContent = brokerage;
}).catch(() => {});

// ─── Sparklines ───────────────────────────────────────────────────────────────
function destroyAllSparklines() {
  sparklineCharts.forEach((c) => c.destroy());
  sparklineCharts.clear();
}

function createSparkline(symbol, history) {
  const canvas = document.getElementById(`spark-${symbol}`);
  if (!canvas) return;

  if (sparklineCharts.has(symbol)) sparklineCharts.get(symbol).destroy();

  const closes = history.map((c) => c.close);
  const isUp = closes.length >= 2 ? closes[closes.length - 1] >= closes[0] : true;
  const color = isUp ? '#26a69a' : '#ef5350';
  const fill = isUp ? 'rgba(38,166,154,0.12)' : 'rgba(239,83,80,0.12)';

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: history.map((c) => c.date),
      datasets: [{
        data: closes,
        borderColor: color,
        backgroundColor: fill,
        borderWidth: 1.5,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
    },
  });

  sparklineCharts.set(symbol, chart);
}

// ─── Watchlist Grid ───────────────────────────────────────────────────────────
async function renderWatchlistGrid() {
  const grid = document.getElementById('stocks-grid');
  const empty = document.getElementById('grid-empty');
  const countBadge = document.getElementById('watchlist-count');

  destroyAllSparklines();
  grid.innerHTML = '';

  if (watchlist.length === 0) {
    empty.classList.remove('hidden');
    countBadge.classList.add('hidden');
    return;
  }

  empty.classList.add('hidden');
  countBadge.textContent = watchlist.length;
  countBadge.classList.remove('hidden');

  // 카드 틀 먼저 생성 (즉시 렌더)
  watchlist.forEach((w) => {
    const card = document.createElement('div');
    card.className = 'stock-card' + (w.symbol === currentSymbol ? ' active' : '');
    card.id = `card-${w.symbol}`;
    card.innerHTML = `
      <div class="card-header-row">
        <div>
          <span class="card-name">${w.name}</span>
          <span class="card-sub">${w.symbol}${w.market ? ' · ' + w.market : ''}</span>
        </div>
        <button class="card-remove" title="삭제">✕</button>
      </div>
      <div class="card-price" id="cp-${w.symbol}" style="color:var(--text-muted)">-</div>
      <div class="card-change" id="cc-${w.symbol}" style="color:var(--text-muted)">-</div>
      <div class="card-volume" id="cv-${w.symbol}"><span class="live-dot"></span>거래량 -</div>
      <div class="card-sparkline-wrapper">
        <canvas id="spark-${w.symbol}"></canvas>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (!e.target.closest('.card-remove')) selectStock(w.symbol);
    });
    card.querySelector('.card-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromWatchlist(w.symbol);
    });

    grid.appendChild(card);
  });

  // 가격 + 스파크라인 병렬 로드
  await Promise.all(
    watchlist.map(async (w) => {
      const price = await refreshCardPrice(w.symbol);
      if (!price) return;
      try {
        const history = await api.getHistory(w.symbol, 'D', 30);
        createSparkline(w.symbol, history);
      } catch {
        // 스파크라인은 부가 정보이므로 실패해도 가격 표시는 유지한다
      }
    })
  );

  startGridPolling();
}

// 카드 한 장의 현재가/등락률/거래량만 갱신 (스파크라인은 건드리지 않음 → 폴링에서 재사용)
async function refreshCardPrice(symbol) {
  const priceEl = document.getElementById(`cp-${symbol}`);
  const changeEl = document.getElementById(`cc-${symbol}`);
  const volEl = document.getElementById(`cv-${symbol}`);

  try {
    const price = await api.getPrice(symbol);

    if (priceEl) {
      priceEl.textContent = fmt(price.currentPrice);
      priceEl.className = `card-price ${changeClass(price.changePrice)}`;
    }
    if (changeEl) {
      changeEl.textContent = `${changeSign(price.changePrice)} (${changeSign(Math.round(price.changeRate * 100) / 100)}%)`;
      changeEl.className = `card-change ${changeClass(price.changePrice)}`;
    }
    if (volEl) volEl.innerHTML = `<span class="live-dot"></span>거래량 ${fmt(price.volume)}`;

    return price;
  } catch {
    if (priceEl && priceEl.textContent === '-') { priceEl.textContent = '오류'; priceEl.style.color = 'var(--down)'; }
    return null;
  }
}

function startGridPolling() {
  if (gridPollTimer) return;
  gridPollTimer = setInterval(() => {
    if (document.hidden || watchlist.length === 0) return;
    watchlist.forEach((w) => refreshCardPrice(w.symbol));
  }, GRID_POLL_MS);
}

// ─── Select Stock (카드 클릭 → 상세) ─────────────────────────────────────────
async function selectStock(symbol) {
  currentSymbol = symbol;
  currentPeriod = 'D';

  document.querySelectorAll('.stock-card').forEach((c) => c.classList.remove('active'));
  document.getElementById(`card-${symbol}`)?.classList.add('active');

  document.querySelectorAll('.period-tab').forEach((b) => b.classList.remove('active'));
  document.querySelector('.period-tab[data-period="D"]').classList.add('active');

  const detail = document.getElementById('detail-section');
  detail.classList.remove('hidden');

  try {
    const [price, history] = await Promise.all([
      api.getPrice(symbol),
      api.getHistory(symbol, 'D'),
    ]);
    renderStockInfo(price);
    renderMainChart(history);
    updateWatchlistBtn(symbol);
    startDetailPolling(symbol);
  } catch (e) {
    alert('종목 조회 오류: ' + e.message);
    return;
  }

  detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 상세 화면이 열려있는 동안 현재가/거래량을 주기적으로 다시 조회해 갱신한다.
function stopDetailPolling() {
  if (detailPollTimer) { clearInterval(detailPollTimer); detailPollTimer = null; }
}

function startDetailPolling(symbol) {
  stopDetailPolling();
  detailPollTimer = setInterval(async () => {
    if (document.hidden || currentSymbol !== symbol) return;
    try {
      const price = await api.getPrice(symbol);
      renderStockInfo(price);
      updateMainChartLive(price);
    } catch {
      // 폴링 실패는 조용히 넘어가고 다음 주기에 재시도한다
    }
  }, DETAIL_POLL_MS);
}

// 일봉 차트의 마지막 봉(=오늘)에 실시간 종가/거래량을 반영한다.
function updateMainChartLive(price) {
  if (!mainChart || currentPeriod !== 'D') return;
  const [closeDataset, volumeDataset] = mainChart.data.datasets;
  const lastIdx = closeDataset.data.length - 1;
  if (lastIdx < 0) return;

  closeDataset.data[lastIdx] = price.currentPrice;
  volumeDataset.data[lastIdx] = price.volume;
  mainChart.update('none');
}

// ─── Render Detail ────────────────────────────────────────────────────────────
function renderStockInfo(p) {
  document.getElementById('stock-name').textContent = p.name;
  document.getElementById('stock-symbol').textContent = p.symbol;
  document.getElementById('stock-market').textContent = p.market;
  document.getElementById('current-price').textContent = fmt(p.currentPrice);
  document.getElementById('currency').textContent = p.currency;

  const cls = changeClass(p.changePrice);
  const chEl = document.getElementById('change-price');
  const crEl = document.getElementById('change-rate');
  chEl.textContent = changeSign(p.changePrice);
  chEl.className = `change ${cls}`;
  crEl.textContent = `(${changeSign(Math.round(p.changeRate * 100) / 100)}%)`;
  crEl.className = `change ${cls}`;

  document.getElementById('open-price').textContent = fmt(p.openPrice);
  document.getElementById('high-price').textContent = fmt(p.highPrice);
  document.getElementById('low-price').textContent = fmt(p.lowPrice);
  document.getElementById('prev-price').textContent = fmt(p.prevClosePrice);
  document.getElementById('volume').textContent = fmt(p.volume);
  document.getElementById('market-cap').textContent = fmtCap(p.marketCap);
}

function renderMainChart(history) {
  const labels = history.map((c) => c.date);
  const closes = history.map((c) => c.close);
  const volumes = history.map((c) => c.volume);
  const isUp = closes.length >= 2 ? closes[closes.length - 1] >= closes[0] : true;
  const lineColor = isUp ? '#26a69a' : '#ef5350';
  const fillColor = isUp ? 'rgba(38,166,154,0.1)' : 'rgba(239,83,80,0.1)';

  if (mainChart) mainChart.destroy();

  const ctx = document.getElementById('price-chart').getContext('2d');
  mainChart = new Chart(ctx, {
    data: {
      labels,
      datasets: [
        {
          type: 'line',
          label: '종가',
          data: closes,
          borderColor: lineColor,
          backgroundColor: fillColor,
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.2,
          yAxisID: 'y',
        },
        {
          type: 'bar',
          label: '거래량',
          data: volumes,
          backgroundColor: 'rgba(92,107,192,0.3)',
          yAxisID: 'yVolume',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1d2e',
          borderColor: '#2e3250',
          borderWidth: 1,
          titleColor: '#8892b0',
          bodyColor: '#e8eaf6',
          callbacks: {
            label(ctx) {
              if (ctx.datasetIndex === 0) return `종가: ${fmt(ctx.parsed.y)}`;
              return `거래량: ${fmt(ctx.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#8892b0', maxTicksLimit: 8 },
          grid: { color: '#2e3250' },
        },
        y: {
          position: 'right',
          ticks: { color: '#8892b0', callback: (v) => fmt(v) },
          grid: { color: '#2e3250' },
        },
        yVolume: {
          position: 'left',
          ticks: { color: '#8892b0', maxTicksLimit: 4, callback: (v) => fmtCap(v * 1000) },
          grid: { display: false },
        },
      },
    },
  });
}

// ─── Watchlist Management ─────────────────────────────────────────────────────
function saveWatchlist() {
  localStorage.setItem('watchlist', JSON.stringify(watchlist));
}

function updateWatchlistBtn(symbol) {
  const btn = document.getElementById('watchlist-btn');
  const isIn = watchlist.some((w) => w.symbol === symbol);
  btn.textContent = isIn ? '★' : '☆';
  btn.classList.toggle('active', isIn);
}

function removeFromWatchlist(symbol) {
  watchlist = watchlist.filter((w) => w.symbol !== symbol);
  saveWatchlist();
  if (currentSymbol === symbol) {
    currentSymbol = null;
    stopDetailPolling();
    document.getElementById('detail-section').classList.add('hidden');
    if (mainChart) { mainChart.destroy(); mainChart = null; }
  }
  renderWatchlistGrid();
}

document.getElementById('watchlist-btn').addEventListener('click', async () => {
  if (!currentSymbol) return;
  const idx = watchlist.findIndex((w) => w.symbol === currentSymbol);

  if (idx >= 0) {
    removeFromWatchlist(currentSymbol);
  } else {
    try {
      const price = await api.getPrice(currentSymbol);
      watchlist.push({ symbol: price.symbol, name: price.name, market: price.market });
      saveWatchlist();
      updateWatchlistBtn(currentSymbol);
      renderWatchlistGrid(); // 새 카드 추가
    } catch {}
  }
});

// ─── Close Detail ─────────────────────────────────────────────────────────────
document.getElementById('detail-close').addEventListener('click', () => {
  document.getElementById('detail-section').classList.add('hidden');
  document.querySelectorAll('.stock-card').forEach((c) => c.classList.remove('active'));
  currentSymbol = null;
  stopDetailPolling();
  if (mainChart) { mainChart.destroy(); mainChart = null; }
});

// ─── Period Tabs ──────────────────────────────────────────────────────────────
document.querySelectorAll('.period-tab').forEach((btn) => {
  btn.addEventListener('click', async () => {
    if (!currentSymbol) return;
    document.querySelectorAll('.period-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = btn.dataset.period;
    try {
      renderMainChart(await api.getHistory(currentSymbol, currentPeriod));
    } catch (e) {
      alert('차트 조회 오류: ' + e.message);
    }
  });
});

// ─── Search ───────────────────────────────────────────────────────────────────
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');

async function doSearch() {
  const q = searchInput.value.trim();
  if (!q) return;

  try {
    const results = await api.search(q);
    searchResults.innerHTML = '';

    if (results.length === 0) {
      searchResults.innerHTML = '<li><span class="result-name" style="color:var(--text-muted)">검색 결과가 없습니다.</span></li>';
    } else {
      results.forEach((r) => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="result-name">${r.name}</span><span class="result-meta">${r.symbol} · ${r.market}</span>`;
        li.addEventListener('click', () => {
          searchResults.classList.add('hidden');
          searchInput.value = '';
          selectStock(r.symbol);
        });
        searchResults.appendChild(li);
      });
    }

    searchResults.classList.remove('hidden');
  } catch (e) {
    alert('검색 오류: ' + e.message);
  }
}

searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-section')) searchResults.classList.add('hidden');
});

// ─── Init ─────────────────────────────────────────────────────────────────────
renderWatchlistGrid();
