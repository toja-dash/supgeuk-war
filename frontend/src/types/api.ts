export type SignalType = 'A' | 'B' | 'C' | 'D';

export type DefenseStatus =
  | 'SAFE'
  | 'FRGN_LINE_TOUCH'
  | 'INST_LINE_TOUCH'
  | 'BREAKDOWN'
  | 'INSUFFICIENT_DATA';

export interface MarketBrief {
  date: string;
  market_brief_text: string;
  kospi_close: number;
  kospi_change_pct: number;
  kosdaq_close: number;
  kosdaq_change_pct: number;
  usdkrw_close: number;
  status_badge: 'live' | 'pending' | 'confirmed';
}

export interface MarketDominance {
  kospi: { indi: number; inst: number; frgn: number };
  kosdaq: { indi: number; inst: number; frgn: number };
}

export interface SectorBubble {
  sector: string;
  sfi_inst: number;
  sfi_frgn: number;
  trade_value: number;
  dominant_type: SignalType;
}

export interface TopPick {
  ticker: string;
  name: string;
  type: SignalType;
  type_intensity?: number;
  weighted_priority?: number;
  change_pct?: number;
}

export interface CaseStudy {
  type: SignalType;
  name: string;
  ticker: string;
  period: string;
  headline: string;
  description: string;
  metric_value: number;
  metric_label: string;
}

export interface MarketSignals {
  count_a: number;
  count_b: number;
  count_c: number;
  count_d: number;
  top_picks: Record<SignalType, TopPick[]>;
}

export interface ScreenerItem {
  ticker: string;
  name: string;
  sector: string;
  close: number;
  change_pct: number;
  type: SignalType;
  sfi_inst: number;
  sfi_frgn: number;
  dominance_indi: number;
  dominance_inst: number;
  dominance_frgn: number;
  defense_status: DefenseStatus;
}

export interface ScreenerResponse {
  items: ScreenerItem[];
  total: number;
  page: number;
  size: number;
}

export interface StockInfo {
  ticker: string;
  name: string;
  sector: string;
  market: string;
  close: number;
  change_pct: number;
  type: SignalType;
  type_intensity?: number;
  sfi_inst: number;
  sfi_frgn: number;
  defense_status: DefenseStatus;
  avg_cost_20d_inst: number | null;
  avg_cost_20d_frgn: number | null;
  deep_dive_headline: string;
  deep_dive_line1: string;
  deep_dive_line2: string;
}

export interface Candle {
  date?: string;
  time?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DailyFlow {
  date: string;
  net_buy_indi: number;
  net_buy_inst: number;
  net_buy_frgn: number;
}

export interface MaEvent {
  date: string;
  event_type: 'GOLDEN_CROSS' | 'DEAD_CROSS';
  short_value: number;
  long_value: number;
  interpretation: string;
}

export interface SimilarPattern {
  similar_ticker: string;
  similar_name: string;
  period_start: string;
  period_end: string;
  similarity: number;
  return_5d: number;
  return_20d: number;
}

export interface ArchiveSummaryItem {
  total_count: number;
  avg_return_5d: number;
  win_rate_5d: number;
  avg_return_20d: number;
  win_rate_20d: number;
  archive_summary: string;
}

export type ArchiveSummary = Record<SignalType, ArchiveSummaryItem>;

export interface ArchiveCase {
  date: string;
  ticker: string;
  name: string;
  sector: string;
  sfi_inst: number;
  sfi_frgn: number;
  return_5d: number;
  return_20d: number;
}

export interface ArchiveCasesResponse {
  items: ArchiveCase[];
  total: number;
  page: number;
  size: number;
}
