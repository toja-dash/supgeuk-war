import type {
  ArchiveCasesResponse,
  ArchiveSummary,
  Candle,
  CaseStudy,
  DailyFlow,
  MaEvent,
  MarketBrief,
  MarketDominance,
  MarketSignals,
  ScreenerResponse,
  SectorBubble,
  SignalType,
  SimilarPattern,
  StockInfo,
} from '../types/api';

// 시그널 카드용 스파크라인 (Type A/B/C/D)
export const mockSparklines: Record<SignalType, number[]> = {
  A: [22, 21, 20, 19, 18, 16, 15, 14, 13, 12, 12], // 위험 — 우하향
  B: [10, 12, 13, 15, 18, 21, 24, 26, 27, 28, 28], // 강세 — 우상향
  C: [38, 41, 39, 43, 40, 44, 41, 45, 42, 46, 45], // 충돌 — 진폭
  D: [33, 31, 32, 30, 31, 30, 32, 31, 30, 32, 31], // 방어 — 횡보
};

// Case Study (Type별 대표 백테스트 사례)
export const mockCaseStudies: Record<SignalType, CaseStudy[]> = {
  A: [
    {
      type: 'A',
      name: 'LG화학',
      ticker: '051910',
      period: '2024-03',
      headline: '외인·기관 동반 매도 + 방어선 붕괴',
      description: '연속 3거래일 누적 -2,800억 순매도, 회복까지 14거래일 소요.',
      metric_value: -7.4,
      metric_label: '10일 수익률',
    },
    {
      type: 'A',
      name: '카카오',
      ticker: '035720',
      period: '2023-07',
      headline: '쌍끌이 설거지 발생 후 단기 급락',
      description: '20일선 데드크로스와 함께 외인 비중 1.2%p 축소.',
      metric_value: -5.8,
      metric_label: '5일 수익률',
    },
    {
      type: 'A',
      name: '셀트리온',
      ticker: '068270',
      period: '2024-09',
      headline: '시가총액 상위주 동반 이탈',
      description: '기관 SFI -8.2, 외인 SFI -6.4로 동반 강매도.',
      metric_value: -4.2,
      metric_label: '5일 수익률',
    },
  ],
  B: [
    {
      type: 'B',
      name: '삼성전자',
      ticker: '005930',
      period: '2024-08',
      headline: '외인·기관 동반 순매수 7일 지속',
      description: '코스피 약세 구간에서도 수급 우위 유지. Type B 시그널 모범 사례.',
      metric_value: 8.2,
      metric_label: '5일 수익률',
    },
    {
      type: 'B',
      name: 'SK하이닉스',
      ticker: '000660',
      period: '2024-04',
      headline: '반도체 슈퍼사이클 진입 직전 매집',
      description: '20일 누적 +1.4조원 순매수, 평단가 위 안전 구역 진입.',
      metric_value: 12.5,
      metric_label: '20일 수익률',
    },
    {
      type: 'B',
      name: '현대차',
      ticker: '005380',
      period: '2025-01',
      headline: '연초 외인 컴백 + 기관 동반 매수',
      description: '실적 컨센서스 상향과 동시 수급 부각.',
      metric_value: 6.4,
      metric_label: '5일 수익률',
    },
  ],
  C: [
    {
      type: 'C',
      name: '카카오',
      ticker: '035720',
      period: '2024-05',
      headline: '외인 매도 vs 기관 매수 충돌',
      description: '5거래일간 변동성 확대, 평균 일중 변동폭 3.1%.',
      metric_value: 3.1,
      metric_label: '일중 변동폭',
    },
    {
      type: 'C',
      name: 'NAVER',
      ticker: '035420',
      period: '2024-11',
      headline: '기관 빨아들이고 외인 던지는 엇갈림',
      description: '20일 평균 SFI 격차 12pt — 방향성 모호 구간.',
      metric_value: 2.7,
      metric_label: '일중 변동폭',
    },
    {
      type: 'C',
      name: '삼성바이오로직스',
      ticker: '207940',
      period: '2025-02',
      headline: '바이오 섹터 순환 매매',
      description: '바이오 ETF 자금 유입과 종목별 디커플링.',
      metric_value: 3.6,
      metric_label: '일중 변동폭',
    },
  ],
  D: [
    {
      type: 'D',
      name: 'KB금융',
      ticker: '105560',
      period: '2024-10',
      headline: '외인 평단 방어선 터치 후 반등',
      description: '20일 평단가 67,800원 지지 후 +4.8% 반등 마감.',
      metric_value: 4.8,
      metric_label: '20일 반등률',
    },
    {
      type: 'D',
      name: '신한지주',
      ticker: '055550',
      period: '2025-03',
      headline: '기관 방어선에서 다중 지지 확인',
      description: '동일 평단가 부근 3회 지지 후 추세 전환.',
      metric_value: 5.6,
      metric_label: '20일 반등률',
    },
    {
      type: 'D',
      name: '하나금융지주',
      ticker: '086790',
      period: '2024-12',
      headline: '연말 배당 매물 흡수 후 방어',
      description: '외인 평단 방어 + 단기 거래량 급감.',
      metric_value: 3.9,
      metric_label: '20일 반등률',
    },
  ],
};

