---
name: DESIGN
description: 수급전쟁 대시보드 디자인 토큰. 컬러·타이포·간격·컴포넌트 토큰을 단일 출처로 정의한다. dashboard-layout.md는 이 파일의 토큰명만 참조한다.
type: visualization-rule
format: Google Stitch DESIGN.md v1
theme: dark-only
---

# 수급전쟁 Design Tokens

본 문서는 Google Stitch `DESIGN.md` 표준 포맷을 따른다.
모든 시각 속성은 **토큰명**으로 참조하며, dashboard-layout.md는 hex/px 값을 직접 쓰지 않는다.

---

## 1. Color

### 1.1 Base (다크 테마 단일)

| 토큰 | Hex | 용도 |
|---|---|---|
| `bg.canvas` | `#0B0F19` | 페이지 최하단 배경 |
| `bg.surface` | `#111827` | 카드·패널 배경 |
| `bg.surface-2` | `#1F2937` | 카드 내부 강조 영역 / hover |
| `bg.overlay` | `#0B0F19E6` | 모달·드롭다운 배경 (90% 알파) |
| `border.subtle` | `#1F2937` | 카드 외곽선 |
| `border.default` | `#374151` | 입력 필드 외곽선 |
| `border.strong` | `#4B5563` | 활성 입력 필드 |
| `text.primary` | `#F9FAFB` | 주요 텍스트·수치 |
| `text.secondary` | `#9CA3AF` | 라벨·캡션 |
| `text.muted` | `#6B7280` | 비활성 텍스트 |
| `text.inverse` | `#0B0F19` | 밝은 배지 위 텍스트 |

### 1.2 Signal — Type A~D (screening-rules.md와 1:1 매핑)

각 Type의 색은 **고정**이며 다른 의미로 재사용하지 않는다.

| 토큰 | Hex | 의미 | 적용 |
|---|---|---|---|
| `signal.typeA` | `#EF4444` | 쌍끌이 설거지 (위험 경고) | 배지·버블·범례 |
| `signal.typeB` | `#10B981` | 개미털기 (기회 포착) | 배지·버블·범례 |
| `signal.typeC` | `#06B6D4` | 외인 주도 | 배지·버블·범례 |
| `signal.typeD` | `#F59E0B` | 기관 방어 | 배지·버블·범례 |

배지 배경은 위 hex의 알파 20%(`signal.typeA-bg` = `#EF444433`),
테두리·텍스트는 100% 사용한다.

### 1.3 Defense — 평단가 방어선 4단계 (supply-analysis.md와 1:1 매핑)

| 토큰 | Hex | 조건 | 의미 |
|---|---|---|---|
| `defense.safe` | `#22C55E` | 현재가 > 외인평단 > 기관평단 | 안전 구역 |
| `defense.caution-yellow` | `#EAB308` | 외인평단 > 현재가 > 기관평단 | 외인 방어선 도달 |
| `defense.caution-orange` | `#F97316` | 외인평단 > 기관평단 > 현재가 | 기관 방어선 도달 |
| `defense.danger` | `#DC2626` | 외인 > 기관 >> 현재가 | 방어선 붕괴 |

상태 배지는 좌측에 4px 원형 dot + 라벨 텍스트로 표시한다.

### 1.4 Subject — 수급 3주체

| 토큰 | Hex | 주체 |
|---|---|---|
| `subject.개인` | `#94A3B8` | 개인 (회색 계열, 중립) |
| `subject.기관` | `#06B6D4` | 기관 (사이언) |
| `subject.외국인` | `#A855F7` | 외국인 (퍼플) |

### 1.5 Numeric — 등락률·수익률

| 토큰 | Hex | 적용 |
|---|---|---|
| `num.up` | `#EF4444` | 양수 등락률·수익률 (한국 관습: 빨강=상승) |
| `num.down` | `#3B82F6` | 음수 등락률·수익률 (파랑=하락) |
| `num.flat` | `#9CA3AF` | 0% / N/A |

> ⚠ Type A의 `signal.typeA`와 `num.up`은 동일 hex(`#EF4444`)지만
> **의미적 토큰을 분리**해서 사용한다. 같은 색이라도 등락률이면 `num.up`,
> Type 배지면 `signal.typeA`로 참조해야 후속 변경이 안전하다.

