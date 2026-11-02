import { CssProfile } from '../types/cssProfile';
import { normalizeBookLayout } from '../lib/picturebook';

// ====================================================================
// 📊 [OMD-CORE-cssProfile-0006] cssProfile ➔ SYSTEM_PROFILE_IDS
// 🎯 @KICK  : 시스템 프로필 식별자 목록을 정의한다
// 🚨 @PATCH : **2026-10-27** — [SNS 카드뉴스 공식 시스템 서식(sns-card-news) 신규 탑재 및 제목 단계별 활자 크기 감소폭(headingSizeOffset) 최초 기본값 '3pt' 표준화]:
//             1) 인스타그램·쓰레드·링크드인 공유에 최적화된 1:1 정사각형(sns_square) 'SNS 카드뉴스 (인스타·링크드인)' 시스템 서식(sns-card-news) 등록
//             2) DEFAULT_PROFILE, SYSTEM_PROFILES, createEmptyProfile의 headingSizeOffset 기본값을 '3pt'로 표준화
//             3) normalizeCssProfile에서 headingSizeOffset이 미정의되어 있거나 레거시 '0px'인 경우 최초 기본값 '3pt'로 자동 정규화 보장
// 🚨 @PATCH : **2026-10-26** — [글머리 기호(불릿) 레벨별 계층 설정(bulletStructure) 프로필 연동 및 정규화]:
//             1) DEFAULT_PROFILE 및 SYSTEM_PROFILES에 bulletStructure(level1: 'disc', level2: 'circle', level3: 'square') 탑재
//             2) normalizeCssProfile에서 bulletStructure 누락 시 자동 하이드레이션 병합 보장
// 🚨 @PATCH : **2026-10-26** — [인용구(blockquote) 테두리 형태 및 두께 정규화 무결성 보장]:
//             1) 전체 박스형 또는 부드러운 그림자 선택 시 DEFAULT_PROFILE의 border-left가 부활하여 선택 표시가 왜곡되던 정규화 결함 해결
//             2) border-width 조절 시 border 단축 속성이 강제 삭제되어 테두리가 실종되던 문제 해결 및 border-left: none/border: none 명시적 보존
// 🚨 @PATCH : **2026-10-25** — [이미지와 캡션 간격 초밀착(4px) 정돈]:
//             1) 시스템 서식 프로필 customCss 내 figcaption 상하 마진을 8px에서 4px로 단정히 축소하여 캡션과 이미지 간격 밀착화
// 🚨 @PATCH : **2026-10-22** — [4대 문서 표준 규격 시스템 서식 프로필(CSS Profile) 신설 탑재]:
//             1) ks-tech-standard: KS 기술표준 (1. ➔ 1.1 십진 분류, 표 상단/그림 하단 하이픈 표기, 그리드 보더)
//             2) corp-strategy-report: 대기업 전략기획서 (삼성/현대 스타일: 15px 고밀도 개조식, 상단 요약 바, 볼드 인디케이터)
//             3) academic-kdi-report: 학술·정책 연구보고서 (KDI 표준: 바탕/명조체, 장절 체계, <표 1>, [그림 1], 각주 여백)
//             4) global-tech-6pager: 글로벌 테크/아마존 6-Pager (Inter/Plus Jakarta Sans, H1~H4 시맨틱 헤딩, 콜아웃)
//             5) [전체 반영 보정] KS 제목 계층형 십진(1. ➔ 1.1 ➔ 1.1.1)·표 상단/그림 하단 '-' 캡션, 대기업 □ ➔ ○ ➔ - ➔ ㆍ 제목 기호,
//                KDI 제1장 ➔ 제1절 ➔ 1. ➔ 가. 제목 번호·<표 1> 상단/[그림 1] 하단 캡션, 6-Pager 번호 없는 시맨틱 헤딩을 실제 서식 값으로 반영
// 🚨 @PATCH : **2026-10-21** — [미디어 설명(캡션) 위치 및 표현 구문(mediaCaptionStructure) 서식 프로필 탑재]:
//             1) DEFAULT_PROFILE에 mediaCaptionStructure(position: 'top', format: 'standard', customTemplate: '**{kind} {n}. {title}**') 기본 탑재
//             2) normalizeCssProfile에서 mediaCaptionStructure 안전 병합 연동으로 모든 서식 프로필에서 미디어 캡션 환경설정 지원
// 🚨 @PATCH : **2026-10-15** — [Story Book-전체표지 시스템 서식 최신 규격(ID: profile-1792073192013, 글자크기 20px) 갱신]: 기본 본문 글자 크기를 16px에서 20px로 확대하고 신규 프로필 ID(profile-1792073192013) 반영 (기존 profile-1792072443551 하위 호환 유지)
// 🚨 @PATCH : **2026-10-15** — [그림책/동화책(Story Book) 2종 시스템 서식 신규 탑재]: 가로(Landscape) A4 규격의 'Story Book-전체표지'(full-image) 및 'Story Book - 오른쪽 그림 표지'(image-right)를 공식 시스템 프로필(SYSTEM_PROFILES, SYSTEM_PROFILE_IDS)에 등록하여 삭제 불가 표준 서식으로 제공
// 🚨 @PATCH : **2026-10-09** — [신규 시스템 서식 '편안한 전자책 서식' 추가]: 시니어 독자 및 저자를 위한 큰 글자(20px), 여유로운 줄 간격(1.85), 편안한 미색 배경(#fcfbf7), 고대비 타이포그래피 규격의 공식 시스템 서식(profile-1791514218283) 등록
// 🚨 @PATCH : **2026-10-01** — [PDF/EPUB 내보내기 페이지 나누기 기준 기본값 'none' 일원화]: 시스템 프로필, 빈 프로필 및 정규화 기본값을 'none'으로 변경하여 제목 기준 인위적 페이지 나눔 배제
// 🚨 @PATCH : **2026-10-01** — [표 미리보기-내보내기 일치화 및 기본 서식 가로선 중심(세로선 0px) 표준화]: DEFAULT_PROFILE 및 system-1의 tableStructure.colBorderWidth를 '0px'로 표준화하여 미리보기와 동일하게 외곽 테두리 및 행 가로선만 렌더링되도록 정합화
// 🚨 @PATCH : **2026-09-26** — [표 모든 테두리(Grid) 세로선 및 행/열 테두리 기본값 정합화]: DEFAULT_PROFILE의 th/td에서 잔여 레거시 'border-left': 'none' / 'border-right': 'none'을 소거하고 tableStructure(outerBorderWidth, rowBorderWidth, colBorderWidth)와 100% 동기화
// 🚨 @PATCH : **2026-09-25** — [한글 폰트 원래 시스템 폰트 복원 및 영문 세리프 적용]: Onrivi 기본서식(system-1 및 DEFAULT_PROFILE)의 pageStyle.fontFamily에서 영문은 Times New Roman/Georgia를 적용하고, 한글은 원래의 Noto Sans KR/시스템 고딕으로 복원
// 🚨 @PATCH : **2026-09-25** — [한컴 테크 블로그 프리미엄 서식 신규 탑재]: 한컴(HANCOM) 공식 블로그의 모던 테크니컬 디자인을 완벽 재현한 'Onrivi 한컴 테크 블로그 서식(hancom-tech-blog)'을 시스템 프로필로 공식 등록 (H2 오렌지 하단선, H3 오렌지 좌측바, 1.8배 본문 줄간격, 8px 문장 사이 간격, 가로선 중심 비교표, 와이드 라운드 미디어 등 반영)
// 🚨 @PATCH : **2026-09-25** — [문서 표준 용지 여백(상하 18mm, 좌우 12mm) 전 서식 일원화]: 모든 시스템 서식(SYSTEM_PROFILES), 빈 서식(createEmptyProfile), 정규화(normalizeCssProfile)의 pageStyle 여백을 marginTop: 18mm, marginBottom: 18mm, marginLeft: 12mm, marginRight: 12mm로 일원화
// 🚨 @PATCH : **2026-09-25** — [시스템 제공 서식 개편]: 구버전 서식('GitHub 기술 블로그/명세서', '공공기관 보고서 양식')을 삭제하고, 신규 시스템 제공 서식 5종('Onrivi 기술 표준 서식', 'Onrivi 법률·계약서 A4 공식 문서', 'Onrivi 네이버 블로그 감성 서식', 'Onrivi 일반 기술서적 표준 서식', 'Onrivi 공식 행사 및 가정통신문 안내장 서식')을 SYSTEM_PROFILES 및 SYSTEM_PROFILE_IDS에 공식 등록
// 🚨 @PATCH : **2026-09-25** — [체크박스 및 체크리스트 글자색 본문 기본색(#2f2f2f) 일치화]: DEFAULT_PROFILE의 taskList 및 checkboxStructure color를 본문 글자색(#2f2f2f)으로 일원화하여 별도 색상 분리 방지
// 🚨 @PATCH : **2026-09-25** — [체크리스트 완료 항목 스타일 '효과없음(none)' 기본값 통일]: DEFAULT_PROFILE rules.taskList 및 checkboxStructure.checkedEffect를 'none'으로 일원화하고, normalizeCssProfile 시 체크박스 완료 기본 효과를 무조건 'none'으로 보장
// 🚨 @PATCH : **2026-09-24** — [기본 서식 명칭 'Onrivi 기본서식' 표준화]: SYSTEM_PROFILES[0] 및 DEFAULT_PROFILE의 명칭을 'Onrivi 기본서식'으로 일원화하고, 서식 미지정/새 서식/가져오기/내보내기/AI 프롬프트의 기본 기준 서식으로 전면 확정
// 🚨 @PATCH : **2026-09-24** — [기본 서식 'ChatGPT 스타일 콘텐츠' 전환 및 전 시스템(가져오기/내보내기/정규화/프롬프트) 기본값 동기화]: DEFAULT_PROFILE 및 SYSTEM_PROFILES[0]을 'ChatGPT 스타일 콘텐츠'로 전면 교체, pageStyle 기본 여백(상하 22mm, 좌 19mm, 우 20mm), fontSize 16px, lineHeight 1.75, letterSpacing -0.01em 및 7대 쇼케이스 태그/구조체 미설정 시 폴백 기본값 일원화
// 🚨 @PATCH : **2026-09-24** — [문서 표준 용지 여백(상하 18mm, 좌우 12mm) 최적화]: DEFAULT_PROFILE(system-1) 및 SYSTEM_PROFILES(system-2, system-3), createEmptyProfile의 pageStyle 여백을 marginTop: 18mm, marginBottom: 18mm, marginLeft: 12mm, marginRight: 12mm로 일원화 (화면 가독성 및 A4 인쇄 균형 최적화)
// 🚨 @PATCH : **2026-09-24** — [표 외곽 테두리 및 열·행 두께 개별 설정(tableStructure) 지원]: outerBorderWidth(외곽 테두리), rowBorderWidth(행 가로선), colBorderWidth(열 세로선) 독립 제어 구조체 탑재 및 정규화(normalizeCssProfile) 연동
// 🚨 @PATCH : **2026-09-24** — [외부 서식 가져오기/붙여넣기/올리기 정제·정규화(sanitizeAndParseCssProfileJson, normalizeCssProfile) 엔진 표준화]: 마크다운 코드블록/주석/trailing-comma 관대 파싱, ID 중복 및 시스템 프로필 오염 0% 차단, 7대 쇼케이스(각주·수식·표·체크박스·미디어·구분선 등) 및 hrStructure/checkboxStructure 100% 자동 하이드레이션 제공
// 🚨 @PATCH : **2026-09-24** — [수식(MATH) 시스템 서식 기본 상하 마진(16px) 및 정렬 표준화]: DEFAULT_PROFILE 및 system-3의 math margin 단축 속성 잔재를 margin-top/bottom: 16px 및 text-align: center로 일원화하여 슬라이더 충돌 방어
// 🚨 @PATCH : **2026-09-24** — [미디어(이미지·비디오·지도) 기본 규격 및 상하/좌우 정렬 마진 표준화]: DEFAULT_PROFILE 및 SYSTEM_PROFILES(system-2, system-3)의 img, video, map 규칙에 기본 너비(width: 480px/560px/600px), 높이(height), 상하 마진(16px), 좌우 마진(auto)을 명시 부여하여 서식 제어 슬라이더 및 좌/중/우 정렬 변경 즉시 시각적 변화 보장
// 🚨 @PATCH : **2026-09-24** — [표준 서식 표(Table) 기본 글자 크기 상속]: system-1의 table, th, td에서 고정 font-size(13px)를 제거하여 문서 기본 글자 크기(pageStyle.fontSize)를 기본 상속하도록 최적화
// 🚨 @PATCH : **2026-09-24** — [시스템 프로필 blockquote 기본 상하 마진(16px) 통일]: system-1/2/3의 blockquote margin-top/bottom을 16px로 일원화하여 초기 슬라이더 1:1 반응 보장
// 🚨 @PATCH : **2026-09-24** — [수평 구분선(HR) 시스템 서식 규격 표준화]: system-2 및 system-3에 hrStructure 기본 규격 추가 및 rules.hr 레거시 border:0 속성 정제
// 🚨 @PATCH : **2026-09-24** — [표준 서식 H1 왼쪽 여백 정렬]: system-1 H1의 padding-left 15px를 0px로 초기화하여 H2~H6와 시작선 완벽 일치
// 🔗 @CALLS : isSystemProfileId
// ====================================================================
/**
 * 시스템 프로필 식별자 목록 — 이 ID를 가진 프로필은 수정/삭제 불가
 */
export const SYSTEM_PROFILE_IDS = [
  'system-1',
  'onrivi-help',
  'ai-friendly-report',
  'github-readme-style',
  'legal-contract-a4',
  'naver-blog-style',
  'profile-tech-book-2026',
  'profile-official-notice-letter',
  'hancom-tech-blog',
  'profile-1791514218283',
  'profile-1792072443551',
  'profile-1792073192013',
  'profile-1792072480655',
  'ks-tech-standard',
  'corp-strategy-report',
  'academic-kdi-report',
  'global-tech-6pager',
  'sns-card-news'
] as const;
export type SystemProfileId = typeof SYSTEM_PROFILE_IDS[number];

// ====================================================================
// 📊 [OMD-CORE-cssProfile-0005] cssProfile ➔ isSystemProfileId
// 🎯 @KICK  : 주어진 id가 시스템 프로필 ID인지 검사한다
// 🛡️ @GUARD : SYSTEM_PROFILE_IDS 배열에 포함된 값인지만 확인
// 🚨 @PATCH : 없음
// 🔗 @CALLS : SYSTEM_PROFILE_IDS
// ====================================================================
export function isSystemProfileId(id: string): boolean {
  return (SYSTEM_PROFILE_IDS as readonly string[]).includes(id);
}

/** 편집·미리보기에서 같은 기본값을 사용하면서 원본 서식 ID를 유지한다. */
export function resolveCssProfile(profile: CssProfile): CssProfile {
  return { ...normalizeCssProfile(profile), id: profile.id };
}

