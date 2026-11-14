import { CssProfile } from '../types/cssProfile';
import { normalizeBookLayout } from '../lib/picturebook';

// ====================================================================
// 📊 [OMD-CORE-cssProfile-0006] cssProfile ➔ SYSTEM_PROFILE_IDS
// 🎯 @KICK  : 시스템 프로필 식별자 목록을 정의한다
// 🚨 @PATCH : **2026-11-14** — [온리비 시스템 서식 8종('온리비_*') 체계 전면 개편 및 정교화]:
//             1) 기존 17종으로 분산·중복되어 있던 시스템 서식을 실생활·실무·집필 핵심 8종('온리비_사용 설명·절차 안내', '온리비_할 일·생활 기록', '온리비_가계부·지출 정리', '온리비_회의·대화 기록', '온리비_신청·제출 문서', '온리비_교과서·산문 집필', '온리비_업무·전략 보고서', '온리비_법률·계약 문서')으로 정교화 및 일원화
//             2) 모든 시스템 제공 서식 명칭에 '온리비_' 접두사를 부여하고, 내부 전용 도움말 서식(HELP_PROFILE / 'onrivi-help')은 사용자 서식 목록(SYSTEM_PROFILES)에서 분리
// 🚨 @PATCH : **2026-11-14** — [Google Developers 기술 문서(DevSite 표준)를 'Onrivi 기본서식(system-1 / DEFAULT_PROFILE)'으로 전면 승격 일원화]:
//             1) Google Developer Documentation Style Guide(https://developers.google.com/style/lists)의 DevSite 디자인 토큰을 'Onrivi 기본서식(system-1 / DEFAULT_PROFILE)'의 공식 표준 규격으로 전면 적용
//             2) Google Sans / Roboto / Roboto Mono 타이포그래피, #202124 본문(16px / line-height 1.5), 클린 헤딩(H1 34px ~ H6 14px), 40px 들여쓰기 다단계 목록(disc ➔ circle ➔ square), #f1f3f4 헤더 및 #dadce0/#e8eaed 미니멀 가로선 비교표(outer 0px, row 1px, col 0px), #e8f0fe Google Blue Note 콜아웃(4px solid #1a73e8), #f1f3f4/#37474f 코드블록 및 인라인코드 반영
//             3) 별도 분리되어 있던 중복 'Google Developers 기술 문서' 프로필을 'Onrivi 기본서식' 단일 기본 프로필로 통합하여 새 서식/정규화/초기화의 기준 서식으로 일원화
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
  'onrivi-todo-life',
  'onrivi-household-ledger',
  'onrivi-meeting-notes',
  'onrivi-application-doc',
  'onrivi-prose-book',
  'onrivi-report',
  'onrivi-legal-contract',
  'onrivi-help',
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
    "name": "온리비_사용 설명·절차 안내",
    "description": "온리비 기본서식. 기기 설정법, 업무 인수인계, 가족 공유 매뉴얼에 최적화된 깔끔한 고딕·단계별 번호·화면 이미지 테두리/캡션·주의/팁 콜아웃 표준 서식입니다.",
    "pageStyle": {
      "fontFamily": "'Roboto', 'Google Sans', 'Noto Sans KR', 'Noto Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      "fontUrl": "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Roboto+Mono:wght@400;500&family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap",
      "fontSize": "16px",
      "lineHeight": "1.5",
      "letterSpacing": "0em",
      "backgroundColor": "#FFFFFF",
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
        "font-size": "34px",
        "font-weight": "400",
        "color": "#202124",
        "padding-left": "0px",
        "padding-bottom": "0px",
        "margin-bottom": "20px",
        "border-bottom": "",
        "border-left": "none",
        "margin-top": "40px",
        "text-align": "left",
        "text-decoration": "none",
        "font-style": "normal",
        "line-height": "1.18",
        "letter-spacing": "-0.01em"
      },
      "h2": {
        "font-size": "24px",
        "font-weight": "400",
        "color": "#202124",
        "padding-left": "0px",
        "border-bottom": "",
        "border-left": "none",
        "padding-bottom": "0px",
        "margin-top": "40px",
        "text-decoration": "none",
        "font-style": "normal",
        "margin-bottom": "20px",
        "text-align": "left",
        "line-height": "1.33",
        "letter-spacing": "0em"
      },
      "h3": {
        "text-align": "left",
        "font-weight": "400",
        "font-size": "20px",
        "padding-left": "0px",
        "margin-top": "32px",
        "margin-bottom": "16px",
        "color": "#202124",
        "border-bottom": "",
        "border-left": "none",
        "line-height": "1.6"
      },
      "h4": {
        "text-align": "left",
        "font-weight": "500",
        "font-size": "16px",
        "margin-top": "24px",
        "margin-bottom": "12px",
        "color": "#202124",
        "border-bottom": "",
        "border-left": "none",
        "line-height": "1.5"
      },
      "h5": {
        "text-align": "left",
        "font-weight": "500",
        "font-size": "15px",
        "margin-top": "20px",
        "margin-bottom": "8px",
        "color": "#202124",
        "border-bottom": "",
        "border-left": "none",
        "line-height": "1.5"
      },
      "h6": {
        "text-align": "left",
        "font-weight": "500",
        "font-size": "14px",
        "margin-top": "16px",
        "margin-bottom": "8px",
        "color": "#5f6368",
        "border-bottom": "",
        "border-left": "none",
        "line-height": "1.5"
      },
      "p": {
        "margin-bottom": "16px",
        "margin-top": "0px",
        "line-height": "1.5",
        "color": "#202124",
        "text-align": "left",
        "text-indent": "0px",
        "letter-spacing": "0em",
        "sentence-gap": "4px"
      },
      "strong": {
        "font-weight": "700",
        "color": "#202124"
      },
      "em": {
        "font-style": "italic",
        "color": "#202124"
      },
      "u": {
        "text-decoration-color": "#1a73e8",
        "text-decoration-style": "solid",
        "text-underline-offset": "3px",
        "text-decoration": "underline"
      },
      "del": {
        "text-decoration": "line-through",
        "color": "#5f6368"
      },
      "ul": {
        "padding-left": "40px",
        "margin-top": "0px",
        "margin-bottom": "16px",
        "list-style-type": "disc",
        "color": "#202124"
      },
      "ol": {
        "padding-left": "40px",
        "margin-top": "0px",
        "margin-bottom": "16px",
        "color": "#202124",
        "list-style-type": "decimal"
      },
      "li": {
        "margin-bottom": "8px",
        "padding-inline-start": "4px",
        "line-height": "1.5",
        "color": "#202124"
      },
      "taskList": {
        "boxSize": "16px",
        "checkedEffect": "none",
        "textGap": "9px",
        "color": "#202124"
      },
      "hr": {
        "border-top-color": "#dadce0",
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
        "border-width": "0px",
        "border-color": "#dadce0",
        "margin-top": "16px",
        "margin-bottom": "16px",
        "font-size": "14px",
        "border-radius": "8px",
        "overflow": "hidden"
      },
      "th": {
        "background-color": "#f1f3f4",
        "padding": "12px 16px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#dadce0",
        "font-weight": "500",
        "font-size": "14px",
        "text-align": "left",
        "color": "#202124"
      },
      "td": {
        "background-color": "#ffffff",
        "padding": "12px 16px",
        "border-style": "solid",
        "border-width": "1px",
        "border-color": "#e8eaed",
        "font-size": "14px",
        "text-align": "left",
        "color": "#202124"
      },
      "blockquote": {
        "padding": "15px 24px",
        "color": "#202124",
        "background-color": "#e8f0fe",
        "border-radius": "4px",
        "margin-top": "16px",
        "margin-bottom": "16px",
        "font-style": "normal",
        "font-weight": "normal",
        "border-left": "4px solid #1a73e8",
        "font-size": "16px"
      },
      "codeBlock": {
        "background-color": "#f1f3f4",
        "color": "#37474f",
        "padding": "16px 24px",
        "border-radius": "8px",
        "font-size": "14px",
        "line-height": "1.45",
        "margin-top": "16px",
        "margin-bottom": "16px",
        "border": "1px solid #dadce0"
      },
      "codeBlockTitle": {
        "background-color": "#e8eaed",
        "color": "#37474f",
        "padding": "8px 12px",
        "border-radius": "8px 8px 0 0",
        "border": "1px solid #dadce0"
      },
      "a": {
        "color": "#1a73e8",
        "text-decoration": "underline",
        "font-weight": "normal"
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
        "border": "1px solid #dadce0",
        "box-shadow": "0 2px 8px rgba(0, 0, 0, 0.06)"
      },
      "code": {
        "background-color": "#f1f3f4",
        "color": "#37474f",
        "padding": "2px 6px",
        "border-radius": "4px",
        "font-weight": "500",
        "border": "1px solid #e2e8f0"
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
        "color": "#202124",
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
        "color": "#5f6368",
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
      "color": "#202124"
    },
    "tableStructure": {
      "outerBorderWidth": "0px",
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
    "headingNumbering": [],
    "customCss": ".custom-preview-container h1, .custom-preview-container h2, .custom-preview-container h3 { font-family: 'Google Sans', 'Roboto', 'Noto Sans KR', sans-serif !important; }\n.custom-preview-container code, .custom-preview-container pre { font-family: 'Roboto Mono', 'JetBrains Mono', monospace !important; }\n.custom-preview-container ul ol, .custom-preview-container ol ol { list-style-type: lower-alpha !important; }"
  }
];

