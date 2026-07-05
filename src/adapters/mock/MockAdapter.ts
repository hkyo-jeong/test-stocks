import { BrokerageAdapter } from '../BrokerageAdapter';
import { CandleData, Period, SearchResult, StockPrice } from '../../types/stock';

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

function generateHistory(basePrice: number, count: number, period: Period): CandleData[] {
  const result: CandleData[] = [];
  let price = basePrice;
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    if (period === 'D') d.setDate(d.getDate() - i);
    else if (period === 'W') d.setDate(d.getDate() - i * 7);
    else d.setMonth(d.getMonth() - i);

    const volatility = basePrice * 0.02;
    const open = price + rand(-volatility, volatility);
    const close = open + rand(-volatility, volatility);
    const high = Math.max(open, close) + rand(0, volatility * 0.5);
    const low = Math.min(open, close) - rand(0, volatility * 0.5);
    const volume = rand(5_000_000, 30_000_000);

    result.push({
      date: d.toISOString().slice(0, 10),
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
      volume,
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

  async getStockHistory(symbol: string, period: Period, count = 60): Promise<CandleData[]> {
    const stock = MOCK_STOCKS[symbol];
    if (!stock) throw new Error(`종목을 찾을 수 없습니다: ${symbol}`);
    return generateHistory(stock.basePrice, count, period);
  }

  async searchStocks(query: string): Promise<SearchResult[]> {
    const q = query.toLowerCase();
    return Object.entries(MOCK_STOCKS)
      .filter(([symbol, { name }]) => symbol.includes(q) || name.toLowerCase().includes(q))
      .map(([symbol, { name, market }]) => ({ symbol, name, market }));
  }
}