// ====================================================================
// 📊 [OMD-CORE-cssProfile-0004] cssProfile ➔ EMPTY_RULES
// 🎯 @KICK  : 모든 태그가 빈 객체인 CssRuleSet 템플릿을 제공한다
// 🛡️ @GUARD : createEmptyProfile()에서 깊은 복사하여 사용되므로 직접 참조하지 않도록 주의
// 🚨 @PATCH : 없음
// 🔗 @CALLS : createEmptyProfile
// ====================================================================
/**
 * 모든 태그가 빈 CssRuleSet을 가진 템플릿 객체입니다.
 * createEmptyProfile()에서 깊은 복사(deep clone)하여 사용합니다.
 * @see createEmptyProfile
 */
const EMPTY_RULES = {
  h1: {}, h2: {}, h3: {}, h4: {}, h5: {}, h6: {},
  p: {}, strong: {}, em: {}, del: {},
  ul: { "list-style-type": "disc" }, ol: { "list-style-type": "decimal" }, li: {}, taskList: {}, hr: {},
  table: {}, th: {}, td: {}, blockquote: {}, codeBlock: {}, codeBlockTitle: {},
  a: {}, img: {}, code: {}, video: {}, math: {},
  map: {}, footnote: {},
};

/**
 * DEFAULT_PROFILE: 애플리케이션 기본값 프로필입니다.
 * - id가 'default'이므로 CssStyleForm에서 모든 입력 필드가 비활성화(disabled)됩니다.
 * - rules는 각 태그에 최소한의 CSS 속성만 지정하여
 *   Tailwind Typography(prose)의 기본 스타일 위에 자연스럽게 얹어집니다.
 * - 사용자가 이 프로필을 선택하면 동적 CSS 주입이 중단되고(dynamicCssString === ''),
 *   MarkdownViewer가 순수 prose 스타일만 사용하게 됩니다.
 * @remarks 사용자 정의 프로필을 생성할 때도 이 객체를 얕은 복사한 뒤
 * rules만 깊은 복사하여 사용합니다. (page.tsx onAddProfile 참고)
 */
// ====================================================================
// 📊 [OMD-CORE-cssProfile-0003] cssProfile ➔ SYSTEM_PROFILES
// 🎯 @KICK  : 앱에 내장된 3개의 시스템 프로필 배열을 정의한다
// 🛡️ @GUARD : system-* 접두사 id를 가지며 수정/삭제 불가
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
/**
 * 시스템 기본 프로필 목록 (4개)
 * - 앱에 내장되어 배포되며 수정/삭제 불가
 * - id는 'system-*' 접두사 사용
 */
