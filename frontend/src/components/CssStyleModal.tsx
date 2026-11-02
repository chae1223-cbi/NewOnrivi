/**
 * 프로그램명 : OnriviAuthor
 * 파일명 : CssStyleModal.tsx
 * -----------------------------------------------------------------------
 * 변경내역
 * 🚨 @PATCH : **2026-10-26** — [15대 서식 쇼케이스 카드 클릭 시 좌측 설정 패널 즉시 전환 완성]:
 *             1) 쇼케이스 모아보기에서 카드(소스코드블록, 인라인코드, 링크, 각주, 동영상, 지도 등) 내부 클릭 시 cardModuleId를 최우선 판별하여 해당 설정 패널로 즉시 1:1 전환되도록 클릭 인스펙터 전면 쇄신
 *             2) 동영상·지도 figure 래퍼가 이미지(img)로 오탐되던 우선순위 결함 및 인라인코드·링크·각주 내부 <p> 태그 오탐으로 본문 패널로 튕기던 문제 완벽 해결
 *             3) 모든 쇼케이스 카드에 data-module-id 명시 바인딩 및 커서 포인터(cursor-pointer) 시각 피드백 제공
 * 🚨 @PATCH : **2026-10-26** — [동영상·지도 쇼케이스 캡션 이미지 규격(figure/figcaption, 중앙 정렬, 0.88em) 일원화]:
 *             1) Card 12(동영상) 및 Card 13(지도) 캡션을 onrivi-video-figure 및 onrivi-map-figure figure/figcaption 구조로 래핑하여 이미지 캡션과 100% 동일한 0.88em 크기 및 중앙 정렬 보장
 * 🚨 @PATCH : **2026-10-26** — [쇼케이스 이미지·동영상·지도 캡션 위치 및 6종 표현 구문 실시간 연동]:
 *             1) syncShowcaseModuleMarkdown을 신설하여 이미지뿐만 아니라 동영상, 지도 카드의 캡션 위치(상/하단) 및 6종 포맷(표준/대괄호/화살괄호/일반/제목만/커스텀)이 실시간 동기화되도록 구현
 *             2) MarkdownViewer에 picturebookProfile={activeProfile}을 바인딩하여 이미지 figcaption 위치 제어가 쇼케이스 및 실제 문서 뷰에 100% 반영되도록 보완
 * 🚨 @PATCH : **2026-10-26** — [15대 서식 순서 쇼케이스 1:1 자동 스크롤 및 포커스 동기화]:
 *             1) 좌측 패널의 15대 서식 선택(클릭 칩, 검색, 하단 팝업 리스트, 이전/다음) 시 우측 쇼케이스 해당 카드로 1:1 정확한 스무스 자동 스크롤 및 코발트 조명 링(ring-4) 포커스 연동
 *             2) 우측 쇼케이스 내 임의 요소 클릭(Click-to-Inspect) 시 15대 세분화 카테고리(코드블록, 인라인코드, 링크, 이미지, 동영상, 지도, 수식 등)로 1:1 정확한 역방향 포커스 연동
 * 🚨 @PATCH : **2026-10-26** — [미리보기 영역 실시간 클릭 인스펙터(Click-to-Inspect) 신설]:
 *             우측 미리보기 화면의 임의 요소(제목, 표, 인용구, 코드, 각주, 미디어 등)를 클릭 시 좌측 서식 제어판의 해당 아코디언 및 탭으로 즉시 자동 전환 및 포커스 연동
 * 🚨 @PATCH : **2026-10-22** — [서식 관리 미리보기 제목 번호 형식(headingNumbering) 실시간 동기화]:
 *             1) SHOWCASE_MODULES Card 2(제목 위계 스타일) 마크다운에 activeProfile.headingNumbering을 syncMarkdownHeadingNumbers로 실시간 주입하여 좌측 패널의 제목 번호(1., Ⅰ., 가. 등) 설정이 우측 카드 미리보기에 1:1 즉각 반영되도록 개선
 *             2) 실제 문서 전체 뷰 모드에서도 documentDisplayContent에 headingNumbering을 동기화하여 서식 번호 변경 시 즉시 미리보기에 동기화
 * 🚨 @PATCH : **2026-10-17** — [서식 미리보기 MarkdownViewer에 listIndent prop 명시적 바인딩]: 서식 모아보기 쇼케이스 및 실제 문서 뷰의 MarkdownViewer에 activeProfile의 ul/ol padding-left 값을 listIndent prop으로 전달하여 목록 들여쓰기가 실시간 반영되도록 보완
 * 🚨 @PATCH : **2026-09-27** — [웹 서식 주제 펼침 시 쇼케이스 첫 태그 이동]: 카드 일부가 보이면 이동하지 않던 nearest 스크롤을 우측 패널 기준 좌표 스크롤로 교체하고 동일 주제 재선택도 처리
 * 🚨 @PATCH : **2026-09-24** — [각주(Footnote) 펄스 연동 및 Card 7 스크롤 연동 신설]: footnote 태그 조작 시 .footnotes, section[data-footnotes] 요소를 찾아 실시간 펄스 하이라이트 및 Card 7 활성화/뷰포트 추종 연동
 * 🚨 @PATCH : **2026-09-24** — [본문 문단(P/BR) 펄스 및 뷰포트 추종 시 활성 모듈 카드 스코핑 보장]: 모듈 모드에서 p 또는 br 조작 시 activeModuleId 카드의 문단을 우선 타겟팅하여 Card 1로의 엉뚱한 뷰포트 점프 버그 원천 차단
 * 🚨 @PATCH : **2026-09-24** — [수식(MATH) 펄스 연동 및 고급 레이아웃·본문 문단 Card 6 스크롤 매핑 신설]:
 *             1) advanced 아코디언 토글 시 Card 6(고급 레이아웃 및 본문 문단)으로의 부드러운 자동 스크롤 매핑 신설
 *             2) math 태그 조작 시 .katex-display, .katex 요소를 찾아 실시간 펄스 하이라이트 및 뷰포트 추종 스크롤 연동
 *             **2026-09-24** — [동영상(VIDEO) 및 지도(MAP) 요소 펄스 애니메이션 및 뷰포트 추종 지원]: video, youtube, map iframe 태그 조작 시 대상 요소를 정확히 찾아 펄스 하이라이트 및 화면 중앙 정렬
 *             **2026-09-24** — [표 래퍼(.table-wrapper-area) 펄스 및 여백 동기화 지원]: table 태그 조작 시 table 및 .table-wrapper-area 동시 타겟팅하여 펄스 애니메이션 및 정렬 뷰포트 추종
 *             **2026-09-24** — [수평 구분선(HR) 타겟 자동 스크롤 및 속성 변경 시 요소 뷰포트 자동 정렬]: HR 아코디언 토글 시 Card 5 내부 hr 요소로 직행 스크롤하고, 속성 변경 시 뷰포트 밖 요소를 화면 중앙으로 자동 정렬하여 실시간 반응성 보장
 *             **2026-09-24** — [서식 관리 우측 5대 서식별 모듈 뭉침 뷰 및 1:1 실시간 동기화 펄스 연동]:
 *             1) 우측 뷰어를 좌측 설정과 1:1 대응되는 5대 서식 뭉침 카드(Grouped Showcase Cards)로 개편
 *             2) [🎴 서식별 모아보기] ↔ [📝 현재 편집 문서] 듀얼 뷰 모드 스위처 신설
 *             3) 좌측 아코디언 토글 시 해당 모듈 카드로 스무스 자동 스크롤 및 테두리 포커스 조명
 *             4) 속성 변경 시 해당 대상 태그 요소 실시간 펄스 하이라이트(.onrivi-sync-pulse) 및 상단 HUD 동기화 상태 배지 연동
 *             2026-09-11** — Modern Technical Editorial 디자인 시스템 적용 (Cobalt #1d4ed8, Inter / Plus Jakarta Sans)
 *             2026-09-02** — LINE Design System (LDSG v5.0) 표준 적용: 헤더 Palette 아이콘 배지 및 LDSG Green 타이틀 적용, 좌측 패널 .bg-sidebar-luxury 럭셔리 그라데이션 적용
 *             2026-08-15** — 모달 창을 풀스크린으로 전환 / 서식 관리 전용
 *             StyleManagerModal 신규 연동 / 헤더에 [서식 관리] + [에디터로 가기] 버튼 추가
 * -----------------------------------------------------------------------
 */
