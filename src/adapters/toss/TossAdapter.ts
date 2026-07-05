import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { BrokerageAdapter } from '../BrokerageAdapter';
import { BuySellSummary, CandleData, Orderbook, Period, SearchResult, StockPrice } from '../../types/stock';
import { searchStockList } from '../kis/stockList';
import {
  TossAccount,
  TossBuyingPowerResult,
  TossCandleInterval,
  TossCandlesResult,
  TossCommission,
  TossCurrency,
  TossEnvelope,
  TossErrorResponse,
  TossExchangeRateResult,
  TossHoldingsResult,
  TossMarketCalendarResult,
  TossOrder,
  TossOrderCancelResult,
  TossOrderCreateRequest,
  TossOrderCreateResult,
  TossOrderListStatus,
  TossOrderModifyRequest,
  TossOrderModifyResult,
  TossOrderbookResult,
  TossOrdersResult,
  TossPriceLimitResult,
  TossPriceResult,
  TossSellableQuantityResult,
  TossStockInfo,
  TossStockWarning,
  TossTokenResponse,
  TossTradeResult,
} from './tossTypes';

// 토스증권 Open API 어댑터
// 문서: https://developers.tossinvest.com/docs
// 개발자 신청: https://developers.tossinvest.com
// 환경변수 TOSS_CLIENT_ID, TOSS_CLIENT_SECRET 필요
export class TossAdapter implements BrokerageAdapter {
  readonly name = '토스증권';
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private http: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    this.baseUrl = process.env.TOSS_BASE_URL ?? 'https://openapi.tossinvest.com';
    this.clientId = process.env.TOSS_CLIENT_ID ?? '';
    this.clientSecret = process.env.TOSS_CLIENT_SECRET ?? '';

    if (!this.clientId || !this.clientSecret) {
      throw new Error('TOSS_CLIENT_ID, TOSS_CLIENT_SECRET 환경변수를 설정하세요.');
    }