export const SYSTEM_PROFILES: CssProfile[] = [
  {
    "id": "system-1",
    "name": "Onrivi 기본서식",
    "description": "온리비 어서(Onrivi Author)의 공식 기본 서식 테마입니다. 정갈한 텍스트 배치와 최적화된 용지 규격을 제공합니다.",
    "pageStyle": {
      "fontFamily": "'Times New Roman', 'Georgia', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', Arial, sans-serif",
      "fontSize": "16px",
      "lineHeight": "1.75",
      "letterSpacing": "-0.01em",
      "backgroundColor": "#ffffff",
      "paperSize": "a4",
      "marginTop": "18mm",
      "marginBottom": "18mm",
      "marginLeft": "12mm",
      "marginRight": "12mm",
      "orientation": "portrait",
      "headingSizeOffset": "3pt",
      "tabSize": "2",
      "exportPageBreakLevel": "none"
    },
    "rules": {
      "h1": {
        "font-size": "32px",
        "font-weight": "700",
        "color": "#202123",
        "padding-left": "0px",
        "margin-bottom": "18px",
        "border-bottom": "",
        "margin-top": "32px",
        "text-align": "left",
        "text-decoration": "none",
        "font-style": "normal",
        "line-height": "1.25",
        "letter-spacing": "-0.025em"
      },
      "h2": {
        "font-size": "24px",
        "font-weight": "700",
        "color": "#202123",
        "border-bottom": "",
        "padding-bottom": "8px",
        "margin-top": "28px",
        "text-decoration": "none",
        "font-style": "normal",
        "margin-bottom": "14px",
        "text-align": "left",
        "line-height": "1.35",
        "letter-spacing": "-0.02em"
      },
      "h3": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "20px",
        "margin-top": "24px",
        "margin-bottom": "12px",
        "color": "#202123",
        "border-bottom": "",
        "line-height": "1.4"
      },
      "h4": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "18px",
        "margin-top": "20px",
        "margin-bottom": "10px",
        "color": "#202123",
        "border-bottom": "",
        "line-height": "1.5"
      },
      "h5": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "16px",
        "margin-top": "18px",
        "margin-bottom": "8px",
        "color": "#202123",
        "border-bottom": "",
        "line-height": "1.55"
      },
      "h6": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "15px",
        "margin-top": "16px",
        "margin-bottom": "8px",
        "color": "#6b6b6b",
        "border-bottom": "",
        "line-height": "1.55"
      },
      "p": {
        "margin-bottom": "16px",
        "margin-top": "0px",
        "line-height": "1.75",
        "color": "#2f2f2f",
        "text-align": "left",
        "text-indent": "0px",
        "letter-spacing": "-0.01em",
        "sentence-gap": "4px"
      },
      "strong": {
        "font-weight": "700",
        "color": "#202123"
      },
      "em": {
        "font-style": "italic",
        "color": "#2f2f2f"
      },
      "u": {
        "text-decoration-color": "#0d0d0d",
        "text-decoration-style": "solid",
        "text-underline-offset": "3px",
        "text-decoration": "underline"
      },
      "del": {
        "text-decoration": "line-through",
        "color": "#6b6b6b"
      },
      "ul": {
        "padding-left": "28px",
        "list-style-type": "disc",
        "color": "#2f2f2f"
      },
      "ol": {
        "padding-left": "28px",
        "color": "#2f2f2f",
        "list-style-type": "decimal"
      },
      "li": {
        "margin-bottom": "5px",
        "padding-inline-start": "3px",
        "line-height": "1.7"
      },
      "taskList": {
        "boxSize": "16px",
        "checkedEffect": "none",
        "textGap": "9px",
        "color": "#2f2f2f"
      },
      "hr": {
        "border-top-color": "#e5e5e5",
        "border-top-width": "1px",
        "border-top-style": "solid",
        "margin-top": "28px",
        "margin-bottom": "28px",
        "width": "100%"
      },
      "table": {
        "width": "100%",
        "border-collapse": "collapse",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#9ca3af",
        "margin-top": "22px",
        "margin-bottom": "22px",
        "font-size": "15px",
        "border-radius": "8px",
        "overflow": "hidden"
      },
      "th": {
        "background-color": "#f7f7f8",
        "padding": "5px 8px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#cbd5e1",
        "font-weight": "650",
        "text-align": "left",
        "color": "#202123"
      },
      "td": {
        "padding": "5px 8px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#cbd5e1",
        "color": "#2f2f2f"
      },
      "blockquote": {
        "padding": "2px 0 2px 18px",
        "color": "#6b6b6b",
        "background-color": "transparent",
        "border-radius": "0",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "font-weight": "normal",
        "border-left": "3px solid #d9d9d9",
        "font-size": "16px"
      },
      "codeBlock": {
        "background-color": "#f7f7f8",
        "color": "#242424",
        "padding": "16px",
        "border-radius": "8px",
        "font-size": "13.5px",
        "border": "1px solid #e5e5e5"
      },
      "codeBlockTitle": {
        "background-color": "#ececec",
        "color": "#5f5f5f",
        "padding": "8px 12px",
        "border-radius": "8px 8px 0 0",
        "border": "1px solid #e5e5e5"
      },
      "a": {
        "color": "#2563eb",
        "text-decoration": "underline",
        "font-weight": "bold"
      },
      "img": {
        "width": "100%",
        "border-radius": "8px",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "margin-left": "auto",
        "margin-right": "auto",
        "background-color": "white",
        "padding": "0px",
        "box-shadow": "none"
      },
      "code": {
        "background-color": "#f7f7f8",
        "color": "#242424",
        "padding": "2px 6px",
        "border-radius": "5px",
        "font-weight": "normal",
        "border": "1px solid #e5e5e5"
      },
      "video": {
        "width": "100%",
        "height": "315px",
        "border-radius": "8px",
        "box-shadow": "none",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "margin-left": "auto",
        "margin-right": "auto",
        "display": "block",
        "float": "none"
      },
      "math": {
        "color": "#2f2f2f",
        "font-size": "16px",
        "text-align": "center",
        "margin-top": "20px",
        "margin-bottom": "20px"
      },
      "map": {
        "width": "100%",
        "height": "400px",
        "border-radius": "8px",
        "box-shadow": "none",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "margin-left": "auto",
        "margin-right": "auto"
      },
      "footnote": {
        "font-size": "13px",
        "color": "#6b6b6b",
        "line-height": "1.5",
        "margin-top": "12px",
        "margin-bottom": "12px",
        "font-weight": "normal"
      }
    },
    "hrStructure": {
      "borderTopStyle": "solid",
      "borderTopWidth": "1px",
      "marginTopBottom": "28px",
      "lineWidth": "100%"
    },
    "checkboxStructure": {
      "boxSize": "16px",
      "checkedEffect": "none",
      "textGap": "9px",
      "color": "#2f2f2f"
    },
    "tableStructure": {
      "outerBorderWidth": "1px",
      "rowBorderWidth": "1px",
      "colBorderWidth": "0px"
    },
    "mediaCaptionStructure": {
      "position": "top",
      "format": "standard",
      "customTemplate": "**{kind} {n}. {title}**"
    },
    "bulletStructure": {
      "level1": "disc",
      "level2": "circle",
      "level3": "square"
    },
    "customCss": ""
  },
  {
    "id": "github-readme-style",
    "name": "Onrivi 기술 표준 서식",
    "description": "GitHub Flavored Markdown 및 GitHub Markdown CSS의 콘텐츠 표현을 참고한 Onrivi Author Preview 전용 서식 테마. GitHub 앱 UI가 아니라 README 문서 콘텐츠의 가독성과 Markdown 표현을 재현한다.",
    "pageStyle": {
      "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', 'Noto Sans', Helvetica, Arial, sans-serif",
      "fontSize": "16px",
      "lineHeight": "1.5",
      "letterSpacing": "0em",
      "backgroundColor": "#ffffff",
      "paperSize": "a4",
      "marginTop": "18mm",
      "marginBottom": "18mm",
      "marginLeft": "12mm",
      "marginRight": "12mm",
      "orientation": "portrait",
      "headingSizeOffset": "3pt",
      "tabSize": "4",
      "exportPageBreakLevel": "none"
    },
    "rules": {
      "h1": {
        "font-size": "32px",
        "font-weight": "600",
        "color": "#1f2328",
        "padding-left": "0px",
        "margin-bottom": "16px",
        "border-bottom": "1px solid #d0d7de",
        "margin-top": "24px",
        "text-align": "left",
        "text-decoration": "none",
        "font-style": "normal",
        "line-height": "1.25",
        "letter-spacing": "-0.025em",
        "padding-bottom": "8px"
      },
      "h2": {
        "font-size": "24px",
        "font-weight": "600",
        "color": "#1f2328",
        "border-bottom": "1px solid #d8dee4",
        "padding-bottom": "6px",
        "margin-top": "24px",
        "text-decoration": "none",
        "font-style": "normal",
        "margin-bottom": "16px",
        "text-align": "left",
        "line-height": "1.25",
        "letter-spacing": "-0.02em"
      },
      "h3": {
        "text-align": "left",
        "font-weight": "600",
        "font-size": "20px",
        "margin-top": "24px",
        "margin-bottom": "16px",
        "color": "#1f2328",
        "border-bottom": "",
        "line-height": "1.25"
      },
      "h4": {
        "text-align": "left",
        "font-weight": "600",
        "font-size": "16px",
        "margin-top": "24px",
        "margin-bottom": "16px",
        "color": "#1f2328",
        "border-bottom": "",
        "line-height": "1.5"
      },
      "h5": {
        "text-align": "left",
        "font-weight": "600",
        "font-size": "14px",
        "margin-top": "24px",
        "margin-bottom": "16px",
        "color": "#1f2328",
        "border-bottom": "",
        "line-height": "1.5"
      },
      "h6": {
        "text-align": "left",
        "font-weight": "600",
        "font-size": "12px",
        "margin-top": "24px",
        "margin-bottom": "16px",
        "color": "#656d76",
        "border-bottom": "",
        "line-height": "1.5"
      },
      "p": {
        "margin-bottom": "16px",
        "margin-top": "0px",
        "line-height": "1.5",
        "color": "#1f2328",
        "text-align": "left",
        "text-indent": "0px",
        "letter-spacing": "0em",
        "sentence-gap": "4px"
      },
      "strong": {
        "font-weight": "600",
        "color": "#1f2328"
      },
      "em": {
        "font-style": "italic",
        "color": "#1f2328"
      },
      "u": {
        "text-decoration-color": "#0d0d0d",
        "text-decoration-style": "solid",
        "text-underline-offset": "2px",
        "text-decoration": "underline"
      },
      "del": {
        "text-decoration": "line-through",
        "color": "#656d76"
      },
      "ul": {
        "padding-left": "2em",
        "list-style-type": "disc",
        "color": "#1f2328"
      },
      "ol": {
        "padding-left": "2em",
        "color": "#1f2328",
        "list-style-type": "decimal"
      },
      "li": {
        "margin-bottom": "4px",
        "padding-inline-start": "3px",
        "line-height": "1.5"
      },
      "taskList": {
        "boxSize": "16px",
        "checkedEffect": "none",
        "textGap": "8px",
        "color": "#1f2328"
      },
      "hr": {
        "border-top-color": "#d8dee4",
        "border-top-width": "1px",
        "border-top-style": "solid",
        "margin-top": "24px",
        "margin-bottom": "24px",
        "width": "100%"
      },
      "table": {
        "width": "100%",
        "border-collapse": "collapse",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#9ca3af",
        "margin-top": "0px",
        "margin-bottom": "16px",
        "font-size": "14px",
        "border-radius": "6px",
        "overflow": "hidden"
      },
      "th": {
        "background-color": "#f6f8fa",
        "padding": "6px 13px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#9ca3af",
        "font-weight": "600",
        "border-bottom": "1px solid #e5e5e5",
        "border-left": "none",
        "border-right": "none",
        "text-align": "left",
        "color": "#1f2328",
        "line-height": "1.5"
      },
      "td": {
        "padding": "6px 13px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#9ca3af",
        "border-bottom": "1px solid #e5e5e5",
        "border-left": "none",
        "border-right": "none",
        "color": "#1f2328",
        "line-height": "1.5"
      },
      "blockquote": {
        "padding": "0 16px",
        "color": "#656d76",
        "background-color": "transparent",
        "border-radius": "0",
        "margin-top": "0px",
        "margin-bottom": "16px",
        "font-weight": "normal",
        "border-left": "4px solid #d0d7de",
        "font-size": "16px",
        "line-height": "1.5"
      },
      "codeBlock": {
        "background-color": "#f6f8fa",
        "color": "#1f2328",
        "padding": "16px",
        "border-radius": "6px",
        "font-size": "13px",
        "border": "1px solid #d0d7de",
        "line-height": "1.45"
      },
      "codeBlockTitle": {
        "background-color": "#f6f8fa",
        "color": "#656d76",
        "padding": "8px 12px",
        "border-radius": "8px 8px 0 0",
        "border": "1px solid #d0d7de"
      },
      "a": {
        "color": "#0969da",
        "text-decoration": "none",
        "font-weight": "bold"
      },
      "img": {
        "width": "100%",
        "border-radius": "6px",
        "margin-top": "16px",
        "margin-bottom": "16px",
        "margin-left": "auto",
        "margin-right": "auto",
        "background-color": "white",
        "padding": "0px",
        "box-shadow": "none"
      },
      "code": {
        "background-color": "#afb8c133",
        "color": "#1f2328",
        "padding": "0.2em 0.4em",
        "border-radius": "6px",
        "font-weight": "normal",
        "border": "none"
      },
      "video": {
        "width": "100%",
        "height": "315px",
        "border-radius": "6px",
        "box-shadow": "none",
        "margin-top": "16px",
        "margin-bottom": "16px",
        "margin-left": "auto",
        "margin-right": "auto",
        "display": "block",
        "float": "none"
      },
      "math": {
        "color": "#1f2328",
        "font-size": "16px",
        "text-align": "center",
        "margin-top": "16px",
        "margin-bottom": "16px"
      },
      "map": {
        "width": "100%",
        "height": "400px",
        "border-radius": "6px",
        "box-shadow": "none",
        "margin-top": "16px",
        "margin-bottom": "16px",
        "margin-left": "auto",
        "margin-right": "auto"
      },
      "footnote": {
        "font-size": "12px",
        "color": "#656d76",
        "line-height": "1.5",
        "margin-top": "12px",
        "margin-bottom": "12px",
        "font-weight": "normal"
      }
    },
    "hrStructure": {
      "borderTopStyle": "solid",
      "borderTopWidth": "1px",
      "marginTopBottom": "24px",
      "lineWidth": "100%"
    },
    "checkboxStructure": {
      "boxSize": "16px",
      "textGap": "8px",
      "color": "#292829",
      "checkedEffect": "none"
    },
    "tableStructure": {
      "outerBorderWidth": "1px",
      "rowBorderWidth": "1px",
      "colBorderWidth": "1px"
    },
    "customCss": ""
  },
  {
    "id": "legal-contract-a4",
    "name": "Onrivi 법률·계약서 A4 공식 문서",
    "description": "법률문서, 계약서, 협약서, 합의서 및 공식 문서 작성에 적합한 A4 전용 서식 테마",
    "pageStyle": {
      "fontFamily": "'Noto Serif KR', 'KoPubBatang', 'Batang', 'Malgun Gothic', serif",
      "fontSize": "16px",
      "lineHeight": "1.8",
      "letterSpacing": "0em",
      "backgroundColor": "#ffffff",
      "paperSize": "a4",
      "marginTop": "18mm",
      "marginBottom": "18mm",
      "marginLeft": "12mm",
      "marginRight": "12mm",
      "orientation": "portrait",
      "headingSizeOffset": "3pt",
      "tabSize": "4",
      "exportPageBreakLevel": "none"
    },
    "rules": {
      "h1": {
        "font-size": "34px",
        "font-weight": "700",
        "color": "#111111",
        "padding-left": "0px",
        "margin-bottom": "20px",
        "border-bottom": "",
        "margin-top": "28px",
        "text-align": "center",
        "text-decoration": "none",
        "font-style": "normal",
        "line-height": "1.5",
        "letter-spacing": "-0.025em"
      },
      "h2": {
        "font-size": "18px",
        "font-weight": "700",
        "color": "#111111",
        "border-bottom": "",
        "padding-bottom": "8px",
        "margin-top": "24px",
        "text-decoration": "none",
        "font-style": "normal",
        "margin-bottom": "12px",
        "text-align": "left",
        "line-height": "1.6",
        "letter-spacing": "-0.02em"
      },
      "h3": {
        "text-align": "left",
        "font-weight": "700",
        "font-size": "15px",
        "margin-top": "18px",
        "margin-bottom": "8px",
        "color": "#111111",
        "border-bottom": "",
        "line-height": "1.7"
      },
      "h4": {
        "text-align": "left",
        "font-weight": "700",
        "font-size": "13px",
        "margin-top": "14px",
        "margin-bottom": "6px",
        "color": "#222222",
        "border-bottom": "",
        "line-height": "1.7"
      },
      "h5": {
        "text-align": "left",
        "font-weight": "700",
        "font-size": "12px",
        "margin-top": "12px",
        "margin-bottom": "5px",
        "color": "#333333",
        "border-bottom": "",
        "line-height": "1.7"
      },
      "h6": {
        "text-align": "left",
        "font-weight": "700",
        "font-size": "11px",
        "margin-top": "10px",
        "margin-bottom": "4px",
        "color": "#444444",
        "border-bottom": "",
        "line-height": "1.7"
      },
      "p": {
        "margin-bottom": "8px",
        "margin-top": "0px",
        "line-height": "1.8",
        "color": "#111111",
        "text-align": "justify",
        "text-indent": "0px",
        "letter-spacing": "0em",
        "sentence-gap": "4px"
      },
      "strong": {
        "font-weight": "700",
        "color": "#111111"
      },
      "em": {
        "font-style": "italic",
        "color": "#222222"
      },
      "u": {
        "text-decoration-color": "#0d0d0d",
        "text-decoration-style": "solid",
        "text-underline-offset": "3px",
        "text-decoration": "underline"
      },
      "del": {
        "text-decoration": "line-through",
        "color": "#666666"
      },
      "ul": {
        "padding-left": "24px",
        "list-style-type": "disc",
        "color": "#111111"
      },
      "ol": {
        "padding-left": "28px",
        "color": "#111111",
        "list-style-type": "decimal"
      },
      "li": {
        "margin-bottom": "3px",
        "padding-inline-start": "3px",
        "line-height": "1.8"
      },
      "taskList": {
        "boxSize": "14px",
        "checkedEffect": "none",
        "textGap": "7px",
        "color": "#111111"
      },
      "hr": {
        "border-top-color": "#777777",
        "border-top-width": "1px",
        "border-top-style": "solid",
        "margin-top": "18px",
        "margin-bottom": "18px",
        "width": "100%"
      },
      "table": {
        "width": "100%",
        "border-collapse": "collapse",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#9ca3af",
        "margin-top": "12px",
        "margin-bottom": "16px",
        "font-size": "15px",
        "border-radius": "8px",
        "overflow": "hidden"
      },
      "th": {
        "background-color": "#f5f5f5",
        "padding": "7px 9px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#9ca3af",
        "font-weight": "700",
        "border-bottom": "1px solid #e5e5e5",
        "border-left": "none",
        "border-right": "none",
        "text-align": "center",
        "color": "#111111"
      },
      "td": {
        "padding": "7px 9px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#9ca3af",
        "border-bottom": "1px solid #e5e5e5",
        "border-left": "none",
        "border-right": "none",
        "color": "#111111"
      },
      "blockquote": {
        "padding": "8px 14px",
        "color": "#333333",
        "background-color": "#fafafa",
        "border-radius": "0",
        "margin-top": "12px",
        "margin-bottom": "12px",
        "font-weight": "normal",
        "border-left": "2px solid #777777",
        "font-size": "11px"
      },
      "codeBlock": {
        "background-color": "#f7f7f7",
        "color": "#222222",
        "padding": "12px 14px",
        "border-radius": "3px",
        "font-size": "13.5px",
        "border": "1px solid #cccccc"
      },
      "codeBlockTitle": {
        "background-color": "#eeeeee",
        "color": "#444444",
        "padding": "8px 12px",
        "border-radius": "8px 8px 0 0",
        "border": "1px solid #cccccc"
      },
      "a": {
        "color": "#111111",
        "text-decoration": "underline",
        "font-weight": "bold"
      },
      "img": {
        "width": "800px",
        "border-radius": "0",
        "margin-top": "10px",
        "margin-bottom": "10px",
        "margin-left": "auto",
        "margin-right": "auto",
        "background-color": "white",
        "padding": "0px",
        "box-shadow": "none",
        "height": "600px",
        "display": "block"
      },
      "code": {
        "background-color": "#f4f4f4",
        "color": "#222222",
        "padding": "1px 4px",
        "border-radius": "2px",
        "font-weight": "normal",
        "border": "1px solid #dddddd"
      },
      "video": {
        "width": "800px",
        "height": "600px",
        "border-radius": "0",
        "box-shadow": "none",
        "margin-top": "12px",
        "margin-bottom": "12px",
        "margin-left": "auto",
        "margin-right": "auto",
        "display": "block",
        "float": "none"
      },
      "math": {
        "color": "#111111",
        "font-size": "13px",
        "text-align": "center",
        "margin-top": "12px",
        "margin-bottom": "12px"
      },
      "map": {
        "width": "800px",
        "height": "600px",
        "border-radius": "0",
        "box-shadow": "none",
        "margin-top": "12px",
        "margin-bottom": "12px",
        "margin-left": "auto",
        "margin-right": "auto"
      },
      "footnote": {
        "font-size": "9px",
        "color": "#555555",
        "line-height": "1.5",
        "margin-top": "8px",
        "margin-bottom": "8px",
        "font-weight": "normal"
      }
    },
    "hrStructure": {
      "borderTopStyle": "solid",
      "borderTopWidth": "1px",
      "marginTopBottom": "18px",
      "lineWidth": "100%"
    },
    "checkboxStructure": {
      "boxSize": "14px",
      "textGap": "7px",
      "color": "#111111",
      "checkedEffect": "none"
    },
    "tableStructure": {
      "outerBorderWidth": "1px",
      "rowBorderWidth": "1px",
      "colBorderWidth": "1px"
    },
    "customCss": ""
  },
  {
    "id": "naver-blog-style",
    "name": "Onrivi 네이버 블로그 감성 서식",
    "description": "트렌디하고 가독성이 뛰어난 네이버 블로그 전용 서식 테마",
    "pageStyle": {
      "fontFamily": "'Pretendard', 'NanumSquare', 'Nanum Gothic', sans-serif",
      "fontSize": "15px",
      "lineHeight": "1.8",
      "letterSpacing": "-0.01em",
      "backgroundColor": "#FFFFFF",
      "paperSize": "a4",
      "marginTop": "18mm",
      "marginBottom": "18mm",
      "marginLeft": "12mm",
      "marginRight": "12mm",
      "orientation": "portrait",
      "headingSizeOffset": "3px",
      "tabSize": "4",
      "exportPageBreakLevel": "none"
    },
    "rules": {
      "h1": {
        "font-size": "24px",
        "font-weight": "700",
        "color": "#111111",
        "padding-left": "12px",
        "margin-bottom": "16px",
        "border-bottom": "",
        "margin-top": "28px",
        "text-align": "left",
        "text-decoration": "none",
        "font-style": "normal",
        "line-height": "1.25",
        "letter-spacing": "-0.025em",
        "border-left": "5px solid #03C75A"
      },
      "h2": {
        "font-size": "20px",
        "font-weight": "700",
        "color": "#4e62e2",
        "border-bottom": "1px solid #E5E7EB",
        "padding-bottom": "8px",
        "margin-top": "22px",
        "text-decoration": "none",
        "font-style": "normal",
        "margin-bottom": "12px",
        "text-align": "left",
        "line-height": "1.35",
        "letter-spacing": "-0.02em",
        "padding-left": "0px"
      },
      "h3": {
        "text-align": "left",
        "font-weight": "600",
        "font-size": "17px",
        "margin-top": "18px",
        "margin-bottom": "8px",
        "color": "#333333",
        "border-bottom": "",
        "line-height": "1.4"
      },
      "h4": {
        "text-align": "left",
        "font-weight": "600",
        "font-size": "15px",
        "margin-top": "14px",
        "margin-bottom": "6px",
        "color": "#444444",
        "border-bottom": "",
        "line-height": "1.5"
      },
      "h5": {
        "text-align": "left",
        "font-weight": "600",
        "font-size": "14px",
        "margin-top": "12px",
        "margin-bottom": "4px",
        "color": "#666666",
        "border-bottom": "",
        "line-height": "1.55"
      },
      "h6": {
        "text-align": "left",
        "font-weight": "600",
        "font-size": "13px",
        "margin-top": "10px",
        "margin-bottom": "4px",
        "color": "#888888",
        "border-bottom": "",
        "line-height": "1.55"
      },
      "p": {
        "margin-bottom": "14px",
        "margin-top": "0px",
        "line-height": "1.8",
        "color": "#333333",
        "text-align": "left",
        "text-indent": "0px",
        "letter-spacing": "-0.01em",
        "sentence-gap": "6px"
      },
      "strong": {
        "font-weight": "bold",
        "color": "#111111",
        "background-color": "#F7F9FA"
      },
      "em": {
        "font-style": "italic",
        "color": "#0d0d0d"
      },
      "u": {
        "text-decoration-color": "#0d0d0d",
        "text-decoration-style": "solid",
        "text-underline-offset": "3px",
        "text-decoration": "underline"
      },
      "del": {
        "text-decoration": "line-through",
        "color": "#999999"
      },
      "ul": {
        "padding-left": "20px",
        "list-style-type": "disc",
        "color": "#333333"
      },
      "ol": {
        "padding-left": "20px",
        "color": "#333333",
        "list-style-type": "decimal"
      },
      "li": {
        "margin-bottom": "6px",
        "padding-inline-start": "3px",
        "line-height": "1.7"
      },
      "taskList": {
        "boxSize": "16px",
        "checkedEffect": "none",
        "textGap": "8px",
        "color": "#333333"
      },
      "hr": {
        "border-top-color": "#E5E7EB",
        "border-top-width": "3px",
        "border-top-style": "solid",
        "margin-top": "24px",
        "margin-bottom": "24px",
        "width": "100%"
      },
      "table": {
        "width": "100%",
        "border-collapse": "collapse",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#9ca3af",
        "margin-top": "16px",
        "margin-bottom": "20px",
        "font-size": "14px",
        "border-radius": "8px",
        "overflow": "hidden"
      },
      "th": {
        "background-color": "#F3F4F6",
        "padding": "10px 12px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#9ca3af",
        "font-weight": "bold",
        "border-bottom": "1px solid #e5e5e5",
        "border-left": "none",
        "border-right": "none",
        "text-align": "center",
        "color": "#111111"
      },
      "td": {
        "padding": "10px 12px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#9ca3af",
        "border-bottom": "1px solid #e5e5e5",
        "border-left": "none",
        "border-right": "none",
        "color": "#333333"
      },
      "blockquote": {
        "padding": "16px 20px",
        "color": "#495057",
        "background-color": "#F7F9FA",
        "border-radius": "12px",
        "margin-top": "18px",
        "margin-bottom": "18px",
        "font-weight": "normal",
        "border-left": "5px solid #2563eb",
        "font-size": "14px",
        "border": "1px solid #E9ECEF"
      },
      "codeBlock": {
        "background-color": "#1E293B",
        "color": "#F8FAFC",
        "padding": "16px",
        "border-radius": "10px",
        "font-size": "13.5px",
        "border": "1px solid #e5e5e5"
      },
      "codeBlockTitle": {
        "background-color": "#0F172A",
        "color": "#94A3B8",
        "padding": "8px 12px",
        "border-radius": "8px 8px 0 0",
        "border": "1px solid #e5e5e5"
      },
      "a": {
        "color": "#4e62e2",
        "text-decoration": "underline",
        "font-weight": "bold"
      },
      "img": {
        "width": "100%",
        "border-radius": "12px",
        "margin-top": "16px",
        "margin-bottom": "16px",
        "margin-left": "auto",
        "margin-right": "auto",
        "background-color": "white",
        "padding": "0px",
        "box-shadow": "0 4px 12px rgba(0,0,0,0.06)"
      },
      "code": {
        "background-color": "#F1F5F9",
        "color": "#4e62e2",
        "padding": "2px 6px",
        "border-radius": "4px",
        "font-weight": "bold",
        "border": "1px solid #e5e5e5"
      },
      "video": {
        "width": "100%",
        "height": "315px",
        "border-radius": "12px",
        "box-shadow": "0 4px 12px rgba(0,0,0,0.08)",
        "margin-top": "16px",
        "margin-bottom": "16px",
        "margin-left": "auto",
        "margin-right": "auto",
        "display": "block",
        "float": "none"
      },
      "math": {
        "color": "#333333",
        "font-size": "16px",
        "text-align": "center",
        "margin-top": "14px",
        "margin-bottom": "14px"
      },
      "map": {
        "width": "100%",
        "height": "360px",
        "border-radius": "12px",
        "box-shadow": "0 4px 12px rgba(0,0,0,0.08)",
        "margin-top": "16px",
        "margin-bottom": "16px",
        "margin-left": "auto",
        "margin-right": "auto"
      },
      "footnote": {
        "font-size": "12px",
        "color": "#6B7280",
        "line-height": "1.5",
        "margin-top": "10px",
        "margin-bottom": "10px",
        "font-weight": "normal"
      }
    },
    "hrStructure": {
      "borderTopStyle": "solid",
      "borderTopWidth": "3px",
      "marginTopBottom": "24px",
      "lineWidth": "100%"
    },
    "checkboxStructure": {
      "boxSize": "16px",
      "textGap": "8px",
      "color": "#333333",
      "checkedEffect": "none"
    },
    "tableStructure": {
      "outerBorderWidth": "1px",
      "rowBorderWidth": "1px",
      "colBorderWidth": "1px"
    },
    "customCss": ""
  },
  {
    "id": "profile-tech-book-2026",
    "name": "Onrivi 일반 기술서적 표준 서식",
    "description": "가독성과 코드/도표 식별성을 극대화한 IT 및 일반 기술 서적 전용 표준 서식 테마입니다.",
    "pageStyle": {
      "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', 'Noto Sans', Arial, sans-serif",
      "fontSize": "16px",
      "lineHeight": "1.75",
      "letterSpacing": "-0.01em",
      "backgroundColor": "#ffffff",
      "paperSize": "a4",
      "marginTop": "18mm",
      "marginBottom": "18mm",
      "marginLeft": "12mm",
      "marginRight": "12mm",
      "orientation": "portrait",
      "headingSizeOffset": "3pt",
      "tabSize": "2",
      "exportPageBreakLevel": "none"
    },
    "rules": {
      "h1": {
        "font-size": "30px",
        "font-weight": "800",
        "color": "#0f172a",
        "padding-left": "0px",
        "margin-bottom": "20px",
        "border-bottom": "2px solid #0284c7",
        "margin-top": "36px",
        "text-align": "left",
        "text-decoration": "none",
        "font-style": "normal",
        "line-height": "1.3",
        "letter-spacing": "-0.02em",
        "padding-bottom": "10px"
      },
      "h2": {
        "font-size": "23px",
        "font-weight": "700",
        "color": "#1e293b",
        "border-bottom": "1px solid #e2e8f0",
        "padding-bottom": "8px",
        "margin-top": "30px",
        "text-decoration": "none",
        "font-style": "normal",
        "margin-bottom": "14px",
        "text-align": "left",
        "line-height": "1.35",
        "letter-spacing": "-0.015em"
      },
      "h3": {
        "text-align": "left",
        "font-weight": "700",
        "font-size": "19px",
        "margin-top": "24px",
        "margin-bottom": "10px",
        "color": "#0284c7",
        "border-bottom": "",
        "line-height": "1.4"
      },
      "h4": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "17px",
        "margin-top": "20px",
        "margin-bottom": "8px",
        "color": "#334155",
        "border-bottom": "",
        "line-height": "1.45"
      },
      "h5": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "16px",
        "margin-top": "18px",
        "margin-bottom": "6px",
        "color": "#475569",
        "border-bottom": "",
        "line-height": "1.5"
      },
      "h6": {
        "text-align": "left",
        "font-weight": "600",
        "font-size": "15px",
        "margin-top": "16px",
        "margin-bottom": "6px",
        "color": "#64748b",
        "border-bottom": "",
        "line-height": "1.5"
      },
      "p": {
        "margin-bottom": "16px",
        "margin-top": "0px",
        "line-height": "1.75",
        "color": "#334155",
        "text-align": "left",
        "text-indent": "0px",
        "letter-spacing": "-0.01em",
        "sentence-gap": "3px"
      },
      "strong": {
        "font-weight": "700",
        "color": "#0f172a"
      },
      "em": {
        "font-style": "italic",
        "color": "#0284c7"
      },
      "u": {
        "text-decoration-color": "#0284c7",
        "text-decoration-style": "solid",
        "text-underline-offset": "3px",
        "text-decoration": "underline"
      },
      "del": {
        "text-decoration": "line-through",
        "color": "#94a3b8"
      },
      "ul": {
        "padding-left": "24px",
        "list-style-type": "disc",
        "color": "#334155"
      },
      "ol": {
        "padding-left": "24px",
        "color": "#334155",
        "list-style-type": "decimal"
      },
      "li": {
        "margin-bottom": "6px",
        "padding-inline-start": "2px",
        "line-height": "1.7"
      },
      "taskList": {
        "boxSize": "16px",
        "checkedEffect": "none",
        "textGap": "9px",
        "color": "#334155"
      },
      "hr": {
        "border-top-color": "#cbd5e1",
        "border-top-width": "1px",
        "border-top-style": "solid",
        "margin-top": "28px",
        "margin-bottom": "28px",
        "width": "100%"
      },
      "table": {
        "width": "100%",
        "border-collapse": "collapse",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#cbd5e1",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "font-size": "14.5px",
        "border-radius": "4px",
        "overflow": "hidden"
      },
      "th": {
        "background-color": "#f1f5f9",
        "padding": "10px 14px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#cbd5e1",
        "font-weight": "700",
        "border-bottom": "2px solid #94a3b8",
        "border-left": "1px solid #cbd5e1",
        "border-right": "1px solid #cbd5e1",
        "text-align": "left",
        "color": "#0f172a"
      },
      "td": {
        "padding": "9px 14px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#cbd5e1",
        "border-bottom": "1px solid #cbd5e1",
        "border-left": "1px solid #cbd5e1",
        "border-right": "1px solid #cbd5e1",
        "color": "#334155"
      },
      "blockquote": {
        "padding": "14px 18px",
        "color": "#334155",
        "background-color": "#f0f9ff",
        "border-radius": "0px 6px 6px 0px",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "font-weight": "normal",
        "border-left": "4px solid #0284c7",
        "font-size": "15px"
      },
      "codeBlock": {
        "background-color": "#1e293b",
        "color": "#f8fafc",
        "padding": "16px",
        "border-radius": "6px",
        "font-size": "13.5px",
        "border": "1px solid #0f172a"
      },
      "codeBlockTitle": {
        "background-color": "#0f172a",
        "color": "#94a3b8",
        "padding": "8px 14px",
        "border-radius": "6px 6px 0 0",
        "border": "1px solid #0f172a"
      },
      "a": {
        "color": "#0284c7",
        "text-decoration": "underline",
        "font-weight": "600"
      },
      "img": {
        "width": "100%",
        "border-radius": "6px",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "margin-left": "auto",
        "margin-right": "auto",
        "background-color": "#ffffff",
        "padding": "0px",
        "box-shadow": "0 1px 3px rgba(0,0,0,0.1)"
      },
      "code": {
        "background-color": "#f1f5f9",
        "color": "#0f172a",
        "padding": "2px 6px",
        "border-radius": "4px",
        "font-weight": "600",
        "border": "1px solid #e2e8f0"
      },
      "video": {
        "width": "100%",
        "height": "350px",
        "border-radius": "6px",
        "box-shadow": "none",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "margin-left": "auto",
        "margin-right": "auto",
        "display": "block",
        "float": "none"
      },
      "math": {
        "color": "#0f172a",
        "font-size": "16px",
        "text-align": "center",
        "margin-top": "20px",
        "margin-bottom": "20px"
      },
      "map": {
        "width": "100%",
        "height": "380px",
        "border-radius": "6px",
        "box-shadow": "none",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "margin-left": "auto",
        "margin-right": "auto"
      },
      "footnote": {
        "font-size": "13px",
        "color": "#64748b",
        "line-height": "1.5",
        "margin-top": "10px",
        "margin-bottom": "10px",
        "font-weight": "normal"
      }
    },
    "hrStructure": {
      "borderTopStyle": "solid",
      "borderTopWidth": "1px",
      "marginTopBottom": "28px",
      "lineWidth": "100%"
    },
    "checkboxStructure": {
      "boxSize": "16px",
      "textGap": "9px",
      "color": "#0d0d0d",
      "checkedEffect": "none"
    },
    "tableStructure": {
      "outerBorderWidth": "1px",
      "rowBorderWidth": "1px",
      "colBorderWidth": "1px"
    },
    "customCss": ""
  },
  {
    "id": "profile-official-notice-letter",
    "name": "Onrivi 공식 행사 및 가정통신문 안내장 서식",
    "description": "학교 가정통신문, 사내 공지문, 세미나 및 행사 안내장을 정갈하고 신뢰감 있게 출력·배포할 수 있는 공식 안내장 테마입니다.",
    "pageStyle": {
      "fontFamily": "'Pretendard', 'KoPubDotum', 'Noto Sans KR', -apple-system, sans-serif",
      "fontSize": "15.5px",
      "lineHeight": "1.75",
      "letterSpacing": "-0.015em",
      "backgroundColor": "#ffffff",
      "paperSize": "a4",
      "marginTop": "18mm",
      "marginBottom": "18mm",
      "marginLeft": "12mm",
      "marginRight": "12mm",
      "orientation": "portrait",
      "headingSizeOffset": "3pt",
      "tabSize": "2",
      "exportPageBreakLevel": "none"
    },
    "rules": {
      "h1": {
        "font-size": "30px",
        "font-weight": "800",
        "color": "#111827",
        "padding-left": "0px",
        "margin-bottom": "22px",
        "border-bottom": "3px double #374151",
        "margin-top": "24px",
        "text-align": "center",
        "text-decoration": "none",
        "font-style": "normal",
        "line-height": "1.3",
        "letter-spacing": "-0.02em",
        "padding-bottom": "12px"
      },
      "h2": {
        "font-size": "22px",
        "font-weight": "750",
        "color": "#1f2937",
        "border-bottom": "1px solid #d1d5db",
        "padding-bottom": "6px",
        "margin-top": "28px",
        "text-decoration": "none",
        "font-style": "normal",
        "margin-bottom": "14px",
        "text-align": "left",
        "line-height": "1.35",
        "letter-spacing": "-0.015em"
      },
      "h3": {
        "text-align": "left",
        "font-weight": "700",
        "font-size": "18.5px",
        "margin-top": "22px",
        "margin-bottom": "10px",
        "color": "#374151",
        "border-bottom": "",
        "line-height": "1.4"
      },
      "h4": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "17px",
        "margin-top": "18px",
        "margin-bottom": "8px",
        "color": "#4b5563",
        "border-bottom": "",
        "line-height": "1.45"
      },
      "h5": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "16px",
        "margin-top": "16px",
        "margin-bottom": "8px",
        "color": "#4b5563",
        "border-bottom": "",
        "line-height": "1.5"
      },
      "h6": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "15px",
        "margin-top": "14px",
        "margin-bottom": "6px",
        "color": "#6b7280",
        "border-bottom": "",
        "line-height": "1.5"
      },
      "p": {
        "margin-bottom": "14px",
        "margin-top": "0px",
        "line-height": "1.75",
        "color": "#374151",
        "text-align": "justify",
        "text-indent": "0px",
        "letter-spacing": "-0.01em",
        "sentence-gap": "4px"
      },
      "strong": {
        "font-weight": "700",
        "color": "#111827"
      },
      "em": {
        "font-style": "italic",
        "color": "#4b5563"
      },
      "u": {
        "text-decoration-color": "#4b5563",
        "text-decoration-style": "solid",
        "text-underline-offset": "3px",
        "text-decoration": "underline"
      },
      "del": {
        "text-decoration": "line-through",
        "color": "#9ca3af"
      },
      "ul": {
        "padding-left": "24px",
        "list-style-type": "disc",
        "color": "#374151"
      },
      "ol": {
        "padding-left": "24px",
        "color": "#374151",
        "list-style-type": "decimal"
      },
      "li": {
        "margin-bottom": "5px",
        "padding-inline-start": "3px",
        "line-height": "1.7"
      },
      "taskList": {
        "boxSize": "16px",
        "checkedEffect": "none",
        "textGap": "9px",
        "color": "#374151"
      },
      "hr": {
        "border-top-color": "#e5e7eb",
        "border-top-width": "1px",
        "border-top-style": "solid",
        "margin-top": "26px",
        "margin-bottom": "26px",
        "width": "100%"
      },
      "table": {
        "width": "100%",
        "border-collapse": "collapse",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#9ca3af",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "font-size": "14.5px",
        "border-radius": "6px",
        "overflow": "hidden"
      },
      "th": {
        "background-color": "#f3f4f6",
        "padding": "10px 12px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#9ca3af",
        "font-weight": "700",
        "border-bottom": "1.5px solid #6b7280",
        "border-left": "none",
        "border-right": "none",
        "text-align": "center",
        "color": "#111827"
      },
      "td": {
        "padding": "9px 12px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#d1d5db",
        "border-bottom": "1px solid #e5e5e5",
        "border-left": "none",
        "border-right": "none",
        "color": "#374151"
      },
      "blockquote": {
        "padding": "12px 18px",
        "color": "#1f2937",
        "background-color": "#f9fafb",
        "border-radius": "6px",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "font-weight": "500",
        "border-left": "4px solid #4b5563",
        "font-size": "15px"
      },
      "codeBlock": {
        "background-color": "#f3f4f6",
        "color": "#1f2937",
        "padding": "14px 18px",
        "border-radius": "6px",
        "font-size": "13.5px",
        "border": "1px solid #e5e7eb"
      },
      "codeBlockTitle": {
        "background-color": "#e5e7eb",
        "color": "#374151",
        "padding": "8px 12px",
        "border-radius": "6px 6px 0 0",
        "border": "1px solid #d1d5db"
      },
      "a": {
        "color": "#1d4ed8",
        "text-decoration": "underline",
        "font-weight": "600"
      },
      "img": {
        "width": "100%",
        "border-radius": "6px",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "margin-left": "auto",
        "margin-right": "auto",
        "background-color": "white",
        "padding": "0px",
        "box-shadow": "none"
      },
      "code": {
        "background-color": "#f3f4f6",
        "color": "#111827",
        "padding": "2px 6px",
        "border-radius": "4px",
        "font-weight": "600",
        "border": "1px solid #e5e7eb"
      },
      "video": {
        "width": "100%",
        "height": "315px",
        "border-radius": "6px",
        "box-shadow": "none",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "margin-left": "auto",
        "margin-right": "auto",
        "display": "block",
        "float": "none"
      },
      "math": {
        "color": "#111827",
        "font-size": "16px",
        "text-align": "center",
        "margin-top": "20px",
        "margin-bottom": "20px"
      },
      "map": {
        "width": "100%",
        "height": "400px",
        "border-radius": "6px",
        "box-shadow": "none",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "margin-left": "auto",
        "margin-right": "auto"
      },
      "footnote": {
        "font-size": "12.5px",
        "color": "#6b7280",
        "line-height": "1.5",
        "margin-top": "12px",
        "margin-bottom": "12px",
        "font-weight": "normal"
      }
    },
    "hrStructure": {
      "borderTopStyle": "solid",
      "borderTopWidth": "1px",
      "marginTopBottom": "26px",
      "lineWidth": "100%"
    },
    "checkboxStructure": {
      "checkedEffect": "none",
      "boxSize": "16px",
      "textGap": "9px",
      "color": "#374151"
    },
    "tableStructure": {
      "outerBorderWidth": "1px",
      "rowBorderWidth": "1px",
      "colBorderWidth": "1px"
    },
    "customCss": ""
  },
  {
    "id": "hancom-tech-blog",
    "name": "Onrivi 한컴 테크 블로그 서식",
    "description": "한컴(HANCOM) 공식 기술 블로그의 모던 테크니컬 디자인을 완벽 구현한 서식입니다. H2 오렌지 하단선과 H3 오렌지 버티컬 바, 1.8배 본문 줄간격과 8px 문장 사이 간격, 가로선 중심의 비교표와 100% 와이드 라운드 미디어로 전문적인 IT 기술 아티클과 리포트를 완성합니다.",
    "pageStyle": {
      "fontFamily": "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', Arial, sans-serif",
      "fontSize": "16px",
      "lineHeight": "1.8",
      "letterSpacing": "-0.02em",
      "backgroundColor": "#ffffff",
      "paperSize": "a4",
      "marginTop": "18mm",
      "marginBottom": "18mm",
      "marginLeft": "12mm",
      "marginRight": "12mm",
      "orientation": "portrait",
      "headingSizeOffset": "3pt",
      "tabSize": "4",
      "exportPageBreakLevel": "none"
    },
    "rules": {
      "h1": {
        "font-size": "32px",
        "font-weight": "800",
        "color": "#111827",
        "line-height": "1.35",
        "letter-spacing": "-0.03em",
        "margin-top": "36px",
        "margin-bottom": "24px",
        "text-align": "left",
        "padding-left": "0px"
      },
      "h2": {
        "font-size": "23px",
        "font-weight": "700",
        "color": "#111827",
        "line-height": "1.4",
        "letter-spacing": "-0.02em",
        "border-bottom": "2px solid #ff5a00",
        "padding-bottom": "10px",
        "margin-top": "52px",
        "margin-bottom": "20px",
        "text-align": "left",
        "padding-left": "0px"
      },
      "h3": {
        "font-size": "18.5px",
        "font-weight": "700",
        "color": "#1f2937",
        "line-height": "1.5",
        "letter-spacing": "-0.015em",
        "border-left": "4px solid #ff5a00",
        "padding-left": "12px",
        "margin-top": "34px",
        "margin-bottom": "14px",
        "text-align": "left"
      },
      "h4": {
        "font-size": "16px",
        "font-weight": "700",
        "color": "#374151",
        "line-height": "1.5",
        "letter-spacing": "-0.01em",
        "margin-top": "24px",
        "margin-bottom": "10px",
        "text-align": "left",
        "padding-left": "0px"
      },
      "h5": {
        "font-size": "15px",
        "font-weight": "700",
        "color": "#4b5563",
        "line-height": "1.5",
        "margin-top": "20px",
        "margin-bottom": "8px",
        "text-align": "left",
        "padding-left": "0px"
      },
      "h6": {
        "font-size": "14px",
        "font-weight": "700",
        "color": "#64748b",
        "line-height": "1.5",
        "margin-top": "16px",
        "margin-bottom": "6px",
        "text-align": "left",
        "padding-left": "0px"
      },
      "p": {
        "font-size": "16px",
        "font-weight": "400",
        "line-height": "1.8",
        "letter-spacing": "-0.02em",
        "color": "#374151",
        "margin-top": "0px",
        "margin-bottom": "20px",
        "sentence-gap": "8px",
        "text-align": "left",
        "text-indent": "0px"
      },
      "strong": {
        "font-weight": "700",
        "color": "#111827"
      },
      "em": {
        "font-style": "italic",
        "color": "#374151"
      },
      "u": {
        "text-decoration": "underline",
        "text-decoration-color": "#ff5a00",
        "text-underline-offset": "3px"
      },
      "del": {
        "text-decoration": "line-through",
        "color": "#94a3b8"
      },
      "a": {
        "color": "#0284c7",
        "text-decoration": "underline",
        "text-underline-offset": "3px",
        "font-weight": "600"
      },
      "blockquote": {
        "background-color": "#f8fafc",
        "border-left": "4px solid #ff5a00",
        "border-radius": "6px",
        "padding": "16px 20px",
        "margin-top": "24px",
        "margin-bottom": "24px",
        "color": "#475569",
        "font-size": "15px",
        "line-height": "1.7"
      },
      "table": {
        "width": "100%",
        "border-collapse": "collapse",
        "margin-top": "24px",
        "margin-bottom": "32px",
        "border-top": "2px solid #111827",
        "border-bottom": "1px solid #e2e8f0"
      },
      "th": {
        "background-color": "#f8fafc",
        "color": "#111827",
        "font-weight": "700",
        "padding": "12px 16px",
        "text-align": "center",
        "border-bottom": "1.5px solid #cbd5e1"
      },
      "td": {
        "padding": "12px 16px",
        "color": "#334155",
        "border-bottom": "1px solid #f1f5f9",
        "font-size": "14.5px",
        "line-height": "1.6"
      },
      "ul": {
        "padding-left": "22px",
        "list-style-type": "disc",
        "color": "#374151",
        "margin-bottom": "20px"
      },
      "ol": {
        "padding-left": "22px",
        "list-style-type": "decimal",
        "color": "#374151",
        "margin-bottom": "20px"
      },
      "li": {
        "margin-bottom": "8px",
        "line-height": "1.75",
        "padding-inline-start": "6px"
      },
      "taskList": {
        "boxSize": "16px",
        "checkedEffect": "none",
        "textGap": "10px",
        "color": "#ff5a00"
      },
      "hr": {
        "border-top": "1px solid #e2e8f0",
        "margin-top": "40px",
        "margin-bottom": "40px",
        "width": "100%"
      },
      "codeBlock": {
        "background-color": "#0f172a",
        "color": "#f8fafc",
        "border-radius": "8px",
        "padding": "16px 20px",
        "margin-top": "20px",
        "margin-bottom": "24px",
        "font-family": "JetBrains Mono, D2Coding, Consolas, monospace",
        "font-size": "14px",
        "line-height": "1.6"
      },
      "codeBlockTitle": {
        "background-color": "#1e293b",
        "color": "#94a3b8",
        "padding": "8px 16px",
        "border-radius": "8px 8px 0 0",
        "font-size": "13px"
      },
      "code": {
        "background-color": "#f1f5f9",
        "color": "#ea580c",
        "border-radius": "4px",
        "padding": "2px 6px",
        "font-weight": "600"
      },
      "img": {
        "width": "100%",
        "height": "auto",
        "border-radius": "10px",
        "box-shadow": "0 4px 16px -2px rgba(0, 0, 0, 0.08)",
        "margin-top": "28px",
        "margin-bottom": "28px",
        "display": "block",
        "margin-left": "auto",
        "margin-right": "auto"
      },
      "video": {
        "width": "100%",
        "height": "315px",
        "border-radius": "10px",
        "margin-top": "28px",
        "margin-bottom": "28px",
        "display": "block",
        "margin-left": "auto",
        "margin-right": "auto"
      },
      "map": {
        "width": "100%",
        "height": "400px",
        "border-radius": "10px",
        "margin-top": "28px",
        "margin-bottom": "28px",
        "display": "block",
        "margin-left": "auto",
        "margin-right": "auto"
      },
      "math": {
        "color": "#111827",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "text-align": "center"
      },
      "footnote": {
        "font-size": "13px",
        "color": "#64748b",
        "line-height": "1.6",
        "margin-top": "32px",
        "margin-bottom": "16px"
      }
    },
    "tableStructure": {
      "outerBorderWidth": "1px",
      "rowBorderWidth": "1px",
      "colBorderWidth": "0px"
    },
    "hrStructure": {
      "borderTopWidth": "1px",
      "borderTopStyle": "solid",
      "lineWidth": "100%",
      "marginTopBottom": "40px"
    },
    "checkboxStructure": {
      "boxSize": "16px",
      "checkedEffect": "none",
      "textGap": "10px",
      "color": "#ff5a00"
    },
    "customCss": ""
  },
  {
    "id": "profile-1791514218283",
    "name": "편안한 전자책 서식",
    "description": "시니어 독자와 저자를 위해 큰 글자(20px), 여유로운 줄 간격(1.85), 눈이 편안한 미색 배경과 고대비 폰트를 적용한 시니어 전용 전자책 출판 서식입니다.",
    "pageStyle": {
      "fontFamily": "'KoPubDotum', 'Pretendard', 'Noto Sans KR', sans-serif",
      "fontSize": "20px",
      "lineHeight": "1.85",
      "letterSpacing": "-0.005em",
      "backgroundColor": "#fcfbf7",
      "paperSize": "a4",
      "marginTop": "20mm",
      "marginBottom": "20mm",
      "marginLeft": "16mm",
      "marginRight": "16mm",
      "orientation": "portrait",
      "headingSizeOffset": "3pt",
      "tabSize": "2",
      "exportPageBreakLevel": "none"
    },
    "rules": {
      "h1": {
        "font-size": "34px",
        "font-weight": "800",
        "color": "#1a202c",
        "padding-left": "0px",
        "margin-bottom": "22px",
        "border-bottom": "",
        "margin-top": "36px",
        "text-align": "left",
        "text-decoration": "none",
        "font-style": "normal",
        "line-height": "1.3",
        "letter-spacing": "-0.02em"
      },
      "h2": {
        "font-size": "26px",
        "font-weight": "700",
        "color": "#1a202c",
        "border-bottom": "2.5px solid #2b6cb0",
        "padding-bottom": "10px",
        "margin-top": "40px",
        "text-decoration": "none",
        "font-style": "normal",
        "margin-bottom": "18px",
        "text-align": "left",
        "line-height": "1.4",
        "letter-spacing": "-0.015em"
      },
      "h3": {
        "text-align": "left",
        "font-weight": "700",
        "font-size": "22px",
        "margin-top": "30px",
        "margin-bottom": "14px",
        "color": "#2b6cb0",
        "border-bottom": "",
        "line-height": "1.45",
        "border-left": "4.5px solid #2b6cb0",
        "padding-left": "12px"
      },
      "h4": {
        "text-align": "left",
        "font-weight": "700",
        "font-size": "20px",
        "margin-top": "24px",
        "margin-bottom": "12px",
        "color": "#2d3748",
        "border-bottom": "",
        "line-height": "1.5"
      },
      "h5": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "19px",
        "margin-top": "20px",
        "margin-bottom": "10px",
        "color": "#2d3748",
        "border-bottom": "",
        "line-height": "1.55"
      },
      "h6": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "18px",
        "margin-top": "18px",
        "margin-bottom": "10px",
        "color": "#4a5568",
        "border-bottom": "",
        "line-height": "1.55"
      },
      "p": {
        "margin-bottom": "20px",
        "margin-top": "0px",
        "line-height": "1.85",
        "color": "#222222",
        "text-align": "left",
        "text-indent": "0px",
        "letter-spacing": "-0.005em",
        "sentence-gap": "6px"
      },
      "strong": {
        "font-weight": "700",
        "color": "#1a202c"
      },
      "em": {
        "font-style": "italic",
        "color": "#2d3748"
      },
      "u": {
        "text-decoration-color": "#2b6cb0",
        "text-decoration-style": "solid",
        "text-underline-offset": "4px",
        "text-decoration": "underline"
      },
      "del": {
        "text-decoration": "line-through",
        "color": "#718096"
      },
      "ul": {
        "padding-left": "32px",
        "list-style-type": "disc",
        "color": "#222222"
      },
      "ol": {
        "padding-left": "32px",
        "color": "#222222",
        "list-style-type": "decimal"
      },
      "li": {
        "margin-bottom": "8px",
        "padding-inline-start": "4px",
        "line-height": "1.8"
      },
      "taskList": {
        "boxSize": "20px",
        "checkedEffect": "none",
        "textGap": "12px",
        "color": "#222222"
      },
      "hr": {
        "border-top-color": "#cbd5e1",
        "border-top-width": "2px",
        "border-top-style": "solid",
        "margin-top": "32px",
        "margin-bottom": "32px",
        "width": "100%"
      },
      "table": {
        "width": "100%",
        "border-collapse": "collapse",
        "border-style": "solid",
        "border-width": "1.5px",
        "border-color": "#a0aec0",
        "margin-top": "24px",
        "margin-bottom": "24px",
        "font-size": "17px",
        "border-radius": "8px",
        "overflow": "hidden"
      },
      "th": {
        "background-color": "#edf2f7",
        "padding": "12px 16px",
        "border-style": "solid",
        "border-width": "1.5px",
        "border-color": "#a0aec0",
        "font-weight": "700",
        "text-align": "left",
        "color": "#1a202c"
      },
      "td": {
        "padding": "12px 16px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#cbd5e1",
        "color": "#222222"
      },
      "blockquote": {
        "padding": "16px 22px",
        "color": "#2d3748",
        "background-color": "#edf2f7",
        "border-radius": "6px",
        "margin-top": "24px",
        "margin-bottom": "24px",
        "font-weight": "normal",
        "border-left": "5px solid #2b6cb0",
        "font-size": "18px"
      },
      "codeBlock": {
        "background-color": "#f1f5f9",
        "color": "#1e293b",
        "padding": "18px",
        "border-radius": "8px",
        "font-size": "15px",
        "border": "1px solid #cbd5e1"
      },
      "codeBlockTitle": {
        "background-color": "#e2e8f0",
        "color": "#334155",
        "padding": "10px 14px",
        "border-radius": "8px 8px 0 0",
        "border": "1px solid #cbd5e1"
      },
      "a": {
        "color": "#2b6cb0",
        "text-decoration": "underline",
        "font-weight": "bold"
      },
      "img": {
        "width": "100%",
        "border-radius": "10px",
        "margin-top": "24px",
        "margin-bottom": "24px",
        "margin-left": "auto",
        "margin-right": "auto",
        "background-color": "white",
        "padding": "0px",
        "box-shadow": "none"
      },
      "code": {
        "background-color": "#edf2f7",
        "color": "#2b6cb0",
        "padding": "3px 8px",
        "border-radius": "5px",
        "font-weight": "600",
        "border": "1px solid #cbd5e1"
      },
      "video": {
        "width": "100%",
        "height": "340px",
        "border-radius": "10px",
        "box-shadow": "none",
        "margin-top": "24px",
        "margin-bottom": "24px",
        "margin-left": "auto",
        "margin-right": "auto",
        "display": "block",
        "float": "none"
      },
      "math": {
        "color": "#1a202c",
        "font-size": "18px",
        "text-align": "center",
        "margin-top": "24px",
        "margin-bottom": "24px"
      },
      "map": {
        "width": "100%",
        "height": "420px",
        "border-radius": "10px",
        "box-shadow": "none",
        "margin-top": "24px",
        "margin-bottom": "24px",
        "margin-left": "auto",
        "margin-right": "auto"
      },
      "footnote": {
        "font-size": "15px",
        "color": "#4a5568",
        "line-height": "1.6",
        "margin-top": "14px",
        "margin-bottom": "14px",
        "font-weight": "normal"
      }
    },
    "hrStructure": {
      "borderTopStyle": "solid",
      "borderTopWidth": "2px",
      "marginTopBottom": "32px",
      "lineWidth": "100%"
    },
    "checkboxStructure": {
      "boxSize": "20px",
      "textGap": "12px",
      "color": "#222222",
      "checkedEffect": "none"
    },
    "tableStructure": {
      "outerBorderWidth": "1.5px",
      "rowBorderWidth": "1.5px",
      "colBorderWidth": "1px"
    },
    "customCss": ""
  },
  {
    "id": "profile-1792073192013",
    "name": "Story Book-전체표지",
    "description": "온리비 어서(Onrivi Author)의 공식 기본 서식 테마입니다. 정갈한 텍스트 배치와 최적화된 용지 규격을 제공합니다.",
    "pageStyle": {
      "fontFamily": "\"EBS 훈민정음 새론\", serif",
      "fontSize": "20px",
      "lineHeight": "1.75",
      "letterSpacing": "-0.01em",
      "backgroundColor": "#ffffff",
      "paperSize": "a4",
      "marginTop": "18mm",
      "marginBottom": "18mm",
      "marginLeft": "12mm",
      "marginRight": "12mm",
      "orientation": "landscape",
      "headingSizeOffset": "3pt",
      "tabSize": "2",
      "exportPageBreakLevel": "none"
    },
    "rules": {
      "h1": {
        "font-size": "32px",
        "font-weight": "700",
        "color": "#202123",
        "padding-left": "0px",
        "margin-bottom": "18px",
        "border-bottom": "",
        "margin-top": "32px",
        "text-align": "left",
        "text-decoration": "none",
        "font-style": "normal",
        "line-height": "1.25",
        "letter-spacing": "-0.025em"
      },
      "h2": {
        "font-size": "24px",
        "font-weight": "700",
        "color": "#202123",
        "border-bottom": "",
        "padding-bottom": "8px",
        "margin-top": "28px",
        "text-decoration": "none",
        "font-style": "normal",
        "margin-bottom": "14px",
        "text-align": "left",
        "line-height": "1.35",
        "letter-spacing": "-0.02em"
      },
      "h3": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "20px",
        "margin-top": "24px",
        "margin-bottom": "12px",
        "color": "#202123",
        "border-bottom": "",
        "line-height": "1.4"
      },
      "h4": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "18px",
        "margin-top": "20px",
        "margin-bottom": "10px",
        "color": "#202123",
        "border-bottom": "",
        "line-height": "1.5"
      },
      "h5": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "16px",
        "margin-top": "18px",
        "margin-bottom": "8px",
        "color": "#202123",
        "border-bottom": "",
        "line-height": "1.55"
      },
      "h6": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "15px",
        "margin-top": "16px",
        "margin-bottom": "8px",
        "color": "#6b6b6b",
        "border-bottom": "",
        "line-height": "1.55"
      },
      "p": {
        "margin-bottom": "16px",
        "margin-top": "0px",
        "line-height": "1.75",
        "color": "#2f2f2f",
        "text-align": "left",
        "text-indent": "0px",
        "letter-spacing": "-0.01em",
        "sentence-gap": "4px"
      },
      "strong": {
        "font-weight": "700",
        "color": "#202123"
      },
      "em": {
        "font-style": "italic",
        "color": "#2f2f2f"
      },
      "u": {
        "text-decoration-color": "#0d0d0d",
        "text-decoration-style": "solid",
        "text-underline-offset": "3px",
        "text-decoration": "underline"
      },
      "del": {
        "text-decoration": "line-through",
        "color": "#6b6b6b"
      },
      "ul": {
        "padding-left": "28px",
        "list-style-type": "disc",
        "color": "#2f2f2f"
      },
      "ol": {
        "padding-left": "28px",
        "color": "#2f2f2f",
        "list-style-type": "decimal"
      },
      "li": {
        "margin-bottom": "5px",
        "padding-inline-start": "3px",
        "line-height": "1.7"
      },
      "taskList": {
        "boxSize": "16px",
        "checkedEffect": "none",
        "textGap": "9px",
        "color": "#2f2f2f"
      },
      "hr": {
        "border-top-color": "#e5e5e5",
        "border-top-width": "1px",
        "border-top-style": "solid",
        "margin-top": "28px",
        "margin-bottom": "28px",
        "width": "100%"
      },
      "table": {
        "width": "100%",
        "border-collapse": "collapse",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#9ca3af",
        "margin-top": "22px",
        "margin-bottom": "22px",
        "font-size": "15px",
        "border-radius": "8px",
        "overflow": "hidden"
      },
      "th": {
        "background-color": "#f7f7f8",
        "padding": "5px 8px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#cbd5e1",
        "font-weight": "650",
        "text-align": "left",
        "color": "#202123",
        "font-size": "inherit"
      },
      "td": {
        "padding": "5px 8px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#cbd5e1",
        "color": "#2f2f2f",
        "font-size": "inherit"
      },
      "blockquote": {
        "padding": "2px 0 2px 18px",
        "color": "#6b6b6b",
        "background-color": "transparent",
        "border-radius": "0",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "font-weight": "normal",
        "border-left": "3px solid #d9d9d9",
        "font-size": "16px"
      },
      "codeBlock": {
        "background-color": "#f7f7f8",
        "color": "#242424",
        "padding": "16px",
        "border-radius": "8px",
        "font-size": "13.5px",
        "border": "1px solid #e5e5e5"
      },
      "codeBlockTitle": {
        "background-color": "#ececec",
        "color": "#5f5f5f",
        "padding": "8px 12px",
        "border-radius": "8px 8px 0 0",
        "border": "1px solid #e5e5e5"
      },
      "a": {
        "color": "#2563eb",
        "text-decoration": "underline",
        "font-weight": "bold"
      },
      "img": {
        "width": "100%",
        "border-radius": "8px",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "margin-left": "auto",
        "margin-right": "auto",
        "background-color": "white",
        "padding": "0px",
        "box-shadow": "none"
      },
      "code": {
        "background-color": "#f7f7f8",
        "color": "#242424",
        "padding": "2px 6px",
        "border-radius": "5px",
        "font-weight": "normal",
        "border": "1px solid #e5e5e5"
      },
      "video": {
        "width": "100%",
        "height": "315px",
        "border-radius": "8px",
        "box-shadow": "none",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "margin-left": "auto",
        "margin-right": "auto",
        "display": "block",
        "float": "none"
      },
      "math": {
        "color": "#2f2f2f",
        "font-size": "16px",
        "text-align": "center",
        "margin-top": "20px",
        "margin-bottom": "20px"
      },
      "map": {
        "width": "100%",
        "height": "400px",
        "border-radius": "8px",
        "box-shadow": "none",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "margin-left": "auto",
        "margin-right": "auto"
      },
      "footnote": {
        "font-size": "13px",
        "color": "#6b6b6b",
        "line-height": "1.5",
        "margin-top": "12px",
        "margin-bottom": "12px",
        "font-weight": "normal"
      }
    },
    "hrStructure": {
      "borderTopStyle": "solid",
      "borderTopWidth": "1px",
      "marginTopBottom": "28px",
      "lineWidth": "100%"
    },
    "checkboxStructure": {
      "boxSize": "16px",
      "textGap": "9px",
      "color": "#2f2f2f",
      "checkedEffect": "none"
    },
    "tableStructure": {
      "outerBorderWidth": "1px",
      "rowBorderWidth": "1px",
      "colBorderWidth": "0px"
    },
    "customCss": "",
    "layout": {
      "schemaVersion": 1,
      "type": "picturebook",
      "cover": "full-image",
      "imageRatio": 0.5,
      "imageFit": "cover",
      "gap": "6mm",
      "pageNumbers": true
    }
  },
  {
    "id": "profile-1792072480655",
    "name": "Story Book - 오른쪽 그림 표지",
    "description": "온리비 어서(Onrivi Author)의 공식 기본 서식 테마입니다. 정갈한 텍스트 배치와 최적화된 용지 규격을 제공합니다.",
    "pageStyle": {
      "fontFamily": "\"EBS 훈민정음 새론\", serif",
      "fontSize": "20px",
      "lineHeight": "1.75",
      "letterSpacing": "-0.01em",
      "backgroundColor": "#ffffff",
      "paperSize": "a4",
      "marginTop": "18mm",
      "marginBottom": "18mm",
      "marginLeft": "12mm",
      "marginRight": "12mm",
      "orientation": "landscape",
      "headingSizeOffset": "3pt",
      "tabSize": "2",
      "exportPageBreakLevel": "none"
    },
    "rules": {
      "h1": {
        "font-size": "32px",
        "font-weight": "700",
        "color": "#202123",
        "padding-left": "0px",
        "margin-bottom": "18px",
        "border-bottom": "",
        "margin-top": "32px",
        "text-align": "left",
        "text-decoration": "none",
        "font-style": "normal",
        "line-height": "1.25",
        "letter-spacing": "-0.025em"
      },
      "h2": {
        "font-size": "24px",
        "font-weight": "700",
        "color": "#202123",
        "border-bottom": "",
        "padding-bottom": "8px",
        "margin-top": "28px",
        "text-decoration": "none",
        "font-style": "normal",
        "margin-bottom": "14px",
        "text-align": "left",
        "line-height": "1.35",
        "letter-spacing": "-0.02em"
      },
      "h3": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "20px",
        "margin-top": "24px",
        "margin-bottom": "12px",
        "color": "#202123",
        "border-bottom": "",
        "line-height": "1.4"
      },
      "h4": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "18px",
        "margin-top": "20px",
        "margin-bottom": "10px",
        "color": "#202123",
        "border-bottom": "",
        "line-height": "1.5"
      },
      "h5": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "16px",
        "margin-top": "18px",
        "margin-bottom": "8px",
        "color": "#202123",
        "border-bottom": "",
        "line-height": "1.55"
      },
      "h6": {
        "text-align": "left",
        "font-weight": "650",
        "font-size": "15px",
        "margin-top": "16px",
        "margin-bottom": "8px",
        "color": "#6b6b6b",
        "border-bottom": "",
        "line-height": "1.55"
      },
      "p": {
        "margin-bottom": "16px",
        "margin-top": "0px",
        "line-height": "1.75",
        "color": "#2f2f2f",
        "text-align": "left",
        "text-indent": "0px",
        "letter-spacing": "-0.01em",
        "sentence-gap": "4px"
      },
      "strong": {
        "font-weight": "700",
        "color": "#202123"
      },
      "em": {
        "font-style": "italic",
        "color": "#2f2f2f"
      },
      "u": {
        "text-decoration-color": "#0d0d0d",
        "text-decoration-style": "solid",
        "text-underline-offset": "3px",
        "text-decoration": "underline"
      },
      "del": {
        "text-decoration": "line-through",
        "color": "#6b6b6b"
      },
      "ul": {
        "padding-left": "28px",
        "list-style-type": "disc",
        "color": "#2f2f2f"
      },
      "ol": {
        "padding-left": "28px",
        "color": "#2f2f2f",
        "list-style-type": "decimal"
      },
      "li": {
        "margin-bottom": "5px",
        "padding-inline-start": "3px",
        "line-height": "1.7"
      },
      "taskList": {
        "boxSize": "16px",
        "checkedEffect": "none",
        "textGap": "9px",
        "color": "#2f2f2f"
      },
      "hr": {
        "border-top-color": "#e5e5e5",
        "border-top-width": "1px",
        "border-top-style": "solid",
        "margin-top": "28px",
        "margin-bottom": "28px",
        "width": "100%"
      },
      "table": {
        "width": "100%",
        "border-collapse": "collapse",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#9ca3af",
        "margin-top": "22px",
        "margin-bottom": "22px",
        "font-size": "15px",
        "border-radius": "8px",
        "overflow": "hidden"
      },
      "th": {
        "background-color": "#f7f7f8",
        "padding": "5px 8px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#cbd5e1",
        "font-weight": "650",
        "text-align": "left",
        "color": "#202123",
        "font-size": "15px"
      },
      "td": {
        "padding": "5px 8px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#cbd5e1",
        "color": "#2f2f2f",
        "font-size": "15px"
      },
      "blockquote": {
        "padding": "2px 0 2px 18px",
        "color": "#6b6b6b",
        "background-color": "transparent",
        "border-radius": "0",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "font-weight": "normal",
        "border-left": "3px solid #d9d9d9",
        "font-size": "20px"
      },
      "codeBlock": {
        "background-color": "#f7f7f8",
        "color": "#242424",
        "padding": "16px",
        "border-radius": "8px",
        "font-size": "13.5px",
        "border": "1px solid #e5e5e5"
      },
      "codeBlockTitle": {
        "background-color": "#ececec",
        "color": "#5f5f5f",
        "padding": "8px 12px",
        "border-radius": "8px 8px 0 0",
        "border": "1px solid #e5e5e5"
      },
      "a": {
        "color": "#2563eb",
        "text-decoration": "underline",
        "font-weight": "bold"
      },
      "img": {
        "width": "100%",
        "border-radius": "8px",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "margin-left": "auto",
        "margin-right": "auto",
        "background-color": "white",
        "padding": "0px",
        "box-shadow": "none"
      },
      "code": {
        "background-color": "#f7f7f8",
        "color": "#242424",
        "padding": "2px 6px",
        "border-radius": "5px",
        "font-weight": "normal",
        "border": "1px solid #e5e5e5"
      },
      "video": {
        "width": "100%",
        "height": "315px",
        "border-radius": "8px",
        "box-shadow": "none",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "margin-left": "auto",
        "margin-right": "auto",
        "display": "block",
        "float": "none"
      },
      "math": {
        "color": "#2f2f2f",
        "font-size": "16px",
        "text-align": "center",
        "margin-top": "20px",
        "margin-bottom": "20px"
      },
      "map": {
        "width": "100%",
        "height": "400px",
        "border-radius": "8px",
        "box-shadow": "none",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "margin-left": "auto",
        "margin-right": "auto"
      },
      "footnote": {
        "font-size": "13px",
        "color": "#6b6b6b",
        "line-height": "1.5",
        "margin-top": "12px",
        "margin-bottom": "12px",
        "font-weight": "normal"
      }
    },
    "hrStructure": {
      "borderTopStyle": "solid",
      "borderTopWidth": "1px",
      "marginTopBottom": "28px",
      "lineWidth": "100%"
    },
    "checkboxStructure": {
      "boxSize": "16px",
      "textGap": "9px",
      "color": "#2f2f2f",
      "checkedEffect": "none"
    },
    "tableStructure": {
      "outerBorderWidth": "1px",
      "rowBorderWidth": "1px",
      "colBorderWidth": "0px"
    },
    "customCss": "",
    "layout": {
      "schemaVersion": 1,
      "type": "picturebook",
      "cover": "image-right",
      "imageRatio": 0.5,
      "imageFit": "cover",
      "gap": "6mm",
      "pageNumbers": true
    }
  }
];
// ====================================================================
// 📊 [OMD-CORE-cssProfile-0002] cssProfile ➔ DEFAULT_PROFILE
// 🎯 @KICK  : 시스템 기본 프로필(system-gov)을 기본값으로 내보낸다
// 🛡️ @GUARD : SYSTEM_PROFILES[0]을 참조하며 시스템 프로필이므로 수정/삭제 불가
// 🚨 @PATCH : 없음
// 🔗 @CALLS : SYSTEM_PROFILES
// ====================================================================
/**
 * DEFAULT_PROFILE: 사용자 정의 프로필 생성/가져오기 시 템플릿으로 사용합니다.
 * (시스템 프로필이 아니므로 가져온 스타일로 덮어쓸 수 있습니다)
 */
