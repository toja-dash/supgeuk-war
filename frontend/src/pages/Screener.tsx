import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Slider } from '../components/ui/Slider';
import { DefenseBadge, TypeBadge, ChangePct } from '../components/ui/Badge';
import { Disclaimer } from '../components/ui/Disclaimer';
import { apiClient } from '../api/client';
import type { ScreenerResponse, ScreenerItem, SignalType, DefenseStatus } from '../types/api';
import { fmtPct, fmtPrice, fmtSfi } from '../lib/format';
import { useFilterStore } from '../stores/filterStore';

const TYPE_OPTIONS = [
  { value: 'ALL', label: '전체 사분면 (ALL)' },
  { value: 'B', label: 'Q1 · 동반 매집 구간' },
  { value: 'D', label: 'Q2 · 기관 방어 우위' },
  { value: 'A', label: 'Q3 · 동반 분산 매도' },
  { value: 'C', label: 'Q4 · 외인 단독 유입' },
];

const DEFENSE_OPTIONS = [
  { value: 'ALL', label: '전체 상태' },
  { value: 'SAFE', label: '안전 구역' },
  { value: 'FRGN_LINE_TOUCH', label: '외인 방어선 도달' },
  { value: 'INST_LINE_TOUCH', label: '기관 방어선 도달' },
  { value: 'BREAKDOWN', label: '방어선 붕괴' },
];

type SortKey = keyof Pick<
  ScreenerItem,
  'name' | 'close' | 'change_pct' | 'sfi_inst' | 'sfi_frgn' | 'dominance_indi' | 'dominance_inst' | 'dominance_frgn'
>;

