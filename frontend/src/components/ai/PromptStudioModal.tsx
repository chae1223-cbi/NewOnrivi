// ====================================================================
// 📊 [OMD-AI-PromptStudioModal-0001] src/components/ai/PromptStudioModal.tsx
// 🎯 @KICK  : 프롬프트 템플릿 전체 원문 열람·입력사항(변수) 작성, 도메인(Category) 관리 및 질의창 연동 전용 스튜디오 모달
// 🛡️ @GUARD : Rule 1(소스코드 주석 관리), Rule 2(코드값 대문자 통일), Rule 3(역할 기반 컴포넌트 분리), Rule 6(Modern Technical Editorial), Rule 8(고대비 시인성 보장)
// 🚨 @PATCH : **2026-10-27** — [프롬프트 모달 안내 문구 문장 부호 표준화]: window.prompt 타이틀 끝의 콜론(:)을 마침표(.)로 변경하여 일관된 문장 부호 적용
// 🚨 @PATCH : **2026-10-20** — [ESLint react-hooks/exhaustive-deps 경고 해소]: 모달 오픈 시 선택 초기화 effect에서 selectedIdRef를 참조하여 불필요한 재실행 및 의존성 누락 경고 제거
// 🚨 @PATCH : **2026-10-20** — [UI 정돈: 도메인 직접입력 인풋 및 상단 중복 삭제버튼 제거, 신규 버튼 풋터 이동]:
//             1) 우측 상단 메타데이터 영역의 도메인 직접입력 중복 인풋창(<input>)을 제거하고 단일 <select> 드롭다운(새 도메인 직접 추가 기능 포함)으로 정돈
//             2) 우측 상단에 중복 노출되던 '🗑️ 삭제' 버튼을 제거하여 하단 풋터의 '🗑️ 템플릿 삭제'로 일원화
//             3) 좌측 사이드바 상단의 '➕ 신규 템플릿 작성하기'를 하단 풋터 '수정 저장' 버튼 바로 앞으로 이동하고 버튼명을 '➕ 신규'로 간결화
// 🚨 @PATCH : **2026-10-20** — [템플릿 신규/수정 시 도메인 하이브리드 변경 UI(드롭다운 빠른 선택 + 직접 타이핑) 구축]:
//             1) 도메인 선택/변경 UI 전면 고도화: 기존 도메인 목록 드롭다운(<select>)과 직접 입력 인풋(<input>)을 결합하여 신규 작성 및 기존 템플릿 수정 시 원하는 도메인으로 원클릭 즉각 변경 및 새 도메인명 자유 타이핑 동시 완벽 지원
//             2) 템플릿 저장 시 변경된 도메인으로 필터(selectedCategory) 자동 동기화하여 수정 저장 후에도 템플릿이 목록에서 유실되지 않고 안정 선택 유지
// 🚨 @PATCH : **2026-10-20** — [공식 템플릿 이름 도메인 중복 접두사 제거 및 도메인 필수 선택 저장 가드 탑재]:
//             1) 공식 템플릿의 표시 이름에서 앞단 '${domain} / ' 접두사를 자동 제거하여 중복 표기 말끔히 해소
//             2) 템플릿 신규/수정/복제 저장 시 도메인(templateFolder) 미선택 상태 차단 가드 구축 (경고 피드백 및 버튼 비활성화)
//             3) 도메인 입력란에 필수(*) 표시 및 미입력 시 고대비 붉은 테두리 시각 안내 제공
// 🚨 @PATCH : **2026-10-20** — [도메인(Domain) 명칭 표준화 및 좌측 사이드바 리스트 UI 슬림화]:
//             1) 사용자 요청에 따라 '대분류' 명칭을 '도메인(Domain)'으로 전면 정규화 및 표준화 (도메인 필터, 도메인 관리 모달, 메타데이터 연동)
//             2) 좌측 사이드바 도메인 필터에서 하단 가로 스크롤 칩 바를 완전 제거하고, 깔끔한 단일 드롭다운 리스트(select)로 UI 슬림화 정돈
// 🚨 @PATCH : **2026-10-20** — [프롬프트 템플릿 대분류(카테고리/폴더) 종합 관리 시스템 전면 구축]:
//             1) 좌측 사이드바 대분류 필터링: 전체 대분류 드롭다운 및 수평 스크롤 카테고리 칩(Pill) 바로가기 탑재 (카테고리별 실시간 템플릿 수 집계 및 즉시 필터)
//             2) 템플릿 작성/수정 시 대분류 자동완성 및 즉석 생성: <datalist id="prompt-category-list"> 연동으로 기존 대분류 원클릭 선택 및 새 분류명 직접 입력 지원
//             3) [📁 대분류 관리] 전용 관리 모달 신설: 새 대분류 생성, 대분류 이름 일괄 변경(Rename Batch Update), 불필요 대분류 정리/미분류 이동 지원
//             4) 시스템 공식 템플릿 대분류 보호 가드 적용: 공식 대분류 변조 방지 및 사용자 대분류에 한해 자유로운 이름 변경/정리 권한 보장
// 🚨 @PATCH : **2026-10-20** — [프롬프트 템플릿 스튜디오 신규 템플릿 작성(New Template) 기능 및 UI 전면 탑재]:
//             1) 좌측 사이드바 상단에 '➕ 신규 템플릿 작성하기' 버튼 탑재 및 신규 작성 모드(startNewTemplate) 연동
//             2) 백지 상태에서 템플릿 이름, 폴더(분류), 원문 프롬프트, 변수({{변수명}}), 추가 데이터 입력 폼 자유 작성 지원
//             3) 우측 상단 메타데이터 영역에 폴더(분류) 인풋 추가 및 신규 작성 모드 뱃지 제공
//             4) 하단 액션바에 '새 템플릿 저장하기' / '작성 취소' 버튼 스마트 분기 및 저장 완료 시 자동 선택·목록 반영
// 🚨 @PATCH : **2026-10-20** — [사용자 템플릿 삭제(Delete) 기능 및 목록/상세 원클릭 제거 완비]:
//             1) 사용자 템플릿 삭제(onDeleteTemplate) 파이프라인 탑재: 데스크톱 ai_presets.json 및 런타임 스토리지 동기 삭제
//             2) 안전 삭제 가드: 기본 공식 템플릿은 삭제 차단(보호)하고 오직 사용자 템플릿에만 삭제 액션 활성화 및 확인 컨펌 제공
//             3) 삭제 완료 시 잔여 템플릿 자동 선택 및 뷰어 갱신으로 UX 연속성 보장
// 🚨 @PATCH : **2026-10-20** — [프롬프트 템플릿 스튜디오 전용 모달 신설 및 질의창 실시간 연동 완비]:
//             1) 좌우 2단 분할 레이아웃: 좌측 템플릿 카테고리/검색 목록 + 우측 전체 프롬프트 원문 뷰어 및 입력사항 작성 폼 탑재
//             2) 전체 프롬프트 원문(시스템 지침/작성 규칙)과 입력 양식 시원한 대형 뷰어로 한눈에 확인
//             3) 변수({{변수명}}) 및 입력 항목 폼 실시간 파싱 제공으로 손쉬운 맞춤형 파라미터 기입
//             4) [질의창에 적용] 원클릭 실행 시 완성된 전체 프롬프트가 메인 AI 질의창으로 100% 자동 연동 주입
// ====================================================================
'use client';

