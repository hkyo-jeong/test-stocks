import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { BuySellSummary, Orderbook as OrderbookType, Period, StockPrice } from '../types';
import { INTRADAY_PERIODS, changeClass, changeSign, defaultCountForPeriod, fmt, fmtCap } from '../utils';
import PriceChart, { PriceChartHandle } from './PriceChart';
import Orderbook from './Orderbook';
import BuySell from './BuySell';

const DETAIL_POLL_MS = 5000;
const INTRADAY_REFRESH_MS = 30000;

const PERIOD_TABS: { period: Period; label: string }[] = [
  { period: '1m', label: '1분' },
  { period: '5m', label: '5분' },
  { period: '15m', label: '15분' },
  { period: 'D', label: '일봉' },
  { period: 'W', label: '주봉' },
  { period: 'M', label: '월봉' },
];

interface Props {
  symbol: string;
  isWatchlisted: boolean;
  onToggleWatchlist: (currentPrice: StockPrice | null) => void;
  onClose: () => void;
}

export default function StockDetail({ symbol, isWatchlisted, onToggleWatchlist, onClose }: Props) {
  const [price, setPrice] = useState<StockPrice | null>(null);
  const [period, setPeriod] = useState<Period>('D');
  const [orderbook, setOrderbook] = useState<OrderbookType | null | undefined>(undefined);
  const [buysell, setBuysell] = useState<BuySellSummary | null | undefined>(undefined);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const chartRef = useRef<PriceChartHandle>(null);
  const noMoreOlderRef = useRef(false);
  const loadingOlderRef = useRef(false);
  const rootRef = useRef<HTMLElement>(null);

  async function loadMarketDepth(sym: string) {
    try {
      setOrderbook(await api.getOrderbook(sym));
    } catch {
      setOrderbook(null);
    }
    try {
      setBuysell(await api.getBuySell(sym));
    } catch {
      setBuysell(null);
    }
  }

  // 종목 선택 시 초기 로드
  useEffect(() => {
    let cancelled = false;
    setPeriod('D');
    setOrderbook(undefined);
    setBuysell(undefined);
    noMoreOlderRef.current = false;
    loadingOlderRef.current = false;
    setLoadingOlder(false);

    (async () => {
      try {
        const [p, history] = await Promise.all([api.getPrice(symbol), api.getHistory(symbol, 'D')]);
        if (cancelled) return;
        setPrice(p);
        chartRef.current?.replace(history, 'D');
        loadMarketDepth(symbol);
        rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {
        if (!cancelled) alert('종목 조회 오류: ' + (e as Error).message);
      }
    })();

    return () => { cancelled = true; };
  }, [symbol]);

  // 현재가/거래량/호가/체결강도 주기적 갱신
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const p = await api.getPrice(symbol);
        setPrice(p);
        chartRef.current?.updateLive(p);
      } catch {
        // 폴링 실패는 조용히 넘어가고 다음 주기에 재시도한다
      }
      loadMarketDepth(symbol);
    }, DETAIL_POLL_MS);
    return () => clearInterval(timer);
  }, [symbol]);

  // 분봉 조회 중일 때 차트 전체를 주기적으로 다시 조회
  useEffect(() => {
    if (!INTRADAY_PERIODS.includes(period)) return;
    const timer = setInterval(async () => {
      if (document.hidden) return;
      if (!chartRef.current?.isPinnedToLatest()) return;
      try {
        const history = await api.getHistory(symbol, period, defaultCountForPeriod(period));
        chartRef.current?.replace(history, period);
      } catch {
        // 폴링 실패는 조용히 넘어가고 다음 주기에 재시도한다
      }
    }, INTRADAY_REFRESH_MS);
    return () => clearInterval(timer);
  }, [symbol, period]);

  async function handlePeriodClick(newPeriod: Period) {
    setPeriod(newPeriod);
    noMoreOlderRef.current = false;
    try {
      const history = await api.getHistory(symbol, newPeriod, defaultCountForPeriod(newPeriod));
      chartRef.current?.replace(history, newPeriod);
    } catch (e) {
      alert('차트 조회 오류: ' + (e as Error).message);
    }
  }

  function maybeLoadOlderHistory() {
    if (loadingOlderRef.current || noMoreOlderRef.current) return;
    const oldest = chartRef.current?.getOldest();
    if (!oldest) return;
    if (!oldest.rawTimestamp) { noMoreOlderRef.current = true; return; }

    loadingOlderRef.current = true;
    setLoadingOlder(true);

    api.getHistory(symbol, period, defaultCountForPeriod(period), oldest.rawTimestamp)
      .then((older) => {
        const deduped = older.filter((c) => !c.rawTimestamp || c.rawTimestamp < oldest.rawTimestamp!);
        if (deduped.length === 0) noMoreOlderRef.current = true;
        else chartRef.current?.prependOlder(deduped);
      })
      .catch(() => {
        // 실패 시 다음 스크롤 시도에서 다시 불러온다
      })
      .finally(() => {
        loadingOlderRef.current = false;
        setLoadingOlder(false);
      });
  }

  const cls = price ? changeClass(price.changePrice) : '';

  return (
    <section className="detail-section" ref={rootRef}>
      <div className="detail-inner">
        <div className="detail-top-row">
          <div>
            <h2 className="stock-name">{price?.name ?? ''}</h2>
            <span className="stock-symbol">{price?.symbol ?? symbol}</span>
            <span className="stock-market">{price?.market ?? ''}</span>
          </div>
          <div className="detail-actions">
            <button
              className={`watchlist-btn${isWatchlisted ? ' active' : ''}`}
              title="관심종목"
              onClick={() => onToggleWatchlist(price)}
            >
              {isWatchlisted ? '★' : '☆'}
            </button>
            <button className="close-btn" title="닫기" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="price-card">
          <div className="current-price-row">
            <span className="current-price">{fmt(price?.currentPrice)}</span>
            <span className="currency">{price?.currency ?? ''}</span>
          </div>
          <div className="change-row">
            <span className={`change ${cls}`}>{price ? changeSign(price.changePrice) : ''}</span>
            <span className={`change ${cls}`}>{price ? `(${changeSign(Math.round(price.changeRate * 100) / 100)}%)` : ''}</span>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat"><span className="stat-label">시가</span><span className="stat-value">{fmt(price?.openPrice)}</span></div>
          <div className="stat"><span className="stat-label">고가</span><span className="stat-value up">{fmt(price?.highPrice)}</span></div>
          <div className="stat"><span className="stat-label">저가</span><span className="stat-value down">{fmt(price?.lowPrice)}</span></div>
          <div className="stat"><span className="stat-label">전일종가</span><span className="stat-value">{fmt(price?.prevClosePrice)}</span></div>
          <div className="stat"><span className="stat-label"><span className="live-dot" />거래량</span><span className="stat-value">{fmt(price?.volume)}</span></div>
          <div className="stat"><span className="stat-label">시가총액</span><span className="stat-value">{fmtCap(price?.marketCap)}</span></div>
        </div>

        <div className="depth-grid">
          <div className="depth-card">
            <h3 className="depth-title">호가</h3>
            <Orderbook orderbook={orderbook} />
          </div>
          <div className="depth-card">
            <h3 className="depth-title">매수 · 매도 체결강도 <span className="depth-badge">추정</span></h3>
            <BuySell buysell={buysell} />
          </div>
        </div>

        <div className="chart-section">
          <div className="period-tabs">
            {PERIOD_TABS.slice(0, 3).map(({ period: p, label }) => (
              <button key={p} data-period={p} className={`period-tab${period === p ? ' active' : ''}`} onClick={() => handlePeriodClick(p)}>{label}</button>
            ))}
            <span className="period-tabs-divider" />
            {PERIOD_TABS.slice(3).map(({ period: p, label }) => (
              <button key={p} data-period={p} className={`period-tab${period === p ? ' active' : ''}`} onClick={() => handlePeriodClick(p)}>{label}</button>
            ))}
          </div>
          <PriceChart ref={chartRef} loadingOlder={loadingOlder} onNeedOlder={maybeLoadOlderHistory} />
          <p className="chart-hint">차트를 좌우로 스크롤하면 다른 시간대·날짜를 볼 수 있습니다.</p>
        </div>
      </div>
    </section>
  );
}