export const mockMarketBrief: MarketBrief = {
  date: '2026-05-13',
  market_brief_text:
    '오늘 코스피는 외국인의 반도체 집중 매수로 상승 마감했으나, 코스닥은 2차전지 쌍끌이 매도로 하락했습니다.',
  kospi_close: 2654.21,
  kospi_change_pct: 1.2,
  kosdaq_close: 842.11,
  kosdaq_change_pct: -0.5,
  usdkrw_close: 1350.2,
  status_badge: 'confirmed',
};

export const mockDominance: MarketDominance = {
  kospi: { indi: -42, inst: 18, frgn: 65 },
  kosdaq: { indi: 28, inst: -22, frgn: -38 },
};

export const mockSectors: SectorBubble[] = [
  { sector: '반도체', sfi_inst: 5.2, sfi_frgn: 8.1, trade_value: 3.2e12, dominant_type: 'B' },
  { sector: '2차전지', sfi_inst: 6.4, sfi_frgn: -3.1, trade_value: 1.8e12, dominant_type: 'D' },
  { sector: '자동차', sfi_inst: 1.2, sfi_frgn: 2.0, trade_value: 9e11, dominant_type: 'B' },
  { sector: '바이오', sfi_inst: -4.2, sfi_frgn: 3.5, trade_value: 6e11, dominant_type: 'C' },
  { sector: '인터넷', sfi_inst: -6.8, sfi_frgn: -5.4, trade_value: 7e11, dominant_type: 'A' },
  { sector: '금융', sfi_inst: 2.1, sfi_frgn: -1.2, trade_value: 5e11, dominant_type: 'D' },
  { sector: '화학', sfi_inst: -2.8, sfi_frgn: 4.6, trade_value: 4e11, dominant_type: 'C' },
];

export const mockSignals: MarketSignals = {
  count_a: 12,
  count_b: 28,
  count_c: 45,
  count_d: 31,
  top_picks: {
    A: [
      { ticker: '247540', name: '에코프로비엠', type: 'A', change_pct: -3.2, type_intensity: 0.85 },
      { ticker: '950210', name: '프레스티지바이오', type: 'A', change_pct: -2.8, type_intensity: 0.74 },
      { ticker: '051910', name: 'LG화학', type: 'A', change_pct: -2.5, type_intensity: 0.66 },
    ],
    B: [
      { ticker: '005930', name: '삼성전자', type: 'B', change_pct: 2.3, type_intensity: 0.92 },
      { ticker: '005380', name: '현대차', type: 'B', change_pct: 1.7, type_intensity: 0.83 },
      { ticker: '000270', name: '기아', type: 'B', change_pct: 1.4, type_intensity: 0.75 },
      { ticker: '000660', name: 'SK하이닉스', type: 'B', change_pct: 2.8, type_intensity: 0.88 },
      { ticker: '035420', name: 'NAVER', type: 'B', change_pct: 0.9, type_intensity: 0.62 },
    ],
    C: [
      { ticker: '068270', name: '셀트리온', type: 'C', change_pct: 0.4, type_intensity: 0.71 },
      { ticker: '035720', name: '카카오', type: 'C', change_pct: -0.8, type_intensity: 0.65 },
      { ticker: '207940', name: '삼성바이오로직스', type: 'C', change_pct: 1.1, type_intensity: 0.58 },
    ],
    D: [
      { ticker: '105560', name: 'KB금융', type: 'D', change_pct: -0.2, type_intensity: 0.55 },
      { ticker: '055550', name: '신한지주', type: 'D', change_pct: 0.1, type_intensity: 0.48 },
      { ticker: '086790', name: '하나금융지주', type: 'D', change_pct: -0.3, type_intensity: 0.62 },
    ],
  },
};