import { useModalEscape } from '@/hooks/useModalEscape';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { AITemplate } from '@/lib/ai/templates';
import { templateVariables, fillTemplate } from '@/lib/ai/templates';

interface PromptStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPrompt: (finalPrompt: string) => void;
  templates: AITemplate[];
  builtins: AITemplate[];
  resourceFolder?: string | null;
  onSaveTemplate?: (template: AITemplate, isUpdate: boolean) => Promise<void>;
  onSaveTemplatesBatch?: (templates: AITemplate[]) => Promise<void>;
  onDeleteTemplate?: (templateId: string) => Promise<void>;
  initialPrompt?: string;
}

export default function PromptStudioModal({
  isOpen,
  onClose,
  onApplyPrompt,
  templates,
  builtins,
  onSaveTemplate,
  onSaveTemplatesBatch,
  onDeleteTemplate,
  initialPrompt = '',
}: PromptStudioModalProps) {
  useModalEscape(isOpen, () => { if (isCategoryManagerOpen) setIsCategoryManagerOpen(false); else onClose(); });
  // 모달 활성화 및 선택 상태
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'builtin' | 'user'>('all');

  // 📁 도메인(카테고리) 관련 상태
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState<boolean>(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<{ oldName: string; newName: string } | null>(null);

  // 우측 폼 상태 (전체 프롬프트 원문 및 사용자 입력사항)
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [templateName, setTemplateName] = useState<string>('');
  const [templateFolder, setTemplateFolder] = useState<string>('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [customUserInput, setCustomUserInput] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  const modalRef = useRef<HTMLDivElement>(null);

  // 통합 템플릿 목록 (공식 템플릿의 이름에서 도메인 중복 접두사 자동 정제)
  const allTemplates = useMemo(() => {
    return [
      ...templates.map((t) => ({ ...t, isUser: true })),
      ...builtins.map((t) => {
        let cleanName = t.name;
        if (t.folder && cleanName.startsWith(`${t.folder} / `)) {
          cleanName = cleanName.slice(`${t.folder} / `.length);
        } else if (cleanName.includes(' / ')) {
          const parts = cleanName.split(' / ');
          cleanName = parts.slice(1).join(' / ');
        }
        return {
          ...t,
          name: cleanName,
          isUser: false,
        };
      }),
    ];
  }, [templates, builtins]);

  // 📊 도메인별 통계 및 고유 목록 추출
  const categoryStats = useMemo(() => {
    const map = new Map<string, { total: number; userCount: number; builtinCount: number }>();

    // 사용자가 임의로 추가한 카테고리도 등록 (템플릿이 0개여도 노출)
    customCategories.forEach((cat) => {
      const trimmed = cat.trim();
      if (trimmed && !map.has(trimmed)) {
        map.set(trimmed, { total: 0, userCount: 0, builtinCount: 0 });
      }
    });

    // 전체 템플릿 순회하며 집계
    allTemplates.forEach((t) => {
      const folderName = (t.folder || '미분류').trim() || '미분류';
      const existing = map.get(folderName) || { total: 0, userCount: 0, builtinCount: 0 };
      existing.total += 1;
      if (t.isUser) {
        existing.userCount += 1;
      } else {
        existing.builtinCount += 1;
      }
      map.set(folderName, existing);
    });

    return map;
  }, [allTemplates, customCategories]);

  // 정렬된 도메인 이름 목록
  const categoryList = useMemo(() => {
    return Array.from(categoryStats.keys()).sort((a, b) => {
      if (a === '미분류') return 1;
      if (b === '미분류') return -1;
      return a.localeCompare(b, 'ko');
    });
  }, [categoryStats]);

  // 필터링된 템플릿 목록 (탭 + 도메인 + 검색어 결합)
  const filteredTemplates = useMemo(() => {
    let list = allTemplates;
    if (activeTab === 'user') list = list.filter((t) => t.isUser);
    if (activeTab === 'builtin') list = list.filter((t) => !t.isUser);

    // 도메인 필터링 적용
    if (selectedCategory !== 'ALL') {
      list = list.filter((t) => ((t.folder || '미분류').trim() || '미분류') === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.folder && t.folder.toLowerCase().includes(q)) ||
          t.editorialCommand.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allTemplates, activeTab, selectedCategory, searchQuery]);

  // 신규 템플릿 작성 모드 여부
  const isCreatingNew = selectedId === 'NEW_TEMPLATE';
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  // 모달 열릴 때 기본 선택 초기화
  useEffect(() => {
    if (!isOpen) return;
    setFeedbackMsg('');
    const curId = selectedIdRef.current;
    if (curId === 'NEW_TEMPLATE') return;
    if (allTemplates.length > 0 && !curId) {
      const first = allTemplates[0];
      setSelectedId(first.id);
      loadTemplateIntoView(first);
    } else if (curId) {
      const found = allTemplates.find((t) => t.id === curId);
      if (found) loadTemplateIntoView(found);
    }
  }, [isOpen, allTemplates]);

  // ➕ [신규 템플릿 작성 시작]
  const startNewTemplate = () => {
    setSelectedId('NEW_TEMPLATE');
    setTemplateName('');
    // 현재 특정 도메인이 선택되어 있다면 해당 도메인을 기본값으로 채우고, 전체/미분류라면 빈 값으로 두어 직접 선택 유도
    const defaultFolder = selectedCategory !== 'ALL' && selectedCategory !== '미분류'
      ? selectedCategory
      : '';
    setTemplateFolder(defaultFolder);
    setCurrentPrompt(initialPrompt ? initialPrompt : '');
    setVariables({});
    setCustomUserInput('');
    setFeedbackMsg(
      defaultFolder
        ? `✨ '${defaultFolder}' 도메인에 새 템플릿을 작성합니다.`
        : '✨ 새 템플릿을 작성합니다. 도메인(필수)과 템플릿 이름을 입력해 주세요.'
    );
  };

  // ESC 키 닫기 핸들러
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCategoryManagerOpen) {
          e.preventDefault();
          e.stopPropagation();
          setIsCategoryManagerOpen(false);
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, isCategoryManagerOpen, onClose]);

  // 템플릿 선택 시 우측 뷰에 로드
  const loadTemplateIntoView = (t: AITemplate & { isUser?: boolean }) => {
    setSelectedId(t.id);
    setTemplateName(t.name);
    setTemplateFolder(t.folder || '');
    setCurrentPrompt(t.editorialCommand || '');
    setFeedbackMsg('');

    // 변수 파싱
    const vars = templateVariables(t.editorialCommand || '');
    const initialVars: Record<string, string> = {};
    for (const v of vars) {
      initialVars[v] = '';
    }
    setVariables(initialVars);

    // {{변수}}가 없는 경우 userInputTemplate 또는 [입력 데이터] 영역 추출
    const userInputPart = (t as any).userInputTemplate || '';
    setCustomUserInput(userInputPart);
  };

  // 현재 감지된 변수 목록
  const detectedVariables = useMemo(() => {
    return templateVariables(currentPrompt);
  }, [currentPrompt]);

  // 최종 조합된 프롬프트 계산
  const computedFinalPrompt = useMemo(() => {
    let result = currentPrompt;
    if (detectedVariables.length > 0) {
      for (const [key, val] of Object.entries(variables)) {
        if (val) {
          result = result.replaceAll(`{{${key}}}`, val);
        }
      }
    }
    if (customUserInput.trim() && !currentPrompt.includes(customUserInput.trim())) {
      result += `\n\n[입력된 데이터]\n${customUserInput.trim()}`;
    }
    return result;
  }, [currentPrompt, detectedVariables, variables, customUserInput]);

  // 현재 선택된 템플릿 및 사용자 정의 여부 계산
  const currentSelectedTemplate = useMemo(() => {
    return allTemplates.find((t) => t.id === selectedId);
  }, [allTemplates, selectedId]);
  const isCurrentUserTemplate = Boolean(currentSelectedTemplate?.isUser);

  // 🚀 [질의창에 적용] 실행
  const handleApply = () => {
    onApplyPrompt(computedFinalPrompt);
    onClose();
  };

  // 🗑️ [템플릿 삭제]
  const handleDelete = async (targetIdToDelete?: string) => {
    const targetId = targetIdToDelete || selectedId;
    if (!onDeleteTemplate || !targetId) return;

    const targetTemplate = allTemplates.find((t) => t.id === targetId);
    if (!targetTemplate?.isUser) {
      setFeedbackMsg('⚠️ 기본 제공 공식 템플릿은 삭제할 수 없습니다.');
      return;
    }

    const confirmed = window.confirm(
      `정말로 '${targetTemplate.name}' 템플릿을 삭제하시겠습니까?\n삭제된 템플릿은 복구할 수 없습니다.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setFeedbackMsg('');
    try {
      await onDeleteTemplate(targetId);
      setFeedbackMsg(`🗑️ '${targetTemplate.name}' 템플릿을 삭제했습니다.`);

      const remaining = allTemplates.filter((t) => t.id !== targetId);
      if (remaining.length > 0) {
        setSelectedId(remaining[0].id);
        loadTemplateIntoView(remaining[0]);
      } else {
        setSelectedId('');
        setTemplateName('');
        setTemplateFolder('');
        setCurrentPrompt('');
        setVariables({});
        setCustomUserInput('');
      }
    } catch (err: any) {
      setFeedbackMsg(`❌ 삭제 실패: ${err?.message || '알 수 없는 오류'}`);
    } finally {
      setDeleting(false);
    }
  };

  // 💾 [템플릿 저장]
  const handleSave = async (isUpdate: boolean) => {
    if (!onSaveTemplate) return;
    if (!templateFolder.trim()) {
      setFeedbackMsg('⚠️ 도메인을 선택하거나 직접 입력해 주세요. (도메인은 필수입니다)');
      return;
    }
    if (!templateName.trim()) {
      setFeedbackMsg('⚠️ 템플릿 이름을 입력해 주세요.');
      return;
    }
    if (!currentPrompt.trim()) {
      setFeedbackMsg('⚠️ 프롬프트 원문을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setFeedbackMsg('');
    try {
      const isActualUpdate = isUpdate && selectedId !== 'NEW_TEMPLATE';
      const targetId = isActualUpdate ? selectedId : `user-template-${Date.now()}`;
      const folderName = templateFolder.trim();
      const templateToSave: AITemplate = {
        id: targetId,
        name: templateName.trim(),
        folder: folderName,
        editorialCommand: currentPrompt,
      };
      await onSaveTemplate(templateToSave, isActualUpdate);
      setSelectedId(targetId);
      setActiveTab('user');

      // 새 카테고리 목록에 없으면 등록
      if (!customCategories.includes(folderName)) {
        setCustomCategories((prev) => [...prev, folderName]);
      }

      // 만약 현재 필터링된 도메인과 변경된 도메인이 다르면, 변경된 도메인으로 필터 동기화
      if (selectedCategory !== 'ALL' && selectedCategory !== folderName) {
        setSelectedCategory(folderName);
      }

      setFeedbackMsg(isActualUpdate ? '✅ 템플릿을 수정 저장했습니다.' : '✅ 새 템플릿으로 저장했습니다.');
    } catch (err: any) {
      setFeedbackMsg(`❌ 저장 실패: ${err?.message || '알 수 없는 오류'}`);
    } finally {
      setSaving(false);
    }
  };

  // 📁 [도메인 일괄 이름 변경 (Rename)]
  const handleRenameCategory = async (oldName: string, newName: string) => {
    const trimmedNew = newName.trim();
    if (!trimmedNew) {
      alert('도메인 이름을 입력해 주세요.');
      return;
    }
    if (oldName === trimmedNew) {
      setEditingCategory(null);
      return;
    }

    setSaving(true);
    try {
      // templates(사용자 템플릿) 중 해당 folder를 가진 것들 일괄 변경
      const updatedUserTemplates = templates.map((t) => {
        const folder = (t.folder || '미분류').trim() || '미분류';
        if (folder === oldName) {
          return { ...t, folder: trimmedNew, updatedAt: new Date().toISOString() };
        }
        return t;
      });

      if (onSaveTemplatesBatch) {
        await onSaveTemplatesBatch(updatedUserTemplates);
      } else if (onSaveTemplate) {
        for (const t of updatedUserTemplates) {
          if ((t.folder || '미분류').trim() === trimmedNew) {
            await onSaveTemplate(t, true);
          }
        }
      }

      // customCategories 동기화
      setCustomCategories((prev) =>
        prev.map((c) => (c === oldName ? trimmedNew : c))
      );

      // 현재 필터 및 폼 상태 동기화
      if (selectedCategory === oldName) {
        setSelectedCategory(trimmedNew);
      }
      if (templateFolder === oldName) {
        setTemplateFolder(trimmedNew);
      }

      setEditingCategory(null);
      setFeedbackMsg(`📁 도메인 '${oldName}'이(가) '${trimmedNew}'(으)로 변경되었습니다.`);
    } catch (err: any) {
      alert(`도메인 이름 변경 실패: ${err?.message || '알 수 없는 오류'}`);
    } finally {
      setSaving(false);
    }
  };

  // 📁 [새 도메인 추가]
  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      alert('도메인 이름을 입력해 주세요.');
      return;
    }
    if (categoryList.includes(trimmed)) {
      alert('이미 존재하는 도메인입니다.');
      return;
    }
    setCustomCategories((prev) => [...prev, trimmed]);
    setNewCategoryInput('');
    setFeedbackMsg(`📁 새 도메인 '${trimmed}'이(가) 추가되었습니다.`);
  };

  // 템플릿이 없는 도메인만 삭제합니다. 삭제 과정에서 템플릿을 이동하지 않습니다.
  const handleDeleteCategory = (catToDelete: string) => {
    if (saving || deleting) return;
    const stats = categoryStats.get(catToDelete);
    if (!stats || catToDelete === '미분류') return;

    if (stats.total > 0) {
      window.alert(`'${catToDelete}' 도메인에 템플릿이 ${stats.total}개 있습니다. 먼저 템플릿을 삭제하거나 다른 도메인으로 이동한 뒤 삭제해 주세요.`);
      return;
    }

    if (!window.confirm(`'${catToDelete}' 도메인을 삭제하시겠습니까?`)) return;

    setCustomCategories((prev) => prev.filter((c) => c !== catToDelete));
    if (selectedCategory === catToDelete) setSelectedCategory('ALL');
    if (templateFolder === catToDelete) setTemplateFolder('');
    setFeedbackMsg(`🗑️ '${catToDelete}' 도메인을 삭제했습니다.`);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="프롬프트 템플릿 스튜디오"
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isCategoryManagerOpen) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-5xl h-[90vh] max-h-[820px] flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100"
      >
        {/* ── 1. 상단 헤더 ── */}
        <header className="shrink-0 px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📑</span>
            <div>
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                프롬프트 템플릿 스튜디오
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold">
                  총 {allTemplates.length}개 템플릿 · {categoryList.length}개 도메인
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                도메인별로 템플릿을 체계적으로 분류하고, 프롬프트 원문과 입력사항을 작성하여 메인 질의창으로 전송하세요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-base font-bold"
            title="닫기 (ESC)"
          >
            ✕
          </button>
        </header>

        {/* ── 2. 본문 2단 분할 영역 (좌: 템플릿 목록 & 도메인 필터 / 우: 프롬프트 상세 및 입력폼) ── */}
        <div className="flex-1 flex overflow-hidden">
          {/* [좌측] 템플릿 탐색 사이드바 (너비 320px) */}
          <aside className="w-84 shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50/70 dark:bg-zinc-900/40">
            {/* 검색 및 탭 & 도메인 필터 영역 */}
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 space-y-2.5">

              {/* 검색창 */}
              <input
                type="text"
                placeholder="템플릿 이름/내용 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />

              {/* 유형 탭 (전체 | 공식 | 내 템플릿) */}
              <div className="flex rounded-lg bg-zinc-200/70 dark:bg-zinc-800 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 py-1 rounded-md transition ${
                    activeTab === 'all'
                      ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  전체 ({allTemplates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('builtin')}
                  className={`flex-1 py-1 rounded-md transition ${
                    activeTab === 'builtin'
                      ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  공식 ({builtins.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('user')}
                  className={`flex-1 py-1 rounded-md transition ${
                    activeTab === 'user'
                      ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  내 템플릿 ({templates.length})
                </button>
              </div>

              {/* 📁 도메인 필터 & 도메인 관리 버튼 */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    <span>📁</span> 도메인 필터
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCategoryManagerOpen(true)}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition cursor-pointer flex items-center gap-1"
                    title="도메인 추가, 이름 변경 및 정리"
                  >
                    <span>⚙️</span>
                    <span>도메인 관리</span>
                  </button>
                </div>

                {/* 도메인 선택 드롭다운 리스트 */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                >
                  <option value="ALL">📂 전체 도메인 보기 ({allTemplates.length}개)</option>
                  {categoryList.map((cat) => {
                    const stats = categoryStats.get(cat);
                    const count = stats?.total || 0;
                    return (
                      <option key={cat} value={cat}>
                        📁 {cat} ({count}개)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* 템플릿 카드 리스트 */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {/* 신규 작성 중일 때 목록 최상단 가상 카드 표시 */}
              {isCreatingNew && (
                <div
                  className="w-full text-left p-2.5 rounded-xl border border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 shadow-xs flex flex-col gap-1 select-none animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold flex items-center gap-1 truncate">
                      <span>✨</span>
                      <span>{templateName.trim() || '새 템플릿 (작성 중)'}</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-200/80 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold shrink-0">
                      신규 작성
                    </span>
                  </div>
                  <span className={`text-[10px] font-medium truncate ${!templateFolder.trim() ? 'text-rose-500 font-bold' : 'text-blue-700/80 dark:text-blue-300/80'}`}>
                    📁 {templateFolder.trim() || '도메인 미지정 (선택 필요)'}
                  </span>
                </div>
              )}
              {filteredTemplates.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400">
                  {searchQuery || selectedCategory !== 'ALL'
                    ? '해당 조건에 일치하는 템플릿이 없습니다.'
                    : '등록된 템플릿이 없습니다.'}
                </div>
              ) : (
                filteredTemplates.map((t) => {
                  const isSelected = selectedId === t.id;
                  const folderLabel = (t.folder || '미분류').trim() || '미분류';
                  return (
                    <div
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => loadTemplateIntoView(t)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          loadTemplateIntoView(t);
                        }
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition cursor-pointer flex flex-col gap-1 border relative group select-none ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 shadow-xs'
                          : 'bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold truncate flex-1">{t.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {t.isUser ? (
                            <>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold shrink-0">
                                사용자
                              </span>
                              {onDeleteTemplate && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleDelete(t.id);
                                  }}
                                  className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/80 transition cursor-pointer text-xs opacity-60 group-hover:opacity-100"
                                  title="템플릿 삭제"
                                >
                                  🗑️
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium shrink-0">
                              공식
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                        <span className="truncate max-w-[200px] flex items-center gap-0.5">
                          <span>📁</span>
                          <span>{folderLabel}</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* [우측] 프롬프트 전체 원문 및 입력사항 작성 영역 */}
          <main className="flex-1 flex flex-col overflow-y-auto p-6 space-y-5 bg-white dark:bg-zinc-900">
            {/* 상단 템플릿 타이틀 & 메타데이터 & 피드백 & 삭제 버튼 */}
            <div className="flex flex-col gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    {isCreatingNew ? '새 템플릿 작성' : '선택된 템플릿'}
                  </span>

                  {/* 📁 도메인(폴더) 선택 (단일 드롭다운 & 새 도메인 즉시 추가 지원) */}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
                      !templateFolder.trim()
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 ring-1 ring-rose-400/40'
                        : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold flex items-center">
                      📁 도메인<span className="text-rose-500 font-bold ml-0.5">*</span>:
                    </span>
                    <select
                      value={templateFolder.trim()}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__CUSTOM__') {
                          const newCat = window.prompt('새로 추가할 도메인 이름을 입력하세요.');
                          if (newCat && newCat.trim()) {
                            const trimmed = newCat.trim();
                            if (!categoryList.includes(trimmed)) {
                              setCustomCategories((prev) => [...prev, trimmed]);
                            }
                            setTemplateFolder(trimmed);
                          }
                        } else {
                          setTemplateFolder(val);
                        }
                      }}
                      className="text-xs bg-transparent text-zinc-800 dark:text-zinc-200 font-bold focus:outline-none cursor-pointer"
                      title="도메인 목록에서 선택"
                    >
                      <option value="" disabled>-- 도메인 선택 (필수) --</option>
                      {categoryList.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      {templateFolder.trim() && !categoryList.includes(templateFolder.trim()) && (
                        <option key={templateFolder.trim()} value={templateFolder.trim()}>
                          {templateFolder.trim()}
                        </option>
                      )}
                      <option value="__CUSTOM__">➕ 새 도메인 직접 추가...</option>
                    </select>
                  </div>

                  {isCreatingNew ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold animate-pulse">
                      ✨ 신규 작성 모드
                    </span>
                  ) : isCurrentUserTemplate ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                      사용자 템플릿
                    </span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                      시스템 공식 템플릿 (읽기 전용)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {feedbackMsg && (
                    <span className="text-xs font-semibold animate-in fade-in text-blue-600 dark:text-blue-400">
                      {feedbackMsg}
                    </span>
                  )}
                </div>
              </div>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="템플릿 이름 입력 (예: 시니어 큰글자 교정, 회의록 요약 등)..."
                className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 bg-transparent border-b border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 focus:border-blue-500 focus:outline-none transition py-1"
                autoFocus={isCreatingNew}
              />
            </div>

            {/* ── A. 템플릿 전체 프롬프트 원문 뷰어 (많은 내용을 시원하게 확인) ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span>📜</span>
                  <span>템플릿 전체 프롬프트 원문</span>
                  <span className="text-[11px] font-normal text-zinc-400">
                    ({currentPrompt.length.toLocaleString()}자)
                  </span>
                </label>
                <span className="text-[11px] text-zinc-400">
                  직접 수정 가능 · 아래 변수 폼과 자동 동기화
                </span>
              </div>
              <textarea
                rows={8}
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                placeholder="전체 프롬프트 원문 (작성 규칙, 지침, 템플릿 양식 등)..."
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/60 p-3.5 text-xs text-zinc-900 dark:text-zinc-100 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y max-h-[300px]"
              />
            </div>

            {/* ── B. 입력사항 (변수 및 사용자 데이터) 작성 폼 ── */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <span>✍️</span>
                  <span>템플릿 입력사항 작성</span>
                </label>
                <span className="text-[11px] text-zinc-400">
                  {detectedVariables.length > 0
                    ? `감지된 입력 변수: ${detectedVariables.length}개`
                    : '세부 입력 데이터를 기입하세요'}
                </span>
              </div>

              {/* 1) {{변수}}가 있는 경우: 각 변수별 개별 인풋 제공 */}
              {detectedVariables.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                  {detectedVariables.map((vName) => (
                    <div key={vName} className="space-y-1">
                      <label className="block text-xs font-bold text-blue-900 dark:text-blue-200">
                        {vName}
                      </label>
                      <input
                        type="text"
                        value={variables[vName] || ''}
                        onChange={(e) =>
                          setVariables((prev) => ({ ...prev, [vName]: e.target.value }))
                        }
                        placeholder={`${vName} 입력...`}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 2) 추가 입력 데이터 / 사용자 요구사항 작성 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  추가 고객 데이터 및 전달사항 (선택 기입)
                </label>
                <textarea
                  rows={4}
                  value={customUserInput}
                  onChange={(e) => setCustomUserInput(e.target.value)}
                  placeholder="예: 보고서 제목, 핵심 통계 수치, 타겟 독자, 특별 요구조건 등..."
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y"
                />
              </div>
            </div>

            {/* ── C. 최종 연동 프롬프트 미리보기 아코디언 ── */}
            <details className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-3">
              <summary className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer flex items-center justify-between select-none">
                <span className="flex items-center gap-1.5">
                  <span>👁️</span> 완성될 프롬프트 미리보기 ({computedFinalPrompt.length.toLocaleString()}자)
                </span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 group-open:rotate-180 transition">
                  ▼
                </span>
              </summary>
              <div className="mt-2.5 p-3 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 max-h-48 overflow-y-auto text-xs font-mono whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 leading-relaxed">
                {computedFinalPrompt}
              </div>
            </details>
          </main>
        </div>

        {/* ── 3. 하단 액션 버튼바 ── */}
        <footer className="shrink-0 px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            {isCreatingNew ? (
              <>
                <button
                  type="button"
                  disabled={saving || !templateFolder.trim() || !templateName.trim() || !currentPrompt.trim()}
                  onClick={() => void handleSave(false)}
                  title={!templateFolder.trim() ? '도메인을 선택하거나 입력해야 저장할 수 있습니다' : '새 템플릿으로 저장'}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition cursor-pointer disabled:opacity-40 shadow-xs flex items-center gap-1.5"
                >
                  <span>💾</span>
                  <span>{saving ? '저장 중…' : '새 템플릿 저장하기'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (allTemplates.length > 0) {
                      loadTemplateIntoView(allTemplates[0]);
                    }
                  }}
                  className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-400 transition cursor-pointer"
                >
                  작성 취소
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={startNewTemplate}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold transition cursor-pointer shadow-xs flex items-center gap-1"
                  title="새로운 템플릿 신규 작성"
                >
                  <span>➕</span>
                  <span>신규</span>
                </button>
                {onSaveTemplate && (
                  <>
                    {isCurrentUserTemplate && (
                      <button
                        type="button"
                        disabled={saving || !templateFolder.trim() || !templateName.trim() || !currentPrompt.trim()}
                        onClick={() => void handleSave(true)}
                        title={!templateFolder.trim() ? '도메인을 선택하거나 입력해야 저장할 수 있습니다' : '수정 사항 저장'}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-40 shadow-xs"
                      >
                        {saving ? '저장 중…' : '수정 저장'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={saving || !templateFolder.trim() || !templateName.trim() || !currentPrompt.trim()}
                      onClick={() => void handleSave(false)}
                      title={!templateFolder.trim() ? '도메인을 선택하거나 입력해야 복제할 수 있습니다' : '새 템플릿으로 복제'}
                      className="px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer disabled:opacity-40"
                    >
                      새 템플릿으로 복제
                    </button>
                  </>
                )}
                {isCurrentUserTemplate && onDeleteTemplate && (
                  <button
                    type="button"
                    disabled={deleting || saving}
                    onClick={() => void handleDelete()}
                    className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-bold text-rose-600 dark:text-rose-400 transition cursor-pointer disabled:opacity-40 flex items-center gap-1"
                    title="현재 선택된 사용자 템플릿 영구 삭제"
                  >
                    <span>🗑️ 템플릿 삭제</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!computedFinalPrompt.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            >
              <span>🚀 질의창에 적용하기</span>
            </button>
          </div>
        </footer>
      </div>

      {/* ── 4. 📁 [도메인(카테고리) 종합 관리 전용 다이얼로그] ── */}
      {isCategoryManagerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="프롬프트 템플릿 도메인 관리"
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCategoryManagerOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-150">
            {/* 상단 헤더 */}
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60">
              <div className="flex items-center gap-2">
                <span className="text-xl">📁</span>
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                    프롬프트 템플릿 도메인 관리
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    템플릿이 있는 도메인은 삭제할 수 없습니다. 먼저 템플릿을 삭제하거나 다른 도메인으로 이동해 주세요.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryManagerOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* 본문 콘텐츠 */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* 신규 도메인 추가 인풋 바 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  ➕ 새 도메인 만들기
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                    placeholder="새 도메인 이름 입력 (예: 소설 기획, 수필 창작 등)..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={!newCategoryInput.trim()}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-40 shrink-0"
                  >
                    추가
                  </button>
                </div>
              </div>

              {/* 현재 도메인 목록 */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-600 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
                  <span>등록된 도메인 ({categoryList.length}개)</span>
                  <span>템플릿 수 및 관리</span>
                </div>

                <div className="space-y-1.5">
                  {categoryList.map((cat) => {
                    const stats = categoryStats.get(cat) || { total: 0, userCount: 0, builtinCount: 0 };
                    const isEditing = editingCategory?.oldName === cat;
                    const isBuiltinOnly = stats.builtinCount > 0 && stats.userCount === 0;

                    return (
                      <div
                        key={cat}
                        className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 flex items-center justify-between gap-2"
                      >
                        {/* 좌측: 이름 (인라인 편집 지원) */}
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editingCategory.newName}
                                onChange={(e) =>
                                  setEditingCategory({ ...editingCategory, newName: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    void handleRenameCategory(cat, editingCategory.newName);
                                  } else if (e.key === 'Escape') {
                                    setEditingCategory(null);
                                  }
                                }}
                                autoFocus
                                className="w-full px-2 py-1 text-xs rounded-lg border border-blue-400 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => void handleRenameCategory(cat, editingCategory.newName)}
                                className="px-2 py-1 rounded-md bg-blue-600 text-white text-[11px] font-bold shrink-0 hover:bg-blue-700 transition"
                              >
                                저장
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCategory(null)}
                                className="px-2 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 text-[11px] text-zinc-500 shrink-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs">📁</span>
                              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                                {cat}
                              </span>
                              {cat === '미분류' && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                                  기본
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 우측: 템플릿 수치 및 관리 버튼 */}
                        {!isEditing && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* 통계 뱃지 */}
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
                              {stats.userCount > 0 ? `사용자 ${stats.userCount}개` : ''}
                              {stats.userCount > 0 && stats.builtinCount > 0 ? ' · ' : ''}
                              {stats.builtinCount > 0 ? `공식 ${stats.builtinCount}개` : ''}
                              {stats.total === 0 ? '0개' : ''}
                            </span>

                            {/* 관리 액션 */}
                            {isBuiltinOnly ? (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 font-medium"
                                title="시스템 내장 기본 도메인은 변경할 수 없습니다."
                              >
                                🔒 공식
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEditingCategory({ oldName: cat, newName: cat })}
                                  className="px-2 py-1 rounded-md text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition cursor-pointer"
                                  title="도메인 이름 일괄 변경"
                                >
                                  ✏️ 이름 변경
                                </button>
                                {cat !== '미분류' && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCategory(cat)}
                                    disabled={stats.total > 0 || saving || deleting}
                                    className="px-2 py-1 rounded-md text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                    title={stats.total > 0 ? `템플릿 ${stats.total}개를 먼저 삭제하거나 다른 도메인으로 이동해 주세요.` : '빈 도메인 삭제'}
                                  >
                                    🗑️ 삭제
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 하단 닫기 */}
            <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end bg-zinc-50 dark:bg-zinc-900/60">
              <button
                type="button"
                onClick={() => setIsCategoryManagerOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                관리 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