/**
 * 시스템 기본서식(SYSTEM_PROFILES[0])을 기반으로 개별 시스템 서식을 일관되게 생성하는 헬퍼
 */
function buildSystemProfile(config: {
  id: SystemProfileId;
  name: string;
  description: string;
  pageStyle?: Partial<CssProfile["pageStyle"]>;
  rules?: Partial<Record<keyof CssProfile["rules"], Record<string, string>>>;
  hrStructure?: Partial<NonNullable<CssProfile["hrStructure"]>>;
  checkboxStructure?: Partial<NonNullable<CssProfile["checkboxStructure"]>>;
  tableStructure?: Partial<NonNullable<CssProfile["tableStructure"]>>;
  mediaCaptionStructure?: CssProfile["mediaCaptionStructure"];
  bulletStructure?: Partial<NonNullable<CssProfile["bulletStructure"]>>;
  headingNumbering?: CssProfile["headingNumbering"];
  customCss?: string;
}): CssProfile {
  const profile: CssProfile = JSON.parse(JSON.stringify(SYSTEM_PROFILES[0]));
  profile.id = config.id;
  profile.name = config.name;
  profile.description = config.description;
  if (config.pageStyle) {
    profile.pageStyle = { ...profile.pageStyle, ...config.pageStyle };
  }
  if (config.rules) {
    for (const [tag, rule] of Object.entries(config.rules)) {
      if (!rule) continue;
      (profile.rules as any)[tag] = { ...(profile.rules as any)[tag], ...rule };
    }
  }
  if (config.hrStructure) {
    profile.hrStructure = { ...profile.hrStructure!, ...config.hrStructure };
  }
  if (config.checkboxStructure) {
    profile.checkboxStructure = { ...profile.checkboxStructure!, ...config.checkboxStructure };
  }
  if (config.tableStructure) {
    profile.tableStructure = { ...profile.tableStructure!, ...config.tableStructure };
  }
  if (config.mediaCaptionStructure) {
    profile.mediaCaptionStructure = config.mediaCaptionStructure;
  }
  if (config.bulletStructure) {
    profile.bulletStructure = { ...profile.bulletStructure!, ...config.bulletStructure };
  }
  if (config.headingNumbering !== undefined) {
    profile.headingNumbering = config.headingNumbering;
  }
  if (config.customCss !== undefined) {
    profile.customCss = config.customCss;
  }
  return profile;
}

