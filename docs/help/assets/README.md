# 📚 온리비 어서(Onrivi Author) 도움말 시각화 에셋 가이드 (현행화 기준: 2026년 10월)

본 디렉토리(`frontend/public/help/assets/`)는 온리비 어서의 공식 사용자 가이드, 온보딩 튜토리얼 및 도움말 모달에서 활용되는 핵심 UI 시각화 이미지 자원들을 보관합니다.

최신 소스 코드 아키텍처 및 **Modern Technical Editorial** 디자인 시스템에 맞추어 현행화된 6대 에셋의 기능과 소스 매핑 정보는 다음과 같습니다.

---

## 📌 6대 핵심 시각화 에셋 현행화 명세

| 파일명 | 에셋 명칭 | 매핑 소스 컴포넌트 | 최신 현행화 핵심 내용 |
| :--- | :--- | :--- | :--- |
| **`fig1_setup_steps.png`** | 온리비 어서 초기 세팅 4단계 워크플로우 | `MainEditorApp.tsx`, `MenuBar.tsx` | 웹/Electron 데스크톱 환경 지원, 작업장(Workspace) 및 미디어 리소스 폴더 분리, 무료 Apprentice 라이선스 활성화, 최신 AI 연동 |
| **`fig2_settings_modal.png`** | 통합 환경설정 모달 | `SettingsModal.tsx`, `useEditorSettings.ts` | 3대 전용 탭(일반/단축키/계정), 에디터 폰트 크기(13~22px) 및 굵기(SemiBold 600 포함 4단계), 고대비 모드, 기본 워터마크 설정 |
| **`fig3_dashboard_pricing.png`** | 대시보드 라이선스 및 권한 | `LicenseModal.tsx`, `authSessionHelper.ts` | 비회원/미등록 Reader 읽기 전용 보호, 무료 Apprentice 마크다운 저작, Pro/Enterprise 고급 출판(EPUB/PDF/HWPX) 및 세션 동시접속 제어 |
| **`fig4_resource_folder.png`** | 공통 리소스 폴더 지정 | `resourceSettings.ts`, `resourceMedia.ts` | 100% 로컬 보안 보관(Local-First), 상대경로 표준화(`./media/`), 도움말 정적 자산 로드 결함 방어(2026-10-14 패치) |
| **`fig5_ai_integration.png`** | AI 연결 및 모델 설정 | `AIConnectionSettings.tsx`, `gemini.ts` | Google 최신 공인 모델(Gemini 3.8 Flash, 3.7 Flash) 지원, 모델명 오입력 방지 드롭다운 강제, AES-256 키 암호화, 3대 작업 모드(질문/정리/수정) |
| **`fig6_css_gallery.png`** | 서식 관리 센터 및 디자인 시스템 | `CssStyleForm.tsx`, `cssProfile.ts` | 앱 UI와 문서 서식의 3대 영역 격리, 대한민국 4대 표준 서식 프로필, 십진 분류 자동 번호(`decimal-outline`), 미디어 캡션 독립 제어 |

---

## 🛡️ 기술적 보안 및 렌더링 보장 안내
- **도움말 에셋 경로 직결**: 마크다운 렌더러(`MarkdownViewer.tsx`)는 `/help/assets/` 및 `./assets/` 경로의 이미지를 사용자의 로컬 리소스 폴더로 오탐하지 않고, 일렉트론 데스크톱(`app://`) 및 웹 정적 라우트로 100% 안전하게 직결하여 로드합니다.
- **로컬 우선 자산 무결성**: 사용자가 작성하는 문서의 미디어 파일은 본 디렉토리가 아닌 사용자 지정 리소스 폴더(`media/`)에 엄격히 격리 저장됩니다.