'use client';

import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useEffect, useState, useRef } from 'react';
import CssStyleForm from './CssStyleForm';
import StyleManagerModal from './StyleManagerModal';
import MarkdownViewer from './MarkdownViewer';
import { getWelcomeContent } from '@/constants/welcomeContent';
import { SHOWCASE_MODULES } from '@/constants/styleShowcaseModules';
import { syncMarkdownHeadingNumbers } from '@/lib/headingNumbering';
import { resolveCaptionConfig, formatMediaCaption } from '@/lib/aiFriendlyReport';
import { CssProfile } from '@/types/cssProfile';
import { DEFAULT_PROFILE } from '@/constants/cssProfile';
import { PAPER_SIZES } from '@/constants/paperSizes';
import { X, Palette, Sparkles, Layers, FileText } from 'lucide-react';

interface CssStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: CssProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string, profile?: CssProfile) => void;
  onUpdateProfile: (profile: CssProfile) => void;
  onAddProfile?: () => void;
  onDeleteProfile?: (id: string) => void;
  onImportProfile?: (profile: CssProfile) => void;
  isDarkMode?: boolean;
  dynamicCssString?: string;
  geminiApiKey?: string;
  aiModelName?: string;
  currentDocContent?: string;
}

function syncShowcaseModuleMarkdown(mod: (typeof SHOWCASE_MODULES)[number], profile: CssProfile): string {
  if (mod.id === 'headings') {
    return syncMarkdownHeadingNumbers(mod.markdown, profile.headingNumbering);
  }
  if (mod.id === 'image') {
    const cfg = resolveCaptionConfig(profile.mediaCaptionStructure, 'image') || {
      position: 'top',
      format: 'standard',
      customTemplate: '**{kind} {n}. {title}**',
    };
    const title = '온리비 에디토리얼 워크스페이스 레이아웃';
    const rawCaption = formatMediaCaption('그림', 1, title, cfg.format, cfg.customTemplate);
    const cleanAlt = rawCaption.replace(/\*\*/g, '').trim();
    return `![${cleanAlt}](https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80)`;
  }
  if (mod.id === 'video') {
    const cfg = resolveCaptionConfig(profile.mediaCaptionStructure, 'video') || {
      position: 'top',
      format: 'standard',
      customTemplate: '**{kind} {n}. {title}**',
    };
    const title = '동영상 미디어 객체 규격 (환경설정과 화면구성)';
    const rawCaption = formatMediaCaption('영상', 1, title, cfg.format, cfg.customTemplate);
    const cleanCaption = rawCaption.replace(/\*\*/g, '').trim();
    const captionEl = `<figcaption data-position="${cfg.position}" class="text-[0.88em] tracking-tight text-zinc-600 dark:text-zinc-300 font-medium text-center">${cleanCaption}</figcaption>`;
    const videoEl = `<video src="/onrivi/01_환경설정과 화면구성.mp4" controls style="max-width:100%; border-radius:12px;"></video>`;
    return `<figure class="onrivi-video-figure" data-caption-position="${cfg.position}" style="display:flex; flex-direction:column; align-items:center; width:100%; text-align:center;">\n${cfg.position === 'top' ? `${captionEl}\n\n${videoEl}` : `${videoEl}\n\n${captionEl}`}\n</figure>`;
  }
  if (mod.id === 'map') {
    const cfg = resolveCaptionConfig(profile.mediaCaptionStructure, 'map') || {
      position: 'top',
      format: 'standard',
      customTemplate: '**{kind} {n}. {title}**',
    };
    const title = '인터랙티브 지도(MAP) 객체 규격 (서울특별시청)';
    const rawCaption = formatMediaCaption('지도', 1, title, cfg.format, cfg.customTemplate);
    const cleanCaption = rawCaption.replace(/\*\*/g, '').trim();
    const captionEl = `<figcaption data-position="${cfg.position}" class="text-[0.88em] tracking-tight text-zinc-600 dark:text-zinc-300 font-medium text-center">${cleanCaption}</figcaption>`;
    const mapEl = `<iframe src="https://maps.google.com/maps?q=37.5665,126.9780&z=15&output=embed" allowfullscreen loading="lazy" style="width:100%; height:420px; border-radius:12px;"></iframe>`;
    return `<figure class="onrivi-map-figure" data-caption-position="${cfg.position}" style="display:flex; flex-direction:column; align-items:center; width:100%; text-align:center;">\n${cfg.position === 'top' ? `${captionEl}\n\n${mapEl}` : `${mapEl}\n\n${captionEl}`}\n</figure>`;
  }
  return mod.markdown;
}