// 2. 온리비_할 일·생활 기록
SYSTEM_PROFILES.push(buildSystemProfile({
  id: "onrivi-todo-life",
  name: "온리비_할 일·생활 기록",
  description: "오늘 할 일, 약속, 루틴, 일상 메모 정리에 최적화된 산뜻한 체크리스트·구분선 중심의 생활 기록 서식입니다.",
  pageStyle: {
    fontFamily: "'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "15.5px",
    lineHeight: "1.6",
    marginTop: "14mm",
    marginBottom: "14mm",
    marginLeft: "12mm",
    marginRight: "12mm",
  },
  rules: {
    h1: { "font-size": "26px", "font-weight": "800", "color": "#0f172a", "border-bottom": "2px solid #0d9488", "padding-bottom": "8px", "margin-top": "20px", "margin-bottom": "16px" },
    h2: { "font-size": "19px", "font-weight": "700", "color": "#0f766e", "border-left": "4px solid #0d9488", "padding-left": "10px", "margin-top": "24px", "margin-bottom": "12px" },
    h3: { "font-size": "16.5px", "font-weight": "700", "color": "#334155", "margin-top": "18px", "margin-bottom": "8px" },
    p: { "color": "#1e293b", "line-height": "1.6", "margin-bottom": "10px" },
    li: { "margin-bottom": "6px", "line-height": "1.6", "color": "#1e293b" },
    taskList: { "boxSize": "18px", "checkedEffect": "strike", "textGap": "10px", "color": "#1e293b" },
    hr: { "border-top-style": "dashed", "border-top-width": "1px", "border-top-color": "#cbd5e1", "margin-top": "18px", "margin-bottom": "18px" },
    blockquote: { "border-left": "3px solid #0d9488", "background-color": "#f0fdfa", "color": "#134e4a", "padding": "12px 16px", "border-radius": "6px" },
  },
  hrStructure: { borderTopStyle: "dashed", borderTopWidth: "1px", marginTopBottom: "18px", lineWidth: "100%" },
  checkboxStructure: { boxSize: "18px", checkedEffect: "strike", textGap: "10px", color: "#1e293b" },
  customCss: "",
}));