### 1.6 Status — 시스템 상태

| 토큰 | Hex | 의미 |
|---|---|---|
| `status.live` | `#22C55E` | 장중 갱신 중 (펄스 애니메이션) |
| `status.confirmed` | `#10B981` | 18:00 마감 확정 |
| `status.pending` | `#F59E0B` | 15:30 잠정치 |

---

## 2. Typography

### 2.1 Family

| 토큰 | Stack | 용도 |
|---|---|---|
| `font.display` | `Pretendard, -apple-system, system-ui, sans-serif` | 모든 본문·헤딩 |
| `font.numeric` | `'JetBrains Mono', 'SF Mono', monospace` | 가격·수익률·SFI 등 수치 |

### 2.2 Scale

| 토큰 | Size / Line | 용도 |
|---|---|---|
| `text.2xs` | 11 / 14 | 캡션·면책 고지 |
| `text.xs` | 12 / 16 | 테이블 라벨·툴팁 |
| `text.sm` | 14 / 20 | 본문·차트 축 |
| `text.base` | 16 / 24 | 카드 내 라벨 |
| `text.lg` | 18 / 28 | 카드 타이틀 |
| `text.xl` | 24 / 32 | 종목명·페이지 헤더 |
| `text.2xl` | 32 / 40 | 통계 카드 수치 |
| `text.3xl` | 40 / 48 | 종목 현재가 (Deep Dive) |

### 2.3 Weight

| 토큰 | Value | 용도 |
|---|---|---|
| `weight.regular` | 400 | 본문 |
| `weight.medium` | 500 | 라벨 |
| `weight.semibold` | 600 | 카드 타이틀·테이블 헤더 |
| `weight.bold` | 700 | 통계 카드 수치·종목명 |

---

## 3. Spacing

4px 그리드 기반.

| 토큰 | px |
|---|---|
| `space.1` | 4 |
| `space.2` | 8 |
| `space.3` | 12 |
| `space.4` | 16 |
| `space.5` | 20 |
| `space.6` | 24 |
| `space.8` | 32 |
| `space.10` | 40 |
| `space.12` | 48 |

페이지 좌우 패딩: `space.6`. 카드 내부 패딩: `space.5`.

---

## 4. Radius / Elevation

| 토큰 | Value |
|---|---|
| `radius.sm` | 4px (배지) |
| `radius.md` | 8px (입력·버튼) |
| `radius.lg` | 12px (카드) |
| `radius.xl` | 16px (모달) |
| `radius.full` | 9999px (dot·pill) |

| 토큰 | Value |
|---|---|
| `shadow.card` | `0 1px 2px #00000040` |
| `shadow.elevated` | `0 4px 12px #00000066` |
| `shadow.modal` | `0 24px 48px #00000099` |

---

## 5. Component Tokens

### 5.1 Badge — Type 배지

```
height: 24px
padding: space.1 space.2
radius: radius.sm
font: font.display / text.xs / weight.semibold
bg: signal.type{A|B|C|D}-bg   (알파 20%)
text: signal.type{A|B|C|D}    (100%)
border: 1px solid signal.type{A|B|C|D}-bg   (알파 40%)
```

### 5.2 Badge — 상태 배지 (안전/주의/위험)

```
좌측: 8px circle (defense 색) + space.1 gap
text: defense 색, text.xs, weight.medium
bg: bg.surface-2
radius: radius.full
padding: space.1 space.3
```

### 5.3 Stat Card

```
bg: bg.surface
border: 1px solid border.subtle
radius: radius.lg
padding: space.5
label: text.secondary / text.sm
value: text.primary / text.2xl / weight.bold / font.numeric
delta: num.up | num.down / text.sm
```

### 5.4 Slider (SFI 하한선)

```
track height: 4px
track bg: bg.surface-2
range bg: subject.기관  (기관SFI 슬라이더)
        | subject.외국인 (외인SFI 슬라이더)
thumb: 16px circle, bg.surface, 2px solid range색
label: 좌측 라벨 + 우측 현재값(font.numeric)
```

### 5.5 Table

