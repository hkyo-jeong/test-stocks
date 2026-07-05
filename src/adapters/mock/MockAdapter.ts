import { BrokerageAdapter } from '../BrokerageAdapter';
import { BuySellSummary, CandleData, Orderbook, Period, SearchResult, StockPrice } from '../../types/stock';

const MOCK_STOCKS: Record<string, { name: string; market: string; basePrice: number }> = {
  '005930': { name: '삼성전자', market: 'KOSPI', basePrice: 75000 },
  '000660': { name: 'SK하이닉스', market: 'KOSPI', basePrice: 189000 },
  '035420': { name: 'NAVER', market: 'KOSPI', basePrice: 185000 },
  '035720': { name: '카카오', market: 'KOSPI', basePrice: 42000 },
  '373220': { name: 'LG에너지솔루션', market: 'KOSPI', basePrice: 320000 },
  '000270': { name: '기아', market: 'KOSPI', basePrice: 97000 },
  '005380': { name: '현대차', market: 'KOSPI', basePrice: 228000 },
  '051910': { name: 'LG화학', market: 'KOSPI', basePrice: 285000 },
  '068270': { name: '셀트리온', market: 'KOSPI', basePrice: 178000 },
  '207940': { name: '삼성바이오로직스', market: 'KOSPI', basePrice: 820000 },
};

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const INTRADAY_STEP_MIN: Record<'1m' | '5m' | '15m', number> = { '1m': 1, '5m': 5, '15m': 15 };

// before가 주어지면 그 시점 바로 이전을 기준(anchor)으로 삼아, 과거로 스크롤할 때도
// 이어지는 구간을 계속 생성해낼 수 있도록 한다. 실제 데이터가 아니므로 값 자체는 매번 새로 합성된다.
function generateHistory(basePrice: number, count: number, period: Period, before?: string): CandleData[] {
  const result: CandleData[] = [];
  let price = basePrice;
  const anchor = before ? new Date(before) : new Date();
  const isIntraday = period === '1m' || period === '5m' || period === '15m';
  const volatility = basePrice * (isIntraday ? 0.003 : 0.02);
  const volumeRange: [number, number] = isIntraday ? [50_000, 400_000] : [5_000_000, 30_000_000];
  const offset = before ? 1 : 0; // before가 있으면 그 시점 자체는 제외하고 그 이전부터 생성

  for (let i = count - 1 + offset; i >= offset; i--) {
    let label: string;
    let d: Date;

    if (isIntraday) {
      const stepMin = INTRADAY_STEP_MIN[period as '1m' | '5m' | '15m'];
      d = new Date(anchor.getTime() - i * stepMin * 60_000);
      label = d.toISOString().slice(11, 16);
    } else {
      d = new Date(anchor);
      if (period === 'D') d.setDate(d.getDate() - i);
      else if (period === 'W') d.setDate(d.getDate() - i * 7);
      else d.setMonth(d.getMonth() - i);
      label = d.toISOString().slice(0, 10);
    }

    const open = price + rand(-volatility, volatility);
    const close = open + rand(-volatility, volatility);
    const high = Math.max(open, close) + rand(0, volatility * 0.5);
    const low = Math.min(open, close) - rand(0, volatility * 0.5);
    const volume = rand(...volumeRange);

    result.push({
      date: label,
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
      volume,
      rawTimestamp: d.toISOString(),
    });

    price = close;
  }

  return result;
}

export class MockAdapter implements BrokerageAdapter {
  readonly name = 'Mock (테스트)';

  async getStockPrice(symbol: string): Promise<StockPrice> {
    const stock = MOCK_STOCKS[symbol];
    if (!stock) throw new Error(`종목을 찾을 수 없습니다: ${symbol}`);

    const volatility = stock.basePrice * 0.03;
    const currentPrice = stock.basePrice + rand(-volatility, volatility);
    const prevClose = stock.basePrice;
    const changePrice = currentPrice - prevClose;
    const changeRate = (changePrice / prevClose) * 100;

    return {
      symbol,
      name: stock.name,
      currentPrice: Math.round(currentPrice),
      changePrice: Math.round(changePrice),
      changeRate: Math.round(changeRate * 100) / 100,
      volume: rand(5_000_000, 30_000_000),
      highPrice: Math.round(currentPrice * 1.02),
      lowPrice: Math.round(currentPrice * 0.98),
      openPrice: Math.round(prevClose * (1 + (rand(-1, 1) * 0.01))),
      prevClosePrice: prevClose,
      marketCap: Math.round(currentPrice * 5_969_782_550),
      currency: 'KRW',
      market: stock.market,
      timestamp: new Date().toISOString(),
    };
  }

  async getStockHistory(symbol: string, period: Period, count = 60, before?: string): Promise<CandleData[]> {
    const stock = MOCK_STOCKS[symbol];
    if (!stock) throw new Error(`종목을 찾을 수 없습니다: ${symbol}`);
    return generateHistory(stock.basePrice, count, period, before);
  }

  async searchStocks(query: string): Promise<SearchResult[]> {
    const q = query.toLowerCase();
    return Object.entries(MOCK_STOCKS)
      .filter(([symbol, { name }]) => symbol.includes(q) || name.toLowerCase().includes(q))
      .map(([symbol, { name, market }]) => ({ symbol, name, market }));
  }

  async getOrderbookSummary(symbol: string): Promise<Orderbook> {
    const stock = MOCK_STOCKS[symbol];
    if (!stock) throw new Error(`종목을 찾을 수 없습니다: ${symbol}`);

    const tick = Math.max(1, Math.round(stock.basePrice * 0.001));
    const asks = Array.from({ length: 10 }, (_, i) => ({
      price: stock.basePrice + (i + 1) * tick,
      volume: rand(10, 500),
    })).sort((a, b) => a.price - b.price);
    const bids = Array.from({ length: 10 }, (_, i) => ({
      price: stock.basePrice - (i + 1) * tick,
      volume: rand(10, 500),
    })).sort((a, b) => b.price - a.price);

    return { timestamp: new Date().toISOString(), currency: 'KRW', asks, bids };
  }

  async getBuySellSummary(symbol: string): Promise<BuySellSummary> {
    const stock = MOCK_STOCKS[symbol];
    if (!stock) throw new Error(`종목을 찾을 수 없습니다: ${symbol}`);

    const sampleTrades = 50;
    const buyVolume = rand(100_000, 1_000_000);
    const sellVolume = rand(100_000, 1_000_000);

    return { buyVolume, sellVolume, sampleTrades, classifiedTrades: sampleTrades - 1, estimated: true };
  }
}