// Optional report theme. Layout values below are product defaults, not government-prescribed measurements.
export const HELP_PROFILE: CssProfile = JSON.parse(JSON.stringify(SYSTEM_PROFILES[0]));
HELP_PROFILE.id = 'onrivi-help';
HELP_PROFILE.name = '온리비 도움말';
HELP_PROFILE.description = '사용 설명서 전용 서식. 읽기 편한 본문, 파란 제목, 표와 코드 예제, 항목별 제목 번호.';
HELP_PROFILE.headingNumbering = ['none', 'decimal', 'hangul', 'decimal-paren', 'hangul-paren', {type:'custom',number:'bullet',prefix:'',suffix:'',bullet:'•'}];
delete HELP_PROFILE.layout;
HELP_PROFILE.pageStyle = { ...HELP_PROFILE.pageStyle, fontFamily: "'Noto Sans KR', 'Malgun Gothic', sans-serif", fontSize: '16px', lineHeight: '1.8', letterSpacing: '0', backgroundColor: '#ffffff', paperSize: 'a4', orientation: 'portrait', marginTop: '18mm', marginBottom: '18mm', marginLeft: '16mm', marginRight: '16mm', headingSizeOffset: '3pt' };
for (const [index, key] of Array.from((['h1','h2','h3','h4','h5','h6'] as const).entries())) {
  HELP_PROFILE.rules[key] = { 'font-size': [28,24,21,19,17,16][index] + 'px', 'font-weight':'700', 'line-height':'1.4', color: index < 2 ? '#1d4ed8' : '#1e293b', 'text-align':'left', 'text-indent':'0', 'margin-top': index ? '28px' : '0', 'margin-bottom':'12px', padding:'0', 'background-color':'transparent', border:'none', 'box-shadow':'none', 'text-shadow':'none', 'border-bottom':index === 1 ? '1px solid #dbeafe' : 'none' };
}
Object.assign(HELP_PROFILE.rules.p, { 'font-size':'16px', 'line-height':'1.8', 'text-align':'left', 'text-indent':'0', 'margin-top':'0', 'margin-bottom':'14px', color:'#334155', 'background-color':'transparent' });
Object.assign(HELP_PROFILE.rules.li, { 'font-size':'16px', 'line-height':'1.8', 'margin-bottom':'6px', color:'#334155' });
Object.assign(HELP_PROFILE.rules.ol, { 'list-style-type':'decimal' });
Object.assign(HELP_PROFILE.rules.table, { width:'100%', 'border-collapse':'collapse', 'font-size':'14px', 'margin-top':'16px', 'margin-bottom':'20px', 'border-color':'#cbd5e1' });
for (const key of ['th','td'] as const) Object.assign(HELP_PROFILE.rules[key], { padding:'10px 12px', border:'1px solid #cbd5e1', 'font-size':'14px', 'line-height':'1.65', color:'#334155', 'background-color': key === 'th' ? '#eff6ff' : 'transparent', 'text-align':'left' });
Object.assign(HELP_PROFILE.rules.a, { color:'#1d4ed8', 'text-decoration':'underline' });
Object.assign(HELP_PROFILE.rules.blockquote, { 'border-left':'3px solid #93c5fd', 'background-color':'#eff6ff', padding:'12px 16px', color:'#334155' });
Object.assign(HELP_PROFILE.rules.codeBlock, { 'background-color':'#f1f5f9', color:'#1e293b', padding:'16px', 'font-size':'14px', 'line-height':'1.6', 'border-radius':'8px' });
HELP_PROFILE.rules.code = { 'background-color':'#eff6ff', color:'#1e40af', padding:'2px 5px', 'border-radius':'4px', 'font-size':'0.9em' };
HELP_PROFILE.tableStructure = {outerBorderWidth:'1px',rowBorderWidth:'1px',colBorderWidth:'1px'};
HELP_PROFILE.customCss = '';
SYSTEM_PROFILES.push(HELP_PROFILE);

