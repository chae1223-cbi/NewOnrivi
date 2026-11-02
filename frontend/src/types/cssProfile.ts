// ====================================================================
// 📊 [OMD-STYLE-CssProfile-0001] cssProfile.ts ➔ 서식 프로필 및 타이포그래피/미디어 타입 정의
// 🚨 @PATCH : **2026-10-26** — [글머리 기호(불릿) 레벨별 계층 설정 구조체(BulletStructure) 신설]:
//             1) 1단계/2단계/3단계별 불릿 기호 및 사용자 정의 커스텀 기호를 독립 저장 제어하는 BulletStructure 추가
//             2) CssProfile에 bulletStructure 속성 연동
// 🚨 @PATCH : **2026-10-22** — [미디어 종류별 캡션 개별 설정(kindOverrides) 신설]:
//             1) 표·그림·지도·동영상별로 캡션 위치/표현 구문을 다르게 지정할 수 있도록 MediaCaptionStructure.kindOverrides 추가 (KS: 표 상단·그림 하단, KDI: <표 1> 상단·[그림 1] 하단)
// 🚨 @PATCH : **2026-10-21** — [미디어 설명(캡션) 위치 및 표현 구문 구조체(MediaCaptionStructure) 신설]:
//             1) 미디어(이미지·지도·동영상) 캡션 위치('top' 상단 / 'bottom' 하단) 및 표현 구문 포맷(standard, bracket, angle, plain, custom) 타입 정의
//             2) CssProfile에 mediaCaptionStructure 속성을 추가하여 서식 프로필별 미디어 캡션 환경설정 지원
// ====================================================================

/** 미디어(이미지·지도·동영상) 설명(캡션) 위치 및 표현 구문 설정 구조체 */
export interface MediaCaptionStructure {
  /** 캡션 위치: 'top' (상단 - AI 친화 표준) | 'bottom' (하단 - 전통 출판) */
  position: 'top' | 'bottom';
  /** 표현 구문 프리셋:
   * 'standard': "**{kind} {n}. {title}**" (예: **그림 1. 풍경**)
   * 'bracket': "**[{kind} {n}] {title}**" (예: **[그림 1] 풍경**)
   * 'angle': "**<{kind} {n}> {title}**" (예: **<그림 1> 풍경**)
   * 'plain': "{kind} {n}. {title}" (볼드 없음)
   * 'title-only': "**{title}**" (번호 없이 제목만)
   * 'custom': 사용자 지정 템플릿
   */
  format: 'standard' | 'bracket' | 'angle' | 'plain' | 'title-only' | 'custom';
  /** 커스텀 템플릿 문자열 ({kind}, {n}, {title} 치환 플레이스홀더) */
  customTemplate?: string;
  /** 미디어 종류별 개별 설정 (없으면 위 공통 설정을 사용) */
  kindOverrides?: Partial<Record<MediaCaptionKind, Partial<Omit<MediaCaptionStructure, 'kindOverrides'>>>>;
}

/** 캡션 대상 미디어 종류 */
export type MediaCaptionKind = 'table' | 'image' | 'map' | 'video';

/** CSS 속성-값 쌍을 담는 규칙 집합 (예: { "text-align": "center", "font-weight": "bold" }) */
export interface CssRuleSet {
  [cssProperty: string]: string;
}