```
header bg: bg.surface
header text: text.secondary / text.xs / weight.semibold / uppercase
row height: 56px
row hover: bg.surface-2
row border-bottom: 1px solid border.subtle
zebra: 사용 안 함  (다크 테마 가독성)
정렬:
  - 종목명: 좌측
  - 모든 수치: 우측 + font.numeric
  - 배지: 중앙
```

### 5.6 Tab (페이지 네비)

```
height: 40px
inactive: text.secondary
active:   text.primary + 2px bottom border (signal 색 또는 brand)
hover:    bg.surface-2
```

### 5.7 Card (카드 컨테이너)

```
bg: bg.surface
border: 1px solid border.subtle
radius: radius.lg
padding: space.5
title: text.lg / weight.semibold / text.primary
subtitle: text.sm / text.secondary
```

---

## 6. Chart Style Tokens

차트 라이브러리(Recharts) 공통 적용 값.

### 6.1 Axis / Grid

| 토큰 | Value |
|---|---|
| `chart.axis-color` | `text.muted` |
| `chart.axis-font` | `text.xs` / `font.numeric` |
| `chart.grid-color` | `border.subtle` |
| `chart.grid-style` | `stroke-dasharray: 3 3` |

### 6.2 Tooltip

```
bg: bg.overlay
border: 1px solid border.default
radius: radius.md
padding: space.3
font: text.xs
shadow: shadow.elevated
```

### 6.3 Bubble (전술 레이더 맵)

| 속성 | 매핑 |
|---|---|
| X축 | 외국인 SFI |
| Y축 | 기관 SFI |
| 크기 | 거래대금 (sqrt scale, 최소 16px / 최대 64px 지름) |
| 색상 | 수급 주도력 → `signal.typeA~D` 중 하나 |
| 알파 | 0.85 |
| stroke | 1px solid 동일 색 100% |

### 6.4 Diverging Bar (시장 3파전 주도력)

```
중앙 0축 기준 좌(매도) / 우(매수)
개인:   subject.개인
기관:   subject.기관
외국인: subject.외국인
bar height: 24px
gap between subjects: space.2
```

### 6.5 Candlestick (Deep Dive)

```
양봉 (close > open): num.up
음봉 (close < open): num.down
도지 (close = open): num.flat
wick: 1px / body: 4~8px (zoom 의존)
오버레이 라인:
  기관 평단: subject.기관, 1.5px dashed
  외인 평단: subject.외국인, 1.5px dashed
```

### 6.6 Grouped Bar (최근 7일 수급)

```
3주체 그룹: subject.개인 / 기관 / 외국인
양수: 위로 / 음수: 아래로
bar width: 8px / group gap: space.3
범례 토글로 주체별 ON/OFF
```

---

## 7. Motion

| 토큰 | Value |
|---|---|
| `motion.fast` | 150ms ease-out |
| `motion.base` | 250ms ease-out |
| `motion.slow` | 400ms ease-in-out |
| `motion.pulse` | 1.5s ease-in-out infinite (status.live 전용) |

차트 mount 애니메이션은 `motion.base` 1회만, hover 전환은 `motion.fast`.

---

## 8. Layout Grid

| 토큰 | Value |
|---|---|
| `grid.columns` | 12 |
| `grid.gutter` | `space.6` (24px) |
| `grid.max-width` | 1440px |
| `grid.page-padding-x` | `space.6` (24px) |

---

## 9. Accessibility

- 모든 텍스트는 배경 대비 WCAG AA(4.5:1) 이상.
- 색상 단독으로 의미 전달 금지: Type 배지는 색 + 텍스트("Type A") 병기.
- `defense.*` 상태는 색 dot + 라벨 텍스트("안전"/"주의"/"위험") 병기.
- 차트 hover 시 툴팁에 수치 + 의미 텍스트 동시 노출.

---

## 10. 토큰 사용 예 (dashboard-layout.md용 참조 표기법)

```
bg: bg.surface                  ← 카드 배경
text-color: text.primary        ← 본문 텍스트
font: font.numeric / text.2xl   ← 큰 수치
chart-color: signal.typeB       ← Type B 버블
hover: motion.fast              ← 트랜지션
```