const STOCK_NAMES: Array<[string, string, string, SignalType]> = [
  ['005930', '삼성전자', '반도체', 'B'],
  ['247540', '에코프로비엠', '2차전지', 'A'],
  ['105560', 'KB금융', '금융', 'D'],
  ['068270', '셀트리온', '바이오', 'C'],
  ['051910', 'LG화학', '화학', 'A'],
  ['005380', '현대차', '자동차', 'B'],
  ['000270', '기아', '자동차', 'B'],
  ['000660', 'SK하이닉스', '반도체', 'B'],
  ['035420', 'NAVER', '인터넷', 'C'],
  ['035720', '카카오', '인터넷', 'C'],
  ['207940', '삼성바이오로직스', '바이오', 'C'],
  ['055550', '신한지주', '금융', 'D'],
];

export const mockScreener: ScreenerResponse = {
  items: STOCK_NAMES.map(([ticker, name, sector, type], i) => {
    const sign = i % 2 === 0 ? 1 : -1;
    const close = 30_000 + i * 17_500;
    const defenses: Array<'SAFE' | 'FRGN_LINE_TOUCH' | 'INST_LINE_TOUCH' | 'BREAKDOWN'> = [
      'SAFE',
      'FRGN_LINE_TOUCH',
      'INST_LINE_TOUCH',
      'BREAKDOWN',
    ];
    return {
      ticker,
      name,
      sector,
      close,
      change_pct: +((sign * (1 + (i % 4) * 0.6)).toFixed(2)),
      type,
      sfi_inst: +((sign * (1 + (i % 5) * 1.1)).toFixed(2)),
      sfi_frgn: +((-sign * (1 + (i % 3) * 1.4)).toFixed(2)),
      dominance_indi: -60 + i * 5,
      dominance_inst: 20 + (i % 6) * 8,
      dominance_frgn: 30 + (i % 5) * 7 - 15,
      defense_status: defenses[i % 4],
    };
  }),
  total: 12,
  page: 1,
  size: 20,
};

export const mockStock = (ticker: string): StockInfo => {
  const found = STOCK_NAMES.find((s) => s[0] === ticker) ?? STOCK_NAMES[0];
  const [t, name, sector, type] = found;
  return {
    ticker: t,
    name,
    sector,
    market: t.startsWith('0') ? 'KOSPI' : 'KOSDAQ',
    close: 82000,
    change_pct: 1.2,
    type,
    type_intensity: 0.78,
    sfi_inst: 5.5,
    sfi_frgn: 9.1,
    defense_status: 'SAFE',
    avg_cost_20d_inst: 79500,
    avg_cost_20d_frgn: 77200,
    deep_dive_headline: '외국인 누적 매수세 + 기관 평단 위 안전 구역',
    deep_dive_line1: '최근 7거래일 외국인 +1.2조원, 기관 +3,200억원 동반 순매수',
    deep_dive_line2: '5/20일선 골든크로스 후 평단가 위에서 안정적 흐름 유지 중',
  };
};

const candleSeed = () => {
  const out: Candle[] = [];
  const start = new Date('2026-02-13');
  let price = 76000;
  for (let i = 0; i < 60; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const open = price;
    const drift = (Math.sin(i / 3) + Math.cos(i / 7)) * 800;
    const close = Math.round(open + drift);
    const high = Math.max(open, close) + Math.round(Math.abs(drift) * 0.4) + 200;
    const low = Math.min(open, close) - Math.round(Math.abs(drift) * 0.3) - 200;
    out.push({
      date: d.toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume: 8_000_000 + Math.round(Math.abs(drift) * 1500),
    });
    price = close;
  }
  return out;
};

export const mockCandles: Candle[] = candleSeed();

export const mockFlows: DailyFlow[] = Array.from({ length: 7 }).map((_, i) => {
  const d = new Date('2026-05-05');
  d.setDate(d.getDate() + i);
  const sign = i % 2 === 0 ? 1 : -1;
  return {
    date: d.toISOString().slice(0, 10),
    net_buy_indi: -sign * (200 + i * 30),
    net_buy_inst: sign * (140 + i * 22),
    net_buy_frgn: sign * (260 + i * 35),
  };
});