const aiReportProfile: CssProfile = JSON.parse(JSON.stringify(SYSTEM_PROFILES[0]));
aiReportProfile.id = 'ai-friendly-report';
aiReportProfile.name = 'AI 친화적 보고서';
aiReportProfile.description = '2026.8.24. 행안부 보도자료의 핵심 원칙을 참고한 선택 서식: 서술형 본문, 단순 표, 상단 그림 제목. 정부 지정 양식은 아닙니다.';
aiReportProfile.pageStyle.fontFamily = "'Noto Sans KR', 'Malgun Gothic', sans-serif";
aiReportProfile.pageStyle.backgroundColor = '#ffffff';
for (const key of ['h1','h2','h3','h4','h5','h6','p','table','th','td','blockquote'] as const) {
  Object.assign(aiReportProfile.rules[key], {'color':'#202123','box-shadow':'none','text-shadow':'none','background-color':'transparent'});
}
Object.assign(aiReportProfile.rules.th, {'background-color':'#f3f4f6','font-weight':'700'});
Object.assign(aiReportProfile.rules.table, {'border-style':'solid','border-color':'#9ca3af'});
aiReportProfile.tableStructure = {outerBorderWidth:'1px',rowBorderWidth:'1px',colBorderWidth:'1px'};
aiReportProfile.headingNumbering = ['roman', 'decimal', 'hangul', 'decimal-paren', 'hangul-paren', 'none'];
aiReportProfile.customCss = `.custom-preview-container figure.onrivi-image-figure, .markdown-viewer-root figure.onrivi-image-figure { display:flex; flex-direction:column; }
.custom-preview-container figure.onrivi-image-figure > figcaption, .markdown-viewer-root figure.onrivi-image-figure > figcaption { order:-1!important; text-align:left!important; align-self:flex-start!important; font-weight:700!important; color:inherit!important; margin:0 0 4px!important; }
.custom-preview-container :is(h1,h2,h3,h4,h5,h6) { border:0!important; background:transparent!important; box-shadow:none!important; padding-left:0!important; }
.custom-preview-container p:has(+table), .custom-preview-container p:has(+.table-wrapper-area) { break-after:avoid; }
.custom-preview-container img { box-shadow:none!important; }`;
SYSTEM_PROFILES.push(aiReportProfile);

