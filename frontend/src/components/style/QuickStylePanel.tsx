// ====================================================================
// 📊 [OMD-STYLE-QUICK-0001] frontend/src/components/style/QuickStylePanel.tsx
// 🎯 @KICK  : 서식 관리 초보자 및 일반 사용자를 위한 한 페이지 핵심 간편 스타일링 패널
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 3(컴포넌트 분리 원칙), Rule 6(LDSG & 고대비 가독성 보장)
// 🚨 @PATCH : **2026-10-26** — [ESLint React Hook exhaustive-deps 의존성 경고 해소]:
//             1) matchedTheme useMemo가 매 렌더링마다 새로 생성되는 rules 객체 대신 원시 색상 문자열(pColor, h1Color)을 직접 참조하도록 최적화
//             2) hasCustomSetting 및 isLawActive useMemo가 매 렌더링마다 새로 생성되는 currentOutline 배열 대신 안정적인 headingNumbering을 참조하도록 정리
// 🚨 @PATCH : **2026-10-26** — [ESLint 빌드 에러 해결]: JSX 텍스트 내 이스케이프되지 않은 작은따옴표(')를 &apos; 엔티티로 치환
// 🚨 @PATCH : **2026-10-26** — [제목 개요 위계 H1~H6 전면 확장 및 '적용 안함' 기본값(디폴트) 지원]:
//             1) 위계별 번호 조합 인라인 편집기를 기존 H1~H3에서 H1~H6(최하위 제목)까지 전 레벨 확장
//             2) 번호 종류 드롭다운에 '적용 안함 (번호 없음)'을 최상단 디폴트 옵션으로 탑재하고 미설정 레벨은 자동 비활성화 및 (번호 없음) 배지 렌더링
// 🚨 @PATCH : **2026-10-26** — [활자 크기 0.5pt 정밀 눈금자(Ruler) 연동 및 사용자 정의 테마(Custom Theme) 팔레트 신설]:
//             1) 슬라이더 하단에 8~24pt(0.5pt 단위) 33개 눈금 물리적 위치 1:1 일치 눈금자(Ruler) 탑재로 숫자 불일치 완전 해소 및 원클릭 눈금 이동
//             2) 문서 테마 섹션에 '사용자 정의 테마' 카드 및 본문·배경·대제목·중제목·인용구 5대 핵심 색상 직접 조색 및 추천 컬러 프리셋 제공
// 🚨 @PATCH : **2026-10-26** — [문서배치·용지규격·방향 간편 모드 이관 및 활자 크기 pt 단위 전면 전환]:
//             1) 글자 크기를 px 단위에서 출판/공문서 표준인 pt(포인트) 단위로 전면 개편 (10pt, 10.5pt, 11pt, 12pt 및 0.5pt 미세 슬라이더)
//             2) 전문가 모드에 있던 '용지 크기(A4, B5 등)'와 '용지 방향(가로/세로)'을 간편 모드 4번 섹션으로 이관
//             3) 전문가 모드에 있던 '문서 배치(일반문서 vs 그림책 및 장면비율/표지설정)'를 간편 모드 5번 섹션으로 이관
// 🚨 @PATCH : **2026-10-26** — [글꼴 관리 기능 간편 스타일링 이관 및 사용자 정의 글꼴(Custom Font) 신설]:
//             1) 4대 대표 글꼴 외에 '사용자 정의 글꼴' 전용 카드 및 인라인 제어 패널 신설
//             2) FontSelectorModal(시스템 폰트 목록 탐색) 직접 호출 및 글꼴 패밀리명 직접 입력 지원
// 🚨 @PATCH : **2026-10-26** — [제목 개요 서식에 사용자 정의 서식(Custom Outline) 신설]:
//             1) 6대 개요 번호 프리셋 및 4대 추천 커스텀 템플릿(법령/도서/조항/영문) 탑재
//             2) H1~H3 실시간 인라인 편집기 및 라이브 미리보기 배지 연동
// ====================================================================

import React, { useState, useMemo, useEffect } from 'react';
import type { CssProfile } from '@/types/cssProfile';
import { headingFormat, headingMarker, headingSetting, type HeadingNumberSetting } from '@/lib/headingNumbering';
import { PAPER_SIZES } from '@/constants/paperSizes';
import { DEFAULT_BOOK_LAYOUT, BOOK_SAMPLE } from '@/lib/picturebook';
import FontSelectorModal from '../FontSelectorModal';
import {
  Type, Palette, Maximize2, ListOrdered, Sliders, Check, Sparkles,
  ChevronDown, ChevronUp, Search, FileText, BookOpen, LayoutTemplate, Smartphone
} from 'lucide-react';

interface QuickStylePanelProps {
  currentProfile: CssProfile;
  isSystemProfile: boolean;
  onUpdateProfile: (profile: CssProfile) => void;
  onSwitchToProMode: () => void;
  isDarkMode?: boolean;
}

