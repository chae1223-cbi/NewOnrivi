'use client';

/*
 * CssStyleForm.tsx — 사용자 친화적 서식 정의 제어판 (관보 서식 규격 지정)
 * 좌측 영역을 차지하는 패널로, 사용자가 선택한 CssProfile의
 * 전역 타이포그래피와 각 HTML 태그별 CSS 룰셋(CssRuleSet)을 편집합니다.
 *
 * 🚨 @PATCH
 *   2026-10-26 — [15대 서식 쇼케이스 선택 시 해당 설정 패널 즉시 전환 연동]:
 *     1) targetSection 우선 적용으로 소스코드블록(codeblock), 인라인코드(inlinecode), 하이퍼링크(link), 각주(footnote), 동영상(video), 지도(map) 등 15대 서식 선택 시 좌측 패널이 정확히 전환되도록 보완
 *     2) 문장 텍스트(<p>) 클릭 시 targetSection이 paragraph로 오인되어 엉뚱한 본문 패널로 튕기던 태그 하이재킹 버그 완벽 차단
 *   2026-10-26 — [서식 글자 크기 pt 단위 표준화]:
 *     baseFontSize를 formatPt 헬퍼를 통해 pt 단위로 일원화하여 모든 세부 패널에 상속 제공
 *   2026-10-26 — [하단 배지 서식 팝업 리스트 선택기(List Selector) 전환]:
 *     1) 하단 탐색 바의 중앙 배지(예: 📋 목록·체크 (9/15))를 클릭 시 15대 전체 서식 리스트가 위로 부드럽게 펼쳐지는 팝업 리스트 선택기로 전면 개편
 *     2) 1~15번 번호, 아이콘, 명칭, 현재 선택 상태 뱃지가 포함된 직관적인 리스트에서 원하는 서식을 클릭 한 번으로 즉시 선택 지원
 *     3) 외부 클릭(click-outside) 시 자동 닫힘 및 닫힘 애니메이션 연동
 *   2026-10-26 — [페이지 서식 일괄 갱신(Partial<CssPageStyle>) 지원 및 프리셋 활성화 결함 해결]:
 *     1) handlePageStyleChange에 객체 형태의 일괄 변경(Partial<CssPageStyle>) 오버로딩을 추가하여 폰트/행간 및 여백 4방향 프리셋이 상태 덮어쓰기 없이 단일 트랜잭션으로 원자적 갱신되도록 개선
 *   2026-10-26 — [인라인코드·링크 및 미디어 4종 독립 분리 & 스크롤 없는 상하단 고정 내비게이션 완비]:
 *     1) 인라인 코드(code)와 하이퍼링크(a)를 별도 독립 패널(DetailInlineCodePanel, DetailLinkPanel)로 분리하고 상단 탭 신설
 *     2) 미디어를 이미지·캡션(DetailImagePanel), 동영상(DetailVideoPanel), 지도(DetailMapPanel), 수식(DetailMathPanel) 4개 전용 패널로 세분화 분리
 *     3) 카테고리 탭과 빠른 검색창을 상단 고정(Sticky Top) 배치하여, 슬라이더 조작을 위해 스크롤을 내린 상태에서도 위로 올릴 필요 없이 즉시 다른 항목 전환 지원
 *     4) 하단에 [◀ 이전 서식] [현재 서식 배지/점프] [다음 서식 ▶] 스티키 플로팅 바(Sticky Bottom Navigation)를 탑재하여 스크롤 없이 순차 탐색 극대화
 *     5) 카테고리 전환 시 패널 최상단으로 자동 부드러운 스크롤 복귀(Auto-Scroll to Top) 지원
 *     6) 기본 글꼴·크기·줄간격·배경색 및 종이 규격·문서 배치·개요 설정을 간편 스타일링으로 완전 위임하여 충돌 차단
 *   2026-10-22 — [제목 번호 형식에 계층형 십진(1. ➔ 1.1 ➔ 1.1.1) 옵션 추가]: KS/ISO 기술표준 서식용 decimal-outline 선택지를 제목 번호 형식 드롭다운에 노출
 *   2026-10-21 — [미디어 설명(캡션) 위치 및 표현 구문(mediaCaptionStructure) 서식 제어 패널 신설]: 서식 제어판 미디어 내에 캡션 기본 위치 토글, 표현 구문 선택 및 커스텀 템플릿 입력 UI 탑재
 *   2026-10-17 — [목록 기본 들여쓰기 너비 슬라이더 조작 시 triggerUpdate 연동]: triggerUpdate(updated, 'ul')를 호출하여 실시간 미리보기 펄스 하이라이트 및 상태 동기화 완벽 보장
 *   2026-10-14 — [서식관리 타이틀에 '각주' 명시 및 각주 스타일 설정 시인성 강화]: 각주 글자 크기, 색상, 줄간격, 상하 여백 설정 접근성 극대화
 *   2026-10-01 — [내보내기 페이지 나누기 설정 UI 제거]: PDF/EPUB 내보내기 시 제목 기준 강제 페이지 분할 폐지에 따라 컨트롤 제거
 *   2026-09-26 — [서식 설정 전체 프리셋 및 굵기 선택 활성화 상태 전수 점검 및 일괄 개선]: 15대 도메인 위젯 안정화
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { CssProfile } from '@/types/cssProfile';

type CssPageStyle = CssProfile['pageStyle'];
import {
  DEFAULT_PROFILE,
  isSystemProfileId,
  sanitizeAndParseCssProfileJson,
  normalizeCssProfile,
  resolveCssProfile,
} from '@/constants/cssProfile';
import { headingFormat, headingMarker, headingSetting } from '@/lib/headingNumbering';
import { CSS_PROFILE_GUIDE_MD } from '@/constants/cssProfileGuide';
import ConfirmModal from './ConfirmModal';
import QuickStylePanel from './style/QuickStylePanel';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

// 도메인 분리 세부 서식 패널 임포트 (15대 도메인 완전 격리)
import { formatPt } from './style/detail/DetailWidgets';
import DetailParagraphPanel from './style/detail/DetailParagraphPanel';
import DetailHeadingPanel from './style/detail/DetailHeadingPanel';
import DetailTablePanel from './style/detail/DetailTablePanel';
import DetailQuotePanel from './style/detail/DetailQuotePanel';
import DetailCodePanel from './style/detail/DetailCodePanel';
import DetailInlineCodePanel from './style/detail/DetailInlineCodePanel';
import DetailLinkPanel from './style/detail/DetailLinkPanel';
import DetailFootnotePanel from './style/detail/DetailFootnotePanel';
import DetailListPanel from './style/detail/DetailListPanel';
import DetailHrPanel from './style/detail/DetailHrPanel';
import DetailImagePanel from './style/detail/DetailImagePanel';
import DetailVideoPanel from './style/detail/DetailVideoPanel';
import DetailMapPanel from './style/detail/DetailMapPanel';
import DetailMathPanel from './style/detail/DetailMathPanel';
import DetailRulesPanel from './style/detail/DetailRulesPanel';

interface CssStyleFormProps {
  profiles: CssProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string, profile?: CssProfile) => void;
  onUpdateProfile: (profile: CssProfile) => void;
  onAddProfile?: () => void;
  onDeleteProfile?: (id: string) => void;
  onImportProfile?: (profile: CssProfile) => void;
  onClose: () => void;
  onOpenStyleManager?: () => void;
  isDarkMode?: boolean;
  geminiApiKey?: string;
  aiModelName?: string;
  onActiveSectionChange?: (sectionId: string) => void;
  onActiveTagChange?: (tag: string, label?: string) => void;
  targetSection?: string | null;
  targetTag?: string | null;
  inspectorKey?: number;
}

export type DetailCategory =
  | 'paragraph'
  | 'headings'
  | 'table'
  | 'quote'
  | 'codeblock'
  | 'inlinecode'
  | 'link'
  | 'footnote'
  | 'lists'
  | 'hr'
  | 'image'
  | 'video'
  | 'map'
  | 'math'
  | 'rules';

interface CategoryOption {
  id: DetailCategory;
  label: string;
  icon: string;
}

const CATEGORIES: CategoryOption[] = [
  { id: 'paragraph', label: '본문·여백', icon: '📄' },
  { id: 'headings', label: '제목', icon: '🏷️' },
  { id: 'table', label: '표', icon: '📊' },
  { id: 'quote', label: '인용구', icon: '💬' },
  { id: 'codeblock', label: '코드블록', icon: '💻' },
  { id: 'inlinecode', label: '인라인코드', icon: '🔤' },
  { id: 'link', label: '하이퍼링크', icon: '🔗' },
  { id: 'footnote', label: '각주', icon: '📌' },
  { id: 'lists', label: '목록·체크', icon: '📋' },
  { id: 'hr', label: '구분선', icon: '➖' },
  { id: 'image', label: '이미지·캡션', icon: '🖼️' },
  { id: 'video', label: '동영상', icon: '🎥' },
  { id: 'map', label: '지도', icon: '🗺️' },
  { id: 'math', label: '수식', icon: '📐' },
  { id: 'rules', label: '전체 규칙', icon: '🧩' },
];

export default function CssStyleForm({
  profiles,
  activeProfileId,
  onSelectProfile,
  onUpdateProfile,
  onDeleteProfile,
  onImportProfile,
  onClose,
  onOpenStyleManager,
  isDarkMode,
  onActiveSectionChange,
  onActiveTagChange,
  targetSection,
  targetTag,
  inspectorKey,
}: CssStyleFormProps) {
  // 현재 활성 프로필 확인 및 시스템 프로필 여부 판별
  const rawProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0] || DEFAULT_PROFILE;
  const currentProfile = useMemo(() => resolveCssProfile(rawProfile), [rawProfile]);
  const isSystemProfile = isSystemProfileId(currentProfile.id);

  // 간편 모드('quick') vs 세부 서식 다듬기('pro') 듀얼 뷰 상태
  const [styleMode, setStyleMode] = useState<'quick' | 'pro'>('quick');

  // 세부 서식 단일 뷰 카테고리 선택 상태
  const [activeCategory, setActiveCategory] = useState<DetailCategory>('paragraph');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 갤러리 메가 메뉴 열림 여부
  const [isGalleryOpen, setShowAllProfiles] = useState(false);

  // 테마 이름 인라인 수정 상태
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(currentProfile.name);

  // 모달 및 토스트 알림 상태
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDanger: boolean;
    onConfirm: () => void;
  } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isBottomListOpen, setIsBottomListOpen] = useState(false);
  const bottomListRef = useRef<HTMLDivElement>(null);

  // 하단 팝업 리스트 외부 클릭 시 자동 닫힘
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bottomListRef.current && !bottomListRef.current.contains(e.target as Node)) {
        setIsBottomListOpen(false);
      }
    };
    if (isBottomListOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBottomListOpen]);

  // 실시간 토스트 메시지 표출
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // 실시간 프로필 갱신 및 펄스 하이라이트 트리거
  const triggerUpdate = (updated: CssProfile, tag?: string, label?: string) => {
    onUpdateProfile(updated);
    if (tag) {
      onActiveTagChange?.(tag, label);
    }
  };

  // 단일 CSS 규칙 갱신
  const updateCssRule = (tag: string, prop: string, val: string) => {
    if (isSystemProfile) return;
    const tagKey = tag as keyof CssProfile['rules'];
    const currentRules = currentProfile.rules[tagKey] || {};
    const updated = {
      ...currentProfile,
      rules: {
        ...currentProfile.rules,
        [tagKey]: {
          ...currentRules,
          [prop]: val,
        },
      },
    };
    triggerUpdate(updated, tag, `${tag} ${prop}`);
  };

  // 단일 CSS 규칙 삭제
  const removeCssRule = (tag: string, prop: string) => {
    if (isSystemProfile) return;
    const tagKey = tag as keyof CssProfile['rules'];
    const currentRules = { ...(currentProfile.rules[tagKey] || {}) };
    delete (currentRules as any)[prop];
    const updated = {
      ...currentProfile,
      rules: {
        ...currentProfile.rules,
        [tagKey]: currentRules,
      },
    };
    triggerUpdate(updated, tag, `${tag} ${prop} 삭제`);
  };

  // 페이지 스타일(용지, 마진, 자간 등) 갱신 (단일 속성 또는 다중 속성 일괄 갱신)
  const handlePageStyleChange = (propOrChanges: keyof CssPageStyle | Partial<CssPageStyle>, val?: any) => {
    if (isSystemProfile) return;
    const patch = typeof propOrChanges === 'object' && propOrChanges !== null
      ? propOrChanges
      : { [propOrChanges as keyof CssPageStyle]: val };
    const updated = {
      ...currentProfile,
      pageStyle: {
        ...currentProfile.pageStyle,
        ...patch,
      },
    };
    const label = typeof propOrChanges === 'object' && propOrChanges !== null
      ? Object.keys(propOrChanges).join(', ')
      : String(propOrChanges);
    triggerUpdate(updated, 'page', `페이지 서식 변경 (${label})`);
  };

  // 현재 개요 체계 요약 텍스트
  const currentOutlineSummary = useMemo(() => {
    const numbering = currentProfile.headingNumbering || [];
    if (numbering.length === 0 || numbering.every((x) => x === 'none')) return '적용 안함 (번호 없음)';
    if (numbering[0] === 'decimal-outline') return '십진 기술표준 (1. ➔ 1.1 ➔ 1.1.1)';
    if (numbering[0] === 'roman') return '보고서 표준 (Ⅰ. ➔ 1. ➔ 가.)';
    if (numbering[0] === 'decimal' && numbering[1] === 'hangul') return '공문서 한글 (1. ➔ 가. ➔ (1))';
    const h1 = headingSetting(numbering[0]);
    if (typeof h1 === 'object' && h1.type === 'custom') {
      return `사용자 정의 (${headingMarker(h1, 1)})`;
    }
    return '사용자 정의 번호 체계';
  }, [currentProfile.headingNumbering]);

  // 카테고리 클릭 핸들러 (스크롤을 맨 위로 부드럽게 리셋)
  const handleCategoryClick = (catId: DetailCategory) => {
    setActiveCategory(catId);
    setSearchKeyword('');
    onActiveSectionChange?.(catId);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 이전 / 다음 카테고리 순환 이동 헬퍼
  const currentIndex = CATEGORIES.findIndex((c) => c.id === activeCategory);
  const handlePrevCategory = () => {
    const nextIdx = (currentIndex - 1 + CATEGORIES.length) % CATEGORIES.length;
    handleCategoryClick(CATEGORIES[nextIdx].id);
  };
  const handleNextCategory = () => {
    const nextIdx = (currentIndex + 1) % CATEGORIES.length;
    handleCategoryClick(CATEGORIES[nextIdx].id);
  };

  // 빠른 검색어 입력 시 자동 카테고리 전환
  const handleSearchChange = (kw: string) => {
    setSearchKeyword(kw);
    const q = kw.trim().toLowerCase();
    if (!q) return;

    if (
      q.includes('제목') ||
      q.includes('h1') ||
      q.includes('h2') ||
      q.includes('h3') ||
      q.includes('h4') ||
      q.includes('h5') ||
      q.includes('h6') ||
      q.includes('개요')
    ) {
      setActiveCategory('headings');
    } else if (
      q.includes('본문') ||
      q.includes('자간') ||
      q.includes('여백') ||
      q.includes('마진') ||
      q.includes('문단') ||
      q.includes('들여쓰기') ||
      q.includes('행간') ||
      q.includes('줄간격') ||
      q.includes('탭')
    ) {
      setActiveCategory('paragraph');
    } else if (
      q.includes('표') ||
      q.includes('테이블') ||
      q.includes('table') ||
      q.includes('th') ||
      q.includes('td')
    ) {
      setActiveCategory('table');
    } else if (q.includes('인용구') || q.includes('블록') || q.includes('인용') || q.includes('quote')) {
      setActiveCategory('quote');
    } else if (q.includes('코드블록') || q.includes('codeblock') || q.includes('pre')) {
      setActiveCategory('codeblock');
    } else if (q.includes('인라인') || q.includes('inline') || q.includes('백틱')) {
      setActiveCategory('inlinecode');
    } else if (q.includes('링크') || q.includes('하이퍼링크') || q.includes('link') || q.includes('url')) {
      setActiveCategory('link');
    } else if (q.includes('각주') || q.includes('footnote')) {
      setActiveCategory('footnote');
    } else if (
      q.includes('목록') ||
      q.includes('리스트') ||
      q.includes('체크') ||
      q.includes('ul') ||
      q.includes('ol') ||
      q.includes('li')
    ) {
      setActiveCategory('lists');
    } else if (q.includes('구분선') || q.includes('hr') || q.includes('수평선')) {
      setActiveCategory('hr');
    } else if (q.includes('이미지') || q.includes('사진') || q.includes('img') || q.includes('캡션')) {
      setActiveCategory('image');
    } else if (q.includes('동영상') || q.includes('video') || q.includes('영상') || q.includes('유튜브')) {
      setActiveCategory('video');
    } else if (q.includes('지도') || q.includes('map')) {
      setActiveCategory('map');
    } else if (q.includes('수식') || q.includes('math') || q.includes('katex')) {
      setActiveCategory('math');
    } else if (q.includes('규칙') || q.includes('css') || q.includes('커스텀')) {
      setActiveCategory('rules');
    }
  };

  // 미리보기 클릭 인스펙터(Click-to-Inspect) 연동
  useEffect(() => {
    if (!inspectorKey) return;
    setStyleMode('pro');

    // 1. targetSection이 제공된 경우 15대 카테고리 1:1 우선 전환 (하위 <p> 태그 오탐 방지)
    if (targetSection) {
      const s = targetSection.toLowerCase();
      if (['headings', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(s)) {
        setActiveCategory('headings');
        return;
      }
      if (['paragraph', 'body', 'advanced', 'p'].includes(s)) {
        setActiveCategory('paragraph');
        return;
      }
      if (s === 'table') {
        setActiveCategory('table');
        return;
      }
      if (['quote', 'blockquote'].includes(s)) {
        setActiveCategory('quote');
        return;
      }
      if (['codeblock', 'pre', 'codeBlock'].includes(s)) {
        setActiveCategory('codeblock');
        return;
      }
      if (s === 'inlinecode') {
        setActiveCategory('inlinecode');
        return;
      }
      if (['link', 'a'].includes(s)) {
        setActiveCategory('link');
        return;
      }
      if (['footnote', 'footnotes'].includes(s)) {
        setActiveCategory('footnote');
        return;
      }
      if (['lists', 'list', 'ul', 'ol', 'li'].includes(s)) {
        setActiveCategory('lists');
        return;
      }
      if (s === 'hr') {
        setActiveCategory('hr');
        return;
      }
      if (['image', 'img', 'media'].includes(s)) {
        setActiveCategory('image');
        return;
      }
      if (s === 'video') {
        setActiveCategory('video');
        return;
      }
      if (s === 'map') {
        setActiveCategory('map');
        return;
      }
      if (s === 'math') {
        setActiveCategory('math');
        return;
      }
      if (['rules', 'effective-rules'].includes(s)) {
        setActiveCategory('rules');
        return;
      }
    }

    // 2. targetTag 기반 보조 폴백
    if (targetTag) {
      const t = targetTag.toLowerCase();
      if (/^h[1-6]$/.test(t)) {
        setActiveCategory('headings');
        return;
      }
      if (['table', 'th', 'td', 'thead', 'tbody', 'tr'].includes(t)) {
        setActiveCategory('table');
        return;
      }
      if (t === 'blockquote') {
        setActiveCategory('quote');
        return;
      }
      if (t === 'pre' || t === 'codeblock') {
        setActiveCategory('codeblock');
        return;
      }
      if (t === 'code') {
        setActiveCategory('inlinecode');
        return;
      }
      if (t === 'a') {
        setActiveCategory('link');
        return;
      }
      if (['footnote', 'sup', 'footnotes'].includes(t)) {
        setActiveCategory('footnote');
        return;
      }
      if (['ul', 'ol', 'li', 'tasklist'].includes(t)) {
        setActiveCategory('lists');
        return;
      }
      if (t === 'hr') {
        setActiveCategory('hr');
        return;
      }
      if (t === 'img') {
        setActiveCategory('image');
        return;
      }
      if (t === 'video') {
        setActiveCategory('video');
        return;
      }
      if (t === 'map' || t === 'iframe') {
        setActiveCategory('map');
        return;
      }
      if (t === 'math') {
        setActiveCategory('math');
        return;
      }
      if (['p', 'strong', 'em', 'u', 'del'].includes(t)) {
        setActiveCategory('paragraph');
        return;
      }
    }
  }, [inspectorKey, targetSection, targetTag]);

  // 기본 서식으로 복구
  const resetToDefault = () => {
    if (isSystemProfile) return;
    setConfirmConfig({
      isOpen: true,
      title: '서식 초기화',
      message: '시스템 기본 서식으로 전환하시겠습니까?',
      isDanger: false,
      onConfirm: () => {
        onSelectProfile(DEFAULT_PROFILE.id);
        setConfirmConfig(null);
      },
    });
  };

  // 테마 이름 변경 저장
  const handleRenameSave = () => {
    if (tempName.trim() && tempName !== currentProfile.name) {
      onUpdateProfile({ ...currentProfile, name: tempName.trim() });
    }
    setIsEditingName(false);
  };

  // 서식 가이드 마크다운 다운로드
  const downloadGuideSpec = () => {
    const blob = new Blob([CSS_PROFILE_GUIDE_MD], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Onrivi_CSS_Profile_Guide.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 서식 JSON 파일 업로드
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      importProfileString(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 서식 문자열 파싱 및 등록
  const importProfileString = (jsonStr: string) => {
    try {
      const parsed = sanitizeAndParseCssProfileJson(jsonStr);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('유효한 서식 JSON 형식이 아닙니다.');
      }
      const imported: CssProfile = {
        ...parsed,
        id: `custom-${Date.now()}`,
        name: parsed.name ? `${parsed.name} (가져옴)` : `가져온 서식 ${new Date().toLocaleDateString()}`,
      };
      onImportProfile?.(imported);
      onSelectProfile(imported.id, imported);
      setShowImportModal(false);
      setImportJsonText('');
      showToast('서식을 성공적으로 가져왔습니다!');
    } catch (err: any) {
      alert(`서식 가져오기 실패: ${err.message || '파일 내용을 확인해 주세요.'}`);
    }
  };

  const baseFontSize = formatPt(currentProfile.pageStyle?.fontSize, 11);
  const currentCategoryObj = CATEGORIES[currentIndex] || CATEGORIES[0];

  return (
    <div className="w-full h-full bg-transparent flex flex-col select-none text-sm animate-fadeIn relative">
      {/* 1단계: 최상단 헤더 */}
      <div className="px-4 py-3 bg-white/70 dark:bg-[#17191E]/70 backdrop-blur-sm border-b border-[#EFEFEF] dark:border-[#22242A] shrink-0 z-30 flex flex-col gap-2">
        <div className="flex items-center justify-end gap-2 -mt-1 mb-1">
          <button
            onClick={downloadGuideSpec}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-zinc-600 hover:text-[#1d4ed8] dark:text-zinc-400 dark:hover:text-[#1d4ed8] bg-white dark:bg-[#131519] hover:bg-slate-50 dark:hover:bg-[#22242A] rounded-lg border border-[#EFEFEF] dark:border-[#22242A] transition-colors shadow-xs cursor-pointer"
            title="CSS 프로필 설정 가이드 다운로드"
          >
            📖 서식 설정 가이드
          </button>
          {onOpenStyleManager && (
            <button
              onClick={onOpenStyleManager}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-zinc-600 hover:text-[#1d4ed8] dark:text-zinc-400 dark:hover:text-[#1d4ed8] bg-white dark:bg-[#131519] hover:bg-slate-50 dark:hover:bg-[#22242A] rounded-lg border border-[#EFEFEF] dark:border-[#22242A] transition-colors shadow-xs cursor-pointer"
              title="서식 관리 (추가/삭제/가져오기/AI생성)"
            >
              ⚙ 서식 관리
            </button>
          )}
        </div>

        {/* 테마 선택 드롭다운 버튼 */}
        {isEditingName && !isSystemProfile ? (
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleRenameSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSave();
              if (e.key === 'Escape') setIsEditingName(false);
            }}
            autoFocus
            className="w-full p-2.5 border-2 border-[#1d4ed8] rounded-xl outline-none text-base font-extrabold bg-white dark:bg-[#131519] text-zinc-900 dark:text-zinc-100 shadow-sm"
          />
        ) : (
          <button
            onClick={() => setShowAllProfiles(!isGalleryOpen)}
            className="flex items-center justify-between w-full p-2.5 bg-gradient-to-r from-emerald-50/70 to-blue-50/70 dark:from-[#1d4ed8]/10 dark:to-[#4D73FF]/10 rounded-xl border border-[#1d4ed8]/30 dark:border-[#1d4ed8]/20 hover:border-[#1d4ed8] dark:hover:border-[#1d4ed8] hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{isSystemProfile ? '🏛️' : '🫆'}</span>
              <span className="text-[16px] font-extrabold text-zinc-900 dark:text-zinc-100 truncate pr-2">
                {currentProfile.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-zinc-400 group-hover:text-[#1d4ed8] transition-transform duration-200 ${
                  isGalleryOpen ? 'rotate-180' : ''
                }`}
              >
                ▼
              </span>
            </div>
          </button>
        )}
      </div>

      {/* 갤러리 메가 메뉴 팝오버 */}
      {isGalleryOpen && (
        <div className="absolute top-[104px] left-0 right-0 max-h-[400px] overflow-y-auto z-40 bg-white/95 dark:bg-[#17191E]/95 backdrop-blur-md border-b border-[#EFEFEF] dark:border-[#22242A] shadow-2xl p-4 custom-scrollbar animate-in slide-in-from-top-2">
          <div className="text-xs font-bold text-zinc-500 mb-3">테마 선택 ({profiles.length}개)</div>
          <div className="grid grid-cols-3 gap-2.5">
            {profiles.map((p) => {
              const isActive = p.id === activeProfileId;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProfile(p.id);
                    setShowAllProfiles(false);
                  }}
                  className={`w-full h-[70px] rounded-xl border-2 flex flex-col items-center justify-center p-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#1d4ed8] bg-[#1d4ed8]/10 shadow-sm'
                      : 'border-[#EFEFEF] dark:border-[#22242A] bg-white dark:bg-[#131519] hover:border-[#1d4ed8]/50'
                  }`}
                >
                  <span className="text-[18px] mb-1">{isSystemProfileId(p.id) ? '🏛️' : '🫆'}</span>
                  <span
                    className={`text-[11px] font-bold truncate w-full text-center ${
                      isActive ? 'text-[#1d4ed8] dark:text-[#1d4ed8]' : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2단계: 스크롤 가능한 본문 영역 */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* 모드 전환 세그먼트 (간편 스타일링 vs 세부 서식 다듬기) */}
        <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs shrink-0">
          <button
            type="button"
            onClick={() => setStyleMode('quick')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              styleMode === 'quick'
                ? 'bg-white dark:bg-zinc-800 text-[#1d4ed8] dark:text-blue-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <span>⚡ 간편 스타일링 (Simple)</span>
          </button>
          <button
            type="button"
            onClick={() => setStyleMode('pro')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              styleMode === 'pro'
                ? 'bg-white dark:bg-zinc-800 text-[#1d4ed8] dark:text-blue-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <span>🎨 세부 서식 다듬기 (Detail)</span>
          </button>
        </div>

        {styleMode === 'quick' ? (
          <QuickStylePanel
            currentProfile={currentProfile}
            isSystemProfile={isSystemProfile}
            onUpdateProfile={onUpdateProfile}
            onSwitchToProMode={() => setStyleMode('pro')}
            isDarkMode={isDarkMode}
          />
        ) : (
          <div className="space-y-4">
            {/* ⚡ 간편 스타일링 위임 알림 배너 */}
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/10 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-300">
                  <span>📐</span>
                  <span>기본 글꼴·크기·줄간격·배경색 및 용지·배치·개요</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStyleMode('quick')}
                  className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>⚡ 간편 모드로 가기</span>
                  <span>➔</span>
                </button>
              </div>
              <p className="text-[11.5px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                문서의 대표 활자체, 종이 판형(A4/B5 등), 0.5pt 활자 크기, 가로·세로 방향, 일반/그림책 문맥 배치 및{' '}
                <strong>제목 개요 번호 체계 (1., Ⅰ., 가., 제1장 등)</strong>는 상단 <strong>[⚡ 간편 스타일링]</strong> 탭에서 원클릭으로 쉽게 지정할 수 있습니다.
              </p>
              <div className="pt-1 border-t border-blue-150 dark:border-blue-900/40 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                <span>
                  현재 개요:{' '}
                  <strong className="text-blue-700 dark:text-blue-300 font-semibold">{currentOutlineSummary}</strong>
                </span>
              </div>
            </div>

            {/* 🎯 [스크롤 방어 핵심] 상단 스티키(Sticky) 카테고리 내비게이션 바 */}
            <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-white/95 dark:bg-[#131519]/95 backdrop-blur-md border-y border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
              {/* 상단 검색창 및 직관 드롭다운 점프 */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="원하는 서식 빠른 검색 (예: 표, 코드, 링크, 각주, 이미지, 동영상, 수식...)"
                    className="w-full pl-8.5 pr-8 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 transition-all font-medium"
                  />
                  {searchKeyword && (
                    <button
                      type="button"
                      onClick={() => setSearchKeyword('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-bold p-0.5 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* 원클릭 서식 빠른 점프 드롭다운 */}
                <select
                  value={activeCategory}
                  onChange={(e) => handleCategoryClick(e.target.value as DetailCategory)}
                  className="py-1.5 px-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
                  title="서식 항목 바로가기"
                >
                  {CATEGORIES.map((c, i) => (
                    <option key={c.id} value={c.id}>
                      {i + 1}. {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 15대 카테고리 퀵 선택 탭 바 (스크롤 없이 바로 클릭) */}
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar pt-0.5">
                {CATEGORIES.map((cat) => {
                  const active = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryClick(cat.id)}
                      className={`px-2 py-1 rounded-md text-[11.5px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        active
                          ? 'bg-[#1d4ed8] text-white shadow-xs scale-[1.02]'
                          : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-350 hover:bg-zinc-200 dark:hover:bg-zinc-750'
                      }`}
                    >
                      <span className="text-xs">{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 🎯 현재 선택된 단일 카테고리 뷰 컴포넌트 렌더링 */}
            <div className="transition-all duration-200 min-h-[300px]">
              {activeCategory === 'paragraph' && (
                <DetailParagraphPanel
                  currentProfile={currentProfile}
                  isSystemProfile={isSystemProfile}
                  onUpdateProfile={onUpdateProfile}
                  triggerUpdate={triggerUpdate}
                  handlePageStyleChange={handlePageStyleChange}
                  updateCssRule={updateCssRule}
                />
              )}

              {activeCategory === 'headings' && (
                <DetailHeadingPanel
                  currentProfile={currentProfile}
                  isSystemProfile={isSystemProfile}
                  currentOutlineSummary={currentOutlineSummary}
                  onUpdateProfile={onUpdateProfile}
                  triggerUpdate={triggerUpdate}
                  handlePageStyleChange={handlePageStyleChange}
                  updateCssRule={updateCssRule}
                  onSwitchToQuickMode={() => setStyleMode('quick')}
                />
              )}

              {activeCategory === 'table' && (
                <DetailTablePanel
                  currentProfile={currentProfile}
                  isSystemProfile={isSystemProfile}
                  baseFontSize={baseFontSize}
                  onUpdateProfile={onUpdateProfile}
                  triggerUpdate={triggerUpdate}
                  updateCssRule={updateCssRule}
                />
              )}

              {activeCategory === 'quote' && (
                <DetailQuotePanel
                  currentProfile={currentProfile}
                  isSystemProfile={isSystemProfile}
                  baseFontSize={baseFontSize}
                  triggerUpdate={triggerUpdate}
                  updateCssRule={updateCssRule}
                />
              )}

              {activeCategory === 'codeblock' && (
                <DetailCodePanel
                  currentProfile={currentProfile}
                  isSystemProfile={isSystemProfile}
                  baseFontSize={baseFontSize}
                  onUpdateProfile={onUpdateProfile}
                  triggerUpdate={triggerUpdate}
                  updateCssRule={updateCssRule}
                />
              )}

              {activeCategory === 'inlinecode' && (
                <DetailInlineCodePanel
                  currentProfile={currentProfile}
                  isSystemProfile={isSystemProfile}
                  triggerUpdate={triggerUpdate}
                  updateCssRule={updateCssRule}
                />
              )}

              {activeCategory === 'link' && (
                <DetailLinkPanel
                  currentProfile={currentProfile}
                  isSystemProfile={isSystemProfile}
                  triggerUpdate={triggerUpdate}
                  updateCssRule={updateCssRule}
                />
              )}

              {activeCategory === 'footnote' && (
                <DetailFootnotePanel
                  currentProfile={currentProfile}
                  isSystemProfile={isSystemProfile}
                  triggerUpdate={triggerUpdate}
                  updateCssRule={updateCssRule}
                />
              )}

              {activeCategory === 'lists' && (
                <DetailListPanel
                  currentProfile={currentProfile}
                  isSystemProfile={isSystemProfile}
                  triggerUpdate={triggerUpdate}
                  updateCssRule={updateCssRule}
                />
              )}

              {activeCategory === 'hr' && (
                <DetailHrPanel
                  currentProfile={currentProfile}
                  isSystemProfile={isSystemProfile}
                  triggerUpdate={triggerUpdate}
                  updateCssRule={updateCssRule}
                />
              )}

              {activeCategory === 'image' && (
                <DetailImagePanel
                  currentProfile={currentProfile}
                  isSystemProfile={isSystemProfile}
                  triggerUpdate={triggerUpdate}
                  updateCssRule={updateCssRule}
                />
              )}

              {activeCategory === 'video' && (
                <DetailVideoPanel
                  currentProfile={currentProfile}
                  isSystemProfile={isSystemProfile}
                  triggerUpdate={triggerUpdate}
                  updateCssRule={updateCssRule}
                />
              )}

              {activeCategory === 'map' && (
                <DetailMapPanel
                  currentProfile={currentProfile}
                  isSystemProfile={isSystemProfile}
                  triggerUpdate={triggerUpdate}
                  updateCssRule={updateCssRule}
                />
              )}

              {activeCategory === 'math' && (
                <DetailMathPanel
                  currentProfile={currentProfile}
                  isSystemProfile={isSystemProfile}
                  baseFontSize={baseFontSize}
                  triggerUpdate={triggerUpdate}
                  updateCssRule={updateCssRule}
                />
              )}

              {activeCategory === 'rules' && (
                <DetailRulesPanel
                  currentProfile={currentProfile}
                  isSystemProfile={isSystemProfile}
                  onUpdateProfile={onUpdateProfile}
                  updateCssRule={updateCssRule}
                  removeCssRule={removeCssRule}
                />
              )}
            </div>

            {/* 🚨 기본 서식 복구 버튼 */}
            {!isSystemProfile && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={resetToDefault}
                  className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400 font-bold border border-red-200 dark:border-red-900/50 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs text-xs"
                >
                  <span>🔄</span>
                  <span>기본 서식(Onrivi Default)으로 복원</span>
                </button>
              </div>
            )}

            {/* 🎯 [스크롤 방어 핵심] 하단 스티키(Sticky Bottom) 이전/다음 순환 탐색 바 */}
            <div className="sticky bottom-0 z-20 -mx-4 px-4 py-2.5 bg-white/95 dark:bg-[#131519]/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 shadow-lg flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrevCategory}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition-all cursor-pointer shadow-2xs"
                title="이전 서식 항목으로 이동"
              >
                <ChevronLeft size={14} />
                <span>이전 서식</span>
              </button>

              {/* 📑 서식 항목 팝업 리스트 선택기 */}
              <div ref={bottomListRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsBottomListOpen(!isBottomListOpen)}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 hover:bg-blue-100/90 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 px-3.5 py-1 rounded-full border border-blue-200 dark:border-blue-900/50 transition-all cursor-pointer shadow-xs active:scale-95 group"
                  title="클릭하여 15대 전체 서식 리스트에서 선택"
                >
                  <span>{currentCategoryObj.icon}</span>
                  <span>{currentCategoryObj.label}</span>
                  <span className="text-[10px] text-blue-500 font-mono">
                    ({currentIndex + 1}/{CATEGORIES.length})
                  </span>
                  <span className={`text-[9px] text-blue-500 transition-transform duration-200 ${isBottomListOpen ? 'rotate-180' : ''}`}>
                    ▲
                  </span>
                </button>

                {/* 위로 펼쳐지는 15대 서식 선택 팝업 리스트 */}
                {isBottomListOpen && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 max-h-80 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-1.5 z-50 space-y-0.5 custom-scrollbar animate-in slide-in-from-bottom-2">
                    <div className="px-2.5 py-1.5 text-[11px] font-extrabold text-zinc-500 dark:text-zinc-400 border-b border-zinc-150 dark:border-zinc-800 mb-1 flex items-center justify-between">
                      <span>📑 서식 항목 리스트</span>
                      <span className="text-[10px] text-zinc-400">15개 항목</span>
                    </div>
                    <div className="space-y-0.5">
                      {CATEGORIES.map((cat, idx) => {
                        const isSelected = activeCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              handleCategoryClick(cat.id);
                              setIsBottomListOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#1d4ed8] text-white shadow-xs'
                                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono opacity-60 w-4 text-right">
                                {idx + 1}.
                              </span>
                              <span className="text-sm">{cat.icon}</span>
                              <span>{cat.label}</span>
                            </div>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-blue-100">선택됨</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleNextCategory}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1d4ed8] hover:bg-blue-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                title="다음 서식 항목으로 이동"
              >
                <span>다음 서식</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ⚡ 실시간 알림 토스트 레이어 */}
      {toastMessage && (
        <div className="fixed bottom-4 left-4 z-[99999] px-4 py-3 rounded-lg bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xl border border-zinc-700 dark:border-zinc-200 text-sm font-bold animate-fadeIn flex items-center gap-2">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 📥 외부 서식 가져오기 모달 */}
      {showImportModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-[480px] max-w-full shadow-2xl p-5 space-y-4 animate-scaleUp text-left">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 text-base">
                📥 외부 서식 가져오기 / 업로드
              </span>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportJsonText('');
                }}
                className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-300 font-bold text-base leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                  방법 1: 서식 파일(.json) 업로드
                </span>
                <div className="relative border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer transition-colors group">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <span className="text-zinc-500 dark:text-zinc-400 group-hover:text-blue-500 transition-colors text-sm font-bold block">
                    📁 서식 JSON 파일 선택하기
                  </span>
                  <span className="text-xs text-zinc-400 mt-1 block">AI가 저장해 준 서식 JSON 파일을 로드합니다.</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                  방법 2: AI 생성 JSON 텍스트 붙여넣기
                </span>
                <textarea
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder="AI가 출력해 준 Onrivi 규격 JSON 텍스트를 여기에 붙여넣어 주세요..."
                  className="w-full h-44 p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-xl font-mono text-xs leading-relaxed outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportJsonText('');
                }}
                className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (!importJsonText.trim()) {
                    showToast('가져올 JSON 텍스트를 입력해 주세요!');
                    return;
                  }
                  importProfileString(importJsonText);
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                가져오기 실행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 확인 모달 */}
      {confirmConfig && (
        <ConfirmModal
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          isDanger={confirmConfig.isDanger}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(null)}
        />
      )}
    </div>
  );
}
