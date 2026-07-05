import axios, { AxiosInstance, AxiosError } from 'axios';
import { BrokerageAdapter } from '../BrokerageAdapter';
import { CandleData, Period, SearchResult, StockPrice } from '../../types/stock';
import {
  KISOAuthResponse,
  KISPriceResponse,
  KISDailyPriceResponse,
  KISStockInfoResponse,
} from './kisTypes';
import { searchStockList } from './stockList';

// 전일대비부호 → 부호 변환
// 1: 상한, 2: 상승 → +1 / 3: 보합 → 0 / 4: 하한, 5: 하락 → -1
function vsSign(code: string): number {
  if (code === '1' || code === '2') return 1;
  if (code === '4' || code === '5') return -1;
  return 0;
}

function assertSuccess(rt_cd: string, msg1: string): void {
  if (rt_cd !== '0') throw new Error(`KIS API 오류: ${msg1} (rt_cd=${rt_cd})`);
}

// 한국투자증권 OpenAPI 어댑터
// 개발자 신청: https://apiportal.koreainvestment.com
// 환경변수: KIS_APP_KEY, KIS_APP_SECRET
// 모의투자: KIS_PAPER=true (기본값 실전투자)
export class KISAdapter implements BrokerageAdapter {
  readonly name: string;
  private readonly baseUrl: string;
  private readonly appKey: string;
  private readonly appSecret: string;
  private readonly isPaper: boolean;
  private http: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    this.isPaper = process.env.KIS_PAPER === 'true';
    this.baseUrl = this.isPaper
      ? (process.env.KIS_BASE_URL ?? 'https://openapifintechtest.koreainvestment.com:9443')
      : (process.env.KIS_BASE_URL ?? 'https://openapi.koreainvestment.com:9443');
    this.appKey = process.env.KIS_APP_KEY ?? '';
    this.appSecret = process.env.KIS_APP_SECRET ?? '';
    this.name = `한국투자증권${this.isPaper ? ' (모의)' : ''}`;

    if (!this.appKey || !this.appSecret) {
      throw new Error('KIS_APP_KEY, KIS_APP_SECRET 환경변수를 설정하세요.');
    }

    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: { appkey: this.appKey, appsecret: this.appSecret },
    });
  }

  private trId(realId: string): string {
    // 모의투자는 tr_id 첫 글자 F → V 치환
    return this.isPaper ? realId.replace(/^F/, 'V') : realId;
  }

  private async ensureToken(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return;

    try {
      const res = await axios.post<KISOAuthResponse>(`${this.baseUrl}/oauth2/tokenP`, {
        grant_type: 'client_credentials',
        appkey: this.appKey,
        appsecret: this.appSecret,
      });

      this.accessToken = res.data.access_token;
      // expires_in은 초 단위. 만료 60초 전에 갱신
      this.tokenExpiresAt = Date.now() + res.data.expires_in * 1000 - 60_000;
      this.http.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
    } catch (err) {
      const msg = (err as AxiosError<{ msg1?: string }>).response?.data?.msg1;
      throw new Error(`KIS 인증 실패: ${msg ?? (err as Error).message}`);
    }
  }

  async getStockPrice(symbol: string): Promise<StockPrice> {
    await this.ensureToken();

    let res;
    try {
      res = await this.http.get<KISPriceResponse>(
        '/uapi/domestic-stock/v1/quotations/inquire-price',
        {
          headers: { tr_id: this.trId('FHKST01010100') },
          params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: symbol },
        }
      );
    } catch (err) {
      const msg = (err as AxiosError<{ msg1?: string }>).response?.data?.msg1;
      throw new Error(`현재가 조회 실패: ${msg ?? (err as Error).message}`);
    }

    assertSuccess(res.data.rt_cd, res.data.msg1);
    const d = res.data.output;
    const sign = vsSign(d.prdy_vrss_sign);

    return {
      symbol,
      name: d.hts_kor_isnm,
      currentPrice: Number(d.stck_prpr),
      changePrice: Math.abs(Number(d.prdy_vrss)) * sign,
      changeRate: Math.abs(Number(d.prdy_ctrt)) * sign,
      volume: Number(d.acml_vol),
      highPrice: Number(d.stck_hgpr),
      lowPrice: Number(d.stck_lwpr),
      openPrice: Number(d.stck_oprc),
      prevClosePrice: Number(d.stck_sdpr),
      marketCap: d.hts_avls ? Number(d.hts_avls) * 100_000_000 : undefined,
      currency: 'KRW',
      market: d.rprs_mrkt_kor_name || 'KOSPI',
      timestamp: new Date().toISOString(),
    };
  }

  async getStockHistory(symbol: string, period: Period, count = 60): Promise<CandleData[]> {
    await this.ensureToken();

    let res;
    try {
      res = await this.http.get<KISDailyPriceResponse>(
        '/uapi/domestic-stock/v1/quotations/inquire-daily-price',
        {
          headers: { tr_id: this.trId('FHKST01010400') },
          params: {
            FID_COND_MRKT_DIV_CODE: 'J',
            FID_INPUT_ISCD: symbol,
            FID_PERIOD_DIV_CODE: period, // D | W | M
            FID_ORG_ADJ_PRC: '0',        // 0: 수정주가 미반영
          },
        }
      );
    } catch (err) {
      const msg = (err as AxiosError<{ msg1?: string }>).response?.data?.msg1;
      throw new Error(`시세 조회 실패: ${msg ?? (err as Error).message}`);
    }

    assertSuccess(res.data.rt_cd, res.data.msg1);

    return (res.data.output2 ?? []).slice(0, count).map((row) => {
      const d = row.stck_bsop_date;
      return {
        date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
        open: Number(row.stck_oprc),
        high: Number(row.stck_hgpr),
        low: Number(row.stck_lwpr),
        close: Number(row.stck_clpr),
        volume: Number(row.acml_vol),
      };
    });
  }

  async searchStocks(query: string): Promise<SearchResult[]> {
    // 1단계: 로컬 종목 목록에서 이름/코드 검색
    const localResults = searchStockList(query);
    if (localResults.length > 0) return localResults;

    // 2단계: 로컬 미매칭 시 코드 직접 조회 (6자리 숫자인 경우)
    if (/^\d{6}$/.test(query.trim())) {
      return this.lookupByCode(query.trim());
    }

    return [];
  }

  private async lookupByCode(symbol: string): Promise<SearchResult[]> {
    await this.ensureToken();

    try {
      const res = await this.http.get<KISStockInfoResponse>(
        '/uapi/domestic-stock/v1/quotations/search-stock-info',
        {
          headers: { tr_id: 'CTPF1002R', custtype: 'P' },
          params: { PRDT_TYPE_CD: '300', PDNO: symbol },
        }
      );

      if (res.data.rt_cd !== '0' || !res.data.output?.prdt_abrv_name) return [];

      const o = res.data.output;
      const marketMap: Record<string, string> = { KSC: 'KOSPI', KDQ: 'KOSDAQ' };
      return [
        {
          symbol: o.shtn_pdno || o.pdno,
          name: o.prdt_abrv_name,
          market: marketMap[o.mket_id_cd] ?? o.mket_id_cd,
        },
      ];
    } catch {
      return [];
    }
  }
}