// 3. 온리비_가계부·지출 정리
SYSTEM_PROFILES.push(buildSystemProfile({
  id: "onrivi-household-ledger",
  name: "온리비_가계부·지출 정리",
  description: "생활비, 고정 지출, 구독료 및 영수증 이미지 관리에 최적화된 숫자 가독성·격자 정산표 중심 서식입니다.",
  pageStyle: {
    fontFamily: "'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "15px",
    lineHeight: "1.55",
    marginTop: "15mm",
    marginBottom: "15mm",
    marginLeft: "12mm",
    marginRight: "12mm",
  },
  rules: {
    h1: { "font-size": "26px", "font-weight": "800", "color": "#1e3a8a", "border-bottom": "2px solid #1d4ed8", "padding-bottom": "8px", "margin-top": "20px", "margin-bottom": "16px" },
    h2: { "font-size": "18px", "font-weight": "700", "color": "#1d4ed8", "border-left": "4px solid #1d4ed8", "padding-left": "10px", "margin-top": "24px", "margin-bottom": "10px" },
    h3: { "font-size": "16px", "font-weight": "700", "color": "#334155", "margin-top": "16px", "margin-bottom": "8px" },
    p: { "color": "#1e293b", "line-height": "1.55", "margin-bottom": "10px" },
    table: { "border-width": "1px", "border-color": "#cbd5e1", "border-radius": "6px", "font-size": "13.5px" },
    th: { "background-color": "#eff6ff", "color": "#1e3a8a", "font-weight": "700", "padding": "8px 12px", "border-color": "#cbd5e1" },
    td: { "padding": "8px 12px", "border-color": "#e2e8f0", "color": "#1e293b" },
    img: { "width": "360px", "border": "1px solid #cbd5e1", "border-radius": "6px", "box-shadow": "0 1px 4px rgba(0,0,0,0.06)" },
    blockquote: { "border-left": "4px solid #2563eb", "background-color": "#f8fafc", "color": "#0f172a", "padding": "12px 16px", "font-weight": "600" },
  },
  tableStructure: { outerBorderWidth: "1px", rowBorderWidth: "1px", colBorderWidth: "1px" },
  mediaCaptionStructure: {
    position: "top", format: "standard", customTemplate: "**{kind} {n}. {title}**",
    kindOverrides: { image: { position: "bottom" }, video: { position: "bottom" }, map: { position: "bottom" } },
  },
  customCss: ".custom-preview-container table, .markdown-viewer-root table { font-variant-numeric: tabular-nums !important; }",
}));

