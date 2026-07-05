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
  // 이 봉에 포함된 가장 이른 원본 캔들의 ISO 타임스탬프. 더 과거 데이터를 이어서 불러올 때
  // getStockHistory의 before 커서로 사용한다. 지원하지 않는 브로커리지/구간은 생략될 수 있다.
  rawTimestamp?: string;
}

export interface SearchResult {
  symbol: string;
  name: string;
  market: string;
}

export type Period = 'D' | 'W' | 'M' | '1m' | '5m' | '15m'; // 일/주/월봉 | 분봉

export interface OrderbookLevel {
  price: number;
  volume: number;
}

export interface Orderbook {
  timestamp: string | null;
  currency: string;
  asks: OrderbookLevel[]; // 매도호가, 낮은 가격(최우선 매도호가)부터 오름차순
  bids: OrderbookLevel[]; // 매수호가, 높은 가격(최우선 매수호가)부터 내림차순
}

// 체결가 등락(틱 룰) 기준으로 매수/매도 체결량을 근사한 값. 브로커리지 API가 체결 주체(매수/매도)를
// 직접 제공하지 않아 최근 체결 내역으로부터 추정한 것이며, 실제 매수/매도 체결과 다를 수 있다.
export interface BuySellSummary {
  buyVolume: number;
  sellVolume: number;
  sampleTrades: number; // 조회된 전체 체결 건수
  classifiedTrades: number; // 그 중 매수/매도로 분류된 건수 (첫 체결 등 기준가 없는 건 제외)
  estimated: true;
}