export default function Screener() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useFilterStore();
  const [sortKey, setSortKey] = useState<SortKey>('change_pct');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedSector, setSelectedSector] = useState<string>(
    () => searchParams.get('sector') ?? 'ALL',
  );

  useEffect(() => {
    const next = {
      type: normalizeOption(searchParams.get('type'), TYPE_OPTIONS.map((o) => o.value), 'ALL'),
      defense: normalizeOption(searchParams.get('defense'), DEFENSE_OPTIONS.map((o) => o.value), 'ALL'),
      sfi_inst_min: normalizeNumber(searchParams.get('sfi_inst_min'), -30),
      sfi_frgn_min: normalizeNumber(searchParams.get('sfi_frgn_min'), -30),
    };

    if (
      next.type !== filters.type ||
      next.defense !== filters.defense ||
      next.sfi_inst_min !== filters.sfi_inst_min ||
      next.sfi_frgn_min !== filters.sfi_frgn_min
    ) {
      filters.setFilters(next);
    }

    const urlSector = searchParams.get('sector') ?? 'ALL';
    setSelectedSector((prev) => (prev !== urlSector ? urlSector : prev));
  }, [searchParams]);

  const updateFilter = (key: 'type' | 'defense' | 'sfi_inst_min' | 'sfi_frgn_min', value: string | number) => {
    const next = new URLSearchParams(searchParams);
    const stringValue = String(value);
    if (
      (key === 'type' && stringValue === 'ALL') ||
      (key === 'defense' && stringValue === 'ALL') ||
      ((key === 'sfi_inst_min' || key === 'sfi_frgn_min') && Number(value) === -30)
    ) {
      next.delete(key);
    } else {
      next.set(key, stringValue);
    }
    setSearchParams(next, { replace: true });
    filters.setFilters({ [key]: value } as Parameters<typeof filters.setFilters>[0]);
  };

  const { data } = useQuery({
    queryKey: [
      'screener',
      filters.type,
      filters.defense,
      filters.sfi_inst_min,
      filters.sfi_frgn_min,
    ],
    queryFn: () =>
      apiClient.get<ScreenerResponse>(
        `/screener?type=${filters.type}&defense=${filters.defense}&sfi_inst_min=${filters.sfi_inst_min}&sfi_frgn_min=${filters.sfi_frgn_min}&size=1000`,
      ),
  });

  const items = data?.items ?? [];

  const sectorOptions = useMemo(() => {
    const sectors = Array.from(new Set(items.map((it) => it.sector).filter(Boolean))).sort();
    return [
      { value: 'ALL', label: '전체 업종' },
      ...sectors.map((s) => ({ value: s, label: s })),
    ];
  }, [items]);

  const filteredItems = useMemo(() =>
    selectedSector === 'ALL' ? items : items.filter((it) => it.sector === selectedSector),
    [items, selectedSector],
  );

  const total = filteredItems.length;

  const sorted = useMemo(() => {
    const out = [...filteredItems];
    out.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return out;
  }, [filteredItems, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card title="🔍 조건 스크리닝 필터">
        <div className="grid grid-cols-1 items-end gap-5 md:grid-cols-5">
          <Select
            label="Type 선택"
            value={filters.type}
            options={TYPE_OPTIONS}
            onChange={(value) => updateFilter('type', value)}
          />
          <Select
            label="평단가 상태"
            value={filters.defense}
            options={DEFENSE_OPTIONS}
            onChange={(value) => updateFilter('defense', value)}
          />
          <Slider
            label="기관 SFI 하한선"
            value={filters.sfi_inst_min}
            min={-30}
            max={30}
            step={0.1}
            accentColor="#06B6D4"
            onChange={(value) => updateFilter('sfi_inst_min', value)}
          />
          <Slider
            label="외국인 SFI 하한선"
            value={filters.sfi_frgn_min}
            min={-30}
            max={30}
            step={0.1}
            accentColor="#A855F7"
            onChange={(value) => updateFilter('sfi_frgn_min', value)}
          />
          <Select
            label="업종 선택"
            value={selectedSector}
            options={sectorOptions}
            onChange={setSelectedSector}
          />
        </div>
      </Card>

      <Card
        title={`📋 조건 일치 종목 (${total}개)`}
        subtitle={`상위 ${sorted.length}개 표시 · 행 클릭 시 Deep Dive로 이동`}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-2xs uppercase text-ink-secondary">
                <Th onClick={() => toggleSort('name')} active={sortKey === 'name'} dir={sortDir} align="left">
                  종목명
                </Th>
                <Th onClick={() => toggleSort('close')} active={sortKey === 'close'} dir={sortDir} align="right">
                  현재가
                </Th>
                <Th align="center">TYPE</Th>
                <Th onClick={() => toggleSort('sfi_inst')} active={sortKey === 'sfi_inst'} dir={sortDir} align="right">
                  기관 SFI
                </Th>
                <Th onClick={() => toggleSort('sfi_frgn')} active={sortKey === 'sfi_frgn'} dir={sortDir} align="right">
                  외인 SFI
                </Th>
                <Th onClick={() => toggleSort('dominance_indi')} active={sortKey === 'dominance_indi'} dir={sortDir} align="right">
                  개인 주도력
                </Th>
                <Th onClick={() => toggleSort('dominance_inst')} active={sortKey === 'dominance_inst'} dir={sortDir} align="right">
                  기관 주도력
                </Th>
                <Th onClick={() => toggleSort('dominance_frgn')} active={sortKey === 'dominance_frgn'} dir={sortDir} align="right">
                  외인 주도력
                </Th>
                <Th align="center">상태</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((it) => (
                <tr
                  key={it.ticker}
                  onClick={() => navigate(`/deep-dive/${it.ticker}`)}
                  className="cursor-pointer border-b border-border-subtle/60 transition hover:bg-surface-2"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink-primary">{it.name}</div>
                    <div className="text-2xs text-ink-muted">
                      {it.ticker} · {it.sector}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-numeric text-ink-primary">{fmtPrice(it.close)}</div>
                    <ChangePct value={it.change_pct} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <TypeBadge type={it.type as SignalType} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <NumPct value={it.sfi_inst} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <NumPct value={it.sfi_frgn} />
                  </td>
                  <td className="px-4 py-3 text-right font-numeric text-ink-secondary">
                    {fmtPct(it.dominance_indi, 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-numeric text-ink-secondary">
                    {fmtPct(it.dominance_inst, 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-numeric text-ink-secondary">
                    {fmtPct(it.dominance_frgn, 0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DefenseBadge state={it.defense_status as DefenseStatus} />
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-ink-muted">
                    조건에 맞는 종목이 없습니다. 필터를 완화해 보세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Disclaimer />
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
  align,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  dir?: 'asc' | 'desc';
  align: 'left' | 'right' | 'center';
}) {
  const alignCls = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
  const justifyCls =
    align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';
  return (
    <th
      onClick={onClick}
      className={`px-4 py-2.5 font-medium tracking-wide ${alignCls} ${
        onClick ? 'cursor-pointer select-none hover:text-ink-primary' : ''
      } ${active ? 'text-ink-primary' : ''}`}
    >
      <span className={`inline-flex items-center gap-1 ${justifyCls}`}>
        {children}
        {onClick && <SortIndicator active={active} dir={dir} />}
      </span>
    </th>
  );
}

function SortIndicator({ active, dir }: { active?: boolean; dir?: 'asc' | 'desc' }) {
  const upActive = active && dir === 'asc';
  const downActive = active && dir === 'desc';
  return (
    <span className="ml-0.5 inline-flex flex-col items-center leading-none" aria-hidden>
      <span
        className={`text-[8px] leading-none ${upActive ? 'text-brand-primary' : 'text-ink-muted/40'}`}
      >
        ▲
      </span>
      <span
        className={`-mt-0.5 text-[8px] leading-none ${downActive ? 'text-brand-primary' : 'text-ink-muted/40'}`}
      >
        ▼
      </span>
    </span>
  );
}

function NumPct({ value }: { value: number }) {
  const cls = value > 0 ? 'text-num-up' : value < 0 ? 'text-num-down' : 'text-num-flat';
  return <span className={`font-numeric ${cls}`}>{fmtSfi(value)}</span>;
}

function normalizeOption(value: string | null, allowed: string[], fallback: string) {
  return value && allowed.includes(value) ? value : fallback;
}

function normalizeNumber(value: string | null, fallback: number) {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