// 1. KS / ISO 기술표준 서식
const ksTechProfile: CssProfile = JSON.parse(JSON.stringify(SYSTEM_PROFILES[0]));
ksTechProfile.id = 'ks-tech-standard';
ksTechProfile.name = 'KS 기술표준 (1. ➔ 1.1)';
ksTechProfile.description = '국가기술표준원(KS A 0001) 및 ISO/IEC 국제 기술표준 규격: 십진 분류 번호 체계(1. ➔ 1.1 ➔ 1.1.1), 표 상단(표 1 -), 그림 하단(그림 1 -) 표기.';
ksTechProfile.pageStyle.fontFamily = "'Pretendard', 'Noto Sans KR', Arial, sans-serif";
ksTechProfile.pageStyle.fontSize = '15.5px';
ksTechProfile.pageStyle.lineHeight = '1.7';
ksTechProfile.mediaCaptionStructure = {
  position: 'top', format: 'custom', customTemplate: '**{kind} {n} - {title}**',
  kindOverrides: { image: { position: 'bottom' }, video: { position: 'bottom' }, map: { position: 'bottom' } }
};
ksTechProfile.headingNumbering = ['decimal-outline', 'decimal-outline', 'decimal-outline', 'none', 'none', 'none'];
ksTechProfile.tableStructure = { outerBorderWidth: '1px', rowBorderWidth: '1px', colBorderWidth: '1px' };
ksTechProfile.customCss = `.custom-preview-container figure.onrivi-image-figure > figcaption, .markdown-viewer-root figure.onrivi-image-figure > figcaption { order: 1!important; text-align: center!important; font-weight: 700!important; margin-top: 4px!important; }`;
SYSTEM_PROFILES.push(ksTechProfile);