// 4. 온리비_회의·대화 기록
SYSTEM_PROFILES.push(buildSystemProfile({
  id: "onrivi-meeting-notes",
  name: "온리비_회의·대화 기록",
  description: "직장 회의, 상담, 가족 간 결정 사항을 참석자·안건·결정사항·담당자 기한 순으로 명쾌하게 정리하는 회의록 표준 서식입니다.",
  pageStyle: {
    fontFamily: "'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "15.5px",
    lineHeight: "1.65",
    marginTop: "16mm",
    marginBottom: "16mm",
    marginLeft: "12mm",
    marginRight: "12mm",
  },
  rules: {
    h1: { "font-size": "28px", "font-weight": "800", "color": "#0f172a", "border-bottom": "2px solid #334155", "padding-bottom": "10px", "margin-top": "20px", "margin-bottom": "18px" },
    h2: { "font-size": "20px", "font-weight": "700", "color": "#1d4ed8", "border-bottom": "1px solid #dbeafe", "padding-bottom": "6px", "margin-top": "26px", "margin-bottom": "12px" },
    h3: { "font-size": "17px", "font-weight": "700", "color": "#1e40af", "border-left": "3px solid #3b82f6", "padding-left": "10px", "margin-top": "20px", "margin-bottom": "10px" },
    p: { "color": "#1e293b", "line-height": "1.65", "margin-bottom": "12px" },
    table: { "border-width": "1px", "border-color": "#cbd5e1" },
    th: { "background-color": "#f1f5f9", "color": "#0f172a", "font-weight": "700", "padding": "10px 14px", "border-color": "#cbd5e1" },
    td: { "padding": "10px 14px", "border-color": "#e2e8f0", "color": "#1e293b" },
    blockquote: { "border-left": "4px solid #1d4ed8", "background-color": "#eff6ff", "color": "#0f172a", "padding": "14px 18px", "font-weight": "500" },
    taskList: { "boxSize": "16px", "checkedEffect": "strike", "textGap": "9px", "color": "#1e293b" },
  },
  checkboxStructure: { boxSize: "16px", checkedEffect: "strike", textGap: "9px", color: "#1e293b" },
  tableStructure: { outerBorderWidth: "1px", rowBorderWidth: "1px", colBorderWidth: "0px" },
  customCss: "",
}));

// 5. 온리비_신청·제출 문서
SYSTEM_PROFILES.push(buildSystemProfile({
  id: "onrivi-application-doc",
  name: "온리비_신청·제출 문서",
  description: "학교·회사·기관 제출용 신청서, 요청서 및 공식 안내문 작성에 적합한 단정한 A4 인쇄 표준 서식입니다.",
  pageStyle: {
    fontFamily: "'Noto Sans KR', 'Malgun Gothic', sans-serif",
    fontSize: "15.5px",
    lineHeight: "1.7",
    marginTop: "18mm",
    marginBottom: "18mm",
    marginLeft: "15mm",
    marginRight: "15mm",
  },
  rules: {
    h1: { "font-size": "28px", "font-weight": "800", "color": "#111827", "text-align": "center", "border-bottom": "2px solid #111827", "padding-bottom": "12px", "margin-top": "16px", "margin-bottom": "24px" },
    h2: { "font-size": "18px", "font-weight": "700", "color": "#1e293b", "border-left": "4px solid #334155", "padding-left": "10px", "margin-top": "24px", "margin-bottom": "12px" },
    h3: { "font-size": "16px", "font-weight": "700", "color": "#334155", "margin-top": "18px", "margin-bottom": "8px" },
    p: { "color": "#111827", "line-height": "1.7", "margin-bottom": "12px" },
    table: { "border-width": "1px", "border-color": "#9ca3af", "border-radius": "0px" },
    th: { "background-color": "#f3f4f6", "color": "#111827", "font-weight": "700", "padding": "10px 14px", "border-color": "#9ca3af" },
    td: { "padding": "10px 14px", "border-color": "#d1d5db", "color": "#111827" },
    blockquote: { "border-left": "3px solid #4b5563", "background-color": "#f9fafb", "color": "#1f2937", "padding": "12px 16px" },
  },
  tableStructure: { outerBorderWidth: "1px", rowBorderWidth: "1px", colBorderWidth: "1px" },
  customCss: "",
}));

