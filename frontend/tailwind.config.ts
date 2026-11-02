// ====================================================================
// 📊 [OMD-CONFIG-tailwind-0001] tailwind.config ➔ Config
// 🎯 @KICK  : TailwindCSS 컴파일러 설정 및 컬러/폰트/스페이싱 변수 셋업
// 🛡️ @GUARD : 기존 에디터 CSS 변수 기반 컬러 유지, OMDLanding 스타일 주입
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 토큰 적용: Cobalt Authority (#1d4ed8 / #2563eb / #1e40af), Intelligence Teal (#0d9488), Kinetic Coral (#f97316), Plus Jakarta Sans 및 Inter / JetBrains Mono 폰트 스택 적용
//           : **2026-07-15** — 신규 퍼플/로즈 실버 테마 적용을 위해 하드코딩된 테마 컬러들을 CSS 변수 기반으로 동적 매핑화 패치 | **2026-06-21** — OMDLanding 이식에 필요한 세부 컬러, 폰트패밀리, 라운딩, 스페이싱 병합 패치
// 🔗 @CALLS : 없음
// ====================================================================
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 기존 에디터 CSS 변수 기반 색상 유지
        primary: "rgb(var(--primary) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "on-surface": "rgb(var(--on-surface) / <alpha-value>)",
        "surface-dim": "rgb(var(--surface-dim) / <alpha-value>)",
        "surface-bright": "rgb(var(--surface-bright) / <alpha-value>)",
        "on-surface-variant": "rgb(var(--on-surface-variant) / <alpha-value>)",
        outline: "rgb(var(--outline) / <alpha-value>)",
        "outline-variant": "rgb(var(--outline-variant) / <alpha-value>)",

        // 💡 [ONRIVI-DS-SYSTEM-003 Modern Technical Editorial] 핵심 브랜드 토큰
        cobalt: {
          DEFAULT: '#1d4ed8',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        teal: {
          DEFAULT: '#0d9488',
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          600: '#0d9488',
          700: '#0f766e',
        },
        coral: {
          DEFAULT: '#f97316',
          50: '#fff7ed',
          100: '#ffedd5',
          600: '#f97316',
          700: '#c2410c',
        },
        "line-green": "#1d4ed8",
        "line-blue": "#2563eb",
        "surface-high": "rgb(var(--surface-container-high) / <alpha-value>)",
        "text-primary": "rgb(var(--on-surface) / <alpha-value>)",
        "text-secondary": "rgb(var(--on-surface-variant) / <alpha-value>)",

        // OMDLanding 전용 색상 추가 - CSS 변수 기반 동적 매핑으로 리팩토링
        "surface-container-low": "rgb(var(--surface-container-low) / <alpha-value>)",
        "on-tertiary-container": "#ea7a5a",
        "surface-container-lowest": "rgb(var(--surface-container-lowest) / <alpha-value>)",
        "primary-fixed": "#d7f8e4",
        "on-secondary-fixed-variant": "#203da0",
        "inverse-on-surface": "#f3effb",
        "on-tertiary": "rgb(var(--on-tertiary) / <alpha-value>)",
        "on-secondary-container": "rgb(var(--on-secondary-container) / <alpha-value>)",
        "on-secondary-fixed": "#0a1b60",
        "surface-container-high": "rgb(var(--surface-container-high) / <alpha-value>)",
        "on-primary": "rgb(var(--on-primary) / <alpha-value>)",
        "surface-variant": "#eef0f2",
        "surface-container": "rgb(var(--surface-container) / <alpha-value>)",
        "on-tertiary-fixed": "#3b0900",
        "tertiary-fixed": "#ffdbd1",
        "secondary-container": "rgb(var(--secondary-container) / <alpha-value>)",
        "error": "rgb(var(--error) / <alpha-value>)",
        "inverse-surface": "#302f38",
        "inverse-primary": "#a2f0c0",
        "secondary-fixed": "#e1e9ff",
        "on-primary-fixed": "#03401b",
        "on-primary-fixed-variant": "#047530",
        "on-tertiary-fixed-variant": "#7f2a11",
        "primary-fixed-dim": "#a2f0c0",
        "on-secondary": "rgb(var(--on-secondary) / <alpha-value>)",
        "surface-tint": "#06c755",
        "primary-container": "rgb(var(--primary-container) / <alpha-value>)",
        "on-error": "rgb(var(--on-error) / <alpha-value>)",
        "on-error-container": "rgb(var(--on-error-container) / <alpha-value>)",
        "tertiary-container": "#621500",
        "secondary": "rgb(var(--secondary) / <alpha-value>)",
        "on-background": "#1b1b23",
        "surface-container-highest": "rgb(var(--surface-container-highest) / <alpha-value>)",
        "error-container": "#ffdad6",
        "secondary-fixed-dim": "#c3c0ff",
        "tertiary-fixed-dim": "#ffb5a0",
        "tertiary": "#3d0a00",
      },
      borderRadius: {
        "sm": "0.25rem",
        "DEFAULT": "0.375rem",
        "md": "0.5rem",
        "lg": "0.75rem",
        "xl": "1rem",
        "2xl": "1.5rem",
        "full": "9999px"
      },
      spacing: {
        "space-8": "2.75rem",
        "space-4": "1.4rem",
        "space-20": "5rem",
        "space-24": "6rem",
        "space-10": "3.5rem"
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "Pretendard Variable", "Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        body: ["Inter", "Pretendard Variable", "Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        ui: ["Inter", "Pretendard Variable", "Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        editor: ["JetBrains Mono", "D2Coding", "Consolas", "monospace"],
        mono: ["JetBrains Mono", "D2Coding", "Consolas", "monospace"],
        "code-block": ["JetBrains Mono", "D2Coding", "Consolas", "monospace"],
        "label-sm": ["Inter", "Pretendard Variable", "Pretendard", "sans-serif"],
        "display-sm": ["Plus Jakarta Sans", "Pretendard Variable", "Pretendard", "sans-serif"],
        "headline-sm": ["Plus Jakarta Sans", "Pretendard Variable", "Pretendard", "sans-serif"],
        "body-lg": ["Inter", "Pretendard Variable", "Pretendard", "sans-serif"],
        "label-md": ["Inter", "Pretendard Variable", "Pretendard", "sans-serif"],
        "display-lg": ["Plus Jakarta Sans", "Pretendard Variable", "Pretendard", "sans-serif"]
      },
      fontSize: {
        "label-sm": ["12px", { "lineHeight": "1.4", "fontWeight": "500" }],
        "display-sm": ["36px", { "lineHeight": "1.2", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "code-block": ["14px", { "lineHeight": "1.6", "fontWeight": "400" }],
        "headline-sm": ["24px", { "lineHeight": "1.3", "fontWeight": "600" }],
        "body-lg": ["16px", { "lineHeight": "1.75", "fontWeight": "400" }],
        "label-md": ["14px", { "lineHeight": "1.5", "fontWeight": "500" }],
        "display-lg": ["56px", { "lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "700" }]
      },
      typography: {
        DEFAULT: {
          css: {
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