dashboard-layout.md는 위 형식으로 토큰만 호출하며,
hex / px / ms 값을 본문에 직접 쓰지 않는다.

---

## 11. Tailwind 매핑 (구현 단일 출처)

본 §의 `tailwind.config.js`를 그대로 `frontend/tailwind.config.js`에 복사한다.
LLM은 임의로 hex 값을 변경하거나 클래스명을 바꾸지 않는다.

### 11.1 `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class", // 다크 단일 테마이지만 class 토글 호환
  theme: {
    extend: {
      colors: {
        canvas: "#0B0F19",
        surface: {
          DEFAULT: "#111827",
          2: "#1F2937"
        },
        overlay: "#0B0F19E6",
        border: {
          subtle: "#1F2937",
          DEFAULT: "#374151",
          strong: "#4B5563"
        },
        ink: {                       // text 토큰을 ink로 노출 (Tailwind 'text-' 충돌 회피)
          primary: "#F9FAFB",
          secondary: "#9CA3AF",
          muted: "#6B7280",
          inverse: "#0B0F19"
        },
        signal: {
          a: "#EF4444",
          b: "#10B981",
          c: "#06B6D4",
          d: "#F59E0B",
          "a-bg": "rgba(239, 68, 68, 0.20)",
          "b-bg": "rgba(16, 185, 129, 0.20)",
          "c-bg": "rgba(6, 182, 212, 0.20)",
          "d-bg": "rgba(245, 158, 11, 0.20)"
        },
        defense: {
          safe: "#22C55E",
          "caution-yellow": "#EAB308",
          "caution-orange": "#F97316",
          danger: "#DC2626"
        },
        subject: {
          indiv: "#94A3B8",
          inst: "#06B6D4",
          foreign: "#A855F7"
        },
        num: {
          up: "#EF4444",
          down: "#3B82F6",
          flat: "#9CA3AF"
        },
        status: {
          live: "#22C55E",
          confirmed: "#10B981",
          pending: "#F59E0B"
        }
      },
      fontFamily: {
        display: ["Pretendard", "system-ui", "sans-serif"],
        numeric: ['"JetBrains Mono"', '"SF Mono"', "monospace"]
      },
      fontSize: {
        "2xs": ["11px", "14px"],
        xs: ["12px", "16px"],
        sm: ["14px", "20px"],
        base: ["16px", "24px"],
        lg: ["18px", "28px"],
        xl: ["24px", "32px"],
        "2xl": ["32px", "40px"],
        "3xl": ["40px", "48px"]
      },
      spacing: {
        // 4px 그리드는 Tailwind 기본(0.25rem)과 일치하므로 추가 정의 불필요
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px"
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.25)",
        elevated: "0 4px 12px rgba(0,0,0,0.40)",
        modal: "0 24px 48px rgba(0,0,0,0.60)"
      },
      transitionDuration: {
        fast: "150ms",
        base: "250ms",
        slow: "400ms"
      },
      maxWidth: {
        page: "1440px"
      },
      keyframes: {
        pulse_signal: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.4" }
        }
      },
      animation: {
        "pulse-signal": "pulse_signal 1.5s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
```

### 11.2 글로벌 CSS

`frontend/src/styles/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body { @apply bg-canvas text-ink-primary font-display antialiased; }
  body { font-feature-settings: "tnum"; }   /* 숫자 고정폭 */
}
```

### 11.3 토큰 → Tailwind 클래스 매핑표

| 본 문서 토큰 | Tailwind 클래스 (예) |
|---|---|
| `bg.canvas` | `bg-canvas` |
| `bg.surface` | `bg-surface` |
| `bg.surface-2` | `bg-surface-2` |
| `border.subtle` | `border-border-subtle` |
| `text.primary` | `text-ink-primary` |
| `text.secondary` | `text-ink-secondary` |
| `text.muted` | `text-ink-muted` |
| `signal.typeA` | `text-signal-a` / `bg-signal-a` |
| `signal.typeA-bg` | `bg-signal-a-bg` |
| `defense.safe` | `text-defense-safe` / `bg-defense-safe` |
| `subject.기관` | `text-subject-inst` / `bg-subject-inst` |
| `subject.외국인` | `text-subject-foreign` |
| `num.up` | `text-num-up` |
| `num.down` | `text-num-down` |
| `font.numeric / text.2xl` | `font-numeric text-2xl` |
| `weight.semibold` | `font-semibold` |
| `radius.lg` | `rounded-lg` |
| `shadow.card` | `shadow-card` |
| `motion.fast` | `transition duration-fast` |
| `grid.max-width` | `max-w-page` |

> ⚠ 한국어 토큰명(`subject.기관`)은 코드에서 영문(`subject-inst`)으로 변환된다.
> 매핑: 개인 → `indiv`, 기관 → `inst`, 외국인 → `foreign`.

### 11.4 컴포넌트 사용 예

#### Type 배지

```tsx
// components/ui/Badge.tsx
const TYPE_CLASSES = {
  A: "text-signal-a bg-signal-a-bg border-signal-a/40",
  B: "text-signal-b bg-signal-b-bg border-signal-b/40",
  C: "text-signal-c bg-signal-c-bg border-signal-c/40",
  D: "text-signal-d bg-signal-d-bg border-signal-d/40",
} as const;