// 6. 온리비_교과서·산문 집필
SYSTEM_PROFILES.push(buildSystemProfile({
  id: "onrivi-prose-book",
  name: "온리비_교과서·산문 집필",
  description: "어릴 적 국어 교과서와 단행본처럼 명조체, 미색 용지, 문단 첫 줄 들여쓰기(1em), 넉넉한 행간으로 수필·에세이·소설을 집필하는 산문 전용 서식입니다.",
  pageStyle: {
    fontFamily: "'Noto Serif KR', 'KoPubWorldBatang', 'NanumMyeongjo', 'Batang', serif",
    fontUrl: "https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;700&display=swap",
    fontSize: "16.5px",
    lineHeight: "1.88",
    letterSpacing: "-0.01em",
    backgroundColor: "#fcfbf7",
    marginTop: "20mm",
    marginBottom: "20mm",
    marginLeft: "16mm",
    marginRight: "16mm",
  },
  rules: {
    h1: { "font-size": "30px", "font-weight": "700", "color": "#1c1917", "text-align": "center", "margin-top": "32px", "margin-bottom": "26px", "line-height": "1.35" },
    h2: { "font-size": "21px", "font-weight": "700", "color": "#44403c", "margin-top": "34px", "margin-bottom": "16px", "line-height": "1.45" },
    h3: { "font-size": "17.5px", "font-weight": "700", "color": "#57534e", "margin-top": "24px", "margin-bottom": "12px" },
    p: { "color": "#292524", "line-height": "1.88", "text-align": "justify", "text-indent": "1em", "margin-bottom": "6px", "sentence-gap": "2px" },
    li: { "color": "#292524", "line-height": "1.85" },
    hr: { "border-top-style": "solid", "border-top-width": "1px", "border-top-color": "#a8a29e", "width": "30%", "margin-top": "28px", "margin-bottom": "28px" },
    blockquote: { "border-left": "3px solid #a8a29e", "background-color": "#f5f2eb", "color": "#44403c", "padding": "14px 20px", "font-style": "italic" },
    footnote: { "color": "#57534e", "font-size": "13px", "line-height": "1.6" },
  },
  hrStructure: { borderTopStyle: "solid", borderTopWidth: "1px", marginTopBottom: "28px", lineWidth: "30%" },
  customCss: ".custom-preview-container :is(h1,h2,h3,h4,h5,h6,hr) + p, .markdown-viewer-root :is(h1,h2,h3,h4,h5,h6,hr) + p { text-indent: 0px !important; }\n.custom-preview-container :is(blockquote,li,td,th) p, .markdown-viewer-root :is(blockquote,li,td,th) p { text-indent: 0px !important; }\n.custom-preview-container hr, .markdown-viewer-root hr { margin-left: auto !important; margin-right: auto !important; }",
}));

