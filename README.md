# 📝 온리비 어서 (Onrivi Author)

**세상에서 가장 다정하고 강력한 마크다운 문서 편집기**  
글을 사랑하는 작가님, 매일 문서와 씨름하는 기획자님, 그리고 나만의 지식을 멋지게 기록하고 싶은 개발자님을 위해 설계된 **로컬-우선(Local-first)** 마크다운 에디터입니다.

---

## 🌟 핵심 기능 (Key Features)

### 1. 완벽한 로컬 환경 & 철통 보안
* 외부 서버 없이 컴퓨터 하드디스크 내에서만 파일이 저장되어 해킹이나 데이터 유출 걱정이 없습니다. 
* 인터넷이 차단된 오프라인 환경(비행기, 폐쇄망 등)에서도 0.x초 만에 즉시 실행됩니다. (데스크탑모델 준비중)
* **보안성**: `DOMPurify`, 엄격한 `CSP`(콘텐츠 보안 정책), `safeStorage`를 적용해 악성 XSS 공격을 원천 차단합니다.

### 2. 쾌적한 한글 타이핑 경험 (Monaco Core)
* 기존 웹 기반 에디터들의 고질적인 한글(IME) 씹힘 현상, 글자 중복 입력 버그를 완벽하게 진압했습니다.
* 대용량 문서에서도 코딩용 에디터 수준의 부드럽고 가벼운 타이핑 손맛을 제공합니다.

### 3. 실시간 듀얼 스플릿 뷰 & 명품 렌더링
* 좌측에서 글을 쓰면 우측에 출판물 수준의 아름다운 문서가 **0.1초 만에 실시간 렌더링**됩니다.
* 복잡한 마크다운 문법을 외울 필요 없이 내 글의 레이아웃을 즉각적으로 눈으로 확인하세요.
* `Mermaid` 다이어그램 지원, 수식(`LaTeX`) 렌더링 지원, 미디어(동영상, 유튜브, 지도, 이미지) 스트리밍 자동 삽입.

### 4. 강력한 파일 관리 및 목차(TOC) 내비게이션
* 컴퓨터의 폴더를 그대로 인식하는 가벼운 **파일 탐색기**가 내장되어 있습니다.
* 문서 작성 시 우측에 **실시간 목차(TOC)**가 자동으로 생성되어 수백 페이지의 긴 글도 길을 잃지 않고 편집할 수 있습니다.

### 5. 완벽한 오피스(Word, Excel, 한글) 연동 복사
* 작성한 표(Table)나 문서를 복사할 때, 서식을 유지한 채 네이버 블로그나 이메일에 바로 붙여넣기가 가능합니다.
* 다중 클립보드 포맷(HTML + TSV) 기술을 적용해, 엑셀과 한글 프로그램에서도 표가 깨지지 않고 예쁘게 이식됩니다.

---

## 🛠️ 기술 스택 (Tech Stack)

### **Frontend (UI & Rendering)**
* **Core**: React 18, Next.js 14
* **Editor Engine**: Monaco Editor
* **Markdown Parser**: React-Markdown, Remark, Rehype, DOMPurify
* **Styling**: Tailwind CSS, 로컬 커스텀 CSS 프로필 엔진 탑재

### **Desktop (OS Integration)**
* **Framework**: Electron
* **Local I/O**: Node.js `fs` 네이티브 모듈 연동
* **Security**: `media://` 커스텀 프로토콜 우회 서빙, `safeStorage`

### **Backend & CI/CD**
* **Database / Auth**: Supabase (PostgreSQL, Row Level Security 탑재)
* **Hosting**: Cloudflare Pages (웹 버전)
* **CI/CD**: GitHub Actions (Husky, Lint-staged, Playwright 연동 자동 QA 파이프라인)

---

## 🚀 시작하기 (Getting Started)

본 프로젝트는 1인 개발/프라이빗 SaaS 배포를 목적으로 구성되어 있습니다.

### 1. 패키지 설치
\`\`\`bash
npm install
cd frontend && npm install
cd ../backend && npm install
\`\`\`

### 2. 로컬 개발 서버 실행
\`\`\`bash
# 프론트엔드(Next.js)와 백엔드를 동시에 실행합니다.
npm run dev

# Electron 데스크톱 앱 창을 띄웁니다.
npm run electron
\`\`\`

### 3. 프로덕션 빌드 (EXE 추출)
\`\`\`bash
npm run dist
\`\`\`
> `dist/` 폴더 내부에 Windows용 설치 파일(`.exe`) 및 포터블 버전이 생성됩니다.

---

## 📖 문서 가이드
상세한 사용법이나 아키텍처 명세는 최상위 `도움말/` 디렉토리 내부의 마크다운 문서들을 참고해 주세요.

* `06_마크다운 문법 입문 가이드.md`
* `07_이미지 및 미디어 삽입 가이드.md`
* `09_트러블슈팅 및 자주 묻는 질문.md`
* `10_시스템 아키텍처 및 기능 명세서.md`

---
© 2026 Onrivi Studio. All rights reserved.