export function TypeBadge({ type }: { type: "A"|"B"|"C"|"D" }) {
  return (
    <span className={`inline-flex items-center h-6 px-2 rounded-sm border text-xs font-semibold ${TYPE_CLASSES[type]}`}>
      Type {type}
    </span>
  );
}
```

#### 상태 배지

```tsx
const DEFENSE_CLASSES = {
  safe:             { dot: "bg-defense-safe",            text: "text-defense-safe",            label: "안전" },
  caution_yellow:   { dot: "bg-defense-caution-yellow",  text: "text-defense-caution-yellow",  label: "외인 평단" },
  caution_orange:   { dot: "bg-defense-caution-orange",  text: "text-defense-caution-orange",  label: "기관 평단" },
  danger:           { dot: "bg-defense-danger",          text: "text-defense-danger",          label: "위험" },
} as const;

export function DefenseBadge({ state }: { state: keyof typeof DEFENSE_CLASSES }) {
  const c = DEFENSE_CLASSES[state];
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-2 text-xs font-medium">
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      <span className={c.text}>{c.label}</span>
    </span>
  );
}
```

#### 등락률 텍스트

```tsx
export function ChangePct({ value }: { value: number }) {
  const cls = value > 0 ? "text-num-up" : value < 0 ? "text-num-down" : "text-num-flat";
  const sign = value > 0 ? "+" : "";
  return <span className={`font-numeric ${cls}`}>{sign}{value.toFixed(2)}%</span>;
}
```

### 11.5 차트 토큰 사용 (Recharts)

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const COLORS = {
  indiv:   "#94A3B8",  // subject.indiv
  inst:    "#06B6D4",  // subject.inst
  foreign: "#A855F7",  // subject.foreign
};

<BarChart data={data}>
  <XAxis stroke="#6B7280" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
  <YAxis stroke="#6B7280" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
  <Tooltip contentStyle={{ background: "#0B0F19E6", border: "1px solid #374151", borderRadius: 8 }} />
  <Bar dataKey="indiv"   fill={COLORS.indiv} />
  <Bar dataKey="inst"    fill={COLORS.inst} />
  <Bar dataKey="foreign" fill={COLORS.foreign} />
</BarChart>
```

> 차트 라이브러리는 className을 받지 않으므로 hex를 직접 쓴다.
> 단, **위 §11.1 toolong tokens**의 hex만 사용하고 임의 hex 도입 금지.

---

## 12. 구현 체크리스트

- [ ] `tailwind.config.js`가 §11.1과 정확히 일치
- [ ] 모든 컴포넌트가 `bg-[...]`, `text-[...]` 같은 임의 hex 클래스를 사용하지 않는다
- [ ] Type 배지 4종이 `signal-{a|b|c|d}` 클래스로 렌더된다
- [ ] 상태 배지 4종이 `defense-{safe|caution-yellow|caution-orange|danger}` 클래스로 렌더된다
- [ ] 등락률은 항상 `text-num-up` / `text-num-down` 사용
- [ ] 본문 폰트는 `font-display`, 수치는 `font-numeric`