// 7. 온리비_업무·전략 보고서
SYSTEM_PROFILES.push(buildSystemProfile({
  id: "onrivi-report",
  name: "온리비_업무·전략 보고서",
  description: "직장 업무 보고, 프로젝트 기획, 성과·분석 리포트용 완성형 보고서 서식입니다. 보고서 표준 번호(Ⅰ.➔1.➔가.), 요약 콜아웃, 블루 틴트 비교표를 제공합니다.",
  pageStyle: {
    fontFamily: "'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "15.5px",
    lineHeight: "1.65",
    marginTop: "18mm",
    marginBottom: "18mm",
    marginLeft: "12mm",
    marginRight: "12mm",
  },
  rules: {
    h1: { "font-size": "28px", "font-weight": "800", "color": "#1d4ed8", "border-bottom": "2px solid #1d4ed8", "padding-bottom": "10px", "margin-top": "24px", "margin-bottom": "18px" },
    h2: { "font-size": "20px", "font-weight": "700", "color": "#1e40af", "border-bottom": "1px solid #bfdbfe", "padding-bottom": "6px", "margin-top": "28px", "margin-bottom": "14px" },
    h3: { "font-size": "17px", "font-weight": "700", "color": "#0f172a", "border-left": "4px solid #2563eb", "padding-left": "12px", "margin-top": "22px", "margin-bottom": "10px" },
    p: { "color": "#0f172a", "line-height": "1.65", "margin-bottom": "12px" },
    table: { "border-width": "1px", "border-color": "#bfdbfe" },
    th: { "background-color": "#eff6ff", "color": "#1e3a8a", "font-weight": "700", "padding": "10px 14px", "border-color": "#bfdbfe" },
    td: { "padding": "10px 14px", "border-color": "#e2e8f0", "color": "#0f172a" },
    blockquote: { "border-left": "4px solid #1d4ed8", "background-color": "#eff6ff", "color": "#0f172a", "padding": "14px 18px", "font-weight": "600" },
  },
  headingNumbering: ["roman", "decimal", "hangul", "decimal-paren", "hangul-paren", "none"],
  tableStructure: { outerBorderWidth: "1px", rowBorderWidth: "1px", colBorderWidth: "0px" },
  mediaCaptionStructure: {
    position: "top", format: "standard", customTemplate: "**{kind} {n}. {title}**",
    kindOverrides: { image: { position: "bottom" }, video: { position: "bottom" }, map: { position: "bottom" } },
  },
  customCss: "",
}));

// 8. 온리비_법률·계약 문서
SYSTEM_PROFILES.push(buildSystemProfile({
  id: "onrivi-legal-contract",
  name: "온리비_법률·계약 문서",
  description: "계약서, 합의서, 각서, 차용증, 내용증명 등 법적 효력과 격식이 필요한 공식 문서를 위한 정갈한 바탕/명조 A4 표준 서식입니다.",
  pageStyle: {
    fontFamily: "'Noto Serif KR', 'KoPubBatang', 'Batang', 'Malgun Gothic', serif",
    fontUrl: "https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;700&display=swap",
    fontSize: "16px",
    lineHeight: "1.8",
    letterSpacing: "0em",
    backgroundColor: "#ffffff",
    marginTop: "18mm",
    marginBottom: "18mm",
    marginLeft: "14mm",
    marginRight: "14mm",
    tabSize: "4",
  },
  rules: {
    h1: { "font-size": "30px", "font-weight": "700", "color": "#111111", "text-align": "center", "margin-top": "24px", "margin-bottom": "24px", "line-height": "1.45", "letter-spacing": "-0.025em" },
    h2: { "font-size": "18px", "font-weight": "700", "color": "#111111", "margin-top": "24px", "margin-bottom": "10px", "line-height": "1.6", "letter-spacing": "-0.02em" },
    h3: { "font-size": "15.5px", "font-weight": "700", "color": "#111111", "margin-top": "16px", "margin-bottom": "8px", "line-height": "1.7" },
    p: { "color": "#111111", "line-height": "1.8", "text-align": "justify", "margin-bottom": "8px", "sentence-gap": "4px" },
    table: { "border-width": "1px", "border-color": "#374151", "border-radius": "0px" },
    th: { "background-color": "#f3f4f6", "color": "#111111", "font-weight": "700", "padding": "10px 12px", "border-color": "#374151" },
    td: { "padding": "10px 12px", "border-color": "#4b5563", "color": "#111111" },
    blockquote: { "border": "1px solid #d1d5db", "border-left": "4px solid #111111", "background-color": "#f9fafb", "color": "#111111", "padding": "12px 16px" },
  },
  tableStructure: { outerBorderWidth: "1px", rowBorderWidth: "1px", colBorderWidth: "1px" },
  customCss: "",
}));

