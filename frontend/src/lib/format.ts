const nfInt = new Intl.NumberFormat('ko-KR');
const nfDec = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtInt = (v: number | null | undefined) =>
  v === null || v === undefined ? '-' : nfInt.format(v);

export const fmtPrice = (v: number | null | undefined) =>
  v === null || v === undefined ? '-' : `${nfInt.format(v)}원`;

export const fmtPct = (v: number | null | undefined, digits = 2) => {
  if (v === null || v === undefined) return '-';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(digits)}%`;
};

export const fmtSfi = (v: number | null | undefined) => {
  if (v === null || v === undefined) return '-';
  const sign = v > 0 ? '+' : '';
  return `${sign}${nfDec.format(v)}`;
};

export const fmtCompactKRW = (v: number) => {
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}조`;
  if (v >= 1e8) return `${(v / 1e8).toFixed(0)}억`;
  if (v >= 1e4) return `${(v / 1e4).toFixed(0)}만`;
  return nfInt.format(v);
};

export const fmtDate = (s: string) => s.replaceAll('-', '.');