    this.http = axios.create({ baseURL: this.baseUrl });
  }

  private async ensureToken(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return;

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    try {
      const res = await axios.post<TossTokenResponse>(`${this.baseUrl}/oauth2/token`, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      this.accessToken = res.data.access_token;
      this.tokenExpiresAt = Date.now() + res.data.expires_in * 1000 - 60_000;
      this.http.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
    } catch (err) {
      const msg = (err as AxiosError<{ error_description?: string; error?: string }>).response?.data;
      throw new Error(`토스증권 인증 실패: ${msg?.error_description ?? msg?.error ?? (err as Error).message}`);
    }
  }

  // 모든 요청에 토큰을 보장하고 envelope({result})를 벗겨서 반환. 실패 시 에러 envelope을 메시지로 변환.
  // 429(rate-limit-exceeded)는 Retry-After 헤더를 존중해 짧게 재시도한다 (워치리스트처럼 동시에 여러 종목을 조회할 때 흔히 발생).
  private async request<T>(config: AxiosRequestConfig, retriesLeft = 3): Promise<T> {
    await this.ensureToken();
    try {
      const res = await this.http.request<TossEnvelope<T>>(config);
      return res.data.result;
    } catch (err) {
      const e = err as AxiosError<TossErrorResponse>;

      if (e.response?.status === 429 && retriesLeft > 0) {
        const retryAfterSec = Number(e.response.headers['retry-after'] ?? 1);
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfterSec, 1) * 1000));
        return this.request<T>(config, retriesLeft - 1);
      }

      const error = e.response?.data?.error;
      throw new Error(`토스증권 API 오류${error ? ` (${error.code})` : ''}: ${error?.message ?? e.message}`);
    }
  }

  private accountHeader(accountSeq: number): AxiosRequestConfig['headers'] {
    return { 'X-Tossinvest-Account': accountSeq };
  }

  // ─── Market Data ──────────────────────────────────

  async getOrderbook(symbol: string): Promise<TossOrderbookResult> {
    return this.request<TossOrderbookResult>({
      method: 'GET',
      url: '/api/v1/orderbook',
      params: { symbol },
    });
  }

  async getPrices(symbols: string[]): Promise<TossPriceResult[]> {
    return this.request<TossPriceResult[]>({
      method: 'GET',
      url: '/api/v1/prices',
      params: { symbols: symbols.join(',') },
    });
  }

  async getTrades(symbol: string, count = 50): Promise<TossTradeResult[]> {
    return this.request<TossTradeResult[]>({
      method: 'GET',
      url: '/api/v1/trades',
      params: { symbol, count },
    });
  }

  async getPriceLimits(symbol: string): Promise<TossPriceLimitResult> {
    return this.request<TossPriceLimitResult>({
      method: 'GET',
      url: '/api/v1/price-limits',
      params: { symbol },
    });
  }

  async getCandles(
    symbol: string,
    interval: TossCandleInterval,
    opts: { count?: number; before?: string; adjusted?: boolean } = {}
  ): Promise<TossCandlesResult> {
    return this.request<TossCandlesResult>({
      method: 'GET',
      url: '/api/v1/candles',
      params: { symbol, interval, ...opts },
    });
  }

  // ─── Stock Info ───────────────────────────────────

  async getStocksInfo(symbols: string[]): Promise<TossStockInfo[]> {
    return this.request<TossStockInfo[]>({
      method: 'GET',
      url: '/api/v1/stocks',
      params: { symbols: symbols.join(',') },
    });
  }

  async getStockWarnings(symbol: string): Promise<TossStockWarning[]> {
    return this.request<TossStockWarning[]>({
      method: 'GET',
      url: `/api/v1/stocks/${symbol}/warnings`,
    });
  }

  // ─── Market Info ──────────────────────────────────

  async getExchangeRate(
    baseCurrency: TossCurrency,
    quoteCurrency: TossCurrency,
    dateTime?: string
  ): Promise<TossExchangeRateResult> {
    return this.request<TossExchangeRateResult>({
      method: 'GET',
      url: '/api/v1/exchange-rate',
      params: { baseCurrency, quoteCurrency, dateTime },
    });
  }

  async getMarketCalendarKR(date?: string): Promise<TossMarketCalendarResult> {
    return this.request<TossMarketCalendarResult>({
      method: 'GET',
      url: '/api/v1/market-calendar/KR',
      params: { date },
    });
  }

  async getMarketCalendarUS(date?: string): Promise<TossMarketCalendarResult> {
    return this.request<TossMarketCalendarResult>({
      method: 'GET',
      url: '/api/v1/market-calendar/US',
      params: { date },
    });
  }

  // ─── Account / Asset ──────────────────────────────

  async getAccounts(): Promise<TossAccount[]> {
    return this.request<TossAccount[]>({ method: 'GET', url: '/api/v1/accounts' });
  }

  async getHoldings(accountSeq: number, symbol?: string): Promise<TossHoldingsResult> {
    return this.request<TossHoldingsResult>({
      method: 'GET',
      url: '/api/v1/holdings',
      params: { symbol },
      headers: this.accountHeader(accountSeq),
    });
  }

  // ─── Order ────────────────────────────────────────

  async getOrders(
    accountSeq: number,
    status: TossOrderListStatus,
    opts: { symbol?: string; from?: string; to?: string; cursor?: string; limit?: number } = {}
  ): Promise<TossOrdersResult> {
    return this.request<TossOrdersResult>({
      method: 'GET',
      url: '/api/v1/orders',
      params: { status, ...opts },
      headers: this.accountHeader(accountSeq),
    });
  }

  async createOrder(accountSeq: number, body: TossOrderCreateRequest): Promise<TossOrderCreateResult> {
    return this.request<TossOrderCreateResult>({
      method: 'POST',
      url: '/api/v1/orders',
      data: body,
      headers: this.accountHeader(accountSeq),
    });
  }

  async getOrder(accountSeq: number, orderId: string): Promise<TossOrder> {
    return this.request<TossOrder>({
      method: 'GET',
      url: `/api/v1/orders/${orderId}`,
      headers: this.accountHeader(accountSeq),
    });
  }

  async modifyOrder(
    accountSeq: number,
    orderId: string,
    body: TossOrderModifyRequest
  ): Promise<TossOrderModifyResult> {
    return this.request<TossOrderModifyResult>({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/modify`,
      data: body,
      headers: this.accountHeader(accountSeq),
    });
  }

  async cancelOrder(accountSeq: number, orderId: string): Promise<TossOrderCancelResult> {
    return this.request<TossOrderCancelResult>({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/cancel`,
      headers: this.accountHeader(accountSeq),
    });
  }

  // ─── Order Info ───────────────────────────────────

  async getBuyingPower(accountSeq: number, currency: TossCurrency): Promise<TossBuyingPowerResult> {
    return this.request<TossBuyingPowerResult>({
      method: 'GET',
      url: '/api/v1/buying-power',
      params: { currency },
      headers: this.accountHeader(accountSeq),
    });
  }

  async getSellableQuantity(accountSeq: number, symbol: string): Promise<TossSellableQuantityResult> {
    return this.request<TossSellableQuantityResult>({
      method: 'GET',
      url: '/api/v1/sellable-quantity',
      params: { symbol },
      headers: this.accountHeader(accountSeq),
    });
  }

  async getCommissions(accountSeq: number): Promise<TossCommission[]> {
    return this.request<TossCommission[]>({
      method: 'GET',
      url: '/api/v1/commissions',
      headers: this.accountHeader(accountSeq),
    });
  }

  // ─── BrokerageAdapter 공통 인터페이스 ──────────────
  // 토스 Open API 는 현재가/기본정보/캔들이 별도 엔드포인트로 나뉘어 있어 조합해서 구성한다.

  async getStockPrice(symbol: string): Promise<StockPrice> {
    const [[stock], [priceInfo], candlesResult] = await Promise.all([
      this.getStocksInfo([symbol]),
      this.getPrices([symbol]),
      this.getCandles(symbol, '1d', { count: 2 }),
    ]);

    if (!stock || !priceInfo) throw new Error(`종목을 찾을 수 없습니다: ${symbol}`);

    const candles = [...candlesResult.candles].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const [today, prev] = candles;

    const currentPrice = Number(priceInfo.lastPrice);
    const prevClosePrice = prev ? Number(prev.closePrice) : currentPrice;
    const changePrice = currentPrice - prevClosePrice;
    const changeRate = prevClosePrice !== 0 ? (changePrice / prevClosePrice) * 100 : 0;

    return {
      symbol: stock.symbol,
      name: stock.name,
      currentPrice,
      changePrice,
      changeRate,
      volume: today ? Number(today.volume) : 0,
      highPrice: today ? Number(today.highPrice) : currentPrice,
      lowPrice: today ? Number(today.lowPrice) : currentPrice,
      openPrice: today ? Number(today.openPrice) : currentPrice,
      prevClosePrice,
      marketCap: Number(stock.sharesOutstanding) * currentPrice,
      currency: priceInfo.currency,
      market: stock.market,
      timestamp: priceInfo.timestamp ?? new Date().toISOString(),
    };
  }

  async getStockHistory(symbol: string, period: Period, count = 60, before?: string): Promise<CandleData[]> {
    if (period === '1m' || period === '5m' || period === '15m') {
      return this.getIntradayHistory(symbol, period, count, before);
    }

    // Toss 캔들 API는 1m | 1d 인터벌만 지원. 주/월봉은 일봉을 모아 직접 집계한다.
    const dailyCount = period === 'D' ? Math.min(count, 200) : 200;
    const { candles } = await this.getCandles(symbol, '1d', { count: dailyCount, before });

    const daily: CandleData[] = candles
      .map((c) => ({
        date: c.timestamp.slice(0, 10),
        open: Number(c.openPrice),
        high: Number(c.highPrice),
        low: Number(c.lowPrice),
        close: Number(c.closePrice),
        volume: Number(c.volume),
        rawTimestamp: c.timestamp,
      }))
      .sort((a, b) => a.rawTimestamp.localeCompare(b.rawTimestamp));

    if (period === 'D') return daily.slice(-count);

    const bucketKey = (date: string): string => {
      if (period === 'M') return date.slice(0, 7); // YYYY-MM
      const d = new Date(date);
      const day = d.getUTCDay();
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
      return monday.toISOString().slice(0, 10);
    };

    const buckets = new Map<string, CandleData[]>();
    for (const candle of daily) {
      const key = bucketKey(candle.date);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(candle);
      else buckets.set(key, [candle]);
    }

    const aggregated: CandleData[] = [...buckets.entries()].map(([date, group]) => ({
      date,
      open: group[0].open,
      high: Math.max(...group.map((c) => c.high)),
      low: Math.min(...group.map((c) => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, c) => sum + c.volume, 0),
      rawTimestamp: group[0].rawTimestamp,
    }));

    return aggregated.slice(-count);
  }

  // Toss는 1분봉만 제공(최대 200개)하므로 5분/15분은 1분봉을 모아 직접 집계한다.
  // 200개 제한으로 조회 가능한 구간은 한 번에 최근 최대 약 200분(1분봉 기준)이며,
  // before 커서로 이어서 호출하면 더 과거 구간을 계속 가져올 수 있다.
  private async getIntradayHistory(
    symbol: string,
    period: '1m' | '5m' | '15m',
    count: number,
    before?: string
  ): Promise<CandleData[]> {
    const { candles } = await this.getCandles(symbol, '1m', { count: 200, before });

    const minute: Array<CandleData & { rawTimestamp: string }> = candles
      .map((c) => ({
        date: c.timestamp.slice(11, 16), // HH:mm (거래소 로컬 시각, 화면 표시용)
        open: Number(c.openPrice),
        high: Number(c.highPrice),
        low: Number(c.lowPrice),
        close: Number(c.closePrice),
        volume: Number(c.volume),
        rawTimestamp: c.timestamp,
      }))
      .sort((a, b) => a.rawTimestamp.localeCompare(b.rawTimestamp));

    if (period === '1m') return minute.slice(-count);

    // 날짜(YYYY-MM-DD)까지 포함해 버킷 키를 만들어야 여러 거래일에 걸친 데이터를 이어 볼 때
    // 서로 다른 날의 같은 시각(HH:mm) 봉이 하나로 뭉치지 않는다.
    const bucketMinutes = period === '5m' ? 5 : 15;
    const bucketKey = (rawTimestamp: string): string => {
      const datePart = rawTimestamp.slice(0, 10);
      const [h, m] = rawTimestamp.slice(11, 16).split(':').map(Number);
      const flo = Math.floor((h * 60 + m) / bucketMinutes) * bucketMinutes;
      const hhmm = `${String(Math.floor(flo / 60)).padStart(2, '0')}:${String(flo % 60).padStart(2, '0')}`;
      return `${datePart} ${hhmm}`;
    };

    const buckets = new Map<string, Array<CandleData & { rawTimestamp: string }>>();
    for (const candle of minute) {
      const key = bucketKey(candle.rawTimestamp);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(candle);
      else buckets.set(key, [candle]);
    }

    const aggregated: Array<CandleData & { rawTimestamp: string }> = [...buckets.entries()].map(([key, group]) => ({
      date: key.slice(11), // HH:mm (표시용)
      open: group[0].open,
      high: Math.max(...group.map((c) => c.high)),
      low: Math.min(...group.map((c) => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, c) => sum + c.volume, 0),
      rawTimestamp: group[0].rawTimestamp,
    }));

    return aggregated
      .sort((a, b) => a.rawTimestamp.localeCompare(b.rawTimestamp))
      .slice(-count);
  }

  // 호가 잔량. 매도호가는 낮은 가격순, 매수호가는 높은 가격순으로 정렬해 반환한다.
  async getOrderbookSummary(symbol: string): Promise<Orderbook> {
    const raw = await this.getOrderbook(symbol);
    return {
      timestamp: raw.timestamp,
      currency: raw.currency,
      asks: [...raw.asks]
        .map((l) => ({ price: Number(l.price), volume: Number(l.volume) }))
        .sort((a, b) => a.price - b.price),
      bids: [...raw.bids]
        .map((l) => ({ price: Number(l.price), volume: Number(l.volume) }))
        .sort((a, b) => b.price - a.price),
    };
  }

  // 최근 체결 내역의 등락(틱 룰)으로 매수/매도 체결량을 근사한다.
  // 직전 체결가보다 오르면 매수 주도, 내리면 매도 주도로 분류하고, 동일가는 직전 분류를 이어간다.
  // Toss API가 체결 주체를 직접 제공하지 않아 만든 추정치이며 실제 매수/매도와 다를 수 있다.
  async getBuySellSummary(symbol: string): Promise<BuySellSummary> {
    const trades = await this.getTrades(symbol, 50);
    const sorted = [...trades].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    let buyVolume = 0;
    let sellVolume = 0;
    let classifiedTrades = 0;
    let lastPrice: number | null = null;
    let lastSide: 'BUY' | 'SELL' | null = null;

    for (const trade of sorted) {
      const price = Number(trade.price);
      const volume = Number(trade.volume);
      let side: 'BUY' | 'SELL' | null = null;

      if (lastPrice != null) {
        if (price > lastPrice) side = 'BUY';
        else if (price < lastPrice) side = 'SELL';
        else side = lastSide;
      }

      if (side === 'BUY') { buyVolume += volume; classifiedTrades += 1; }
      else if (side === 'SELL') { sellVolume += volume; classifiedTrades += 1; }

      if (side) lastSide = side;
      lastPrice = price;
    }

    return {
      buyVolume,
      sellVolume,
      sampleTrades: sorted.length,
      classifiedTrades,
      estimated: true,
    };
  }

  async searchStocks(query: string): Promise<SearchResult[]> {
    // 1단계: 로컬 종목 목록에서 이름/코드 검색 (Toss Open API는 이름 검색을 지원하지 않음)
    const localResults = searchStockList(query);
    if (localResults.length > 0) return localResults;

    // 2단계: 로컬 미매칭 시 심볼 형식이면 직접 조회 시도 (국내 6자리 코드 또는 해외 티커)
    if (/^[A-Za-z0-9.\-]+$/.test(query.trim())) {
      try {
        const stocks = await this.getStocksInfo([query.trim()]);
        return stocks.map((s) => ({ symbol: s.symbol, name: s.name, market: s.market }));
      } catch {
        return [];
      }
    }

    return [];
  }
}
