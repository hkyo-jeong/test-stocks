import { BuySellSummary, CandleData, Orderbook, Period, SearchResult, StockPrice } from '../types/stock';

export interface BrokerageAdapter {
  readonly name: string;
  getStockPrice(symbol: string): Promise<StockPrice>;
  // before: 이 ISO 시각 이전 데이터를 요청 (과거 데이터 이어보기용 커서). 미지원 시 무시해도 된다.
  getStockHistory(symbol: string, period: Period, count?: number, before?: string): Promise<CandleData[]>;
  searchStocks(query: string): Promise<SearchResult[]>;
  // 선택 기능: 호가/체결 기반 매수·매도 추정. 지원하지 않는 브로커리지는 구현하지 않아도 된다.
  getOrderbookSummary?(symbol: string): Promise<Orderbook>;
  getBuySellSummary?(symbol: string): Promise<BuySellSummary>;
}
