import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useState, useEffect } from 'react';
import { rememberLocalFontSources } from '@/lib/localFontSources';

// =====================================================================
// 📊 [OMD-CORE-FontSelectorModal-0001] FontSelectorModal ➔ FontEntry
// 🎯 @KICK  : 폰트 목록 항목 타입 — CSS 적용용(name=family)과 화면 표시용(label) 분리
// 🛡️ @GUARD : CSS font-family는 반드시 font.family 사용 (postscriptName 사용 시 브라우저 미인식)
// 🚨 @PATCH : **2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
//             2026-08-01** — postscriptName → family 로 CSS 적용 기준 수정;
//             한글명 매핑 복원; 번들 임베드 폰트 추가;
//             검색상자(input) 타이핑 시 keydown 이벤트가 document.body로 버블링되어
//             Monaco getModifierState 런타임 크래시를 유발하는 현상 해결 —
//             최외각 wrapper에 onKeyDown stopPropagation 가드 장착 (ExportModal/LicenseModal과 동일 패턴)
// 🔗 @CALLS : 없음
// =====================================================================
interface FontEntry {
  name: string;  // CSS font-family 적용용 → font.family 사용 ✅
  label: string; // 화면 표시용 → 한글명 우선, 없으면 family 그대로
}

interface FontSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFont: string;
  onSelectFont: (fontName: string) => void;
  isDarkMode: boolean;
}

// =====================================================================
// 한글명 매핑 테이블 — CSS family명 → 화면 표시 한글명
// =====================================================================
const FONT_NAME_MAP: Record<string, string> = {
  // Windows 기본 한글 폰트
  'Malgun Gothic'          : '맑은 고딕',
  'Malgun Gothic Semilight': '맑은 고딕 Semilight',
  'Gulim'                  : '굴림',
  'GulimChe'               : '굴림체',
  'Dotum'                  : '돋움',
  'DotumChe'               : '돋움체',
  'Batang'                 : '바탕',
  'BatangChe'              : '바탕체',
  'Gungsuh'                : '궁서',
  'GungsuhChe'             : '궁서체',
  // 나눔 계열
  'Nanum Gothic'           : '나눔고딕',
  'NanumGothic'            : '나눔고딕',
  'NanumGothicBold'        : '나눔고딕 Bold',
  'NanumGothicExtraBold'   : '나눔고딕 ExtraBold',
  'Nanum Myeongjo'         : '나눔명조',
  'NanumMyeongjo'          : '나눔명조',
  'NanumSquare'            : '나눔스퀘어',
  'NanumSquareRound'       : '나눔스퀘어라운드',
  'NanumBarunGothic'       : '나눔바른고딕',
  'NanumBarunpen'          : '나눔바른펜',
  'NanumPen Script'        : '나눔펜스크립트',
  // 은 계열
  'UnBatang'               : '은바탕',
  'UnDotum'                : '은돋움',
  // Noto
  'Noto Sans KR'           : '본고딕 (Noto Sans KR)',
  'Noto Serif KR'          : '본명조 (Noto Serif KR)',
  'Noto Sans CJK KR'       : '본고딕 CJK KR',
  // 애플
  'Apple SD Gothic Neo'    : '애플 SD 산돌고딕 Neo',
  'AppleGothic'            : '애플고딕',
  'AppleMyungjo'           : '애플명조',
  // 프리텐다드 / SUIT
  'Spoqa Han Sans Neo'     : '스포카 한 산스 Neo',
  'Pretendard'             : '프리텐다드',
  'Pretendard Variable'    : '프리텐다드 Variable',
  'SUIT'                   : 'SUIT',
  // 기타 한글 폰트
  'Gmarket Sans'           : '지마켓 산스',
  'GmarketSans'            : '지마켓 산스',
  'Black Han Sans'         : '검정한산스',
  'Jua'                    : '주아체',
  'Do Hyeon'               : '도현체',
  'Nanum Pen Script'       : '나눔손글씨 펜',
  'Gaegu'                  : '개구체',
  'Hi Melody'              : '하이멜로디',
  'Cute Font'              : '귀여운폰트',
  'Single Day'             : '싱글데이',
  'Stylish'                : '스타일리시',
  'Sunflower'              : '해바라기',
  'Poor Story'             : '가난한이야기',
  'Gamja Flower'           : '감자꽃',
  // ── 번들 임베드 폰트 ──
  '학교안심 포스터 B'          : '학교안심 포스터 B',
  '학교안심 포스터 OTF B'      : '학교안심 포스터 OTF B',
  '학교안심 어항꾸미기 B'      : '학교안심 어항꾸미기 B',
  '학교안심 어항꾸미기 OTF B'  : '학교안심 어항꾸미기 OTF B',
  '학교안심 붓펜M'             : '학교안심 붓펜M',
  '학교안심 보드마카 R'        : '학교안심 보드마카 R',
  '학교안심 보드마카 OTF R'    : '학교안심 보드마카 OTF R',
  '디자인하우스체'             : '디자인하우스체',
  '더서클체'                   : '더서클체',
  'EBS 주시경체'               : 'EBS 주시경체',
  'EBS 훈민정음 새론'          : 'EBS 훈민정음 새론',
  '이순신 돋움체'              : '이순신 돋움체',
};

