# [Design System] Onrivi Author: 프리미엄 UI/UX 가이드 (v1.0)

## 1. 디자인 철학
Onrivi Author는 **"집중력을 높이는 미니멀리즘"**을 추구합니다. 불필요한 장식을 배제하고, Glassmorphism 효과와 세밀한 타이포그래피를 통해 전문가용 도구로서의 프리미엄 감성을 전달합니다.

## 2. 컬러 팔레트 (Color Palette)

### 2.1 Dark Mode (Primary)
*   **Background (Deep):** `#0e0e0e` (전역 검색, 배경 강조)
*   **Background (Surface):** `#181c20` (메인 에디터 배경)
*   **Border/Divider:** `rgba(255, 255, 255, 0.1)` (White 10%)
*   **Text (Primary):** `#ffffff` (고대비 텍스트)
*   **Text (Secondary):** `rgba(255, 255, 255, 0.6)` (부연 설명, 아이콘)

### 2.2 Light Mode
*   **Background (Deep):** `#f7f9ff` (전역 배경)
*   **Background (Surface):** `#ffffff` (에디터 및 패널)
*   **Border/Divider:** `rgba(0, 0, 0, 0.05)` (Black 5%)
*   **Text (Primary):** `#181c20` (Deep Black)

### 2.3 Accent Colors
*   **Brand Blue:** `text-blue-500` (#3b82f6) - 포인트, 선택 상태, 하이라이트
*   **Warning/Highlight:** `text-orange-500` (#f97316) - 검색 결과 강조, 특수 상태

## 3. 타이포그래피 (Typography)

### 3.1 Editor Font (Monospaced)
*   **Primary:** `'JetBrains Mono'`, `'Fira Code'`, `monospace`
*   **Size:** 기본 14px (사용자 설정에 따라 10px ~ 32px 가변)
*   **Line Height:** 1.6 (가독성 최적화)

### 3.2 UI Font (Sans-serif)
*   **Primary:** `-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`, `Roboto`, `sans-serif`
*   **Weights:** Regular(400), Semibold(600), Bold(700)

## 4. UI 컴포넌트 스타일 가이드

### 4.1 Glassmorphism (유리 효과)
*   **효과:** `backdrop-blur-md`, `bg-white/50` (라이트), `bg-black/50` (다크)
*   **적용 대상:** 모달(Modal), 플로팅 툴바, 컨텍스트 메뉴

### 4.2 Buttons & Interactions
*   **Icon Buttons:** Hover 시 `bg-black/5` 또는 `bg-white/5` 적용, 둥근 모서리(`rounded-md`).
*   **Active State:** `scale-95` 트랜지션을 통해 클릭 피드백 제공.
*   **Transitions:** 모든 색상 및 투명도 변화에 `duration-200`, `ease-in-out` 적용.

### 4.3 Sidebar (Navigation)
*   **Level Indent:** 12px 단위 계층 인덴트.
*   **Selected Item:** `border-l-2 border-blue-500`, `bg-blue-500/10` 배경 처리.

## 5. 아이콘 시스템 (Iconography)
*   **Library:** `lucide-react`
*   **Standard Size:**
    *   **Sidebar/Toolbar:** 14px
    *   **Main Actions:** 16px
    *   **Large Illustrations:** 32px~40px
*   **Stroke Width:** 2px (기본값)