// 2. 대기업 전략기획서 (삼성/현대 스타일)
const corpReportProfile: CssProfile = JSON.parse(JSON.stringify(SYSTEM_PROFILES[0]));
corpReportProfile.id = 'corp-strategy-report';
corpReportProfile.name = '대기업 전략기획서 (삼성/현대)';
corpReportProfile.description = '국내 주요 대기업 및 컨설팅펌 표준: 기호 체계(□ ➔ ○ ➔ - ➔ ㆍ), 상단 핵심 요약 헤드라인 박스, 콤팩트 개조식 서식.';
corpReportProfile.pageStyle.fontFamily = "'Pretendard', 'Malgun Gothic', -apple-system, sans-serif";
corpReportProfile.pageStyle.fontSize = '15px';
corpReportProfile.pageStyle.lineHeight = '1.65';
corpReportProfile.mediaCaptionStructure = { position: 'top', format: 'standard', customTemplate: '**{kind} {n}. {title}**' };
corpReportProfile.headingNumbering = [
  { type: 'custom', number: 'bullet', prefix: '', suffix: '', bullet: '□' },
  { type: 'custom', number: 'bullet', prefix: '', suffix: '', bullet: '○' },
  { type: 'custom', number: 'bullet', prefix: '', suffix: '', bullet: '-' },
  { type: 'custom', number: 'bullet', prefix: '', suffix: '', bullet: 'ㆍ' },
  'none', 'none'
];
corpReportProfile.tableStructure = { outerBorderWidth: '1px', rowBorderWidth: '1px', colBorderWidth: '0px' };
corpReportProfile.rules.blockquote = { 'border-left': '4px solid #1d4ed8', 'background-color': '#f8fafc', 'padding': '10px 14px', 'font-weight': '600' };
corpReportProfile.customCss = `.custom-preview-container blockquote { border-left: 4px solid #1d4ed8!important; background: #f8fafc!important; border-radius: 4px; padding: 10px 14px!important; margin: 12px 0!important; }`;
SYSTEM_PROFILES.push(corpReportProfile);

// 3. 학술·정책 연구보고서 (KDI 표준)
const academicReportProfile: CssProfile = JSON.parse(JSON.stringify(SYSTEM_PROFILES[0]));
academicReportProfile.id = 'academic-kdi-report';
academicReportProfile.name = '학술·정책 연구보고서 (KDI 표준)';
academicReportProfile.description = '국책연구기관 및 연구재단 표준 논문 규격: 장절 체계(제1장 ➔ 제1절 ➔ 1.), 표 상단(<표 1>), 그림 하단([그림 1]), 바탕/명조 활자.';
academicReportProfile.pageStyle.fontFamily = "'KoPubWorldBatang', 'NanumMyeongjo', 'Batang', serif";
academicReportProfile.pageStyle.fontSize = '16px';
academicReportProfile.pageStyle.lineHeight = '1.85';
academicReportProfile.mediaCaptionStructure = {
  position: 'top', format: 'angle', customTemplate: '**<{kind} {n}> {title}**',
  kindOverrides: {
    image: { position: 'bottom', format: 'bracket' },
    video: { position: 'bottom', format: 'bracket' },
    map: { position: 'bottom', format: 'bracket' }
  }
};
academicReportProfile.headingNumbering = [
  { type: 'custom', number: 'decimal', prefix: '제', suffix: '장' },
  { type: 'custom', number: 'decimal', prefix: '제', suffix: '절' },
  'decimal', 'hangul', 'none', 'none'
];
academicReportProfile.tableStructure = { outerBorderWidth: '1.5px', rowBorderWidth: '1px', colBorderWidth: '0px' };
academicReportProfile.customCss = `.custom-preview-container figure.onrivi-image-figure > figcaption, .markdown-viewer-root figure.onrivi-image-figure > figcaption { order: 1!important; text-align: center!important; font-weight: 700!important; margin-top: 4px!important; }
.custom-preview-container p.table-title, .markdown-viewer-root p.table-title { font-weight: 700!important; text-align: center!important; margin-bottom: 6px!important; }`;
SYSTEM_PROFILES.push(academicReportProfile);

// 4. 글로벌 테크/아마존 6-Pager
const globalTechProfile: CssProfile = JSON.parse(JSON.stringify(SYSTEM_PROFILES[0]));
globalTechProfile.id = 'global-tech-6pager';
globalTechProfile.name = '글로벌 테크/아마존 6-Pager';
globalTechProfile.description = '실리콘밸리 글로벌 테크 및 아마존 표준: 6페이지 내러티브 서술식, 시맨틱 헤딩 위계, 콜아웃 안내 박스.';
globalTechProfile.pageStyle.fontFamily = "'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
globalTechProfile.pageStyle.fontSize = '15.5px';
globalTechProfile.pageStyle.lineHeight = '1.75';
globalTechProfile.mediaCaptionStructure = { position: 'top', format: 'standard', customTemplate: '**{kind} {n}. {title}**' };
globalTechProfile.headingNumbering = [];
globalTechProfile.tableStructure = { outerBorderWidth: '1px', rowBorderWidth: '1px', colBorderWidth: '1px' };
SYSTEM_PROFILES.push(globalTechProfile);