// 1. 4대 대표 글꼴 프리셋
const FONT_PRESETS = [
  { id: 'pretendard', name: '가독성 고딕', font: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif', sample: '가나다' },
  { id: 'batang', name: '단정한 명조', font: "'KoPub Batang', 'Batang', 'Nanum Myeongjo', serif", sample: '가나다' },
  { id: 'noto', name: '표준 본고딕', font: "'Noto Sans KR', sans-serif", sample: '가나다' },
  { id: 'mono', name: '기술/코딩', font: "'JetBrains Mono', 'D2Coding', monospace", sample: 'Code' },
];

// 2. 5대 문서 테마 프리셋
interface MoodTheme {
  id: string;
  name: string;
  desc: string;
  badge: string;
  textColor: string;
  bgColor: string;
  h1Color: string;
  h1Border: string;
  h2Color: string;
  h2Border: string;
  quoteBorder: string;
  quoteBg: string;
}

const MOOD_THEMES: MoodTheme[] = [
  {
    id: 'gov',
    name: '대한민국 관보',
    desc: '클래식 먹색 & 이중 관보선',
    badge: '🏛️ 공문서',
    textColor: '#111827',
    bgColor: '#FFFFFF',
    h1Color: '#111827',
    h1Border: '3px double #111827',
    h2Color: '#1F2937',
    h2Border: '1px solid #9CA3AF',
    quoteBorder: '#4B5563',
    quoteBg: '#F9FAFB'
  },
  {
    id: 'cobalt',
    name: '코발트 신뢰',
    desc: '모던 블루 악센트 & 세련된 정돈감',
    badge: '💼 비즈니스',
    textColor: '#0F172A',
    bgColor: '#FFFFFF',
    h1Color: '#1D4ED8',
    h1Border: '2px solid #1D4ED8',
    h2Color: '#1E40AF',
    h2Border: '1px solid #BFDBFE',
    quoteBorder: '#2563EB',
    quoteBg: '#EFF6FF'
  },
  {
    id: 'tech',
    name: '테크 & 리서치',
    desc: '지적인 틸 & 단단한 다크 그레이',
    badge: '🔬 연구·기술',
    textColor: '#0F172A',
    bgColor: '#FFFFFF',
    h1Color: '#0F172A',
    h1Border: '1.5px solid #0F172A',
    h2Color: '#1E293B',
    h2Border: '1px solid #CBD5E1',
    quoteBorder: '#334155',
    quoteBg: '#F8FAFC'
  },
  {
    id: 'editorial',
    name: '따뜻한 에세이',
    desc: '온화한 베이지 톤 & 부드러운 여백',
    badge: '☕ 출판·수필',
    textColor: '#292524',
    bgColor: '#FCFBF9',
    h1Color: '#44403C',
    h1Border: '1px solid #E7E5E4',
    h2Color: '#57534E',
    h2Border: 'none',
    quoteBorder: '#D6D3D1',
    quoteBg: '#F5F5F4'
  },
  {
    id: 'minimal',
    name: '모던 미니멀',
    desc: '군더더기 없는 흑백 & 깔끔한 선',
    badge: '⬛ 미니멀',
    textColor: '#18181B',
    bgColor: '#FFFFFF',
    h1Color: '#18181B',
    h1Border: 'none',
    h2Color: '#27272A',
    h2Border: 'none',
    quoteBorder: '#71717A',
    quoteBg: '#FAFAFA'
  }
];

// 3. 4대 대표 활자 크기 (출판/행정 표준 pt 단위)
const PT_SIZE_PRESETS = [
  { id: '10pt', label: '10pt', title: '작게', pt: 10, lineHeight: '1.6', desc: '공문서·조밀한 정보' },
  { id: '10.5pt', label: '10.5pt', title: '행정', pt: 10.5, lineHeight: '1.65', desc: '정부 표준 공문서' },
  { id: '11pt', label: '11pt', title: '표준', pt: 11, lineHeight: '1.75', desc: '보고서·단행본 권장' },
  { id: '12pt', label: '12pt', title: '크게', pt: 12, lineHeight: '1.85', desc: '시니어·여유로운 읽기' },
];

// 4. 제목 번호 형식 프리셋 (사용자 정의 포함)
const OUTLINE_PRESETS: { id: string; name: string; pattern: string; value: HeadingNumberSetting[] }[] = [
  { id: 'none', name: '번호 없음', pattern: '순수 제목만 표기', value: [] },
  { id: 'decimal', name: '십진 기술표준', pattern: '1. ➔ 1.1 ➔ 1.1.1', value: ['decimal-outline', 'decimal-outline', 'decimal-outline', 'decimal-outline', 'decimal-outline', 'decimal-outline'] },
  { id: 'report', name: '보고서 표준', pattern: 'Ⅰ. ➔ 1. ➔ 가.', value: ['roman', 'decimal', 'hangul', 'decimal-paren', 'hangul-paren', 'none'] },
  { id: 'hangul', name: '공문서 한글', pattern: '1. ➔ 가. ➔ (1)', value: ['decimal', 'hangul', 'decimal-paren', 'hangul-paren', 'none', 'none'] },
  { id: 'law', name: '법령/규정', pattern: '제1장 ➔ 제1조 ➔ 1.', value: [
    { type: 'custom', number: 'decimal', prefix: '제', suffix: '장 ' },
    { type: 'custom', number: 'decimal', prefix: '제', suffix: '조 ' },
    'decimal', 'hangul', 'none', 'none'
  ] },
  { id: 'custom', name: '사용자 정의', pattern: '직접 조합 및 서식 지정', value: [
    { type: 'custom', number: 'decimal', prefix: '제', suffix: '장 ' },
    { type: 'custom', number: 'decimal', prefix: '제', suffix: '조 ' },
    'decimal', 'hangul', 'none', 'none'
  ] }
];

// 4대 대표 커스텀 템플릿
const CUSTOM_TEMPLATES = [
  {
    name: '🏛️ 법령/규정',
    desc: '제1장 ➔ 제1조 ➔ 1.',
    value: [
      { type: 'custom' as const, number: 'decimal' as const, prefix: '제', suffix: '장 ' },
      { type: 'custom' as const, number: 'decimal' as const, prefix: '제', suffix: '조 ' },
      'decimal' as const, 'hangul' as const, 'none' as const, 'none' as const
    ]
  },
  {
    name: '📖 도서/챕터',
    desc: 'Chapter 1. ➔ Section 1. ➔ 1.',
    value: [
      { type: 'custom' as const, number: 'decimal' as const, prefix: 'Chapter ', suffix: '. ' },
      { type: 'custom' as const, number: 'decimal' as const, prefix: 'Section ', suffix: '. ' },
      'decimal' as const, 'hangul' as const, 'none' as const, 'none' as const
    ]
  },
  {
    name: '📑 조항/항목',
    desc: '제1조 ➔ ① ➔ 1.',
    value: [
      { type: 'custom' as const, number: 'decimal' as const, prefix: '제', suffix: '조 ' },
      { type: 'custom' as const, number: 'bullet' as const, prefix: '', suffix: ' ', bullet: '①' },
      'decimal' as const, 'hangul' as const, 'none' as const, 'none' as const
    ]
  },
  {
    name: '🔤 영문 대단원',
    desc: 'Part I. ➔ Unit 1. ➔ 1.',
    value: [
      { type: 'custom' as const, number: 'roman' as const, prefix: 'Part ', suffix: '. ' },
      { type: 'custom' as const, number: 'decimal' as const, prefix: 'Unit ', suffix: '. ' },
      'decimal' as const, 'hangul' as const, 'none' as const, 'none' as const
    ]
  }
];

// pt 단위 안전 파싱 헬퍼 (px 호환 변환: 1px = 0.75pt)
export const parsePt = (sizeStr?: string): number => {
  if (!sizeStr) return 11;
  const trimmed = sizeStr.trim();
  if (trimmed.endsWith('pt')) {
    const num = parseFloat(trimmed);
    return isNaN(num) ? 11 : num;
  }
  if (trimmed.endsWith('px')) {
    const num = parseFloat(trimmed);
    const converted = Math.round((num * 0.75) * 10) / 10;
    return isNaN(converted) ? 11 : converted;
  }
  const num = parseFloat(trimmed);
  return isNaN(num) ? 11 : num;
};

export default function QuickStylePanel({
  currentProfile,
  isSystemProfile,
  onUpdateProfile,
  onSwitchToProMode,
  isDarkMode
}: QuickStylePanelProps) {
  const pageStyle = currentProfile.pageStyle || {};
  const rules = currentProfile.rules || {};

  // 폰트 탐색 모달 및 사용자 정의 폰트 상태
  const [isFontModalOpen, setIsFontModalOpen] = useState(false);
  const [showCustomFontPanel, setShowCustomFontPanel] = useState(false);
  const [customFontInput, setCustomFontInput] = useState(pageStyle.fontFamily || '');

  // 제목 개요 사용자 정의 섹션 강제 펼침 여부
  const [showCustomDetail, setShowCustomDetail] = useState(false);
  const [showCustomThemePanel, setShowCustomThemePanel] = useState(false);

  // ── 1. 서체 핸들러 ──
  const currentFont = pageStyle.fontFamily || '';
  const isFontActive = (f: string) => currentFont.toLowerCase().includes(f.split(',')[0].replace(/['"]/g, '').toLowerCase());
  const isPresetFontActive = FONT_PRESETS.some(p => isFontActive(p.font));
  const isCustomFontActive = !isPresetFontActive && currentFont.trim().length > 0;

  useEffect(() => {
    if (pageStyle.fontFamily) {
      setCustomFontInput(pageStyle.fontFamily);
    }
  }, [pageStyle.fontFamily]);

  const handleFontSelect = (font: string) => {
    if (isSystemProfile) return;
    onUpdateProfile({
      ...currentProfile,
      pageStyle: {
        ...pageStyle,
        fontFamily: font
      }
    });
  };

  const handleApplyCustomFont = () => {
    if (isSystemProfile || !customFontInput.trim()) return;
    handleFontSelect(customFontInput.trim());
  };

  // ── 2. 테마 분위기 핸들러 ──
  const pColor = rules['p']?.color;
  const h1Color = rules['h1']?.color;
  const matchedTheme = useMemo(() => {
    return MOOD_THEMES.find(t => (pColor === t.textColor) && (h1Color === t.h1Color));
  }, [pColor, h1Color]);

  const isCustomThemeActive = !matchedTheme;

  const handleCustomColorChange = (key: 'textColor' | 'bgColor' | 'h1Color' | 'h2Color' | 'quoteBorder' | 'quoteBg', color: string) => {
    if (isSystemProfile) return;
    const nextRules = { ...rules };
    let nextBg = pageStyle.backgroundColor || '#ffffff';

    if (key === 'textColor') {
      nextRules['p'] = { ...(nextRules['p'] || {}), color };
    } else if (key === 'bgColor') {
      nextBg = color;
    } else if (key === 'h1Color') {
      nextRules['h1'] = { ...(nextRules['h1'] || {}), color };
    } else if (key === 'h2Color') {
      nextRules['h2'] = { ...(nextRules['h2'] || {}), color };
    } else if (key === 'quoteBorder') {
      const existingBg = nextRules['blockquote']?.['background-color'] || '#f8fafc';
      nextRules['blockquote'] = { ...(nextRules['blockquote'] || {}), 'border-left': `4px solid ${color}`, 'background-color': existingBg };
    } else if (key === 'quoteBg') {
      const existingBorder = (nextRules['blockquote']?.['border-left'] || '4px solid #2563eb');
      nextRules['blockquote'] = { ...(nextRules['blockquote'] || {}), 'border-left': existingBorder, 'background-color': color };
    }

    onUpdateProfile({
      ...currentProfile,
      pageStyle: {
        ...pageStyle,
        backgroundColor: nextBg
      },
      rules: nextRules
    });
  };

  const handleMoodSelect = (theme: MoodTheme) => {
    if (isSystemProfile) return;
    const nextRules = { ...rules };

    nextRules['h1'] = {
      ...(nextRules['h1'] || {}),
      color: theme.h1Color,
      'border-bottom': theme.h1Border
    };

    nextRules['h2'] = {
      ...(nextRules['h2'] || {}),
      color: theme.h2Color,
      'border-bottom': theme.h2Border
    };

    nextRules['blockquote'] = {
      ...(nextRules['blockquote'] || {}),
      'border-left': `4px solid ${theme.quoteBorder}`,
      'background-color': theme.quoteBg
    };

    nextRules['p'] = {
      ...(nextRules['p'] || {}),
      color: theme.textColor
    };

    onUpdateProfile({
      ...currentProfile,
      pageStyle: {
        ...pageStyle,
        backgroundColor: theme.bgColor
      },
      rules: nextRules
    });
  };

  // ── 3. 활자 크기(pt) & 행간 핸들러 ──
  const currentPt = useMemo(() => parsePt(pageStyle.fontSize), [pageStyle.fontSize]);
  const isPtPresetActive = (pt: number) => Math.abs(currentPt - pt) < 0.25;

  const handleSizeSelect = (fontSizePt: string, lineHeight?: string) => {
    if (isSystemProfile) return;
    onUpdateProfile({
      ...currentProfile,
      pageStyle: {
        ...pageStyle,
        fontSize: fontSizePt,
        ...(lineHeight ? { lineHeight } : {})
      }
    });
  };

  // ── 4. 용지 규격 및 방향 핸들러 ──
  const currentPaperSize = (pageStyle.paperSize || 'a4').toLowerCase();
  const currentOrientation = pageStyle.orientation || 'portrait';
  const currentPaperSpec = PAPER_SIZES[currentPaperSize] || PAPER_SIZES.a4;

  const handlePaperSizeChange = (paperSize: string) => {
    if (isSystemProfile) return;
    onUpdateProfile({
      ...currentProfile,
      pageStyle: {
        ...pageStyle,
        paperSize
      }
    });
  };

  const handleOrientationChange = (orientation: string) => {
    if (isSystemProfile) return;
    onUpdateProfile({
      ...currentProfile,
      pageStyle: {
        ...pageStyle,
        orientation
      }
    });
  };

  // ── 5. 문서 배치(Layout: 일반 vs 그림책) 핸들러 ──
  const isPicturebook = Boolean(currentProfile.layout && currentProfile.layout.type === 'picturebook');

  const handleLayoutToggle = (type: 'flow' | 'picturebook') => {
    if (isSystemProfile) return;
    onUpdateProfile({
      ...currentProfile,
      layout: type === 'picturebook' ? { ...DEFAULT_BOOK_LAYOUT } : undefined
    });
  };

  const updateBookLayout = (patch: Partial<NonNullable<CssProfile['layout']>>) => {
    if (isSystemProfile || !currentProfile.layout) return;
    onUpdateProfile({
      ...currentProfile,
      layout: {
        ...currentProfile.layout,
        ...patch
      }
    });
  };

  // ── 6. 제목 개요 번호 매김 핸들러 ──
  const headingNumbering = currentProfile.headingNumbering;
  const currentOutline = headingNumbering || [];

  const hasCustomSetting = useMemo(() => {
    return (headingNumbering || []).some(x => {
      if (!x) return false;
      if (typeof x === 'object' && (x as any).type === 'custom') return true;
      return headingFormat(x) === 'custom';
    });
  }, [headingNumbering]);

  const isLawActive = useMemo(() => {
    const list = headingNumbering || [];
    const h1 = headingSetting(list[0]);
    const h2 = headingSetting(list[1]);
    return (
      typeof h1 === 'object' && h1.prefix === '제' && h1.suffix.startsWith('장') &&
      typeof h2 === 'object' && h2.prefix === '제' && h2.suffix.startsWith('조')
    );
  }, [headingNumbering]);

  const isOutlinePresetActive = (preset: typeof OUTLINE_PRESETS[0]) => {
    if (preset.id === 'law') {
      return isLawActive;
    }
    if (preset.id === 'custom') {
      return (hasCustomSetting && !isLawActive) || showCustomDetail;
    }
    if (hasCustomSetting) return false;
    if (preset.value.length === 0) {
      return currentOutline.length === 0 || currentOutline.every(x => x === 'none');
    }
    return preset.value[0] === currentOutline[0] && preset.value[1] === currentOutline[1];
  };

  const handleOutlineSelect = (presetId: string, val: HeadingNumberSetting[]) => {
    if (isSystemProfile) return;
    if (presetId === 'custom') {
      setShowCustomDetail(true);
      if (!hasCustomSetting) {
        onUpdateProfile({
          ...currentProfile,
          headingNumbering: val
        });
      }
      return;
    }
    if (presetId === 'law') {
      setShowCustomDetail(true);
      onUpdateProfile({
        ...currentProfile,
        headingNumbering: val
      });
      return;
    }
    setShowCustomDetail(false);
    onUpdateProfile({
      ...currentProfile,
      headingNumbering: val
    });
  };

  const updateCustomLevel = (
    index: number,
    patch: { isNone?: boolean; prefix?: string; number?: 'decimal' | 'roman' | 'hangul' | 'bullet'; suffix?: string; bullet?: string }
  ) => {
    if (isSystemProfile) return;
    const formats: HeadingNumberSetting[] = Array.from({ length: 6 }, (_, i) => {
      return currentOutline[i] || 'none';
    });

    if (patch.isNone) {
      formats[index] = 'none';
    } else {
      const raw = headingSetting(formats[index]);
      const existing = typeof raw === 'object' && (raw as any).type === 'custom'
        ? (raw as any)
        : { type: 'custom' as const, number: 'decimal' as const, prefix: '', suffix: '. ', bullet: '•' };

      const { isNone, ...rest } = patch;
      formats[index] = { ...existing, ...rest };
    }

    onUpdateProfile({
      ...currentProfile,
      headingNumbering: formats
    });
  };

  const getCustomSetting = (index: number) => {
    const raw = headingSetting(currentOutline[index]);
    if (typeof raw === 'object' && (raw as any).type === 'custom') {
      return {
        isNone: false,
        ...(raw as { type: 'custom'; number: 'decimal' | 'roman' | 'hangul' | 'bullet'; prefix: string; suffix: string; bullet?: string })
      };
    }
    if (raw === 'none' || !raw) {
      return {
        isNone: true,
        type: 'custom' as const,
        number: 'decimal' as const,
        prefix: '',
        suffix: '',
        bullet: '•'
      };
    }
    // 내장 프리셋 포맷 (decimal, roman, hangul 등)
    return {
      isNone: false,
      type: 'custom' as const,
      number: raw as any,
      prefix: '',
      suffix: '. ',
      bullet: '•'
    };
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* 알림 배너 */}
      <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 flex items-start gap-3">
        <div className="p-1 rounded-md bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
          <Type size={16} />
        </div>
        <div className="text-xs leading-relaxed">
          <span className="font-bold">간편 스타일 스튜디오</span>: 문서의 모든 거시 규격(글꼴, 테마, pt 활자 크기, 용지, 문서배치, 제목번호)을 한 화면에서 원스톱으로 지정하세요.
        </div>
      </div>

      {/* ── 1. 대표 서체 (사용자 정의 글꼴 포함) ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Type size={14} className="text-blue-600 dark:text-blue-400" />
            <span>1. 대표 서체 (Font Family)</span>
          </label>
          <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60 truncate max-w-[180px]">
            {currentFont.split(',')[0].replace(/['"]/g, '') || '기본 서체'}
          </span>
        </div>

        {/* 4대 대표 글꼴 그리드 */}
        <div className="grid grid-cols-2 gap-2">
          {FONT_PRESETS.map((item) => {
            const active = isFontActive(item.font);
            return (
              <button
                key={item.id}
                type="button"
                disabled={isSystemProfile}
                onClick={() => {
                  handleFontSelect(item.font);
                  setShowCustomFontPanel(false);
                }}
                className={`p-3 rounded-xl border text-left transition-all relative group flex flex-col justify-between ${
                  active
                    ? 'border-blue-600 bg-blue-500/10 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-500/30'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                } ${isSystemProfile ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-extrabold truncate">{item.name}</span>
                  {active && <Check size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                </div>
                <div className="text-[11px] opacity-60 truncate font-mono" style={{ fontFamily: item.font }}>
                  {item.sample} 다람쥐 헌 쳇바퀴
                </div>
              </button>
            );
          })}

          {/* 5번째: 사용자 정의 글꼴 카드 (2열 확장) */}
          <button
            type="button"
            disabled={isSystemProfile}
            onClick={() => {
              setShowCustomFontPanel(!showCustomFontPanel);
            }}
            className={`col-span-2 p-3 rounded-xl border text-left transition-all relative group flex items-center justify-between ${
              isCustomFontActive || showCustomFontPanel
                ? 'border-blue-600 bg-blue-500/10 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-500/30'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200'
            } ${isSystemProfile ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
                <Sparkles size={14} />
              </div>
              <div>
                <div className="text-xs font-extrabold flex items-center gap-1.5">
                  <span>사용자 정의 글꼴 (Custom Font)</span>
                  {isCustomFontActive && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-mono">
                      적용 중
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5 truncate max-w-[280px]">
                  {isCustomFontActive
                    ? `${currentFont.split(',')[0].replace(/['"]/g, '')} (직접 지정 서체)`
                    : '시스템 폰트 목록 검색 또는 글꼴명 직접 입력'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isCustomFontActive && <Check size={16} className="text-blue-600 dark:text-blue-400" />}
              <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                {showCustomFontPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </div>
          </button>
        </div>

        {/* ── ✨ 사용자 정의 글꼴 상세 설정 패널 ── */}
        {(isCustomFontActive || showCustomFontPanel) && (
          <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-50/40 dark:bg-blue-950/20 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-blue-200/60 dark:border-blue-900/40 pb-2">
              <span className="text-xs font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-1">
                <Sparkles size={13} />
                <span>글꼴 탐색 및 직접 지정</span>
              </span>
              <button
                type="button"
                disabled={isSystemProfile}
                onClick={() => setIsFontModalOpen(true)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Search size={12} />
                <span>시스템 폰트 목록에서 찾기</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block">
                글꼴 패밀리 직접 입력
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customFontInput}
                  disabled={isSystemProfile}
                  onChange={(e) => setCustomFontInput(e.target.value)}
                  placeholder="예: '나눔스퀘어', '맑은 고딕', sans-serif"
                  className="flex-1 p-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-mono bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyCustomFont();
                  }}
                />
                <button
                  type="button"
                  disabled={isSystemProfile || !customFontInput.trim()}
                  onClick={handleApplyCustomFont}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  적용
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                💡 PC에 설치된 임의의 글꼴명(예: NanumSquare, &apos;HCR Batang&apos;)을 입력하거나 위 목록 버튼을 눌러 선택하세요.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. 문서 테마 & 분위기 ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Palette size={14} className="text-blue-600 dark:text-blue-400" />
            <span>2. 문서 분위기 & 테마 컬러</span>
          </label>
          <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full border border-zinc-400" style={{ backgroundColor: rules['h1']?.color || '#111827' }} />
            <span>{matchedTheme ? matchedTheme.name : '전문가 직접 지정'}</span>
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {MOOD_THEMES.map((theme) => {
            const active = (rules['p']?.color === theme.textColor) && (rules['h1']?.color === theme.h1Color);
            return (
              <button
                key={theme.id}
                type="button"
                disabled={isSystemProfile}
                onClick={() => handleMoodSelect(theme)}
                className={`p-3 rounded-xl border text-left transition-all relative flex items-center justify-between ${
                  active
                    ? 'border-blue-600 bg-blue-500/10 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-500/30'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                } ${isSystemProfile ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center -space-x-1 shrink-0">
                    <span className="w-4 h-4 rounded-full border border-white dark:border-zinc-900 shadow-xs" style={{ backgroundColor: theme.h1Color }} />
                    <span className="w-4 h-4 rounded-full border border-white dark:border-zinc-900 shadow-xs" style={{ backgroundColor: theme.textColor }} />
                    <span className="w-4 h-4 rounded-full border border-white dark:border-zinc-900 shadow-xs" style={{ backgroundColor: theme.quoteBorder }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold">{theme.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                        {theme.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      {theme.desc}
                    </div>
                  </div>
                </div>
                {active && <Check size={16} className="text-blue-600 dark:text-blue-400 shrink-0 ml-2" />}
              </button>
            );
          })}

          {/* 6번째: 사용자 정의 테마 (Custom Theme) 카드 */}
          <button
            type="button"
            disabled={isSystemProfile}
            onClick={() => setShowCustomThemePanel(!showCustomThemePanel)}
            className={`p-3 rounded-xl border text-left transition-all relative flex items-center justify-between ${
              isCustomThemeActive || showCustomThemePanel
                ? 'border-blue-600 bg-blue-500/10 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-500/30'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200'
            } ${isSystemProfile ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold">사용자 정의 테마 (Custom Theme)</span>
                  {isCustomThemeActive && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-mono">
                      적용 중
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  본문·배경·대제목·중제목·인용구 5대 핵심 색상을 직접 조색하여 나만의 테마 생성
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isCustomThemeActive && <Check size={16} className="text-blue-600 dark:text-blue-400" />}
              <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                {showCustomThemePanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </div>
          </button>
        </div>

        {/* ── ✨ 사용자 정의 테마 상세 조색 패널 ── */}
        {(isCustomThemeActive || showCustomThemePanel) && (
          <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-50/40 dark:bg-blue-950/20 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-blue-200/60 dark:border-blue-900/40 pb-2">
              <span className="text-xs font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-1">
                <Palette size={13} />
                <span>나만의 5대 핵심 색상 조색</span>
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                실시간 미리보기 연동
              </span>
            </div>

            {/* 5대 색상 피커 그리드 */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* 본문 글자색 */}
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 block">본문 글자색</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={isSystemProfile}
                    value={rules['p']?.color || '#111827'}
                    onChange={(e) => handleCustomColorChange('textColor', e.target.value)}
                    className="w-7 h-7 rounded border border-zinc-300 dark:border-zinc-700 cursor-pointer shrink-0 bg-transparent"
                  />
                  <input
                    type="text"
                    disabled={isSystemProfile}
                    value={rules['p']?.color || '#111827'}
                    onChange={(e) => handleCustomColorChange('textColor', e.target.value)}
                    className="w-full text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 bg-transparent outline-none uppercase"
                  />
                </div>
              </div>

              {/* 문서 배경색 */}
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 block">문서 배경색</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={isSystemProfile}
                    value={pageStyle.backgroundColor || '#ffffff'}
                    onChange={(e) => handleCustomColorChange('bgColor', e.target.value)}
                    className="w-7 h-7 rounded border border-zinc-300 dark:border-zinc-700 cursor-pointer shrink-0 bg-transparent"
                  />
                  <input
                    type="text"
                    disabled={isSystemProfile}
                    value={pageStyle.backgroundColor || '#ffffff'}
                    onChange={(e) => handleCustomColorChange('bgColor', e.target.value)}
                    className="w-full text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 bg-transparent outline-none uppercase"
                  />
                </div>
              </div>

              {/* 대제목 (H1) 악센트색 */}
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 block">대제목 (H1) 악센트색</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={isSystemProfile}
                    value={rules['h1']?.color || '#1d4ed8'}
                    onChange={(e) => handleCustomColorChange('h1Color', e.target.value)}
                    className="w-7 h-7 rounded border border-zinc-300 dark:border-zinc-700 cursor-pointer shrink-0 bg-transparent"
                  />
                  <input
                    type="text"
                    disabled={isSystemProfile}
                    value={rules['h1']?.color || '#1d4ed8'}
                    onChange={(e) => handleCustomColorChange('h1Color', e.target.value)}
                    className="w-full text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 bg-transparent outline-none uppercase"
                  />
                </div>
              </div>

              {/* 중제목 (H2) 악센트색 */}
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 block">중제목 (H2) 악센트색</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={isSystemProfile}
                    value={rules['h2']?.color || '#1e40af'}
                    onChange={(e) => handleCustomColorChange('h2Color', e.target.value)}
                    className="w-7 h-7 rounded border border-zinc-300 dark:border-zinc-700 cursor-pointer shrink-0 bg-transparent"
                  />
                  <input
                    type="text"
                    disabled={isSystemProfile}
                    value={rules['h2']?.color || '#1e40af'}
                    onChange={(e) => handleCustomColorChange('h2Color', e.target.value)}
                    className="w-full text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 bg-transparent outline-none uppercase"
                  />
                </div>
              </div>

              {/* 인용구 (Blockquote) 바 색상 (전체 폭) */}
              <div className="col-span-2 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 block">인용구 (Blockquote) 테두리 선 색상</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={isSystemProfile}
                    value={(rules['blockquote']?.['border-left'] || '').split(' ')[2] || '#2563eb'}
                    onChange={(e) => handleCustomColorChange('quoteBorder', e.target.value)}
                    className="w-7 h-7 rounded border border-zinc-300 dark:border-zinc-700 cursor-pointer shrink-0 bg-transparent"
                  />
                  <input
                    type="text"
                    disabled={isSystemProfile}
                    value={(rules['blockquote']?.['border-left'] || '').split(' ')[2] || '#2563eb'}
                    onChange={(e) => handleCustomColorChange('quoteBorder', e.target.value)}
                    className="w-full text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 bg-transparent outline-none uppercase"
                  />
                </div>
              </div>
            </div>

            {/* 추천 프리셋 원클릭 팔레트 */}
            <div className="pt-1">
              <span className="text-[10px] font-semibold text-zinc-500 block mb-1">추천 컬러 테마 퀵 조합:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: '🍷 버건디 와인', h1: '#881337', h2: '#9F1239', text: '#2A1015', bg: '#FFFDFC', qBorder: '#BE123C', qBg: '#FFF1F2' },
                  { name: '🌲 에메랄드 숲', h1: '#064E3B', h2: '#065F46', text: '#022C22', bg: '#FBFDFB', qBorder: '#059669', qBg: '#ECFDF5' },
                  { name: '🍂 앤틱 앰버', h1: '#78350F', h2: '#92400E', text: '#2D1B0D', bg: '#FCFAF7', qBorder: '#D97706', qBg: '#FEF3C7' },
                  { name: '🌌 딥 네이비', h1: '#0F172A', h2: '#1E293B', text: '#090D16', bg: '#F8FAFC', qBorder: '#3B82F6', qBg: '#EFF6FF' },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    disabled={isSystemProfile}
                    onClick={() => {
                      if (isSystemProfile) return;
                      handleMoodSelect({
                        id: 'custom-preset',
                        name: preset.name,
                        desc: '추천 커스텀 조합',
                        badge: '추천',
                        textColor: preset.text,
                        bgColor: preset.bg,
                        h1Color: preset.h1,
                        h1Border: `2px solid ${preset.h1}`,
                        h2Color: preset.h2,
                        h2Border: `1px solid ${preset.h2}40`,
                        quoteBorder: preset.qBorder,
                        quoteBg: preset.qBg
                      });
                    }}
                    className="px-2 py-1 rounded bg-white dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-zinc-200 dark:border-zinc-700 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. 활자 크기(pt 단위 전면 개편) ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Maximize2 size={14} className="text-blue-600 dark:text-blue-400" />
            <span>3. 본문 활자 크기 (pt 단위)</span>
          </label>
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
            {currentPt}pt ({Math.round(currentPt * 96 / 72 * 10) / 10}px 상당)
          </span>
        </div>

        {/* 4대 대표 표준 규격 (10pt ~ 12pt) */}
        <div className="grid grid-cols-4 gap-2">
          {PT_SIZE_PRESETS.map((sz) => {
            const active = isPtPresetActive(sz.pt);
            return (
              <button
                key={sz.id}
                type="button"
                disabled={isSystemProfile}
                onClick={() => handleSizeSelect(`${sz.pt}pt`, sz.lineHeight)}
                className={`p-2 rounded-xl border text-center transition-all ${
                  active
                    ? 'border-blue-600 bg-blue-500/10 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-500/30'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                } ${isSystemProfile ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="text-xs font-extrabold">{sz.label}</div>
                <div className="text-[10px] text-zinc-400 mt-0.5 truncate">{sz.title}</div>
              </button>
            );
          })}
        </div>

        {/* 0.5pt 단위 정밀 슬라이더 & 눈금자 */}
        <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200/80 dark:border-zinc-800/60 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span>미세 크기 조절</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-mono font-bold">
                0.5pt 정밀 눈금자
              </span>
            </span>
            <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-sm">
              {currentPt} pt
            </span>
          </div>

          {/* 슬라이더 트랙 & 정밀 눈금자 일체형 컨테이너 */}
          <div className="relative pt-1 pb-1">
            <input
              type="range"
              min={8}
              max={24}
              step={0.5}
              disabled={isSystemProfile}
              value={currentPt}
              onChange={(e) => handleSizeSelect(`${e.target.value}pt`)}
              className="w-full accent-blue-600 cursor-pointer block"
            />

            {/* 정밀 눈금자 (Ruler Track: 8pt ~ 24pt, 0.5pt 간격, 총 33눈금 물리적 1:1 위치 일치) */}
            <div className="relative mx-[8px] h-8 mt-1 select-none">
              {/* 기준 수평 베이스 라인 */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-zinc-300 dark:bg-zinc-700" />

              {/* 0.5pt 단위 33개 눈금 렌더링 (8.0 ~ 24.0) */}
              {Array.from({ length: 33 }, (_, i) => 8 + i * 0.5).map((ptVal) => {
                const pct = ((ptVal - 8) / 16) * 100;
                const isMajor = ptVal % 2 === 0; // 8, 10, 12, 14, 16, 18, 20, 22, 24
                const isMedium = !isMajor && ptVal % 1 === 0; // 9, 11, 13, 15, 17, 19, 21, 23
                const isActive = Math.abs(ptVal - currentPt) < 0.25;

                return (
                  <div
                    key={ptVal}
                    onClick={() => !isSystemProfile && handleSizeSelect(`${ptVal}pt`)}
                    className="absolute top-0 flex flex-col items-center cursor-pointer group"
                    style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                    title={`${ptVal}pt 클릭 시 즉시 적용`}
                  >
                    {/* 눈금 세로선 */}
                    <div
                      className={`w-[1px] transition-all ${
                        isActive
                          ? 'bg-blue-600 dark:bg-blue-400 w-[2px]'
                          : isMajor
                          ? 'bg-zinc-400 dark:bg-zinc-500 group-hover:bg-blue-500'
                          : isMedium
                          ? 'bg-zinc-300 dark:bg-zinc-600 group-hover:bg-blue-400'
                          : 'bg-zinc-250 dark:bg-zinc-700/80 group-hover:bg-blue-300'
                      }`}
                      style={{
                        height: isMajor ? '10px' : isMedium ? '6px' : '4px'
                      }}
                    />

                    {/* 주 눈금 숫자 레이블 (8, 10, 12, 14, 16, 18, 20, 22, 24) */}
                    {isMajor && (
                      <span
                        className={`text-[9px] font-mono mt-1 transition-all leading-none ${
                          isActive
                            ? 'font-bold text-blue-600 dark:text-blue-400 scale-110'
                            : 'text-zinc-500 dark:text-zinc-400 group-hover:text-blue-500'
                        }`}
                      >
                        {ptVal}
                      </span>
                    )}

                    {/* 활성 위치가 홀수나 10.5pt 등 소수점일 때 눈금 바로 아래 강조 숫자 */}
                    {isActive && !isMajor && (
                      <span className="text-[9px] font-mono font-bold text-blue-600 dark:text-blue-400 mt-1 scale-110 leading-none">
                        {ptVal}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. 용지 규격 및 인쇄 방향 (간편 모드 이관) ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <LayoutTemplate size={14} className="text-blue-600 dark:text-blue-400" />
            <span>4. 용지 규격 및 인쇄 방향</span>
          </label>
          <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
            {currentPaperSpec.label} · {currentOrientation === 'landscape' ? '가로' : '세로'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* 용지 크기 선택 드롭다운 */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-zinc-500 block">용지 판형 (Paper Size)</span>
            <select
              disabled={isSystemProfile}
              value={currentPaperSize}
              onChange={(e) => handlePaperSizeChange(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-800 dark:text-zinc-200 shadow-xs cursor-pointer"
            >
              {Object.entries(PAPER_SIZES).map(([key, spec]) => (
                <option key={key} value={key}>
                  {spec.label} ({spec.width}×{spec.height}mm)
                </option>
              ))}
            </select>
          </div>

          {/* 용지 방향 (가로 / 세로 세그먼트) */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-zinc-500 block">인쇄 방향 (Orientation)</span>
            <div className="flex rounded-xl p-0.5 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                disabled={isSystemProfile}
                onClick={() => handleOrientationChange('portrait')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentOrientation === 'portrait'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                세로 (Portrait)
              </button>
              <button
                type="button"
                disabled={isSystemProfile}
                onClick={() => handleOrientationChange('landscape')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentOrientation === 'landscape'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                가로 (Landscape)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. 문서 배치 형식 (일반문서 vs 그림책) (간편 모드 이관) ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <BookOpen size={14} className="text-blue-600 dark:text-blue-400" />
            <span>5. 문서 배치 형식 (Document Layout)</span>
          </label>
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
            {isPicturebook ? '📚 그림책 조판' : '📄 일반 연속 문서'}
          </span>
        </div>

        {/* 2대 레이아웃 카드 선택 */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isSystemProfile}
            onClick={() => handleLayoutToggle('flow')}
            className={`p-3 rounded-xl border text-left transition-all ${
              !isPicturebook
                ? 'border-blue-600 bg-blue-500/10 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-500/30'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 text-zinc-800 dark:text-zinc-200'
            } cursor-pointer`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <FileText size={14} />
                <span>일반 문서 (Flow)</span>
              </span>
              {!isPicturebook && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
            </div>
            <div className="text-[10px] text-zinc-400">보고서, 기획서, 표준 인쇄 연속 조판</div>
          </button>

          <button
            type="button"
            disabled={isSystemProfile}
            onClick={() => handleLayoutToggle('picturebook')}
            className={`p-3 rounded-xl border text-left transition-all ${
              isPicturebook
                ? 'border-blue-600 bg-blue-500/10 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-500/30'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 text-zinc-800 dark:text-zinc-200'
            } cursor-pointer`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-extrabold flex items-center gap-1.5">
                <BookOpen size={14} />
                <span>그림책 (Picturebook)</span>
              </span>
              {isPicturebook && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
            </div>
            <div className="text-[10px] text-zinc-400">장면별 그림+본문 1:1 대면 배치</div>
          </button>
        </div>

        {/* 그림책 세부 제어창 */}
        {isPicturebook && currentProfile.layout && (
          <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-50/40 dark:bg-blue-950/20 space-y-3 animate-in fade-in duration-200">
            <span className="text-xs font-bold text-blue-900 dark:text-blue-200 block">
              📚 그림책 상세 옵션
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-zinc-600 dark:text-zinc-400 block mb-1">표지 배치</label>
                <select
                  disabled={isSystemProfile}
                  value={currentProfile.layout.cover}
                  onChange={(e) => updateBookLayout({ cover: e.target.value as any })}
                  className="w-full p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-bold"
                >
                  <option value="full-image">전체 그림 표지</option>
                  <option value="image-right">오른쪽 그림 표지</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-600 dark:text-zinc-400 block mb-1">그림 맞춤</label>
                <select
                  disabled={isSystemProfile}
                  value={currentProfile.layout.imageFit}
                  onChange={(e) => updateBookLayout({ imageFit: e.target.value as any })}
                  className="w-full p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-bold"
                >
                  <option value="contain">전체 보이기 (여백 허용)</option>
                  <option value="cover">영역 채우기 (자르기 허용)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
                <span>그림 영역 비율</span>
                <span className="font-bold font-mono text-blue-600">{Math.round(currentProfile.layout.imageRatio * 100)}%</span>
              </div>
              <input
                type="range"
                min={30}
                max={70}
                disabled={isSystemProfile}
                value={currentProfile.layout.imageRatio * 100}
                onChange={(e) => updateBookLayout({ imageRatio: Number(e.target.value) / 100 })}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isSystemProfile}
                  checked={currentProfile.layout.pageNumbers}
                  onChange={(e) => updateBookLayout({ pageNumbers: e.target.checked })}
                  className="rounded accent-blue-600"
                />
                <span>페이지 번호 표기</span>
              </label>
              <span className="text-[11px] text-zinc-400">간격: {currentProfile.layout.gap || '6mm'}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 6. 제목 번호 매김 형식 (사용자 정의 포함) ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <ListOrdered size={14} className="text-blue-600 dark:text-blue-400" />
            <span>6. 제목 개요 번호 체계</span>
          </label>
          <span className="text-[11px] text-zinc-400">H1~H6 자동 부여</span>
        </div>
        
        {/* 6대 개요 프리셋 그리드 */}
        <div className="grid grid-cols-2 gap-2">
          {OUTLINE_PRESETS.map((ot) => {
            const active = isOutlinePresetActive(ot);
            return (
              <button
                key={ot.id}
                type="button"
                disabled={isSystemProfile}
                onClick={() => handleOutlineSelect(ot.id, ot.value)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  active
                    ? 'border-blue-600 bg-blue-500/10 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-500/30'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                } ${isSystemProfile ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-extrabold truncate">{ot.name}</span>
                  {active && <Check size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate">{ot.pattern}</div>
              </button>
            );
          })}
        </div>

        {/* ── ✨ 사용자 정의 서식 상세 설정 패널 (접이식/조건부 노출) ── */}
        {(hasCustomSetting || showCustomDetail) && (
          <div className="mt-3 p-3.5 rounded-xl border border-blue-500/30 bg-blue-50/40 dark:bg-blue-950/20 space-y-3.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-blue-200/60 dark:border-blue-900/40 pb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-extrabold text-blue-900 dark:text-blue-200">
                  사용자 정의 서식 구성기
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomDetail(!showCustomDetail)}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                {showCustomDetail ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                <span>{showCustomDetail ? '접기' : '펼치기'}</span>
              </button>
            </div>

            {/* 원클릭 추천 템플릿 */}
            <div>
              <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                추천 커스텀 템플릿
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {CUSTOM_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.name}
                    type="button"
                    disabled={isSystemProfile}
                    onClick={() => {
                      if (!isSystemProfile) {
                        onUpdateProfile({ ...currentProfile, headingNumbering: tmpl.value });
                        setShowCustomDetail(true);
                      }
                    }}
                    className="p-2 rounded-lg border border-blue-200/80 dark:border-blue-900/60 bg-white dark:bg-zinc-900 text-left hover:border-blue-500 transition-all cursor-pointer group shadow-xs"
                  >
                    <div className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {tmpl.name}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate">
                      {tmpl.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* H1 ~ H6 실시간 인라인 편집기 */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  위계별 번호 조합 (H1 ~ H6)
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  필요하지 않은 레벨은 &apos;적용 안함&apos;으로 유지
                </span>
              </div>

              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const custom = getCustomSetting(idx);
                const levelName = [
                  'H1 (최상위 제목)',
                  'H2 (중간 제목)',
                  'H3 (소제목)',
                  'H4 (세부 제목)',
                  'H5 (하위 항목)',
                  'H6 (최하위 항목)'
                ][idx];

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border transition-all space-y-2 ${
                      custom.isNone
                        ? 'bg-zinc-50/70 dark:bg-zinc-900/30 border-zinc-200/70 dark:border-zinc-800/50 opacity-80'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{levelName}</span>
                        {custom.isNone && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500 font-medium">
                            적용 안함 (기본)
                          </span>
                        )}
                      </div>
                      {custom.isNone ? (
                        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700/60">
                          (번호 없음) 문서 제목
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60 truncate max-w-[160px]">
                          {headingMarker(custom, 1)}문서 제목
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      <div>
                        <label className="text-[10px] text-zinc-600 dark:text-zinc-400 font-semibold block mb-0.5">앞 문구 (접두사)</label>
                        <input
                          type="text"
                          value={custom.isNone ? '' : custom.prefix}
                          disabled={isSystemProfile || custom.isNone}
                          onChange={(e) => updateCustomLevel(idx, { prefix: e.target.value })}
                          placeholder={custom.isNone ? '적용 안함' : '예: 제, Chapter '}
                          className="w-full p-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-600 dark:text-zinc-400 font-semibold block mb-0.5">번호 종류</label>
                        <select
                          value={custom.isNone ? 'none' : custom.number}
                          disabled={isSystemProfile}
                          onChange={(e) => {
                            if (e.target.value === 'none') {
                              updateCustomLevel(idx, { isNone: true });
                            } else {
                              updateCustomLevel(idx, { isNone: false, number: e.target.value as any });
                            }
                          }}
                          className="w-full p-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-medium cursor-pointer"
                        >
                          <option value="none">적용 안함 (번호 없음)</option>
                          <option value="decimal">1, 2, 3 (숫자)</option>
                          <option value="roman">Ⅰ, Ⅱ, Ⅲ (로마)</option>
                          <option value="hangul">가, 나, 다 (한글)</option>
                          <option value="bullet">글머리기호</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-600 dark:text-zinc-400 font-semibold block mb-0.5">뒤 문구 (접미사)</label>
                        <input
                          type="text"
                          value={custom.isNone ? '' : custom.suffix}
                          disabled={isSystemProfile || custom.isNone}
                          onChange={(e) => updateCustomLevel(idx, { suffix: e.target.value })}
                          placeholder={custom.isNone ? '적용 안함' : '예: 장 , . '}
                          className="w-full p-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {!custom.isNone && custom.number === 'bullet' && (
                      <div className="pt-1">
                        <label className="text-[10px] text-zinc-600 dark:text-zinc-400 font-semibold block mb-0.5">글머리기호 문자</label>
                        <input
                          type="text"
                          value={custom.bullet || '•'}
                          disabled={isSystemProfile}
                          onChange={(e) => updateCustomLevel(idx, { bullet: e.target.value })}
                          placeholder="예: •, ①, ㈎, ※, ◆"
                          className="w-full p-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 text-xs font-medium"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
              💡 H1부터 H6까지 각 위계별로 번호 체계를 자유롭게 지정하거나 &apos;적용 안함&apos;으로 유지할 수 있습니다.
            </p>
          </div>
        )}
      </div>

      {/* ── 7. 전문가 모드 전환 유도 바 ── */}
      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={onSwitchToProMode}
          className="w-full py-3 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:border-blue-500 bg-white dark:bg-zinc-900 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-xs group cursor-pointer"
        >
          <Sliders size={15} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>더 세밀한 조정이 필요하신가요? [세부 서식 다듬기(Detail) 펼치기 🎨]</span>
        </button>
      </div>

      {/* ── 폰트 검색 모달 ── */}
      <FontSelectorModal
        isOpen={isFontModalOpen}
        onClose={() => setIsFontModalOpen(false)}
        currentFont={pageStyle.fontFamily || ''}
        onSelectFont={(font) => {
          handleFontSelect('"' + font + '", serif');
          setCustomFontInput('"' + font + '", serif');
          setIsFontModalOpen(false);
        }}
        isDarkMode={isDarkMode || false}
      />
    </div>
  );
}
