export interface KISOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  access_token_token_expired: string;
}

export interface KISPriceOutput {
  hts_kor_isnm: string;       // 종목명
  stck_prpr: string;          // 현재가
  prdy_vrss: string;          // 전일대비 (절댓값)
  prdy_vrss_sign: string;     // 전일대비부호: 1상한 2상승 3보합 4하한 5하락
  prdy_ctrt: string;          // 전일대비율 (절댓값)
  acml_vol: string;           // 누적거래량
  stck_hgpr: string;          // 당일 최고가
  stck_lwpr: string;          // 당일 최저가
  stck_oprc: string;          // 당일 시가
  stck_sdpr: string;          // 기준가 (전일종가)
  hts_avls: string;           // 시가총액 (억원)
  rprs_mrkt_kor_name: string; // 시장명 (코스피/코스닥)
}

export interface KISPriceResponse {
  rt_cd: string;   // "0" = 성공
  msg_cd: string;
  msg1: string;
  output: KISPriceOutput;
}

export interface KISDailyPriceItem {
  stck_bsop_date: string; // YYYYMMDD
  stck_oprc: string;      // 시가
  stck_hgpr: string;      // 고가
  stck_lwpr: string;      // 저가
  stck_clpr: string;      // 종가
  acml_vol: string;       // 거래량
  prdy_vrss_sign: string;
  prdy_vrss: string;
}

export interface KISDailyPriceResponse {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output1: Record<string, string>;
  output2: KISDailyPriceItem[];
}

export interface KISStockInfoOutput {
  pdno: string;           // 종목코드
  shtn_pdno: string;      // 단축 종목코드
  prdt_abrv_name: string; // 종목약어명
  mket_id_cd: string;     // 시장ID코드 (KSC=코스피, KDQ=코스닥)
}

export interface KISStockInfoResponse {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output: KISStockInfoOutput;
}
