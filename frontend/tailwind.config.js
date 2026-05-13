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
        },
        brand: {
          primary: "#6366F1",
          "primary-hover": "#4F46E5"
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
