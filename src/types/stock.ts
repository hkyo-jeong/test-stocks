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
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  market: string;
}

export type Period = 'D' | 'W' | 'M'; // Daily | Weekly | Monthly