export default function CssStyleModal({
  isOpen,
  onClose,
  profiles,
  activeProfileId,
  onSelectProfile,
  onUpdateProfile,
  onAddProfile,
  onDeleteProfile,
  onImportProfile,
  isDarkMode,
  dynamicCssString,
  geminiApiKey,
  aiModelName,
  currentDocContent
}: CssStyleModalProps) {
  useModalEscape(isOpen, onClose);
  const [isStyleManagerOpen, setIsStyleManagerOpen] = useState(false);
  
  /* ─── 뷰 모드: 'modules' (서식별 뭉침 모아보기) vs 'document' (실제 내 문서 전체보기) ─── */
  const [previewViewMode, setPreviewViewMode] = useState<'modules' | 'document'>('modules');
  
  /* ─── 현재 포커스된 서식 모듈 ID ('typography' | 'headings' | 'lists' | 'boxes' | 'media' | 'advanced') ─── */
  const [activeModuleId, setActiveModuleId] = useState<string>('typography');
  // 같은 주제를 다시 펼쳐도 스크롤 효과가 실행되도록 요청 순번을 함께 저장한다.
  const [scrollRequest, setScrollRequest] = useState<{ sectionId: string; sequence: number } | null>(null);
  // 전체 창이 아닌 우측 쇼케이스의 실제 스크롤 컨테이너를 가리킨다.
  const previewScrollRef = useRef<HTMLDivElement>(null);
  
  /* ─── 실시간 동기화 상태 텍스트 ─── */
  const [syncStatusText, setSyncStatusText] = useState<string>('실시간 미리보기');
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  /* ─── 클릭 인스펙터 (Click-to-Inspect) 상태 ─── */
  const [targetSection, setTargetSection] = useState<string | null>(null);
  const [targetTag, setTargetTag] = useState<string | null>(null);
  const [inspectorKey, setInspectorKey] = useState<number>(0);
  const [inspectorToast, setInspectorToast] = useState<string | null>(null);
  const inspectorToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePreviewClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // 1. 모듈 쇼케이스 카드 내부 클릭 시 해당 카드의 15대 서식 ID 즉시 판별
    const cardEl = target.closest('.onrivi-showcase-card') as HTMLElement | null;
    const cardModuleId = cardEl?.getAttribute('data-module-id');

    let section = 'paragraph';
    let tag = 'p';
    let label = '';
    let pulseTarget: HTMLElement | null = null;

    if (previewViewMode === 'modules' && cardModuleId) {
      section = cardModuleId;
      pulseTarget = cardEl;

      // 모듈 내 서브 요소 정밀 태깅
      const stylableSubEl = target.closest(
        'h1, h2, h3, h4, h5, h6, table, blockquote, pre, code, a, hr, img, figure, video, iframe, ul, ol, li, [data-footnote-ref], .footnotes, section[data-footnotes], .katex, .katex-display, p'
      ) as HTMLElement | null;

      if (stylableSubEl) {
        pulseTarget = stylableSubEl;
        const subTag = stylableSubEl.tagName.toLowerCase();
        if (/^h[1-6]$/.test(subTag)) {
          tag = subTag;
        } else if (cardModuleId === 'codeblock') {
          tag = 'codeBlock';
        } else if (cardModuleId === 'inlinecode') {
          tag = 'code';
        } else if (cardModuleId === 'link') {
          tag = 'a';
        } else if (cardModuleId === 'footnote') {
          tag = 'footnote';
        } else if (cardModuleId === 'video') {
          tag = 'video';
        } else if (cardModuleId === 'map') {
          tag = 'map';
        } else if (cardModuleId === 'math') {
          tag = 'math';
        } else if (cardModuleId === 'image') {
          tag = 'img';
        } else if (cardModuleId === 'quote') {
          tag = 'blockquote';
        } else if (cardModuleId === 'table') {
          tag = 'table';
        } else if (cardModuleId === 'lists') {
          tag = subTag === 'ol' ? 'ol' : 'ul';
        } else if (cardModuleId === 'hr') {
          tag = 'hr';
        } else {
          tag = subTag;
        }
      } else {
        const defaultTagMap: Record<string, string> = {
          headings: 'h1',
          paragraph: 'p',
          table: 'table',
          quote: 'blockquote',
          codeblock: 'codeBlock',
          inlinecode: 'code',
          link: 'a',
          footnote: 'footnote',
          lists: 'ul',
          hr: 'hr',
          image: 'img',
          video: 'video',
          map: 'map',
          math: 'math',
          rules: 'rules',
        };
        tag = defaultTagMap[cardModuleId] || 'p';
      }

      const titleMap: Record<string, string> = {
        headings: '제목 위계 스타일 (Headings)',
        paragraph: '본문 문단 (Paragraph)',
        table: '표 (Table)',
        quote: '인용구 (Blockquote)',
        codeblock: '소스코드 블록 (Code Block)',
        inlinecode: '인라인 코드 (Inline Code)',
        link: '하이퍼링크 (Link)',
        footnote: '각주 및 주석 (Footnotes)',
        lists: '목록 및 태스크 체크박스 (Lists)',
        hr: '수평 구분선 (HR)',
        image: '이미지·캡션 (Image)',
        video: '동영상 (Video)',
        map: '인터랙티브 지도 (Map)',
        math: '수식 (Math)',
        rules: '전체 서식 규칙 (Global Rules)',
      };
      label = titleMap[cardModuleId] || cardModuleId;
    } else {
      // 2. 실제 내 문서 전체보기(document) 모드에서의 정밀 요소 인스펙터
      const stylableEl = target.closest(
        'h1, h2, h3, h4, h5, h6, table, blockquote, pre, code, a, hr, .onrivi-video-figure, video, .onrivi-map-figure, iframe, .onrivi-image-figure, img, figure, ul, ol, li, [data-footnote-ref], .footnotes, section[data-footnotes], .katex, .katex-display, p'
      ) as HTMLElement | null;

      if (!stylableEl) return;
      pulseTarget = stylableEl;
      const tagName = stylableEl.tagName.toLowerCase();

      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        section = 'headings';
        tag = tagName;
        label = `${tagName.toUpperCase()} 제목`;
      } else if (tagName === 'table' || stylableEl.closest('table')) {
        section = 'table';
        tag = 'table';
        label = '표 (Table)';
      } else if (tagName === 'blockquote' || stylableEl.closest('blockquote')) {
        section = 'quote';
        tag = 'blockquote';
        label = '인용구 (Blockquote)';
      } else if (tagName === 'pre' || stylableEl.closest('pre')) {
        section = 'codeblock';
        tag = 'codeBlock';
        label = '소스코드 블록 (Code Block)';
      } else if (tagName === 'code' || stylableEl.closest('code:not(pre code)')) {
        section = 'inlinecode';
        tag = 'code';
        label = '인라인 코드 (Inline Code)';
      } else if (tagName === 'a' || stylableEl.closest('a')) {
        section = 'link';
        tag = 'a';
        label = '하이퍼링크 (Link)';
      } else if (
        stylableEl.hasAttribute('data-footnote-ref') ||
        stylableEl.classList.contains('footnotes') ||
        stylableEl.closest('.footnotes') ||
        stylableEl.closest('section[data-footnotes]')
      ) {
        section = 'footnote';
        tag = 'footnote';
        label = '각주 (Footnote)';
      } else if (tagName === 'hr' || stylableEl.closest('hr')) {
        section = 'hr';
        tag = 'hr';
        label = '수평 구분선 (HR)';
      } else if (stylableEl.closest('.onrivi-video-figure') || tagName === 'video') {
        section = 'video';
        tag = 'video';
        label = '동영상 (Video)';
      } else if (stylableEl.closest('.onrivi-map-figure') || tagName === 'iframe') {
        section = 'map';
        tag = 'map';
        label = '지도 (Map)';
      } else if (tagName === 'img' || stylableEl.closest('.onrivi-image-figure') || stylableEl.closest('figure')) {
        section = 'image';
        tag = 'img';
        label = '이미지·캡션 (Image)';
      } else if (stylableEl.classList.contains('katex') || stylableEl.closest('.katex') || stylableEl.closest('.katex-display')) {
        section = 'math';
        tag = 'math';
        label = '수식 (Math)';
      } else if (['ul', 'ol', 'li'].includes(tagName)) {
        section = 'lists';
        tag = tagName;
        label = '목록 (List)';
      } else if (tagName === 'p') {
        section = 'paragraph';
        tag = 'p';
        label = '본문 문단 (P)';
      }
    }

    setTargetSection(section);
    setTargetTag(tag);
    setActiveModuleId(section);
    setInspectorKey(k => k + 1);

    // Trigger visual pulse on clicked element
    if (pulseTarget) {
      pulseTarget.classList.remove('onrivi-sync-pulse');
      void pulseTarget.offsetWidth;
      pulseTarget.classList.add('onrivi-sync-pulse');
      setTimeout(() => pulseTarget?.classList.remove('onrivi-sync-pulse'), 1400);
    }

    // Toast notification
    setInspectorToast(`📌 [${label}] 서식 설정으로 이동했습니다.`);
    if (inspectorToastTimerRef.current) clearTimeout(inspectorToastTimerRef.current);
    inspectorToastTimerRef.current = setTimeout(() => {
      setInspectorToast(null);
      inspectorToastTimerRef.current = null;
    }, 2500);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isStyleManagerOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isStyleManagerOpen]);

  // ====================================================================
  // 📊 [OMD-EDIT-0038] frontend/src/components/CssStyleModal.tsx ➔ handleActiveSectionChange
  // 🎯 @KICK  : 좌측에서 선택된 15대 서식에 대응하는 우측 쇼케이스 카드를 활성화하고 1:1 자동 스크롤을 실행한다.
  // 🛡️ @GUARD : 문서 보기 상태에서도 모듈 보기로 전환하고 동일 서식 재선택 시에도 즉시 뷰포트를 이동한다.
  // 🔗 @CALLS : setActiveModuleId(), setPreviewViewMode(), setScrollRequest()
  // ====================================================================
  const handleActiveSectionChange = (sectionId: string) => {
    setActiveModuleId(sectionId);
    setPreviewViewMode('modules');
    setScrollRequest(previous => ({ sectionId, sequence: (previous?.sequence || 0) + 1 }));
  };

  // ====================================================================
  // 📊 [OMD-EDIT-0039] frontend/src/components/CssStyleModal.tsx ➔ 서식 주제 쇼케이스 스크롤 효과
  // 🎯 @KICK  : 선택된 서식 카드를 우측 쇼케이스 패널의 최적 보이는 영역으로 부드럽게 자동 스크롤한다.
  // 🛡️ @GUARD : 렌더 완료 후 대상 카드 DOM을 찾고, 대상 요소 시각 펄스 강조를 실행한다.
  // 🚨 @PATCH : 15대 서식 모듈 1:1 대응 및 패널 좌표 기준 스무스 스크롤 연동
  // ====================================================================
  useEffect(() => {
    if (!isOpen || previewViewMode !== 'modules' || !scrollRequest) return;
    const firstTag: Record<string, string> = {
      paragraph: 'p',
      headings: 'h1',
      table: 'table',
      quote: 'blockquote',
      codeblock: 'pre',
      inlinecode: 'code',
      link: 'a',
      footnote: '.footnotes, [data-footnote-ref], p',
      lists: 'ul, ol',
      hr: 'hr',
      image: 'img, figure',
      video: 'video',
      map: 'iframe',
      math: '.katex-display, .katex',
      rules: 'p',
    };
    const moduleId = scrollRequest.sectionId;
    const frame = requestAnimationFrame(() => {
      const pane = previewScrollRef.current;
      const card = document.getElementById(`omd-showcase-module-${moduleId}`);
      if (!pane || !card) return;
      const paneRect = pane.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const targetTop = pane.scrollTop + cardRect.top - paneRect.top - 20;
      pane.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });

      // 내부 첫 태그 시각 펄스 강조
      const selector = firstTag[moduleId] || 'p';
      const firstElement = (card.querySelector(selector) || card) as HTMLElement;
      if (firstElement) {
        firstElement.classList.remove('onrivi-sync-pulse');
        void firstElement.offsetWidth;
        firstElement.classList.add('onrivi-sync-pulse');
        setTimeout(() => firstElement.classList.remove('onrivi-sync-pulse'), 1400);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, previewViewMode, scrollRequest]);

  /* ─── 속성 변경 시 해당 대상 태그 요소 펄스(Pulse) 하이라이트 & 헤더 HUD 갱신 ─── */
  const handleActiveTagChange = (tag: string, label?: string) => {
    const displayLabel = label || tag.toUpperCase();
    setSyncStatusText(`⚡ ${displayLabel} 실시간 동기화`);

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }
    syncTimerRef.current = setTimeout(() => {
      setSyncStatusText('실시간 미리보기');
      syncTimerRef.current = null;
    }, 2000);

    // 우측 뷰어 컨테이너 내부의 해당 태그 요소에 펄스 애니메이션 부여
    const container = document.getElementById('omd-modal-preview-container');
    if (container) {
      let selector = tag === 'table' ? 'table, .table-wrapper-area' : tag;
      if (tag === 'video') selector = 'video, iframe[src*="youtube"], iframe[src*="vimeo"]';
      else if (tag === 'map') selector = 'iframe[src*="map"], iframe[src*="google.com/maps"]';
      else if (tag === 'img') selector = 'img, figure:has(img)';
      else if (tag === 'math') selector = '.katex-display, .katex';
      else if (tag === 'footnote') {
        selector = '.footnotes, section[data-footnotes], [data-footnote-ref]';
        setActiveModuleId('footnotes');
      }
      else if (tag === 'p' || tag === 'br') {
        selector = previewViewMode === 'modules' ? `#omd-showcase-module-${activeModuleId} p` : 'p';
      }
      const targetElements = container.querySelectorAll(selector);
      targetElements.forEach((el) => {
        el.classList.remove('onrivi-sync-pulse');
        void (el as HTMLElement).offsetWidth; // 강제 reflow
        el.classList.add('onrivi-sync-pulse');
        setTimeout(() => {
          el.classList.remove('onrivi-sync-pulse');
        }, 1400);
      });

      // 💡 편집 중인 대상 요소가 현재 뷰포트 시야 밖에 있으면 중앙으로 부드럽게 스크롤 정렬
      if (targetElements.length > 0) {
        const firstEl = targetElements[0] as HTMLElement;
        const rect = firstEl.getBoundingClientRect();
        const isInViewport = rect.top >= 80 && rect.bottom <= (window.innerHeight - 80);
        if (!isInViewport) {
          firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  const welcomeContent = getWelcomeContent();
  const documentDisplayContent = (currentDocContent && currentDocContent.trim().length > 0)
    ? currentDocContent
    : welcomeContent;

  const activeProfile = profiles.find((p: any) => p.id === activeProfileId) || DEFAULT_PROFILE;
  const paperBgColor = activeProfile.pageStyle.backgroundColor || '#ffffff';
  const paper = PAPER_SIZES[activeProfile.pageStyle.paperSize?.toLowerCase()] || PAPER_SIZES.a4;
  const landscape = activeProfile.pageStyle.orientation === 'landscape';
  const paperWidth = landscape ? paper.height : paper.width;
  const paperHeight = landscape ? paper.width : paper.height;
  const paperKey = `${activeProfile.id}:${paperWidth}:${paperHeight}:${activeProfile.layout?.type || 'flow'}`;
  const previousPaperKey = useRef(paperKey);
  const [paperScale, setPaperScale] = useState(1);

  useEffect(() => {
    if (previousPaperKey.current !== paperKey || (isOpen && activeProfile.layout?.type === 'picturebook')) {
      setPreviewViewMode('document');
    }
    previousPaperKey.current = paperKey;
  }, [paperKey, isOpen, activeProfile.layout?.type]);

  useEffect(() => {
    const container = previewScrollRef.current;
    if (!container || !isOpen) return;
    const resize = () => setPaperScale(Math.min(1, Math.max(0.1, (container.clientWidth - 80) / (paperWidth * 96 / 25.4))));
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    return () => observer.disconnect();
  }, [isOpen, paperWidth]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col transition-all duration-300 ${isDarkMode ? 'bg-[#111216]' : 'bg-[#F8F9FA]'}`}>
      <div className="w-full h-full flex flex-col overflow-hidden">

        {/* 상단 헤더 바 (Modern Technical Editorial & LDSG 규격) */}
        <div className={`flex items-center justify-between px-6 py-3 border-b shrink-0 ${isDarkMode ? 'border-[#22242A] bg-[#17191E]' : 'border-[#EFEFEF] bg-white'}`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1d4ed8]/15 text-[#1d4ed8]">
              <Palette className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold tracking-tight text-[#1d4ed8]">
              서식 테마 설정
            </h2>

            {/* 실시간 동기화 상태 HUD 배지 */}
            <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold tracking-wide transition-all flex items-center gap-1.5 ${
              syncStatusText.startsWith('⚡')
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 animate-pulse'
                : 'bg-[#1d4ed8]/10 text-[#1d4ed8]'
            }`}>
              <Sparkles className="w-3 h-3" />
              <span>{syncStatusText}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* 🎴 서식별 모아보기 ↔ 📝 현재 편집 문서 듀얼 뷰 모드 세그먼트 컨트롤 */}
            <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 shadow-xs">
              <button
                type="button"
                onClick={() => setPreviewViewMode('modules')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  previewViewMode === 'modules'
                    ? 'bg-white dark:bg-zinc-700 text-[#1d4ed8] dark:text-blue-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
                title="6대 핵심 서식을 그룹별로 모아 한자리에서 정밀 비교"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>서식별 모아보기</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewViewMode('document')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  previewViewMode === 'document'
                    ? 'bg-white dark:bg-zinc-700 text-[#1d4ed8] dark:text-blue-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
                title="현재 에디터에서 작성 중인 실제 원고 전체에 서식 적용"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>현재 편집 문서</span>
              </button>
            </div>

            <div className="h-5 w-[1px] bg-zinc-200 dark:bg-zinc-800" />

            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-bold rounded-lg transition-colors ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'}`}
              title="닫기 (Esc)"
            >
              <span>에디터로 가기</span>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2분할 메인 콘텐츠 영역 */}
        <div className="flex flex-1 overflow-hidden relative">

          {/* 좌측: 서식 폼 (.bg-sidebar-luxury 표준) */}
          <div className={`w-[480px] shrink-0 h-full overflow-y-auto no-scrollbar border-r relative bg-sidebar-luxury ${isDarkMode ? 'border-[#22242A]' : 'border-[#EFEFEF]'}`}>
            <CssStyleForm
              profiles={profiles}
              activeProfileId={activeProfileId}
              onSelectProfile={onSelectProfile}
              onUpdateProfile={onUpdateProfile}
              onAddProfile={onAddProfile}
              onDeleteProfile={onDeleteProfile}
              onImportProfile={onImportProfile}
              onClose={onClose}
              onOpenStyleManager={() => setIsStyleManagerOpen(true)}
              isDarkMode={isDarkMode}
              geminiApiKey={geminiApiKey}
              aiModelName={aiModelName}
              onActiveSectionChange={handleActiveSectionChange}
              onActiveTagChange={handleActiveTagChange}
              targetSection={targetSection}
              targetTag={targetTag}
              inspectorKey={inspectorKey}
            />
          </div>

          {/* 우측: 듀얼 모드 프리뷰 뷰어 */}
          <div 
            ref={previewScrollRef}
            onClickCapture={handlePreviewClickCapture}
            className={`flex-1 h-full overflow-y-auto p-6 lg:p-10 ${isDarkMode ? 'bg-[#0E0E10]' : 'bg-slate-100'}`}
          >
            <div
              className="max-w-[920px] mx-auto relative custom-preview-container"
              id="omd-modal-preview-container"
            >
              {dynamicCssString && (
                <style dangerouslySetInnerHTML={{ __html: dynamicCssString }} />
              )}

              {previewViewMode === 'modules' ? (
                /* 🎴 모드 1: 5대 서식별 뭉침 모아보기 카드 뷰 */
                <div className="space-y-8 pb-16">
                  {SHOWCASE_MODULES.map((mod) => {
                    const isCardActive = activeModuleId === mod.id;
                    const renderedMarkdown = syncShowcaseModuleMarkdown(mod, activeProfile);
                    return (
                      <div
                        key={mod.id}
                        id={'omd-showcase-module-' + mod.id}
                        data-module-id={mod.id}
                        className={`onrivi-showcase-card rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm cursor-pointer ${
                          isCardActive
                            ? 'onrivi-showcase-card-active border-[#1d4ed8] ring-4 ring-[#1d4ed8]/25 shadow-2xl scale-[1.01]'
                            : 'border-slate-200/80 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700'
                        }`}
                        style={{ backgroundColor: paperBgColor }}
                      >
                        {/* 카드 상단 메타 헤더 바 */}
                        <div className={`px-6 py-3 border-b flex items-center justify-between ${
                          isDarkMode ? 'border-zinc-800/60 bg-zinc-900/40' : 'border-slate-200/60 bg-slate-50/70'
                        }`}>
                          <div className="flex items-center gap-2.5">
                            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                              isCardActive
                                ? 'bg-[#1d4ed8] text-white shadow-xs'
                                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}>
                              {mod.badge}
                            </span>
                            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                              {mod.title}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:inline-block">
                            {mod.description}
                          </span>
                        </div>

                        {/* 마크다운 렌더링 바디 */}
                        <div className={mod.id === 'headings' ? 'py-6 lg:py-8' : 'p-6 lg:p-8'}>
                          <MarkdownViewer
                            content={renderedMarkdown}
                            originalContent={renderedMarkdown}
                            customCss={dynamicCssString}
                            picturebookProfile={activeProfile}
                            listIndent={activeProfile.rules.ul?.['padding-left'] || activeProfile.rules.ol?.['padding-left'] || '28px'}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* 📝 모드 2: 현재 편집 중인 실제 문서 전체 뷰 */
                <div>
                  <p className="mb-3 text-sm text-slate-500" role="status">{paper.label} · {landscape ? '가로' : '세로'} · {paperWidth} × {paperHeight} mm</p>
                <div
                  data-style-paper-preview="true"
                  className="relative mx-auto shadow-sm border border-slate-200/80 dark:border-zinc-800/80"
                  style={activeProfile.layout?.type === 'picturebook' ? { backgroundColor: 'transparent', border: 'none', boxShadow: 'none' } : {
                    backgroundColor: paperBgColor, boxSizing: 'border-box', width: `${paperWidth}mm`, minHeight: `${paperHeight}mm`, zoom: paperScale,
                    padding: `${activeProfile.pageStyle.marginTop || '18mm'} ${activeProfile.pageStyle.marginRight || '12mm'} ${activeProfile.pageStyle.marginBottom || '18mm'} ${activeProfile.pageStyle.marginLeft || '12mm'}`,
                  }}
                >
                  <MarkdownViewer
                    content={syncMarkdownHeadingNumbers(documentDisplayContent, activeProfile.headingNumbering)}
                    originalContent={syncMarkdownHeadingNumbers(documentDisplayContent, activeProfile.headingNumbering)}
                    customCss={dynamicCssString}
                    listIndent={activeProfile.rules.ul?.['padding-left'] || activeProfile.rules.ol?.['padding-left'] || '28px'}
                    picturebookProfile={activeProfile}
                  />
                </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 서식 관리 모달 (풀스크린, z-index 더 높게) */}
      {isStyleManagerOpen && (
        <StyleManagerModal
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSelectProfile={onSelectProfile}
          onUpdateProfile={onUpdateProfile}
          onAddProfile={onAddProfile}
          onDeleteProfile={onDeleteProfile}
          onImportProfile={onImportProfile}
          onClose={() => setIsStyleManagerOpen(false)}
          isDarkMode={isDarkMode}
          geminiApiKey={geminiApiKey}
          aiModelName={aiModelName}
        />
      )}

      {/* 📌 클릭 인스펙터 실시간 토스트 */}
      {inspectorToast && (
        <div className="fixed bottom-6 right-6 z-[99999] px-4 py-2.5 rounded-xl bg-zinc-900/95 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xl border border-zinc-700/50 dark:border-zinc-300/50 text-xs font-bold animate-fadeIn flex items-center gap-2 backdrop-blur-sm pointer-events-none">
          <span>{inspectorToast}</span>
        </div>
      )}
    </div>
  );
}