/** 서식 정의 프로필 - 전역 타이포그래피 + 태그별 CSS 룰셋 */
export interface CssProfile {
  /** H1〜H6 automatic numbering. Missing entries mean no number. */
  headingNumbering?: import('@/lib/headingNumbering').HeadingNumberSetting[];
  /** 고정 페이지 그림책 배치. 없으면 기존 연속 문서로 표시한다. */
  layout?: {
    schemaVersion: 1;
    type: 'picturebook';
    cover: 'full-image' | 'image-right';
    imageRatio: number;
    imageFit: 'contain' | 'cover';
    gap: string;
    pageNumbers: boolean;
  };
  /** 고유 식별자 (예: 'default', 'profile-1234567890') */
  id: string;
  /** 프로필 표시 이름 (사용자 지정 가능) */
  name: string;
  /** 프로필 설명 (옵션) */
  description?: string;
  /** 사용자 정의 추가 CSS 코드 (옵션) */
  customCss?: string;
  /** 선택 용지 전역 타이포그래피 및 페이지 설정 */
  pageStyle: {
    /** 인쇄 대표 서체 (예: "휴먼명조", serif) */
    fontFamily: string;
    /** 웹 폰트 로드용 URL (옵션, 예: 구글 폰트 주소) */
    fontUrl?: string;
    /** 기본 글자 크기 (예: '15px') */
    fontSize: string;
    /** 기본 줄 간격 (예: '1.8') */
    lineHeight: string;
    /** 기본 자간 조절 (예: '-0.02em') */
    letterSpacing: string;
    /** 페이지 배경색 (예: '#ffffff') */
    backgroundColor: string;
    /** 용지 크기 (예: 'a4', 'a3', 'letter' 등) */
    paperSize: string;
    /** 위쪽 여백 (예: '18mm') */
    marginTop: string;
    /** 아래쪽 여백 (예: '18mm') */
    marginBottom: string;
    /** 왼쪽 여백 (예: '12mm') */
    marginLeft: string;
    /** 오른쪽 여백 (예: '12mm') */
    marginRight: string;
    /** 용지 방향: 'portrait' | 'landscape' */
    orientation: string;
    /** H1→H6 단계별 크기 감소폭 (px) */
    headingSizeOffset: string;
    /** 탭 문자 렌더링 폭 (기본 4 = 공백 4개) */
    tabSize: string;
    /** PDF/EPUB 내보내기 시 페이지 나누기 기준 (none, h1, h2, h3, h4, h5, h6) */
    exportPageBreakLevel?: string;
  };
  /** 각 마크다운 요소별 CSS 룰셋 (빈 객체면 해당 요소는 기본 스타일 사용) */
  rules: {
    h1: CssRuleSet;       // H1 보도자료 대제목
    h2: CssRuleSet;       // H2 대분류 / 정책 과제 서두
    h3: CssRuleSet;       // H3 중분류 항목
    h4: CssRuleSet;       // H4 소분류 항목
    h5: CssRuleSet;       // H5 각주형 제목
    h6: CssRuleSet;       // H6 최소 제목
    p: CssRuleSet;        // P 기본 본문 문단
    strong: CssRuleSet;   // STRONG 굵게
    em: CssRuleSet;       // EM 기울임
    u: CssRuleSet;        // U 밑줄
    del: CssRuleSet;      // DEL 취소선
    ul: CssRuleSet;       // UL 순서 없는 목록
    ol: CssRuleSet;       // OL 순서 있는 목록
    li: CssRuleSet;       // LI 목록 아이템 (margin-bottom, padding-inline-start 등)
    taskList: CssRuleSet; // TASKLIST 체크리스트
    hr: CssRuleSet;       // HR 수평선
    table: CssRuleSet;    // TABLE 표
    th: CssRuleSet;       // TH 표 헤더 셀
    td: CssRuleSet;       // TD 표 데이터 셀
    blockquote: CssRuleSet; // BLOCKQUOTE 인용 상자
    codeBlock: CssRuleSet;  // CODE BLOCK 코드 블록
    codeBlockTitle: CssRuleSet;  // CODE BLOCK TITLE 코드 블록 타이틀
    a: CssRuleSet;        // A 링크
    img: CssRuleSet;      // IMG 이미지
    code?: CssRuleSet;     // CODE 인라인 코드
    video?: CssRuleSet;    // VIDEO 동영상
    math?: CssRuleSet;     // MATH 수식 (KaTeX)
    map?: CssRuleSet;      // MAP 지도
    footnote?: CssRuleSet; // FOOTNOTE 각주
  };
  hrStructure?: {
    borderTopStyle: string;
    borderTopWidth: string;
    marginTopBottom: string;
    lineWidth: string;
  };
  checkboxStructure?: {
    boxSize: string;
    checkedEffect: string;
    textGap: string;
    color?: string;
  };
  tableStructure?: {
    outerBorderWidth: string; // 표 외곽 테두리 두께 (예: '1px')
    rowBorderWidth: string;   // 행(가로선) 두께 (예: '1px')
    colBorderWidth: string;   // 열(세로선) 두께 (예: '1px')
  };
  mediaCaptionStructure?: MediaCaptionStructure;
  /** 글머리 기호(불릿) 1~3단계 레벨별 서식 구조체 */
  bulletStructure?: {
    level1?: string;   // 1단계 (기본 'disc')
    level2?: string;   // 2단계 (기본 'circle')
    level3?: string;   // 3단계 (기본 'square')
    custom1?: string;  // 1단계 직접 입력 기호
    custom2?: string;  // 2단계 직접 입력 기호
    custom3?: string;  // 3단계 직접 입력 기호
  };
}