// ====================================================================
// 📊 [OMD-CORE-cssProfile-0002] cssProfile ➔ DEFAULT_PROFILE & HELP_PROFILE
// 🎯 @KICK  : 시스템 기본 프로필(system-1)과 내부 도움말 전용 서식(HELP_PROFILE)을 내보낸다
// 🛡️ @GUARD : HELP_PROFILE은 도움말 뷰어 전용이므로 사용자 서식 목록(SYSTEM_PROFILES)에는 포함하지 않음
// 🚨 @PATCH : 2026-11-14 — HELP_PROFILE을 SYSTEM_PROFILES 목록에서 분리하여 사용자 서식 선택지 8종 유지
// 🔗 @CALLS : SYSTEM_PROFILES
// ====================================================================
export const HELP_PROFILE: CssProfile = (() => {
  const help: CssProfile = JSON.parse(JSON.stringify(SYSTEM_PROFILES[0]));
  help.id = "onrivi-help";
  help.name = "온리비 도움말";
  help.description = "사용 설명서 전용 서식. 읽기 편한 본문, 파란 제목, 표와 코드 예제, 항목별 제목 번호.";
  help.headingNumbering = ["none", "decimal", "hangul", "decimal-paren", "hangul-paren", { type: "custom", number: "bullet", prefix: "", suffix: "", bullet: "•" }];
  delete help.layout;
  help.pageStyle = { ...help.pageStyle, fontFamily: "'Noto Sans KR', 'Malgun Gothic', sans-serif", fontSize: "16px", lineHeight: "1.8", letterSpacing: "0", backgroundColor: "#ffffff", paperSize: "a4", orientation: "portrait", marginTop: "18mm", marginBottom: "18mm", marginLeft: "16mm", marginRight: "16mm", headingSizeOffset: "3pt" };
  for (const [index, key] of Array.from((["h1", "h2", "h3", "h4", "h5", "h6"] as const).entries())) {
    help.rules[key] = { "font-size": [28, 24, 21, 19, 17, 16][index] + "px", "font-weight": "700", "line-height": "1.4", color: index < 2 ? "#1d4ed8" : "#1e293b", "text-align": "left", "text-indent": "0", "margin-top": index ? "28px" : "0", "margin-bottom": "12px", padding: "0", "background-color": "transparent", border: "none", "box-shadow": "none", "text-shadow": "none", "border-bottom": index === 1 ? "1px solid #dbeafe" : "none" };
  }
  Object.assign(help.rules.p, { "font-size": "16px", "line-height": "1.8", "text-align": "left", "text-indent": "0", "margin-top": "0", "margin-bottom": "14px", color: "#334155", "background-color": "transparent" });
  Object.assign(help.rules.li, { "font-size": "16px", "line-height": "1.8", "margin-bottom": "6px", color: "#334155" });
  Object.assign(help.rules.ol, { "list-style-type": "decimal" });
  Object.assign(help.rules.table, { width: "100%", "border-collapse": "collapse", "font-size": "14px", "margin-top": "16px", "margin-bottom": "20px", "border-color": "#cbd5e1" });
  for (const key of ["th", "td"] as const) Object.assign(help.rules[key], { padding: "10px 12px", border: "1px solid #cbd5e1", "font-size": "14px", "line-height": "1.65", color: "#334155", "background-color": key === "th" ? "#eff6ff" : "transparent", "text-align": "left" });
  Object.assign(help.rules.a, { color: "#1d4ed8", "text-decoration": "underline" });
  Object.assign(help.rules.blockquote, { "border-left": "3px solid #93c5fd", "background-color": "#eff6ff", padding: "12px 16px", color: "#334155" });
  Object.assign(help.rules.codeBlock, { "background-color": "#f1f5f9", color: "#1e293b", padding: "16px", "font-size": "14px", "line-height": "1.6", "border-radius": "8px" });
  help.rules.code = { "background-color": "#eff6ff", color: "#1e40af", padding: "2px 5px", "border-radius": "4px", "font-size": "0.9em" };
  help.tableStructure = { outerBorderWidth: "1px", rowBorderWidth: "1px", colBorderWidth: "1px" };
  help.customCss = "";
  return help;
})();

export const DEFAULT_PROFILE: CssProfile = SYSTEM_PROFILES[0]; // Onrivi 기본서식 (Google Developers DevSite 표준)

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
      fontFamily: "'Roboto', 'Google Sans', 'Noto Sans KR', 'Noto Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      fontUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Roboto+Mono:wght@400;500&family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap',
      fontSize: '16px',
      lineHeight: '1.5',
      letterSpacing: '0em',
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
      color: '#202124'
    },
    tableStructure: {
      outerBorderWidth: '0px',
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
