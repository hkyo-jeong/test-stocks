// 이름 기반 검색을 위한 주요 한국 상장 종목 목록
// KIS OpenAPI는 종목명 검색 엔드포인트를 제공하지 않으므로 로컬 목록을 사용합니다.
export interface StockEntry {
  symbol: string;
  name: string;
  market: string;
}

export const STOCK_LIST: StockEntry[] = [
  // KOSPI
  { symbol: '005930', name: '삼성전자', market: 'KOSPI' },
  { symbol: '000660', name: 'SK하이닉스', market: 'KOSPI' },
  { symbol: '373220', name: 'LG에너지솔루션', market: 'KOSPI' },
  { symbol: '207940', name: '삼성바이오로직스', market: 'KOSPI' },
  { symbol: '005380', name: '현대차', market: 'KOSPI' },
  { symbol: '000270', name: '기아', market: 'KOSPI' },
  { symbol: '068270', name: '셀트리온', market: 'KOSPI' },
  { symbol: '105560', name: 'KB금융', market: 'KOSPI' },
  { symbol: '055550', name: '신한지주', market: 'KOSPI' },
  { symbol: '035420', name: 'NAVER', market: 'KOSPI' },
  { symbol: '051910', name: 'LG화학', market: 'KOSPI' },
  { symbol: '035720', name: '카카오', market: 'KOSPI' },
  { symbol: '005490', name: 'POSCO홀딩스', market: 'KOSPI' },
  { symbol: '012330', name: '현대모비스', market: 'KOSPI' },
  { symbol: '066570', name: 'LG전자', market: 'KOSPI' },
  { symbol: '006400', name: '삼성SDI', market: 'KOSPI' },
  { symbol: '017670', name: 'SK텔레콤', market: 'KOSPI' },
  { symbol: '096770', name: 'SK이노베이션', market: 'KOSPI' },
  { symbol: '015760', name: '한국전력', market: 'KOSPI' },
  { symbol: '028260', name: '삼성물산', market: 'KOSPI' },
  { symbol: '033780', name: 'KT&G', market: 'KOSPI' },
  { symbol: '009150', name: '삼성전기', market: 'KOSPI' },
  { symbol: '032830', name: '삼성생명', market: 'KOSPI' },
  { symbol: '000810', name: '삼성화재', market: 'KOSPI' },
  { symbol: '011200', name: 'HMM', market: 'KOSPI' },
  { symbol: '086280', name: '현대글로비스', market: 'KOSPI' },
  { symbol: '047810', name: '한국항공우주', market: 'KOSPI' },
  { symbol: '000720', name: '현대건설', market: 'KOSPI' },
  { symbol: '003490', name: '대한항공', market: 'KOSPI' },
  { symbol: '009830', name: '한화솔루션', market: 'KOSPI' },
  { symbol: '003550', name: 'LG', market: 'KOSPI' },
  { symbol: '034730', name: 'SK', market: 'KOSPI' },
  { symbol: '034020', name: '두산에너빌리티', market: 'KOSPI' },
  { symbol: '097950', name: 'CJ제일제당', market: 'KOSPI' },
  { symbol: '010130', name: '고려아연', market: 'KOSPI' },
  { symbol: '003670', name: '포스코퓨처엠', market: 'KOSPI' },
  { symbol: '011170', name: '롯데케미칼', market: 'KOSPI' },
  { symbol: '030200', name: 'KT', market: 'KOSPI' },
  { symbol: '018260', name: '삼성에스디에스', market: 'KOSPI' },
  { symbol: '010950', name: 'S-Oil', market: 'KOSPI' },
  { symbol: '000100', name: '유한양행', market: 'KOSPI' },
  { symbol: '006800', name: '미래에셋증권', market: 'KOSPI' },
  { symbol: '071050', name: '한국금융지주', market: 'KOSPI' },
  { symbol: '316140', name: '우리금융지주', market: 'KOSPI' },
  { symbol: '139480', name: '이마트', market: 'KOSPI' },
  { symbol: '004020', name: '현대제철', market: 'KOSPI' },
  { symbol: '001450', name: '현대해상', market: 'KOSPI' },
  { symbol: '090430', name: '아모레퍼시픽', market: 'KOSPI' },
  { symbol: '018880', name: '한온시스템', market: 'KOSPI' },
  { symbol: '011780', name: '금호석유', market: 'KOSPI' },
  // KOSDAQ
  { symbol: '247540', name: '에코프로비엠', market: 'KOSDAQ' },
  { symbol: '086520', name: '에코프로', market: 'KOSDAQ' },
  { symbol: '323410', name: '카카오뱅크', market: 'KOSDAQ' },
  { symbol: '259960', name: '크래프톤', market: 'KOSDAQ' },
  { symbol: '352820', name: '하이브', market: 'KOSDAQ' },
  { symbol: '377300', name: '카카오페이', market: 'KOSDAQ' },
  { symbol: '302440', name: 'SK바이오사이언스', market: 'KOSDAQ' },
  { symbol: '196170', name: '알테오젠', market: 'KOSDAQ' },
  { symbol: '028300', name: 'HLB', market: 'KOSDAQ' },
  { symbol: '066970', name: '엘앤에프', market: 'KOSDAQ' },
  { symbol: '058470', name: '리노공업', market: 'KOSDAQ' },
  { symbol: '278280', name: '천보', market: 'KOSDAQ' },
  { symbol: '357780', name: '솔브레인', market: 'KOSDAQ' },
  { symbol: '214150', name: '클래시스', market: 'KOSDAQ' },
  { symbol: '950130', name: '엑스페릭스', market: 'KOSDAQ' },
  { symbol: '031980', name: '피에스케이홀딩스', market: 'KOSDAQ' },
  { symbol: '403870', name: 'HPSP', market: 'KOSDAQ' },
  { symbol: '226340', name: '본느', market: 'KOSDAQ' },
  { symbol: '241560', name: '두산밥캣', market: 'KOSDAQ' },
  { symbol: '145020', name: '휴젤', market: 'KOSDAQ' },
];

export function searchStockList(query: string): StockEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return STOCK_LIST.filter(
    (s) => s.name.toLowerCase().includes(q) || s.symbol.includes(q)
  ).slice(0, 10);
}
