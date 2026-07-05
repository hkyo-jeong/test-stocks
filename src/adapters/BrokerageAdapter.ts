import { CandleData, Period, SearchResult, StockPrice } from '../types/stock';

export interface BrokerageAdapter {
  readonly name: string;
  getStockPrice(symbol: string): Promise<StockPrice>;
  getStockHistory(symbol: string, period: Period, count?: number): Promise<CandleData[]>;
  searchStocks(query: string): Promise<SearchResult[]>;
}
