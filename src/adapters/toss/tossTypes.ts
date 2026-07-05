// 토스증권 OpenAPI 요청/응답 타입
// 참고: https://developers.tossinvest.com/docs
// OpenAPI 스펙: https://openapi.tossinvest.com/openapi-docs/latest/openapi.json

export type TossCurrency = "KRW" | "USD";
export type TossMarketCountry = "KR" | "US";

// 공통 envelope: 성공 시 { result }, 실패 시 { error } (non-2xx)
export interface TossEnvelope<T> {
  result: T;
}

export interface TossErrorBody {
  requestId: string;
  code: string;
  message: string;
  data?: Record<string, unknown> | null;
}

export interface TossErrorResponse {
  error: TossErrorBody;
}

// ─── Auth ───────────────────────────────────────────

export interface TossTokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
}

// ─── Market Data ────────────────────────────────────

export interface TossOrderbookLevel {
  price: string; // decimal string
  volume: string; // decimal string
}

export interface TossOrderbookResult {
  timestamp: string | null;
  currency: TossCurrency;
  asks: TossOrderbookLevel[];
  bids: TossOrderbookLevel[];
}

export interface TossPriceResult {
  symbol: string;
  timestamp: string | null;
  lastPrice: string;
  currency: TossCurrency;
}

export interface TossTradeResult {
  price: string;
  volume: string;
  timestamp: string;
  currency: TossCurrency;
}

export interface TossPriceLimitResult {
  timestamp: string;
  upperLimitPrice: string | null;
  lowerLimitPrice: string | null;
  currency: TossCurrency;
}

export type TossCandleInterval = "1m" | "1d";

export interface TossCandle {
  timestamp: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  closePrice: string;
  volume: string;
  currency: TossCurrency;
}

export interface TossCandlesResult {
  candles: TossCandle[];
  nextBefore: string | null;
}

// ─── Stock Info ─────────────────────────────────────

export type TossMarket =
  | "KOSPI"
  | "KOSDAQ"
  | "NYSE"
  | "NASDAQ"
  | "AMEX"
  | "KR_ETC"
  | "US_ETC";

export type TossSecurityType =
  | "STOCK"
  | "FOREIGN_STOCK"
  | "DEPOSITARY_RECEIPT"
  | "INFRASTRUCTURE_FUND"
  | "REIT"
  | "ETF"
  | "FOREIGN_ETF"
  | "ETN"
  | "STOCK_WARRANTS";

export type TossListingStatus =
  | "SCHEDULED"
  | "ACTIVE"
  | "DELISTED";

export interface TossStockInfo {
  symbol: string;
  name: string;
  englishName: string;
  isinCode: string;
  market: TossMarket;
  securityType: TossSecurityType;
  isCommonShare: boolean;
  status: TossListingStatus;
  currency: TossCurrency;
  listDate: string | null;
  delistDate: string | null;
  sharesOutstanding: string;
  leverageFactor?: string | null;
}

export type TossWarningType =
  | "LIQUIDATION_TRADING"
  | "OVERHEATED"
  | "INVESTMENT_WARNING"
  | "INVESTMENT_RISK"
  | "VI_STATIC_AND_DYNAMIC"
  | "VI_STATIC"
  | "VI_DYNAMIC"
  | "STOCK_WARRANTS";