export const mockMaEvents: MaEvent[] = [
  {
    date: '2026-05-08',
    event_type: 'GOLDEN_CROSS',
    short_value: 81200,
    long_value: 81050,
    interpretation: '단기 추세 강화 신호 — 5·20일선 골든크로스 발생',
  },
  {
    date: '2026-04-22',
    event_type: 'DEAD_CROSS',
    short_value: 78900,
    long_value: 79150,
    interpretation: '60·120일선 데드크로스 — 중기 모멘텀 둔화',
  },
  {
    date: '2026-03-14',
    event_type: 'GOLDEN_CROSS',
    short_value: 76500,
    long_value: 76350,
    interpretation: '5·20일선 골든크로스 — 단기 반등 신호',
  },
];

export const mockSimilarPatterns: SimilarPattern[] = [
  {
    similar_ticker: '005930',
    similar_name: '삼성전자',
    period_start: '2025-11-12',
    period_end: '2025-11-30',
    similarity: 0.92,
    return_5d: 2.1,
    return_20d: 8.5,
  },
  {
    similar_ticker: '000660',
    similar_name: 'SK하이닉스',
    period_start: '2024-08-05',
    period_end: '2024-08-23',
    similarity: 0.88,
    return_5d: -1.2,
    return_20d: 6.4,
  },
  {
    similar_ticker: '005930',
    similar_name: '삼성전자',
    period_start: '2024-03-04',
    period_end: '2024-03-22',
    similarity: 0.85,
    return_5d: 3.4,
    return_20d: 9.2,
  },
];

export const mockArchiveSummary: ArchiveSummary = {
  A: {
    total_count: 982,
    avg_return_5d: -2.6,
    win_rate_5d: 0.32,
    avg_return_20d: -5.4,
    win_rate_20d: 0.28,
    archive_summary: 'Type A (쌍끌이 설거지) 발생 후 단·중기 모두 평균 손실 구간',
  },
  B: {
    total_count: 1428,
    avg_return_5d: 3.4,
    win_rate_5d: 0.62,
    avg_return_20d: 8.1,
    win_rate_20d: 0.71,
    archive_summary: 'Type B (쌍끌이 매수) 발생 후 5일 +3.4%, 20일 +8.1% 양호',
  },
  C: {
    total_count: 1156,
    avg_return_5d: 0.4,
    win_rate_5d: 0.48,
    avg_return_20d: 2.2,
    win_rate_20d: 0.54,
    archive_summary: 'Type C (개미털기) 발생 후 단기 변동성 큼, 중기 +2.2%',
  },
  D: {
    total_count: 874,
    avg_return_5d: -0.8,
    win_rate_5d: 0.41,
    avg_return_20d: 1.6,
    win_rate_20d: 0.52,
    archive_summary: 'Type D (기관 방어) 발생 후 단기 약세, 중기 점진 회복',
  },
};

export const mockArchiveCases = (type: SignalType): ArchiveCasesResponse => {
  const seeds: Array<[string, string, string]> = [
    ['2025-10-12', '삼성전자', '반도체'],
    ['2025-08-04', '현대차', '자동차'],
    ['2024-12-18', 'NAVER', '인터넷'],
    ['2024-09-02', '카카오', '인터넷'],
    ['2024-05-21', 'LG화학', '화학'],
    ['2024-03-08', '셀트리온', '바이오'],
    ['2023-11-15', '에코프로비엠', '2차전지'],
    ['2023-08-29', 'SK하이닉스', '반도체'],
  ];
  const sign = type === 'B' ? 1 : type === 'A' ? -1 : 0.5;
  return {
    items: seeds.map(([date, name, sector], i) => ({
      date,
      ticker: `00${1000 + i}`,
      name,
      sector,
      sfi_inst: +(sign * (3 + i * 0.4)).toFixed(2),
      sfi_frgn: +(sign * (4 + i * 0.5)).toFixed(2),
      return_5d: +(sign * (2 + i * 0.3)).toFixed(2),
      return_20d: +(sign * (5 + i * 0.6)).toFixed(2),
    })),
    total: 50,
    page: 1,
    size: 50,
  };
};