// ── 임베드 폰트 목록 (항상 목록 선두에 고정) ──
const EMBEDDED_FONTS: FontEntry[] = [
  { name: '학교안심 포스터 B',         label: '학교안심 포스터 B' },
  { name: '학교안심 어항꾸미기 B',     label: '학교안심 어항꾸미기 B' },
  { name: '학교안심 붓펜M',            label: '학교안심 붓펜M' },
  { name: '학교안심 보드마카 R',       label: '학교안심 보드마카 R' },
  { name: '디자인하우스체',            label: '디자인하우스체' },
  { name: '더서클체',                  label: '더서클체' },
  { name: 'EBS 주시경체',              label: 'EBS 주시경체' },
  { name: 'EBS 훈민정음 새론',         label: 'EBS 훈민정음 새론' },
  { name: '이순신 돋움체',             label: '이순신 돋움체' },
];

const EMBEDDED_NAMES = new Set(EMBEDDED_FONTS.map(f => f.name));
const LEGACY_EMBEDDED_ALIASES = new Set([
  '학교안심 포스터 OTF B', '학교안심 어항꾸미기 OTF B', '학교안심 보드마카 OTF R',
]);

// queryLocalFonts 미지원 환경 폴백
const FALLBACK_FONTS: FontEntry[] = [
  ...EMBEDDED_FONTS,
  { name: 'Malgun Gothic',    label: '맑은 고딕' },
  { name: 'Batang',           label: '바탕체' },
  { name: 'Gungsuh',          label: '궁서체' },
  { name: 'Dotum',            label: '돋움체' },
  { name: 'Gulim',            label: '굴림체' },
  { name: 'NanumGothic',      label: '나눔고딕' },
  { name: 'NanumMyeongjo',    label: '나눔명조' },
  { name: 'Noto Sans KR',     label: '본고딕 (Noto Sans KR)' },
  { name: 'Segoe UI',         label: 'Segoe UI' },
  { name: 'Arial',            label: 'Arial' },
  { name: 'Times New Roman',  label: 'Times New Roman' },
  { name: 'Georgia',          label: 'Georgia' },
  { name: 'Verdana',          label: 'Verdana' },
  { name: 'Tahoma',           label: 'Tahoma' },
  { name: 'Consolas',         label: 'Consolas' },
  { name: 'Courier New',      label: 'Courier New' },
  { name: 'D2Coding',         label: 'D2Coding' },
  { name: 'Impact',           label: 'Impact' },
];

// =====================================================================
// 📊 [OMD-CORE-FontSelectorModal-0002] FontSelectorModal ➔ collectFonts
// 🎯 @KICK  : queryLocalFonts()로 PC 설치 폰트 수집 → 임베드 폰트를 최상단에 고정 병합
// 🛡️ @GUARD : 미지원/권한거부 시 FALLBACK_FONTS 반환
// 🚨 @PATCH : **2026-08-01** — CSS적용 기준 postscriptName → font.family 수정;
//             번들 임베드 폰트(학교안심 등 14종) 목록 선두 고정 병합
// 🔗 @CALLS : window.queryLocalFonts
// =====================================================================
async function collectFonts(): Promise<FontEntry[]> {
  let systemFonts: FontEntry[] = [];
  try {
    if (typeof window !== 'undefined' && 'queryLocalFonts' in window) {
      const localFonts: any[] = await (window as any).queryLocalFonts();
      rememberLocalFontSources(localFonts || []);
      if (localFonts && localFonts.length > 0) {
        const fontMap = new Map<string, FontEntry>();
        localFonts.forEach((font: any) => {
          if (!fontMap.has(font.family) && !EMBEDDED_NAMES.has(font.family) && !LEGACY_EMBEDDED_ALIASES.has(font.family)) {
            fontMap.set(font.family, {
              name: font.family,
              label: FONT_NAME_MAP[font.family] || font.family,
            });
          }
        });
        systemFonts = Array.from(fontMap.values()).sort((a, b) =>
          a.label.localeCompare(b.label, 'ko')
        );
      }
    }
  } catch (err) {
    console.warn('queryLocalFonts 실패 (권한 거부 또는 미지원):', err);
  }

  if (systemFonts.length === 0) {
    return FALLBACK_FONTS;
  }

  // 임베드 폰트를 최상단에 고정
  return [...EMBEDDED_FONTS, ...systemFonts];
}

