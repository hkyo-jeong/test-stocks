import type { BuySellSummary, CandleData, Orderbook, Period, SearchResult, StockPrice } from './types';

async function extractError(res: Response): Promise<string> {
  try {
    return (await res.json()).error;
  } catch {
    return res.statusText;
  }
}

export const api = {
  async search(q: string): Promise<SearchResult[]> {
    const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error(await extractError(res));
    return res.json();
  },
  async getPrice(symbol: string): Promise<StockPrice> {
    const res = await fetch(`/api/stocks/${symbol}`);
    if (!res.ok) throw new Error(await extractError(res));
    return res.json();
  },
  async getHistory(symbol: string, period: Period = 'D', count = 60, before?: string): Promise<CandleData[]> {
    const params = new URLSearchParams({ period, count: String(count) });
    if (before) params.set('before', before);
    const res = await fetch(`/api/stocks/${symbol}/history?${params}`);
    if (!res.ok) throw new Error(await extractError(res));
    return res.json();
  },
  async getBrokerageInfo(): Promise<{ brokerage: string }> {
    const res = await fetch('/api/stocks/info');
    return res.json();
  },
  // 브로커리지가 지원하지 않으면 501 → null 반환 (에러로 취급하지 않음)
  async getOrderbook(symbol: string): Promise<Orderbook | null> {
    const res = await fetch(`/api/stocks/${symbol}/orderbook`);
    if (res.status === 501) return null;
    if (!res.ok) throw new Error(await extractError(res));
    return res.json();
  },
  async getBuySell(symbol: string): Promise<BuySellSummary | null> {
    const res = await fetch(`/api/stocks/${symbol}/buy-sell`);
    if (res.status === 501) return null;
    if (!res.ok) throw new Error(await extractError(res));
    return res.json();
  },
};