export interface TossStockWarning {
  warningType: TossWarningType;
  exchange?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

// ─── Market Info ────────────────────────────────────

export interface TossExchangeRateResult {
  baseCurrency: TossCurrency;
  quoteCurrency: TossCurrency;
  rate: string;
  midRate: string;
  basisPoint: string;
  rateChangeType: "UP" | "EQUAL" | "DOWN";
  validFrom: string;
  validUntil: string;
}

// 장 운영 정보는 세션별로 깊게 중첩되어 있고 국내/해외 구조가 달라
// 호출부에서 필요한 필드만 골라 쓰도록 loose 하게 타입을 둔다.
export interface TossMarketCalendarDay {
  date: string;
  [session: string]: unknown;
}

export interface TossMarketCalendarResult {
  today: TossMarketCalendarDay;
  previousBusinessDay: TossMarketCalendarDay;
  nextBusinessDay: TossMarketCalendarDay;
}

// ─── Account / Asset ────────────────────────────────

export type TossAccountType =
  | "BROKERAGE"
  | "OVERSEAS_DERIVATIVES"
  | "PENSION_SAVINGS"
  | "RESHORING_INVESTMENT";

export interface TossAccount {
  accountNo: string;
  accountSeq: number;
  accountType: TossAccountType;
}

export interface TossMoney {
  krw: string;
  usd?: string | null;
}

export interface TossHoldingItem {
  symbol: string;
  name: string;
  marketCountry: TossMarketCountry;
  currency: TossCurrency;
  quantity: string;
  lastPrice: string;
  averagePurchasePrice: string;
  marketValue: {
    purchaseAmount: string;
    amount: string;
    amountAfterCost: string;
  };
  profitLoss: {
    amount: string;
    amountAfterCost: string;
    rate: string;
    rateAfterCost: string;
  };
  dailyProfitLoss: {
    amount: string;
    rate: string;
  };
  cost: {
    commission: string;
    tax?: string | null;
  };
}

export interface TossHoldingsResult {
  totalPurchaseAmount: TossMoney;
  marketValue: {
    amount: TossMoney;
    amountAfterCost: TossMoney;
  };
  profitLoss: {
    amount: TossMoney;
    amountAfterCost: TossMoney;
    rate: string;
    rateAfterCost: string;
  };
  dailyProfitLoss: {
    amount: TossMoney;
    rate: string;
  };
  items: TossHoldingItem[];
}

// ─── Order ───────────────────────────────────────────

export type TossOrderSide = "BUY" | "SELL";
export type TossOrderType = "LIMIT" | "MARKET";
export type TossTimeInForce =
  | "DAY"
  | "CLS"
  | "OPG";
export type TossOrderStatus =
  | "PENDING"
  | "PENDING_CANCEL"
  | "PENDING_REPLACE"
  | "PARTIAL_FILLED"
  | "FILLED"
  | "CANCELED"
  | "REJECTED"
  | "CANCEL_REJECTED"
  | "REPLACE_REJECTED"
  | "REPLACED";

export interface TossOrderExecution {
  filledQuantity: string;
  averageFilledPrice: string | null;
  filledAmount: string | null;
  commission: string | null;
  tax: string | null;
  filledAt: string | null;
  settlementDate: string | null;
}

export interface TossOrder {
  orderId: string;
  symbol: string;
  side: TossOrderSide;
  orderType: TossOrderType;
  timeInForce: TossTimeInForce;
  status: TossOrderStatus;
  price: string | null;
  quantity: string;
  orderAmount: string | null;
  currency: TossCurrency;
  orderedAt: string;
  canceledAt: string | null;
  execution: TossOrderExecution;
}

export interface TossOrdersResult {
  orders: TossOrder[];
  nextCursor: string | null;
  hasNext: boolean;
}

export type TossOrderListStatus =
  | "OPEN"
  | "CLOSED";

// 수량 지정 방식과 금액 지정 방식(US MARKET 전용) 중 정확히 하나만 사용
export interface TossOrderCreateQuantityBased {
  clientOrderId?: string;
  symbol: string;
  side: TossOrderSide;
  orderType: TossOrderType;
  timeInForce?: "DAY" | "CLS";
  quantity: string; // decimal string
  price?: string; // LIMIT 주문 시 필수
  confirmHighValueOrder?: boolean;
}

export interface TossOrderCreateAmountBased {
  clientOrderId?: string;
  symbol: string;
  side: TossOrderSide;
  orderType: "MARKET";
  orderAmount: string; // decimal string, USD
  confirmHighValueOrder?: boolean;
}

export type TossOrderCreateRequest =
  | TossOrderCreateQuantityBased
  | TossOrderCreateAmountBased;

export interface TossOrderCreateResult {
  orderId: string;
  clientOrderId?: string | null;
}

export interface TossOrderModifyRequest {
  orderType: TossOrderType;
  quantity?: string; // KR 필수, US 불가
  price?: string;
  confirmHighValueOrder?: boolean;
}

export interface TossOrderModifyResult {
  orderId: string;
}

export interface TossOrderCancelResult {
  orderId: string;
}

export interface TossBuyingPowerResult {
  currency: TossCurrency;
  cashBuyingPower: string;
}

export interface TossSellableQuantityResult {
  sellableQuantity: string;
}

export interface TossCommission {
  marketCountry: TossMarketCountry;
  commissionRate: string;
  startDate?: string | null;
  endDate?: string | null;
}