// =====================================================================
// 📊 [OMD-CORE-FontSelectorModal-0003] FontSelectorModal ➔ FontSelectorModal
// 🎯 @KICK  : 시스템 폰트 목록을 검색·선택하는 모달. 선택 시 font.family 전달
// 🛡️ @GUARD : isOpen false 시 렌더링 생략
// 🚨 @PATCH : **2026-08-01** — 임베드 폰트 선두 고정; 내장 배지 표시; label+name 양방향 검색
// 🔗 @CALLS : collectFonts
// =====================================================================
export default function FontSelectorModal({
  isOpen, onClose, currentFont, onSelectFont, isDarkMode,
}: FontSelectorModalProps) {
  useModalEscape(isOpen, onClose);
  const [fonts, setFonts] = useState<FontEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSearchTerm('');
    collectFonts().then((list) => {
      setFonts(list);
      setLoading(false);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = fonts.filter(f => {
    const term = searchTerm.toLowerCase();
    return f.label.toLowerCase().includes(term) || f.name.toLowerCase().includes(term);
  });

  const bg       = isDarkMode ? 'bg-zinc-900'     : 'bg-white';
  const border   = isDarkMode ? 'border-zinc-700' : 'border-gray-200';
  const divider  = isDarkMode ? 'border-zinc-800' : 'border-gray-100';
  const textMain = isDarkMode ? 'text-white'       : 'text-[#1b1b23]';
  const textSub  = isDarkMode ? 'text-zinc-500'    : 'text-gray-400';
  const inputBg  = isDarkMode
    ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500'
    : 'bg-gray-50 border-gray-200 text-[#1b1b23]';
  const listBg   = isDarkMode ? 'border-zinc-800 bg-zinc-950/40' : 'border-gray-100 bg-gray-50/50';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div
        className={`w-full max-w-md mx-4 rounded-xl shadow-2xl border flex flex-col ${bg} ${border}`}
        style={{ maxHeight: '90dvh', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className={`flex justify-between items-center px-6 py-4 border-b shrink-0 ${divider}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1d4ed8]/15 text-[#1d4ed8]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7V4h16v3M9 20h6M12 4v16" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1d4ed8] tracking-tight">시스템 글꼴 선택</h2>
              {!loading && (
                <span className={`text-[11px] font-medium ${textSub}`}>
                  {filtered.length}개 표시 / 전체 {fonts.length}개
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-md transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 검색창 */}
        <div className="px-5 pt-3 pb-2 shrink-0">
          <input
            type="text"
            placeholder="한글명·영문명 검색 (예: 맑은, Gothic, EBS)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full p-2.5 rounded-lg text-xs font-semibold border outline-none transition-all focus:border-blue-500 ${inputBg}`}
            autoFocus
          />
        </div>

        {/* 폰트 목록 */}
        <div className={`mx-4 mb-3 flex-1 overflow-y-auto min-h-0 space-y-0.5 rounded-lg border p-1 ${listBg}`}>
          {loading ? (
            <div className={`flex flex-col items-center justify-center py-10 gap-3 ${textSub}`}>
              <svg className="animate-spin w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span className="text-xs font-medium">시스템 폰트를 불러오는 중...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className={`text-center py-8 text-xs font-medium ${textSub}`}>
              검색된 글꼴이 없습니다.
            </div>
          ) : (
            filtered.map((font) => {
              const isSelected  = currentFont.includes(font.name);
              const isEmbedded  = EMBEDDED_NAMES.has(font.name);
              const hasKoreanLabel = font.label !== font.name;
              return (
                <button
                  key={font.name}
                  onClick={() => { onSelectFont(font.name); onClose(); }}
                  className={`w-full text-left px-3 py-2.5 rounded-md transition-all flex justify-between items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDarkMode
                        ? 'hover:bg-blue-600/20 text-zinc-300'
                        : 'hover:bg-blue-50 text-zinc-600'
                  }`}
                >
                  <span className="flex flex-col min-w-0">
                    <span className="flex items-center gap-1.5 text-xs font-bold truncate">
                      {isEmbedded && (
                        <span className={`text-[9px] px-1 py-0.5 rounded font-bold shrink-0 ${
                          isSelected ? 'bg-blue-400 text-white' : 'bg-amber-400 text-amber-900'
                        }`}>내장</span>
                      )}
                      {font.label}
                    </span>
                    {hasKoreanLabel && (
                      <span className={`text-[10px] font-normal truncate ${
                        isSelected ? 'text-blue-100' : textSub
                      }`}>
                        {font.name}
                      </span>
                    )}
                  </span>
                  <span
                    className="text-sm opacity-70 shrink-0"
                    style={{ fontFamily: `"${font.name}", sans-serif` }}
                  >
                    가나다 ABC 123
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* 하단 */}
        <div className={`px-5 pb-4 shrink-0 flex items-center justify-between text-[10px] font-medium ${textSub}`}>
          <span>현재 적용: <span className="text-blue-500 font-bold">{currentFont || '없음'}</span></span>
          <span><span className="text-amber-500 font-bold">내장</span> = 앱 번들 포함 폰트</span>
        </div>
      </div>
    </div>
  );
}