// 5. SNS 카드뉴스 (인스타·링크드인 1:1 정사각 표준)
const snsCardNewsProfile: CssProfile = JSON.parse(JSON.stringify(SYSTEM_PROFILES[0]));
snsCardNewsProfile.id = 'sns-card-news';
snsCardNewsProfile.name = 'SNS 카드뉴스 (인스타·링크드인)';
snsCardNewsProfile.description = '인스타그램·쓰레드·링크드인·블로그 공유에 최적화된 1:1 정사각형(1080×1080) SNS 카드뉴스 공식 서식입니다. 구분선(---) 또는 대제목(# H1)마다 카드 1장씩 분리 출력됩니다.';
snsCardNewsProfile.pageStyle = {
  ...snsCardNewsProfile.pageStyle,
  fontFamily: "Pretendard, 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif",
  fontSize: '13pt',
  lineHeight: '1.65',
  letterSpacing: '-0.02em',
  backgroundColor: '#f8fafc',
  paperSize: 'sns_square',
  marginTop: '16mm',
  marginBottom: '16mm',
  marginLeft: '16mm',
  marginRight: '16mm',
  orientation: 'portrait',
  headingSizeOffset: '3pt',
  exportPageBreakLevel: 'h1',
};
snsCardNewsProfile.rules.h1 = {
  ...snsCardNewsProfile.rules.h1,
  'font-size': '28px',
  'font-weight': '800',
  'color': '#0f172a',
  'margin-top': '8px',
  'margin-bottom': '16px',
  'padding-bottom': '10px',
  'border-bottom': '3px solid #1d4ed8',
  'line-height': '1.3',
  'letter-spacing': '-0.03em',
};
snsCardNewsProfile.rules.h2 = {
  ...snsCardNewsProfile.rules.h2,
  'font-size': '22px',
  'font-weight': '700',
  'color': '#1d4ed8',
  'margin-top': '16px',
  'margin-bottom': '10px',
  'border-left': '4px solid #1d4ed8',
  'padding-left': '12px',
  'border-bottom': 'none',
  'line-height': '1.35',
};
snsCardNewsProfile.rules.p = {
  ...snsCardNewsProfile.rules.p,
  'margin-top': '0px',
  'margin-bottom': '14px',
  'line-height': '1.65',
  'color': '#1e293b',
};
snsCardNewsProfile.rules.strong = {
  'font-weight': '800',
  'color': '#1d4ed8',
  'background-color': '#dbeafe',
};
snsCardNewsProfile.rules.blockquote = {
  'padding': '14px 18px',
  'color': '#0f172a',
  'background-color': '#ffffff',
  'border': '1.5px solid #cbd5e1',
  'border-left': '5px solid #1d4ed8',
  'border-radius': '12px',
  'margin-top': '16px',
  'margin-bottom': '16px',
  'font-weight': '600',
  'box-shadow': '0 4px 12px rgba(15, 23, 42, 0.06)',
};
snsCardNewsProfile.headingNumbering = [];
SYSTEM_PROFILES.push(snsCardNewsProfile);

export const DEFAULT_PROFILE: CssProfile = SYSTEM_PROFILES[0]; // system-gov

// ====================================================================
// 📊 [OMD-CORE-cssProfile-0001] cssProfile ➔ createEmptyProfile
// 🎯 @KICK  : 새로운 빈 CssProfile 객체를 생성하여 반환한다
// 🛡️ @GUARD : EMPTY_RULES를 깊은 복사하여 여러 프로필이 동일 객체를 참조하지 않도록 방지한다
// 🚨 @PATCH : **2026-09-11** — CssProfile에 customCss 사용자 정의 CSS 속성 연동
// 🔗 @CALLS : 없음
// ====================================================================
/**
 * 새로운 빈 프로필을 생성합니다.
 * EMPTY_RULES를 JSON.parse(JSON.stringify(...))로 깊은 복사하여
 * 여러 프로필이同一个 객체를 참조하지 않도록 합니다.
 * @returns 모든 rules가 빈 객체인 CssProfile (id와 이름은 빈 문자열)
 */
export function createEmptyProfile(): CssProfile {
  return {
    id: '',
    name: '',
    customCss: '',
    pageStyle: {
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', 'Noto Sans', Arial, sans-serif",
      fontSize: '16px',
      lineHeight: '1.75',
      letterSpacing: '-0.01em',
      backgroundColor: '#ffffff',
      paperSize: 'a4',
      marginTop: '18mm',
      marginBottom: '18mm',
      marginLeft: '12mm',
      marginRight: '12mm',
      orientation: 'portrait',
      headingSizeOffset: '3pt',
      tabSize: '2',
      exportPageBreakLevel: 'none'
    },
    rules: JSON.parse(JSON.stringify(EMPTY_RULES)),
    hrStructure: {
      borderTopStyle: 'solid',
      borderTopWidth: '1px',
      marginTopBottom: '28px',
      lineWidth: '100%'
    },
    checkboxStructure: {
      boxSize: '16px',
      checkedEffect: 'none',
      textGap: '9px',
      color: '#2f2f2f'
    },
    tableStructure: {
      outerBorderWidth: '1px',
      rowBorderWidth: '1px',
      colBorderWidth: '0px'
    },
    bulletStructure: {
      level1: 'disc',
      level2: 'circle',
      level3: 'square'
    }
  };
}

/**
 * 외부에서 붙여넣기 되거나 파일로 업로드된 원본 JSON 문자열을
 * 마크다운 코드블록, 앞뒤 주석, trailing comma 등을 관대하게 정제하여 안전하게 파싱합니다.
 */
export function sanitizeAndParseCssProfileJson(rawText: string): any | null {
  if (!rawText || typeof rawText !== 'string') return null;
  let text = rawText.trim();

  // 1. 마크다운 ```json ... ``` 블록 추출
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = text.match(codeBlockRegex);
  if (match && match[1]) {
    text = match[1].trim();
  }

  // 2. 앞뒤 설명 텍스트 방어: 첫 '{'부터 마지막 '}'까지 슬라이스
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    text = text.substring(startIdx, endIdx + 1);
  }

  // 3. 1차 표준 JSON.parse 시도
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (_) {
    // 파싱 실패 시 추가 살균 시도
  }

  // 4. 단일행 주석(// ...) 및 마지막 쉼표(trailing comma) 정제 후 2차 시도
  try {
    const relaxed = text
      .replace(/\/\/[^\n\r]*/g, '') // 단일행 주석 제거
      .replace(/,\s*([\]}])/g, '$1'); // trailing comma 제거
    const parsed = JSON.parse(relaxed);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (_) {
    // 2차 파싱 실패
  }

  return null;
}

/**
 * 임포트/붙여넣기/업로드된 프로필 데이터를 Onrivi 최신 서식 기준(DEFAULT_PROFILE / 7대 쇼케이스 태그 등)에 맞추어
 * 완벽하게 정규화(Deep Merge, 살균, 누락 필드 하이드레이션, ID 충돌 방지)합니다.
 */
export function normalizeCssProfile(
  imported: any,
  existingProfiles: CssProfile[] = []
): CssProfile {
  // 1. ID 충돌 방지 및 안전한 새 식별자 부여
  const isDuplicateId = existingProfiles.some((p: any) => p.id === imported?.id);
  const isSystem = isSystemProfileId(imported?.id || '');
  const finalId = (!imported?.id || isDuplicateId || isSystem)
    ? ('profile-' + Date.now())
    : imported.id;

  // 2. pageStyle null/undefined/empty string 살균 및 기본값 병합
  const cleanPageStyle = Object.fromEntries(
    Object.entries(imported?.pageStyle || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const mergedPageStyle = {
    ...DEFAULT_PROFILE.pageStyle,
    ...cleanPageStyle,
    fontFamily: cleanPageStyle.fontFamily || DEFAULT_PROFILE.pageStyle.fontFamily,
    fontSize: cleanPageStyle.fontSize || DEFAULT_PROFILE.pageStyle.fontSize || '16px',
    lineHeight: cleanPageStyle.lineHeight || DEFAULT_PROFILE.pageStyle.lineHeight || '1.75',
    letterSpacing: cleanPageStyle.letterSpacing || DEFAULT_PROFILE.pageStyle.letterSpacing || '-0.01em',
    paperSize: cleanPageStyle.paperSize || DEFAULT_PROFILE.pageStyle.paperSize || 'a4',
    orientation: cleanPageStyle.orientation || DEFAULT_PROFILE.pageStyle.orientation || 'portrait',
    marginTop: cleanPageStyle.marginTop || DEFAULT_PROFILE.pageStyle.marginTop || '18mm',
    marginBottom: cleanPageStyle.marginBottom || DEFAULT_PROFILE.pageStyle.marginBottom || '18mm',
    marginLeft: cleanPageStyle.marginLeft || DEFAULT_PROFILE.pageStyle.marginLeft || '12mm',
    marginRight: cleanPageStyle.marginRight || DEFAULT_PROFILE.pageStyle.marginRight || '12mm',
    tabSize: cleanPageStyle.tabSize || DEFAULT_PROFILE.pageStyle.tabSize || '2',
    headingSizeOffset: (!cleanPageStyle.headingSizeOffset || String(cleanPageStyle.headingSizeOffset).trim() === '0px')
      ? '3pt'
      : String(cleanPageStyle.headingSizeOffset),
    exportPageBreakLevel: cleanPageStyle.exportPageBreakLevel || DEFAULT_PROFILE.pageStyle.exportPageBreakLevel || 'none',
  };

  // 3. rules 구버전 호환 살균 (Sanitization)
  const incomingRules = imported?.rules ? structuredClone(imported.rules) : {};
  Object.keys(incomingRules).forEach(tag => {
    const r = incomingRules[tag];
    if (r && typeof r === 'object') {
      // 3-1. 거대 공백 버그 유발 keep-all -> break-all 변환
      if (r['word-break'] === 'keep-all') {
        r['word-break'] = 'break-all';
      }
    }
  });

  // 3-2. blockquote 테두리 중복 속성 살균
  if (incomingRules.blockquote) {
    const bq = incomingRules.blockquote;
    if (bq['border'] && bq['border'] !== 'none') {
      bq['border-left'] = 'none';
      delete bq['border-left-width'];
      delete bq['border-left-color'];
    } else if (bq['box-shadow'] && bq['box-shadow'] !== 'none' && (!bq['border-left'] || bq['border-left'] === 'none')) {
      bq['border-left'] = 'none';
      delete bq['border-left-width'];
      delete bq['border-left-color'];
    }
    if (bq['border-left'] && bq['border-left'] !== 'none' && bq['border-width']) {
      delete bq['border-width'];
    }
  }

  // 3-3. 인라인 code 폰트 크기 조절 잔재 제거
  if (incomingRules.code && incomingRules.code['font-size']) {
    delete incomingRules.code['font-size'];
  }

  // 3-4. 표(table, th, td) 단축 속성과 개별 속성 중복 제거 및 세로선 방해 레거시 방향별 테두리 살균
  ['table', 'th', 'td', 'codeBlock', 'math'].forEach(tag => {
    if (incomingRules[tag] && incomingRules[tag]['border-width'] && incomingRules[tag]['border']) {
      delete incomingRules[tag]['border'];
    }
  });
  ['th', 'td'].forEach(tag => {
    if (incomingRules[tag]) {
      if (incomingRules[tag]['border-left'] === 'none' || incomingRules[tag]['border-left'] === '0' || incomingRules[tag]['border-left'] === '0px') {
        delete incomingRules[tag]['border-left'];
      }
      if (incomingRules[tag]['border-right'] === 'none' || incomingRules[tag]['border-right'] === '0' || incomingRules[tag]['border-right'] === '0px') {
        delete incomingRules[tag]['border-right'];
      }
    }
  });

  // 4. 7대 쇼케이스 태그(각주, 수식, 표, 인용구, 체크박스, 구분선, 미디어 등) 누락 방어 2-Depth Deep Merge
  const cleanRules = Object.fromEntries(
    Object.entries(incomingRules).filter(([, v]) => v !== undefined && v !== null)
  );
  const deeplyMergedRules: any = structuredClone(DEFAULT_PROFILE.rules || {});
  Object.keys(cleanRules).forEach(tag => {
    deeplyMergedRules[tag] = {
      ...(deeplyMergedRules[tag] || {}),
      ...(cleanRules[tag] as object || {}),
    };
  });

  // 4-1. blockquote 전체 박스형 및 그림자형에서 DEFAULT_PROFILE의 border-left 부활 원천 차단
  if (deeplyMergedRules.blockquote) {
    const bq = deeplyMergedRules.blockquote;
    if (bq['border'] && bq['border'] !== 'none') {
      bq['border-left'] = 'none';
    }
    if (cleanRules.blockquote && (cleanRules.blockquote as any)['border-left'] === 'none') {
      bq['border-left'] = 'none';
    }
    if (cleanRules.blockquote && (cleanRules.blockquote as any)['border'] === 'none') {
      bq['border'] = 'none';
    }
  }

  // Controls with a base-size mode must not regain a fixed size during normalization.
  ['table', 'th', 'td', 'blockquote', 'codeBlock', 'math'].forEach(tag => {
    if (!incomingRules[tag]?.['font-size']) deeplyMergedRules[tag]['font-size'] = 'inherit';
  });

  // 5. hrStructure 및 checkboxStructure, tableStructure 안전 병합
  const mergedHrStructure = {
    ...(DEFAULT_PROFILE.hrStructure || {}),
    ...(imported?.hrStructure || {}),
  };
  const mergedCheckboxStructure = {
    boxSize: '16px',
    textGap: '9px',
    color: '#2f2f2f',
    checkedEffect: 'none',
    ...(DEFAULT_PROFILE.checkboxStructure || {}),
    ...(imported?.checkboxStructure || {}),
  };
  if (!mergedCheckboxStructure.checkedEffect) {
    mergedCheckboxStructure.checkedEffect = 'none';
  }
  if (deeplyMergedRules.taskList) {
    deeplyMergedRules.taskList.checkedEffect = deeplyMergedRules.taskList.checkedEffect || 'none';
    if (!deeplyMergedRules.taskList.color || deeplyMergedRules.taskList.color === '#0d0d0d') {
      deeplyMergedRules.taskList.color = deeplyMergedRules.p?.color || '#2f2f2f';
    }
  }
  const mergedTableStructure = {
    ...(DEFAULT_PROFILE.tableStructure || {
      outerBorderWidth: '1px',
      rowBorderWidth: '1px',
      colBorderWidth: '0px',
    }),
    ...(imported?.tableStructure || {}),
  };

  const mergedMediaCaptionStructure = {
    position: (imported?.mediaCaptionStructure?.position === 'bottom') ? 'bottom' : 'top',
    format: imported?.mediaCaptionStructure?.format || 'standard',
    customTemplate: imported?.mediaCaptionStructure?.customTemplate || '**{kind} {n}. {title}**',
    // 표·그림·지도·동영상별 개별 캡션 설정 보존 (KS/KDI 표준 서식)
    ...(imported?.mediaCaptionStructure?.kindOverrides && typeof imported.mediaCaptionStructure.kindOverrides === 'object'
      ? { kindOverrides: imported.mediaCaptionStructure.kindOverrides }
      : {}),
  };

  const mergedBulletStructure = {
    level1: 'disc',
    level2: 'circle',
    level3: 'square',
    ...(DEFAULT_PROFILE.bulletStructure || {}),
    ...(imported?.bulletStructure || {}),
  };

  // 6. 최종 서식 객체 조립
  return {
    ...DEFAULT_PROFILE,
    ...imported,
    id: finalId,
    name: (imported?.name && String(imported.name).trim()) || 'Onrivi 기본서식',
    description: imported?.description || '',
    customCss: imported?.customCss || '',
    pageStyle: mergedPageStyle,
    rules: deeplyMergedRules,
    hrStructure: mergedHrStructure,
    checkboxStructure: mergedCheckboxStructure,
    tableStructure: mergedTableStructure,
    mediaCaptionStructure: mergedMediaCaptionStructure,
    bulletStructure: mergedBulletStructure,
    layout: normalizeBookLayout(imported?.layout),
  };
}
