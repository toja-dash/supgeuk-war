import type {
  ArchiveCasesResponse,
  ArchiveSummary,
  Candle,
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
      { ticker: '247540', name: '에코프로비엠', type: 'A' },
      { ticker: '950210', name: '프레스티지바이오', type: 'A' },
      { ticker: '051910', name: 'LG화학', type: 'A' },
    ],
    B: [
      { ticker: '005930', name: '삼성전자', type: 'B' },
      { ticker: '005380', name: '현대차', type: 'B' },
      { ticker: '000270', name: '기아', type: 'B' },
      { ticker: '000660', name: 'SK하이닉스', type: 'B' },
      { ticker: '035420', name: 'NAVER', type: 'B' },
    ],
    C: [
      { ticker: '068270', name: '셀트리온', type: 'C' },
      { ticker: '035720', name: '카카오', type: 'C' },
      { ticker: '207940', name: '삼성바이오로직스', type: 'C' },
    ],
    D: [
      { ticker: '105560', name: 'KB금융', type: 'D' },
      { ticker: '055550', name: '신한지주', type: 'D' },
      { ticker: '086790', name: '하나금융지주', type: 'D' },
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
