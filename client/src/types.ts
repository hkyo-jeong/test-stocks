export interface StockPrice {
  symbol: string;
  name: string;
  currentPrice: number;
  changePrice: number;
  changeRate: number;
  volume: number;
  highPrice: number;
  lowPrice: number;
  openPrice: number;
  prevClosePrice: number;
  marketCap?: number;
  currency: string;
  market: string; // KOSPI | KOSDAQ | NYSE | NASDAQ
  timestamp: string;
}

export interface CandleData {
  date: string; // 'D'|'W'|'M' → YYYY-MM-DD, 분봉('1m'|'5m'|'15m') → HH:mm (거래소 로컬 시각)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rawTimestamp?: string;
}

export interface SearchResult {
  symbol: string;
  name: string;
  market: string;
}

export type Period = 'D' | 'W' | 'M' | '1m' | '5m' | '15m';

export interface OrderbookLevel {
  price: number;
  volume: number;
}

export interface Orderbook {
  timestamp: string | null;
  currency: string;
  asks: OrderbookLevel[];
  bids: OrderbookLevel[];
}

export interface BuySellSummary {
  buyVolume: number;
  sellVolume: number;
  sampleTrades: number;
  classifiedTrades: number;
  estimated: true;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  market: string;
}
