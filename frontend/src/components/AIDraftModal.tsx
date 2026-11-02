// ====================================================================
// 📊 [OMD-MODAL-0002 ✅ FIXED] AIDraftModal.tsx
// 🎯 @KICK  : AI 초안 생성 및 에디토리얼 어시스턴트 모달
// 🛡️ @GUARD : Rule 1, Rule 2, Rule 7 (원트랜잭션 무결성 및 실패 시 클린 롤백), 실시간 단계별 진행 가시성
// 🚨 @PATCH : **2026-09-20** — [아이콘 디자인시스템 통합] lucide-react 직접 import 전체 제거, Icon 컴포넌트로 교체
// 🚨 @PATCH : **2026-09-16** — [문서 전체 모드 질문/요약 프롬프트 원본 통복제 방어 및 Auto-RAG 후보 식별자 호환성 보장]: 1) 질의/요약/일정안내 요청 시 원본 문서 통복사 및 사족 출력을 엄격히 금지하고 질문에 대응되는 핵심 정보만 정리·요약하여 답변하도록 프롬프트 지침 전면 개편 2) searchKnowledge limit 5건 상향 및 chunkId/id 상호 호환 식별자 병합 지원
// 🚨 @PATCH : **2026-09-16** — [AI 생성 단계별 실시간 진행(Generating Step) 표시 및 원트랜잭션 무결성 보장]:
//             1) 실시간 3단계 진행 표시: [1/3 지식 검색] ➔ [2/3 AI 모델 추론] ➔ [3/3 스트리밍 수신] 단계별 상태 텍스트를 상단 배너와 실행 버튼에 실시간 노출하여 대기 체감 및 가시성 대폭 향상
//             2) 원트랜잭션(All-or-Nothing) 클린 롤백: 중간 오류(429, 네트워크, 스트림 단절) 발생 시 불완전한 찌꺼기 텍스트를 즉시 비우고(setDraftResult('')) 정확한 한글 원인 및 해결책을 붉은색 배너로 명확히 표시
//             **2026-09-13** — [지식관리 기능 데스크톱 전용 전환]: KnowledgeAttachmentPalette 및 Auto-RAG/출처 각주 컨트롤을 isDesktop 전용으로 한정하여 웹 브라우저 AI 작성 UI 경량화 및 집중도 향상
//             **2026-09-13** — [출처 링크 일원화 및 본문 인라인 링크 결합]:
//             1) 출처 목록 포맷 일원화: 하단 출처 목록에서 불필요한 화살표와 중복 문서명([출처 N: 문서] ➔ [문서](...))을 제거하고 [출처 N: 문서명](<file:///...#L시작-L끝>) 단일 링크로 결합
//             2) 본문 인라인 출처 태그 링크화: 본문 내부의 [출처 N: ...] 태그에도 해당 청크의 파일 및 라인 앵커(<file:///...#L시작-L끝>)를 자동 결합하여 본문에서 즉시 출처 원문으로 점프 지원
//             **2026-09-12** — [지식 보관함 출처 고유 번호 부여([출처 N: 문서명]) 및 하단 1:1 매칭, 절대경로 마크다운 링크화]:
//             1) 본문 인라인 출처 번호화: 본문 서술 시 인용한 지식 자료 번호와 1:1 대응되는 [출처 N: 문서명] (예: [출처 1: 추석], [출처 2: ...]) 태그를 생성하도록 AI 프롬프트 규칙 고도화
//             2) 하단 출처 목록 1:1 번호 매칭 및 절대경로: 하단 출처 목록 항목을 1. [출처 1: 문서명] ➔ [문서명](<file:///절대경로#L시작-L끝>) 형식으로 결합하여 본문 인라인 태그와 완벽히 상호 매칭
//             3) 꺾쇠 포맷 적용: 경로에 공백/특수문자가 포함되어도 안전하도록 마크다운 링크를 <...>로 래핑
//             **2026-09-12** — [본문 인라인 출처 표기 의무화 및 문서 태그([출처: 문서명]) 표준화]:
//             1) 본문 인라인 출처 의무화: 지식 보관함(RAG)의 사실, 규격, 데이터를 본문에서 서술할 때마다 해당 문장 바로 뒤에 [출처: 문서명] 문서 태그를 필수로 삽입하도록 프롬프트 지침 전면 강화
//             2) 하단 출처 목록과 1:1 매칭: 하단 지식 출처 목록의 각 항목을 [출처: 문서명] ➔ [문서명](file:///...) 형식으로 정돈하여 본문 인라인 태그와 하단 원본 출처 목록 간의 직관적 상호 연계 보장
//             3) 환각 방어 강화: 참조 지식 0건 시 가상 [출처: ...] 태그 생성 차단 및 소거 필터링 적용
//             **2026-09-12** — [Auto-RAG 및 출처 각주 무조건 기본 OFF(false) 설정 및 연동]:
//             1) 모달 진입 시 및 작업 대상 범위 전환 시 Auto-RAG(isAutoRagEnabled)와 출처 각주 포함(includeCitations)을 무조건 기본 false(OFF)로 초기화하여 사용자가 명시적으로 켜기 전까지 비활성화 유지
//             2) Auto-RAG 스위치 ON 시 출처 각주 포함도 함께 자동으로 ON 되도록 동기화 연동 보장
//             3) 3대 RAG 세트 defaultExpanded={true} 전달로 모달 진입 시 접기/펼치기 대상 3개가 모두 펼쳐진 상태로 렌더링되도록 개선
//             **2026-09-12** — [현재 작업 중인 문서 100% 인식 보장, 에디팅 프롬프트 전면 개편, Auto-RAG 하이재킹 원천 방어 및 UX 시인성 강화]:
//             1) 현재 문서 인식 보장: '문서 전체' 모드 시 기존의 '양식만 참조하고 완전히 새 문서 작성/요약 금지' 프롬프트를 전면 폐기하고, 사용자의 현재 문서를 1순위 핵심 본문으로 인식하여 수정·보완·교정·확장·요약하도록 지침 전면 개편
//             2) Gemini 플래그십(3.8/3.7/3.6/3.5) 및 최신 오픈 모델 Gemma 4(gemma-4-31b-it, gemma-4-26b-a4b-it) 반영
//             3) 동적 모델 탐색: fetchGoogleAIStudioModels 연동으로 API 키를 통한 Google AI Studio 실시간 모델 목록 동적 주입
//             4) 구버전 저장 모델 자동 정규화(normalizeAIModelName) 및 오류 진단 추천 모델(Gemini 3.8/3.7 Flash) 갱신
//             **2026-09-12** — [하단 선택기 라벨 간소화: '제조사:', '모델:' 텍스트 제거 및 컴팩트 드롭다운 정돈]
//             1) 사용자 UX 피드백 반영: 하단 드롭다운 선택기 내부의 불필요한 '제조사:', '모델:' 텍스트 라벨을 전면 제거하여 모던하고 슬림한 버튼 형태로 정돈
//             **2026-09-12** — [가상 출처 환각 전면 차단 및 내부 시스템 출처만 단일 공급원(SSOT) 결합 보장]
//             1) AI가 임의로 '참고 자료 및 출처' 섹션이나 가상 파일 경로(file:///...)를 날조하지 못하도록 프롬프트 금지 규칙을 엄격히 지정
//             2) 생성 완료 후 stripHallucinatedCitations 정규식 필터링을 통해 AI가 임의로 덧붙인 모든 후행 출처 섹션 및 가상 링크를 100% 무조건 박멸
//             3) 오직 실제 내부 지식 보관함에서 검색/첨부된 청크(activeKnowledge)가 존재하고 '출처 각주 포함' 옵션이 활성화된 경우에만 시스템 프로그램이 검증된 실제 내부 지식 출처 마크다운 블록을 단일 공급원(SSOT)으로 결합
//             4) 지식 참조가 0건이거나 출처 옵션 해제 시 어떠한 참고자료나 출처 블록도 일체 노출되지 않도록 철저히 통제
//             **2026-09-12** — [하단 액션바 UI 정돈: 초기화·에디터 이동 제거 및 AI 제조사(Provider)/모델 듀얼 선택기 복원]
//             1) AI 실행 버튼 좌측에 위치했던 불필요한 '초기화' 및 '에디터 이동' 버튼을 전면 제거하여 하단 바 공간 확보 및 실행 집중도 강화
//             2) AI 서비스 제조사(Google Gemini, Google Gemma, 직접 입력)와 세부 모델을 연동하여 고를 수 있는 듀얼 선택기 탑재
// ====================================================================
"use client";

import { useModalEscape } from '@/hooks/useModalEscape';
import {RECOMMENDED_MODELS,compareRecommendedModels} from '@/lib/ai/recommendedModels';
import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { getEffectiveResourceFolder } from '@/lib/profileStorage';
import { readResourceJson, writeResourceJson } from '@/lib/resourceJson';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '@/components/icons/Icon';
import { useToast } from '@/components/ToastProvider';
import { getPromptTemplates, savePromptTemplates, getPromptTemplate, PromptTemplate } from '@/lib/promptTemplates';
import { generateDraftWithAIStream, formatUserFriendlyAIError, FormattedAIError, ONRIVI_AI_MODELS, DEFAULT_AI_MODEL, fetchGoogleAIStudioModels, getCachedAIModels, normalizeAIModelName } from '@/lib/gemini';
import AIPromptLibrary from './AIPromptLibrary';
import { KnowledgeAttachmentPalette } from './knowledge/KnowledgeAttachmentPalette';
import { knowledgeClient } from '@/lib/knowledge/knowledgeClient';
import { loadSecureData } from '@/lib/secureStorage';
import type { RetrievalCandidate } from '@/types/knowledge';

export interface AIModelItem {
  id: string;
  label: string;
  badge?: string;
  desc?: string;
}

export interface AIProviderItem {
  id: 'google-gemini' | 'google-gemma' | 'custom';
  name: string;
  vendor: string;
  badge?: string;
  models: AIModelItem[];
}

export const AI_PROVIDERS: AIProviderItem[] = [
  {
    id: 'google-gemini',
    name: 'Google (Gemini)',
    vendor: 'Google',
    models: [
      { id: 'gemini-4-argon', label: 'Gemini 4 Argon' },
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', badge: '추천' },
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite' },
    ]
  },
  {
    id: 'google-gemma',
    name: 'Google (Gemma)',
    vendor: 'Google',
    models: [
      { id: 'gemma-4-31b-it', label: '💎 Gemma 4 31B IT (Google DeepMind 256K 플래그십)', badge: '신규' },
      { id: 'gemma-4-26b-a4b-it', label: '💎 Gemma 4 26B A4B IT (MoE 경량 고처리량)', badge: '신규' },
    ]
  },
  {
    id: 'custom',
    name: '직접 입력 (Custom)',
    vendor: 'Custom',
    models: []
  }
];

function inferProviderFromModel(modelName: string): AIProviderItem['id'] {
  if (!modelName) return 'google-gemini';
  if (modelName.startsWith('gemma')) return 'google-gemma';
  if (modelName.startsWith('gemini-')) return 'google-gemini';
  return 'custom';
}

interface AIDraftModalProps {
  onClose: () => void;
  onApply: (content: string, action: 'insert' | 'replace' | 'append', scope: 'selection' | 'document' | 'none') => void;
  geminiApiKey: string;
  aiModelName: string;
  onModelChange?: (model: string) => void;
  editorContext?: {
    selectedText: string;
    fullText: string;
  };
  initialMode?: 'draft' | 'editorial';
  resourceFolder?: string;
  resourceFolderHandle?: any;
  rootFolder?: any;
}

interface AIPreset {
  id: string;
  name: string;
  // Legacy fields for backwards compatibility during migration
  mode?: 'draft' | 'editorial';
  domainId?: string;
  docType?: string;
  systemPrompt?: string;
  userPrompt?: string;
  
  // Unified fields
  editorialCommand: string;
  targetScope?: 'selection' | 'document' | 'none';
  folder?: string;
}


export default function AIDraftModal({ 
  onClose, 
  onApply, 
  geminiApiKey, 
  aiModelName,
  onModelChange,
  editorContext,
  initialMode = 'draft',
  resourceFolder,
  resourceFolderHandle,
  rootFolder
}: AIDraftModalProps) {
  useModalEscape(true, onClose);
  const { showToast } = useToast();

  const effectiveResourceFolder = getEffectiveResourceFolder();
  const effectiveResourceFolderHandle = resourceFolderHandle;

  const isDesktop = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return !!(window as any).electronAPI ||
      navigator.userAgent.toLowerCase().includes('electron') ||
      new URLSearchParams(window.location.search).get('env') === 'desktop';
  }, []);

  const [currentModel, setCurrentModel] = useState<string>(() => {
    const raw = aiModelName || (typeof window !== 'undefined' ? localStorage.getItem('onrivi_ai_model_name') || '' : '') || DEFAULT_AI_MODEL;
    return normalizeAIModelName(raw);
  });
  const [selectedProviderId, setSelectedProviderId] = useState<AIProviderItem['id']>(() => {
    const raw = aiModelName || (typeof window !== 'undefined' ? localStorage.getItem('onrivi_ai_model_name') || '' : '') || DEFAULT_AI_MODEL;
    return inferProviderFromModel(normalizeAIModelName(raw));
  });
  const [formattedError, setFormattedError] = useState<FormattedAIError | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // 구글 AI 스튜디오 동적 모델 목록 캐시 및 실시간 동기화
  const [providers, setProviders] = useState<AIProviderItem[]>(() => {
    const cached = getCachedAIModels();
    if (cached && cached.length > 0) {
      const geminiList: AIModelItem[] = [];
      const gemmaList: AIModelItem[] = [];
      cached.filter(m=>RECOMMENDED_MODELS.some(row=>row.provider==='google'&&row.id===m.id)).sort(compareRecommendedModels).forEach(m => {
        if (m.id.startsWith('gemma-')) {
          gemmaList.push({ id: m.id, label: m.label, badge: m.badge, desc: m.desc });
        } else {
          geminiList.push({ id: m.id, label: m.label, badge: m.badge, desc: m.desc });
        }
      });
      return [
        { id: 'google-gemini', name: 'Google (Gemini)', vendor: 'Google', models: geminiList.length > 0 ? geminiList : AI_PROVIDERS[0].models },
        { id: 'google-gemma', name: 'Google (Gemma)', vendor: 'Google', models: gemmaList.length > 0 ? gemmaList : AI_PROVIDERS[1].models },
        { id: 'custom', name: '직접 입력 (Custom)', vendor: 'Custom', models: [] }
      ];
    }
    return AI_PROVIDERS;
  });

  useEffect(() => {
    if (geminiApiKey) {
      fetchGoogleAIStudioModels(geminiApiKey).then((dynamicModels) => {
        if (dynamicModels && dynamicModels.length > 0) {
          const geminiList: AIModelItem[] = [];
          const gemmaList: AIModelItem[] = [];
          dynamicModels.filter(m=>RECOMMENDED_MODELS.some(row=>row.provider==='google'&&row.id===m.id)).sort(compareRecommendedModels).forEach(m => {
            if (m.id.startsWith('gemma-')) {
              gemmaList.push({ id: m.id, label: m.label, badge: m.badge, desc: m.desc });
            } else {
              geminiList.push({ id: m.id, label: m.label, badge: m.badge, desc: m.desc });
            }
          });
          setProviders([
            { id: 'google-gemini', name: 'Google (Gemini)', vendor: 'Google', models: geminiList.length > 0 ? geminiList : AI_PROVIDERS[0].models },
            { id: 'google-gemma', name: 'Google (Gemma)', vendor: 'Google', models: gemmaList.length > 0 ? gemmaList : AI_PROVIDERS[1].models },
            { id: 'custom', name: '직접 입력 (Custom)', vendor: 'Custom', models: [] }
          ]);
        }
      }).catch(() => {});
    }
  }, [geminiApiKey]);

  useEffect(() => {
    if (aiModelName) {
      const clean = normalizeAIModelName(aiModelName);
      setCurrentModel(clean);
      setSelectedProviderId(inferProviderFromModel(clean));
    }
  }, [aiModelName]);

  const currentProviderModels = useMemo(() => {
    const prov = providers.find(p => p.id === selectedProviderId);
    return prov ? prov.models : [];
  }, [providers, selectedProviderId]);

  const handleProviderSelect = (providerId: AIProviderItem['id']) => {
    setSelectedProviderId(providerId);
    setFormattedError(null);
    setLastError(null);

    const targetProv = providers.find(p => p.id === providerId);
    if (targetProv && targetProv.models.length > 0) {
      const firstModel = targetProv.models[0].id;
      handleModelSelect(firstModel);
    }
  };

  const handleModelSelect = (newModel: string) => {
    setCurrentModel(newModel);
    setSelectedProviderId(inferProviderFromModel(newModel));
    setFormattedError(null);
    setLastError(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('onrivi_ai_model_name', newModel);
        const raw = localStorage.getItem('onrivi_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.aiModelName = newModel;
          localStorage.setItem('onrivi_settings', JSON.stringify(parsed));
        }
      } catch {}
    }
    onModelChange?.(newModel);
  };
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSavingPrompts, setIsSavingPrompts] = useState(false);
  const [presets, setPresets] = useState<AIPreset[]>([]);
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  
  const [showLibrary, setShowLibrary] = useState(false);
  const [templatesDict, setTemplatesDict] = useState<Record<string, Record<string, PromptTemplate>>>({});

  // Preset Saving State
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [presetFolderInput, setPresetFolderInput] = useState('');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState<string>('');
  const [loadedPresetName, setLoadedPresetName] = useState<string>('');
  const [loadedPresetFolder, setLoadedPresetFolder] = useState<string>('');

  // Existing folders list for preset categorization
  const existingFolders = useMemo(() => {
    const folderSet = new Set<string>();
    presets.forEach(p => {
      if (p.folder && p.folder.trim()) folderSet.add(p.folder.trim());
    });
    Object.keys(templatesDict || {}).forEach(domain => {
      if (domain && domain.trim()) folderSet.add(domain.trim());
    });
    return Array.from(folderSet).sort((a, b) => a.localeCompare(b));
  }, [presets, templatesDict]);

  // Editorial Command State
  const [editorialCommand, setEditorialCommand] = useState('');
  const [targetScope, setTargetScope] = useState<'selection' | 'document' | 'none'>(() => {
    if (editorContext?.selectedText && editorContext.selectedText.trim()) return 'selection';
    if (editorContext?.fullText && editorContext.fullText.trim()) return 'document';
    return 'none';
  });

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState<'idle' | 'rag' | 'prompt' | 'stream'>('idle');
  const [draftResult, setDraftResult] = useState('');
  const [generationComplete, setGenerationComplete] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);
  
  // 🧠 [ONRIVI-KNOWLEDGE-INTEGRATION] 로컬 지식 보관함 RAG 연동 상태
  const [attachedKnowledgeChunks, setAttachedKnowledgeChunks] = useState<RetrievalCandidate[]>([]);
  // 🌟 [사용자 요구사항]: 디폴트는 지식 보관함 자동 참조(Auto-RAG) 및 출처 각주 포함 모두 OFF(false)
  const [isAutoRagEnabled, setIsAutoRagEnabled] = useState<boolean>(false);
  const [includeCitations, setIncludeCitations] = useState<boolean>(false);
  const [citedSources, setCitedSources] = useState<RetrievalCandidate[]>([]);

  // 작업 대상 범위 변경 핸들러: 범위 전환 시에도 Auto-RAG 및 각주는 기본 OFF 유지 (사용자가 필요 시 명시적 ON)
  const handleScopeChange = (newScope: 'selection' | 'document' | 'none') => {
    setTargetScope(newScope);
    setIsAutoRagEnabled(false);
    setIncludeCitations(false);
  };

  // File Attachment State
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFileContent, setAttachedFileContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const previewRef = useRef<HTMLDivElement>(null);
  const presetContainerRef = useRef<HTMLDivElement>(null);

  // Click outside to close preset dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (presetContainerRef.current && !presetContainerRef.current.contains(event.target as Node)) {
        setShowPresetDropdown(false);
        setIsSavingPreset(false);
        setShowFolderDropdown(false);
      }
    };
    if (showPresetDropdown || isSavingPreset) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPresetDropdown, isSavingPreset]);


  useEffect(() => {
    async function load() {
      const templates = await getPromptTemplates(resourceFolder, resourceFolderHandle);
      setTemplatesDict(templates);
      const options = Object.keys(templates).map(domain => ({
        id: domain,
        label: domain,
        docTypes: Object.keys(templates[domain])
      }));
    }
    void load().catch((error:any)=>showToast(error.message,'error'));
  // resourceFolder, resourceFolderHandle가 변경될 때 (e.g. 사용자가 폴더를 새로 선택) 템플릿을 다시 로드해야 함
  }, [resourceFolder, resourceFolderHandle, showToast]);

  // Load presets on mount
  useEffect(() => {
    async function loadPresets() {
      try { const saved=await readResourceJson('ai_presets.json',resourceFolderHandle);if(Array.isArray(saved))setPresets(saved); }catch(e:any){showToast(e.message,'error');}
    }
    loadPresets();
  // resourceFolderHandle이 변경될 때도 프리셋을 다시 로드해야 함
  }, [resourceFolder, resourceFolderHandle, showToast]);

  // Auto-Save Drafts logic
  const AI_DRAFT_CACHE_KEY = 'omd_ai_draft_cache';

  useEffect(() => {
    // [OMD-EDIT-AI] AI 모달 열릴 때 무조건 초기화 (캐시 로드 방지)
    localStorage.removeItem(AI_DRAFT_CACHE_KEY);
  }, []);

  useEffect(() => {
    const data = {
      editorialCommand,
      targetScope
    };
    localStorage.setItem(AI_DRAFT_CACHE_KEY, JSON.stringify(data));
  }, [editorialCommand, targetScope]);

  // Set default targetScope if no selection
  useEffect(() => {
    if (!editorContext?.selectedText && targetScope === 'selection') {
      handleScopeChange('document');
    }
  }, [editorContext, targetScope]);


  // Auto-scroll the preview div as result streams in
  useEffect(() => {
    if (previewRef.current && isGenerating) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [draftResult, isGenerating]);



  const handleSavePresetClick = () => {
    setIsSavingPreset(true);
    setShowFolderDropdown(false);
    setPresetNameInput(loadedPresetName || '');
    setPresetFolderInput(loadedPresetFolder || '');
    setShowPresetDropdown(false);
  };

  const handleConfirmSavePreset = () => {
    if (!presetNameInput.trim()) {
      showToast("라이브러리 이름을 입력해주세요.", "warning");
      return;
    }

    const trimmedName = presetNameInput.trim();
    const trimmedFolder = presetFolderInput.trim();
    const existingIndex = presets.findIndex(p => p.name === trimmedName);
    let updated;
    if (existingIndex !== -1) {
      const updatedPreset: AIPreset = {
        ...presets[existingIndex],
        editorialCommand,
        targetScope,
        name: trimmedName,
        folder: trimmedFolder || undefined
      };
      updated = [...presets];
      updated[existingIndex] = updatedPreset;
    } else {
      const newPreset: AIPreset = {
        id: Date.now().toString(),
        name: trimmedName,
        editorialCommand,
        targetScope,
        folder: trimmedFolder || undefined
      };
      updated = [...presets, newPreset];
    }
    void writeResourceJson('ai_presets.json',updated,resourceFolderHandle).then(result=>{
      if(result.success){setPresets(updated);showToast('라이브러리를 저장했습니다.','success');}
      else showToast(result.error || '라이브러리 저장 실패','error');
      setIsSavingPreset(false);setShowFolderDropdown(false);
    });
  };

  const handleCancelSavePreset = () => {
    setIsSavingPreset(false);
    setShowFolderDropdown(false);
    setPresetNameInput('');
  };

  const handleSelectTemplate = (domain: string, docType: string, template: PromptTemplate) => {
    const combinedCommand = `[작성 규칙]\n${template.systemPrompt}\n\n[입력 데이터]\n${template.userInputTemplate}`;
    setEditorialCommand(combinedCommand);
    setTargetScope('document');
    setShowLibrary(false);
    setLoadedPresetName(docType);
    setLoadedPresetFolder(domain);
    showToast("템플릿을 불러왔습니다.", "success");
  };

  const handleLoadPreset = (preset: AIPreset) => {
    setLoadedPresetName(preset.name);
    setLoadedPresetFolder(preset.folder || '');
    if (preset.mode === 'draft' || preset.systemPrompt || preset.userPrompt) {
      // Legacy preset migration on load
      const combined = `[작성 규칙]\n${preset.systemPrompt || ''}\n\n[입력 데이터]\n${preset.userPrompt || ''}`;
      setEditorialCommand(combined.trim());
      handleScopeChange('document');
    } else {
      setEditorialCommand(preset.editorialCommand || '');
      handleScopeChange(preset.targetScope || 'selection');
    }
    setShowPresetDropdown(false);
    setShowLibrary(false);
    showToast("라이브러리를 불러왔습니다.", "success");
  };

  const handleDeletePreset = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = presets.filter(p => p.id !== id);
    void writeResourceJson('ai_presets.json',updated,resourceFolderHandle).then(result=>{
      if(result.success){setPresets(updated);showToast('라이브러리를 저장했습니다.','success');}
      else showToast(result.error || '라이브러리 저장 실패','error');
      setIsSavingPreset(false);setShowFolderDropdown(false);
    });
  };

  const handleStartRename = (e: React.MouseEvent, p: AIPreset) => {
    e.stopPropagation();
    setEditingPresetId(p.id);
    setEditingPresetName(p.name);
  };

  const handleSaveRename = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!editingPresetName.trim()) {
      showToast("이름을 입력해주세요.", "warning");
      return;
    }
    renamePreset(id, editingPresetName.trim());
    setEditingPresetId(null);
    setEditingPresetName('');
  };

  const renamePreset = (id: string, newName: string) => {
    const updated = presets.map(p => p.id === id ? { ...p, name: newName } : p);
    
    void writeResourceJson('ai_presets.json',updated,resourceFolderHandle).then(result=>{
      if(result.success){setPresets(updated);showToast('라이브러리를 저장했습니다.','success');}
      else showToast(result.error || '라이브러리 저장 실패','error');
      setIsSavingPreset(false);setShowFolderDropdown(false);
    });
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPresetId(null);
    setEditingPresetName('');
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setAttachedFileContent(text);
      setAttachedFileName(file.name);
      showToast(`${file.name} 파일이 첨부되었습니다.`, "success");
    };
    reader.onerror = () => {
      showToast("파일을 읽는 중 오류가 발생했습니다.", "error");
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = () => {
    setAttachedFileName('');
    setAttachedFileContent('');
  };

  const handleCopyResult = async () => {
    try {
      await navigator.clipboard.writeText(draftResult);
      setAiCopied(true);
      showToast("AI 생성 결과가 클립보드에 복사되었습니다.", "success");
      setTimeout(() => setAiCopied(false), 2000);
    } catch (err) {
      showToast("클립보드 복사 실패", "error");
    }
  };

  const handleGenerate = async (overrideModel?: string) => {
    if (!geminiApiKey) {
      showToast("설정에서 Gemini API 키를 먼저 등록해주세요.", "warning");
      onClose();
      return;
    }

    // Google AI Studio (Gemini / Gemma / Custom) 전용 실행

    const targetModel = overrideModel || currentModel || DEFAULT_AI_MODEL;
    if (overrideModel && overrideModel !== currentModel) {
      handleModelSelect(overrideModel);
    }
    setFormattedError(null);
    setLastError(null);

    if (!editorialCommand.trim()) {
      showToast("AI에게 전달할 명령 또는 초안 주제를 입력해주세요.", "warning");
      return;
    }

    setIsGenerating(true);
    setGeneratingStep(isAutoRagEnabled ? 'rag' : 'prompt');
    setDraftResult('');
    setGenerationComplete(false);
    setCitedSources([]); // 🌟 [화면 즉각 초기화] 이전 실행의 지식 출처 요약 배너를 즉각 비워 새로운 추출 준비

    // 🧠 [ONRIVI-KNOWLEDGE-INTEGRATION] 지식 보관함 연동 및 Auto-RAG 처리
    let activeKnowledge: RetrievalCandidate[] = [...attachedKnowledgeChunks];

    // Auto-RAG 지식 검색 수행:
    // 사용자가 '지식 보관함 자동 참조 (Auto-RAG)'를 활성화(ON)한 경우 지식 보관함에서 검색을 수행합니다.
    // 문서 전체/선택 영역 작업 시에도 사용자가 필요에 의해 RAG를 켰다면 관련 지식을 검색하여 보조 자료로 주입합니다.
    if (isAutoRagEnabled) {
      try {
        const searchData = await knowledgeClient.searchKnowledge({
          query: editorialCommand.trim(),
          resourceFolder: effectiveResourceFolder,
          resourceFolderHandle: effectiveResourceFolderHandle,
          limit: 5,
          geminiApiKey,
          aiModelName: targetModel,
        });
        if (searchData && Array.isArray(searchData.candidates) && searchData.candidates.length > 0) {
          // 기존 수동 첨부 청크와 중복되지 않도록 병합 (최대 5건 유지)
          const existingIds = new Set(activeKnowledge.map(k => k.chunkId || (k as any).id));
          const newCandidates = searchData.candidates
            .map(c => ({
              ...c,
              chunkId: c.chunkId || (c as any).id,
              documentTitle: c.documentTitle || (c as any).doc_title || c.headingTitle,
              snippet: c.snippet || (c as any).chunk_text || (c as any).chunk_summary || '',
            }))
            .filter(c => !existingIds.has(c.chunkId));
          activeKnowledge = [...activeKnowledge, ...newCandidates].slice(0, 5);
        }
      } catch (err) {
        console.warn('[AIDraftModal] Auto-RAG 검색 폴백 실패:', err);
      }
    }

    setCitedSources(activeKnowledge);
    setGeneratingStep('prompt');

    // 문서 상단 메타정보(YAML Frontmatter, JSDoc/HTML 주석) 제거 헬퍼
    const stripFrontmatterAndMeta = (text: string): string => {
      if (!text) return '';
      let clean = text.trim();
      if (clean.startsWith('---')) {
        clean = clean.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
      }
      if (clean.startsWith('/**')) {
        clean = clean.replace(/^\/\*\*[\s\S]*?\*\/\r?\n?/, '');
      }
      if (clean.startsWith('<!--')) {
        clean = clean.replace(/^<!--[\s\S]*?-->\r?\n?/, '');
      }
      return clean.trim();
    };

    let finalSystemPrompt = "당신은 전문적이고 논리적인 고품격 마크다운 작가이자 에디터입니다. 지시사항을 정확하게 반영하여 실용적이고 완성도 높은 한국어 마크다운 문서를 작성하십시오.";
    
    // 메타정보 추출 금지 공통 원칙
    finalSystemPrompt += `\n\n[핵심 금지 규칙: 메타정보 추출 및 출력 절대 금지]
1. 원본 문서나 참고 자료 상단의 메타데이터(YAML Frontmatter \`--- ... ---\`, 제목/작성자/일자 메타 속성, 헤더 주석 등)는 절대로 추출하거나 결과물 상단에 포함하지 마십시오.
2. 결과물은 메타정보 없이 마크다운 본문(제목 헤딩 # 또는 첫 도입 단락)부터 곧바로 시작해야 합니다.`;

    let finalUserPrompt = editorialCommand;

    if (targetScope === 'selection' && editorContext?.selectedText && editorContext.selectedText.trim()) {
      const cleanSelection = stripFrontmatterAndMeta(editorContext.selectedText);
      finalSystemPrompt += `\n\n[선택 영역 텍스트 기반 작업 지침]
당신은 사용자가 선택한 [대상 영역 텍스트]를 정확하게 이해하고, 사용자의 [작업 명령]에 따라 수정, 보완, 교정, 개선, 번역 또는 확장하는 전문 에디터입니다.
- 제공된 [대상 영역 텍스트]의 맥락과 문맥을 충실히 반영하여 결과물을 작성하십시오.
- 불필요한 서론이나 사족 없이 교정/수정 완료된 마크다운 텍스트 결과물만 제공하십시오.`;
      finalUserPrompt = `[대상 영역 텍스트]\n${cleanSelection}\n\n[사용자 작업 명령]\n${editorialCommand}\n\n위 [대상 영역 텍스트]의 내용을 정확히 인식하고 바탕으로 삼아, [사용자 작업 명령]을 충실히 반영한 완성도 높은 마크다운 텍스트를 작성해 주세요.`;
    } else if (targetScope === 'document' && editorContext?.fullText && editorContext.fullText.trim()) {
      const cleanDoc = stripFrontmatterAndMeta(editorContext.fullText);
      finalSystemPrompt += `\n\n[현재 작업 문서 기반 에디팅 및 집필 지침]
당신은 사용자가 현재 열어두고 집필 중인 [현재 편집 중인 문서 원본]을 바탕으로 삼아, 사용자의 [작업 명령]을 수행하는 전문 마크다운 에디터입니다.
1. [현재 편집 중인 문서 원본]의 실제 텍스트, 목차, 문맥, 주제 및 사실관계를 가장 먼저 정확히 정독하고 파악하십시오.
2. [단순 원본 본문 복제/반복 출력 절대 금지]: 사용자의 [작업 명령]이 질문 답변, 요약, 핵심 정리, 일정/현황 안내인 경우 원본 문서를 통째로 복사하거나 사족, 이미지 프롬프트 등을 그대로 앵무새처럼 출력하지 마십시오. 질문에 직접 대응되는 핵심 정보와 팩트를 일목요연하게 요약·정리하여 완성된 답변을 작성하십시오.
3. 사용자의 [작업 명령]이 오탈자 검수, 문체 다듬기, 추가 작성, 특정 섹션 수정/보강 등인 경우에만 [현재 편집 중인 문서 원본]의 내용을 바탕으로 해당 작업을 온전히 적용하십시오.
4. 사족이나 불필요한 메타 설명 없이, 요청된 작업이 온전히 적용된 마크다운 결과물을 제공하십시오.`;
      finalUserPrompt = `[현재 편집 중인 문서 원본]\n${cleanDoc}\n\n[사용자 작업 명령]\n${editorialCommand}\n\n위 [현재 편집 중인 문서 원본]의 내용과 보조 참고 지식을 종합하여, [사용자 작업 명령]에 맞게 핵심 내용을 명확히 정리·요약하거나 수정·보완한 완성도 높은 마크다운 텍스트를 작성해 주세요. (단순한 원본 본문 복제가 아닌, 사용자의 질문과 지시사항을 정확하게 해결하는 정리된 결과물을 출력하십시오.)`;
    }

    if (attachedFileContent) {
      const cleanAttached = stripFrontmatterAndMeta(attachedFileContent);
      finalUserPrompt += `\n\n[첨부 문서 내용: ${attachedFileName}]\n${cleanAttached}`;
    }

    // 🧠 지식 청크 컨텍스트 주입 및 출처 표기 규칙 강화
    if (activeKnowledge.length > 0) {
      const knowledgeContextBlocks = activeKnowledge.map((c, idx) => {
        const title = c.documentTitle || c.headingTitle;
        const path = c.headingPath || c.headingTitle;
        const lineInfo = `L${c.startLine}~L${c.endLine}`;
        const snippet = stripFrontmatterAndMeta(c.snippet || '');
        return `[참고 지식 자료 ${idx + 1}]
- 문서명: ${title}
- 상세 섹션(경로): ${path}
- 원본 파일: ${c.filePath} (${lineInfo})
- 발췌 내용:
${snippet}`;
      }).join('\n\n---\n\n');

      const sampleDocTitle = activeKnowledge[0]?.documentTitle || activeKnowledge[0]?.headingTitle || '문서명';

      if (targetScope === 'document' || targetScope === 'selection') {
        // 본문 작업 중 지식 보관함은 보조 참고 자료로 주입하여 현재 문서 내용이 주인이 되도록 보장
        finalUserPrompt += `\n\n[보조 참고 지식 자료 (보충/팩트 체크용)]\n${knowledgeContextBlocks}\n\n위 [보조 참고 지식 자료]는 필요한 경우에만 팩트 확인, 기술 규격 보완 또는 보충 설명 자료로만 참고하십시오. 작업의 최우선 기준은 [현재 편집 중인 문서 원본] 및 사용자의 [작업 명령]입니다. 지식 자료의 사실이나 데이터를 인용·보강한 문장 바로 뒤에는 반드시 [출처 N: 문서명] (예: [출처 1: ${sampleDocTitle}]) 형태처럼 해당 참고 지식 자료 번호(N)가 포함된 문서 태그를 표기하십시오. 단, 글의 마지막에 '참고 자료'나 '출처' 목록 섹션을 절대로 직접 작성하지 마십시오.`;
        finalSystemPrompt += `\n\n[보조 지식 자료 활용 및 본문 인라인 출처 태그 규칙]
1. 제공된 [보조 참고 지식 자료]는 사실 관계 검증이나 보충 정보로만 보조적으로 활용하십시오.
2. 작업의 중심은 사용자의 [현재 편집 중인 문서 원본] 또는 [대상 영역 텍스트]이며, 외래 지식이 문서의 본래 내용이나 맥락을 덮어쓰거나 왜곡해서는 안 됩니다.
3. [본문 내 문서 태그 형태의 출처 번호 표기 (필수)]: 지식 자료의 사실, 규격, 데이터를 본문에 인용하거나 보완 서술한 문장 바로 뒤에는 반드시 [출처 N: 문서명] (예: [출처 1: ${sampleDocTitle}]) 형태처럼 인용한 [참고 지식 자료 N]의 번호와 문서명을 함께 삽입하십시오.
4. [출처 목록 섹션 직접 작성 절대 금지]: 본문 끝에 '## 참고 자료', '## 출처', '## 참고문헌', 'References' 등의 출처 목록 섹션을 절대로 직접 작성하지 마십시오.`;
      } else {
        finalUserPrompt += `\n\n[참고 지식 문서 컨텍스트 (Knowledge Base Evidence)]\n${knowledgeContextBlocks}\n\n[출처 표기 필수 원칙] 위의 [참고 지식 문서 컨텍스트]를 최우선 근거로 활용하여 글을 작성하십시오. 본문에서 지식 자료의 사실이나 내용을 서술한 문장 바로 뒤에는 반드시 [출처 N: 문서명] (예: [출처 1: ${sampleDocTitle}]) 형태처럼 인용한 [참고 지식 자료 N]의 번호가 포함된 문서 태그를 명시하십시오. 단, 글의 마지막에 '참고 자료'나 '출처' 목록 섹션을 절대로 직접 작성하지 마십시오. (시스템 엔진이 검증된 실제 내부 출처 링크를 하단에 번호별로 자동 결합합니다.)`;
        finalSystemPrompt += `\n\n[지식 자료 추출 및 본문 인라인 출처 태그 규칙]
1. 당신에게 제공된 [참고 지식 문서 컨텍스트]는 신뢰할 수 있는 단일 진실 공급원(Single Source of Truth)입니다. 지식 자료의 사실, 정책, 기술 규격 및 상세 정보를 우선적으로 반영하여 작성하십시오. 불필요한 날조나 왜곡(Hallucination)은 엄격히 금지됩니다.
2. [본문 내 문서 태그 형태의 출처 번호 표기 (필수)]: 본문 작성 중 특정 지식 자료의 사실, 규격, 정책, 데이터, 통계 등을 서술할 때마다, 해당 문장(또는 단락) 바로 뒤에 반드시 [출처 N: 문서명] (예: [출처 1: ${sampleDocTitle}]) 형태처럼 인용한 [참고 지식 자료 N]의 번호(N)와 문서명을 정확히 삽입하십시오.
3. [출처 목록 섹션 직접 작성 절대 금지]: 본문 끝에 '## 참고 자료', '## 출처', '## 참고문헌', 'References' 등의 출처 목록 섹션을 절대로 직접 작성하지 마십시오. 검증된 실제 내부 지식 보관함 출처는 시스템에 의해 하단에 [출처 N: 문서명] 태그와 연계되어 안전하게 자동 결합됩니다.`;
      }
    } else {
      // 🛡️ [환각 방어] 참조된 실제 지식 문서가 없는 경우, AI가 가상의 파일명이나 출처 링크를 날조(Hallucination)하지 못하도록 원천 차단
      finalSystemPrompt += `\n\n[가상 출처 날조 절대 금지 규칙]
현재 작성 중인 작업에는 외부/내부 지식 보관함 문서가 주입되지 않았습니다(참조 문서 0건).
존재하지 않는 가상의 문서명, 가상의 파일 경로(file:///...), 가상의 출처 태그([출처: ...] 또는 [출처 N: ...]), 가상의 각주, 또는 '참고 자료 및 출처'/'References' 섹션을 절대로 지어내거나 포함하지 마십시오. 어떠한 참고자료나 출처 태그/목록도 생성하지 말고, 오직 순수한 본문 콘텐츠만 완성도 있게 작성하십시오.`;
    }

    try {
      setGeneratingStep('stream');
      const generated = await generateDraftWithAIStream(
        geminiApiKey,
        targetModel,
        finalSystemPrompt,
        finalUserPrompt,
        (chunkText) => {
          setDraftResult(chunkText);
        }
      );

      // 🧹 [출처 환각 완벽 차단] AI 모델이 임의로 생성하거나 날조한 후행 출처/참고자료 섹션을 정규식으로 완벽 제거
      const stripHallucinatedCitations = (text: string): string => {
        if (!text) return '';
        let cleaned = text;

        // 1. 후행 수평선 + 출처 섹션 또는 독립 출처 섹션 헤딩 패턴 제거
        // 예: ## 📚 참고 자료 및 출처, ## 참고 자료, ## 출처, ## 참고문헌, ## References, ### Sources 등
        cleaned = cleaned.replace(
          /(?:\r?\n)+(?:---+\s*(?:\r?\n)+)?#{1,4}\s*(?:[📚📖🔍📎]\s*)?(?:참고\s*자료(?:\s*및\s*출처)?|참고\s*문헌|출처(?:\s*및\s*근거)?|References?|Sources?|Citations?)(?:[\s\S]*)$/i,
          ''
        );

        // 2. 인용구 형태의 후행 출처 블록 제거 (예: > 📚 **참고 자료**: ... 또는 > 출처: ...)
        cleaned = cleaned.replace(
          /(?:\r?\n)+(?:---+\s*(?:\r?\n)+)?>\s*(?:[📚📖🔍📎]\s*)?(?:\*{1,2})?(?:참고\s*자료|참고\s*문헌|출처|지식\s*보관함|References?|Sources?)(?:[\s\S]*)$/i,
          ''
        );

        // 3. 지식 문서가 0건일 때 AI가 본문 내에 날조한 가상 file:/// 링크 및 가상 [출처: ...] 태그 치환 방어
        if (activeKnowledge.length === 0) {
          cleaned = cleaned.replace(/\[([^\]]+)\]\(file:\/\/\/[^\)]+\)/gi, '$1');
          cleaned = cleaned.replace(/\[출처(?:\s*\d+)?:\s*[^\]]+\]/gi, '');
        }

        return cleaned.trim();
      };

      const cleanedContent = stripHallucinatedCitations(generated || '');
      let finalized = cleanedContent;

      // 📚 [단일 진실 공급원(SSOT)] 오직 내부 시스템에 실제 존재하는 지식 청크가 있고, 출처 각주 포함 옵션이 켜져 있을 때만 시스템이 직접 검증된 출처 블록 결합!
      if (activeKnowledge.length > 0 && includeCitations) {
        let linkedBody = cleanedContent;

        const sourceList = activeKnowledge.map((c, i) => {
          const num = i + 1;
          const title = c.documentTitle || c.headingTitle || '내부 지식 문서';
          const path = c.headingPath || c.headingTitle || '';
          
          // 절대경로 정규화: 데스크톱 상대경로인 경우 rootFolder.name과 합성
          let fullPath = (c.filePath || '').replace(/\\/g, '/');
          const isDesktop = typeof window !== 'undefined' && !!(window as any).electronAPI;
          if (isDesktop && !/^[a-zA-Z]:\//.test(fullPath) && !fullPath.startsWith('/') && rootFolder?.name) {
            const base = rootFolder.name.replace(/\\/g, '/').replace(/\/$/, '');
            const rel = fullPath.replace(/^\.\//, '').replace(/^\//, '');
            fullPath = `${base}/${rel}`;
          }

          const fileUri = fullPath.startsWith('/') || /^[a-zA-Z]:\//.test(fullPath)
            ? `file:///${fullPath.replace(/^\/+/, '')}`
            : fullPath;
          const lineAnchor = (c.startLine && c.endLine) ? `#L${c.startLine}-L${c.endLine}` : '';
          const lineInfo = (c.startLine && c.endLine) ? ` (L${c.startLine}~L${c.endLine})` : '';
          const pathInfo = path ? ` - 섹션: \`${path}\`` : '';

          // 🔗 본문 인라인 [출처 N: ...] 태그에도 직접 출처 링크 자동 결합
          const inlineRegex = new RegExp(`\\[출처\\s*${num}:\\s*([^\\]]+)\\](?!\\()`, 'g');
          linkedBody = linkedBody.replace(inlineRegex, `[출처 ${num}: $1](<${fileUri}${lineAnchor}>)`);

          return `${num}. [출처 ${num}: ${title}](<${fileUri}${lineAnchor}>)${pathInfo}${lineInfo}`;
        }).join('\n');
        finalized = `${linkedBody}\n\n---\n\n## 📚 내부 지식 보관함 출처\n${sourceList}\n`;
      }
      // 🌟 [원트랜잭션 무결성] 100% 정상 완성된 최종 문서만 원자적으로 한 번에 반영
      setDraftResult(finalized);
      setGenerationComplete(true);
      setGeneratingStep('idle');
      setFormattedError(null);
      setLastError(null);
      if (activeKnowledge.length > 0) {
        showToast(`AI 생성이 완료되었습니다. (지식 ${activeKnowledge.length}건 참조됨)`, 'success');
      } else {
        showToast('AI 글 생성이 완료되었습니다. 결과를 확인해주세요.', 'success');
      }
    } catch (e: any) {
      console.error('AIDraftModal handleGenerate Error:', e);
      const diagnosed: FormattedAIError = (e as any).diagnosed || formatUserFriendlyAIError(e, targetModel);
      setFormattedError(diagnosed);
      setLastError(diagnosed.description);
      // 🛡️ [원트랜잭션 클린 롤백] 오류 발생 시 중간 생성 찌꺼기 텍스트를 즉시 완전 제거
      setDraftResult('');
      setGenerationComplete(false);
      setGeneratingStep('idle');
      showToast(`${diagnosed.title}: ${diagnosed.description}`, 'error');
      if (typeof window !== 'undefined') {
        window.alert(`❌ AI 글 생성 실패 (${diagnosed.title})\n\n${diagnosed.description}\n\n💡 해결 방법: ${diagnosed.solution || 'API 키 또는 모델 설정을 확인해 주세요.'}`);
      }
    } finally {
      setIsGenerating(false);
      setGeneratingStep('idle');
    }
  };

  const handleReset = () => {
    setEditorialCommand('');
    setLoadedPresetName('');
    setLoadedPresetFolder('');
    const defaultScope: 'selection' | 'document' | 'none' = 
      (editorContext?.selectedText && editorContext.selectedText.trim()) ? 'selection' : 
      ((editorContext?.fullText && editorContext.fullText.trim()) ? 'document' : 'none');
    handleScopeChange(defaultScope);
    setAttachedFileName('');
    setAttachedFileContent('');
    setAttachedKnowledgeChunks([]);
    setCitedSources([]);
    setDraftResult('');
    setGenerationComplete(false);
    setIsGenerating(false);
    setFormattedError(null);
    setLastError(null);
    const defaultModel = aiModelName || DEFAULT_AI_MODEL;
    setCurrentModel(defaultModel);
    showToast('모든 입력 내용과 설정이 초기화되었습니다.', 'success');
  };

  const handleApply = (action: 'insert' | 'replace' | 'append') => {
    if (!draftResult.trim()) {
      showToast("생성된 결과가 없습니다.", "warning");
      return;
    }

    let finalOutput = draftResult;
    if (includeCitations && citedSources.length > 0) {
      const hasDirectFileLinks = finalOutput.includes('file:///');
      if (!hasDirectFileLinks) {
        const footnotes = citedSources.map((c, i) => {
          const num = i + 1;
          const title = c.documentTitle || c.headingTitle || '내부 지식 문서';
          const path = c.headingPath || c.headingTitle || '';
          
          let fullPath = (c.filePath || '').replace(/\\/g, '/');
          const isDesktop = typeof window !== 'undefined' && !!(window as any).electronAPI;
          if (isDesktop && !/^[a-zA-Z]:\//.test(fullPath) && !fullPath.startsWith('/') && rootFolder?.name) {
            const base = rootFolder.name.replace(/\\/g, '/').replace(/\/$/, '');
            const rel = fullPath.replace(/^\.\//, '').replace(/^\//, '');
            fullPath = `${base}/${rel}`;
          }

          const fileUri = fullPath.startsWith('/') || /^[a-zA-Z]:\//.test(fullPath)
            ? `file:///${fullPath.replace(/^\/+/, '')}`
            : fullPath;
          const lineAnchor = (c.startLine && c.endLine) ? `#L${c.startLine}-L${c.endLine}` : '';
          const lineInfo = (c.startLine && c.endLine) ? ` (L${c.startLine}~L${c.endLine})` : '';
          const pathInfo = path ? ` - 섹션: \`${path}\`` : '';

          // 🔗 본문 인라인 [출처 N: ...] 태그에도 직접 출처 링크 자동 결합
          const inlineRegex = new RegExp(`\\[출처\\s*${num}:\\s*([^\\]]+)\\](?!\\()`, 'g');
          finalOutput = finalOutput.replace(inlineRegex, `[출처 ${num}: $1](<${fileUri}${lineAnchor}>)`);

          return `> ${num}. [출처 ${num}: ${title}](<${fileUri}${lineAnchor}>)${pathInfo}${lineInfo}`;
        }).join('\n');
        finalOutput += `\n\n---\n> 📚 **내부 지식 보관함 원본 출처**:\n${footnotes}\n`;
      }
    }

    onApply(finalOutput, action, targetScope);
  };



  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className="relative bg-white dark:bg-zinc-900 w-full h-full min-h-0 flex flex-col transition-all duration-300 overflow-hidden outline-none"
        onMouseDown={e => e.stopPropagation()}
        tabIndex={-1}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.nativeEvent) {
            e.nativeEvent.stopImmediatePropagation?.();
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleGenerate();
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            handleSavePresetClick();
          }
          if (e.key === 'Escape') {
            if (showLibrary) {
              setShowLibrary(false);
            } else if (isSavingPreset) {
              handleCancelSavePreset();
            } else {
              onClose();
            }
          }
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFEFEF] dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1d4ed8]/15 text-[#1d4ed8] flex items-center justify-center">
              <Icon name="AiAssistant" className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-base font-bold text-[#1d4ed8] tracking-tight">
                AI 프롬프트
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isGenerating ? 'bg-amber-500 animate-pulse' : lastError ? 'bg-rose-500' : 'bg-[#1d4ed8]'}`}></div>
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  {isGenerating ? "AI가 작업을 수행하고 있습니다..." : lastError ? "요청 실패 (우측 안내를 확인해 주세요)" : "협업 준비 완료"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200/90 dark:border-zinc-700 font-bold text-[12px] shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
                title="모든 입력 내용 및 설정 초기화"
              >
                <Icon name="RotateCcw" className="w-3.5 h-3.5" />
                <span>초기화</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200/90 dark:border-zinc-700 font-bold text-[12px] shadow-2xs transition-all cursor-pointer"
                title="AI 모달을 닫고 에디터로 돌아갑니다"
              >
                <span>에디터 이동</span>
                <Icon name="Close" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Body (Side-by-side) */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          
          {/* Left Column: Prompts */}
          <div className="flex-1 min-h-0 bg-slate-50 dark:bg-zinc-800/50 border-r border-zinc-100 dark:border-zinc-800 flex flex-col relative overflow-hidden">
            
            {/* Mode & Preset Top Bar */}
            <div className="px-6 pt-5 pb-3 shrink-0 flex items-center justify-between z-10 relative">
              <div className="flex bg-zinc-200/50 dark:bg-zinc-800 p-1 rounded-lg">
                <span className="px-3 py-1.5 text-[12px] font-bold bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 shadow-sm rounded-md">
                  AI 프롬프트
                </span>
              </div>

              <div ref={presetContainerRef} className="flex items-center gap-2 relative">
                <button
                  onClick={() => { setShowLibrary(true); setIsSavingPreset(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Icon name="Book" className="w-3.5 h-3.5" />
                  라이브러리 열기
                </button>
                <button
                  onClick={handleSavePresetClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[#1d4ed8] dark:text-blue-400 hover:bg-[#1d4ed8]/10 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                >
                  <Icon name="Save" className="w-3.5 h-3.5" />
                  현재 설정 저장
                </button>

                {/* Preset Saving Popover */}
                {isSavingPreset && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-xl shadow-2xl overflow-visible z-50 p-4 flex flex-col gap-3.5">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/20 flex items-center justify-center text-[#1d4ed8] dark:text-blue-400">
                          <Icon name="Book" className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">라이브러리 저장</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelSavePreset}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded transition-colors"
                        title="닫기"
                      >
                        <Icon name="Close" className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-3">
                      {/* Folder Name & Selector */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <Icon name="FolderOpen" className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400" />
                            <span>폴더명 <span className="text-[10px] font-normal text-zinc-600 dark:text-zinc-400">(선택)</span></span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowFolderDropdown(prev => !prev)}
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                              showFolderDropdown
                                ? 'bg-[#1d4ed8] text-white shadow-xs'
                                : 'text-[#1d4ed8] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60'
                            }`}
                          >
                            <Icon name="FolderOpen" className="w-3 h-3" />
                            <span>폴더 선택</span>
                            <Icon name="ArrowDown" className={`w-3 h-3 transition-transform duration-150 ${showFolderDropdown ? 'rotate-180' : ''}`} />
                          </button>
                        </div>

                        <div className="relative">
                          <input 
                            type="text" 
                            value={presetFolderInput}
                            onChange={(e) => setPresetFolderInput(e.target.value)}
                            onKeyDown={(e) => { 
                              if (e.key === 'Enter') handleConfirmSavePreset(); 
                              if (e.key === 'Escape') {
                                if (showFolderDropdown) setShowFolderDropdown(false);
                                else handleCancelSavePreset();
                              }
                            }}
                            placeholder="새 폴더명 입력 또는 폴더 선택"
                            className="w-full bg-slate-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-[12px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8] transition-all"
                          />

                          {/* Folder Dropdown */}
                          {showFolderDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-30 max-h-44 overflow-y-auto custom-scrollbar p-1">
                              <div className="px-2 py-1 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                                기존 저장 폴더 목록
                              </div>
                              {existingFolders.length === 0 ? (
                                <div className="px-3 py-2.5 text-[11px] text-zinc-600 dark:text-zinc-400 text-center">
                                  저장된 폴더가 없습니다.<br />새 폴더명을 직접 입력해주세요.
                                </div>
                              ) : (
                                existingFolders.map(folder => (
                                  <button
                                    key={folder}
                                    type="button"
                                    onClick={() => {
                                      setPresetFolderInput(folder);
                                      setShowFolderDropdown(false);
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 text-[11px] rounded flex items-center justify-between transition-colors ${
                                      presetFolderInput === folder
                                        ? 'bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/20 text-[#1d4ed8] dark:text-blue-400 font-bold'
                                        : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                    }`}
                                  >
                                    <span className="flex items-center gap-1.5 truncate">
                                      <Icon name="FolderOpen" className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                      <span className="truncate">{folder}</span>
                                    </span>
                                    {presetFolderInput === folder && (
                                      <Icon name="Checkmark" className="w-3.5 h-3.5 text-[#1d4ed8] shrink-0" />
                                    )}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                        {/* Quick Selection Chips */}
                        {existingFolders.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">추천:</span>
                            {existingFolders.slice(0, 4).map(folder => (
                              <button
                                key={folder}
                                type="button"
                                onClick={() => setPresetFolderInput(folder)}
                                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                                  presetFolderInput === folder
                                    ? 'bg-[#1d4ed8] text-white border-[#1d4ed8] font-bold shadow-xs'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-[#1d4ed8]/50'
                                }`}
                              >
                                {folder}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Library Name */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <Icon name="Book" className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400" />
                          <span>라이브러리 이름 <span className="text-red-500">*</span></span>
                        </label>
                        <input 
                          type="text" 
                          value={presetNameInput}
                          onChange={(e) => setPresetNameInput(e.target.value)}
                          onKeyDown={(e) => { 
                            if (e.key === 'Enter') handleConfirmSavePreset(); 
                            if (e.key === 'Escape') handleCancelSavePreset(); 
                          }}
                          placeholder="라이브러리 이름 입력"
                          autoFocus
                          className="w-full bg-slate-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-[12px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8] transition-all"
                        />
                      </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <button 
                        type="button"
                        onClick={handleCancelSavePreset} 
                        className="px-3 py-1.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                      >
                        취소
                      </button>
                      <button 
                        type="button"
                        onClick={handleConfirmSavePreset} 
                        className="px-3.5 py-1.5 text-[11px] font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] active:bg-[#1e3a8a] rounded-md shadow-sm transition-colors flex items-center gap-1.5"
                      >
                        <Icon name="Checkmark" className="w-3.5 h-3.5" />
                        저장하기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-1 min-h-0 flex-col overflow-y-auto custom-scrollbar px-6 pb-28 relative">
              <div className="flex flex-col gap-6">
                
                {loadedPresetName && (
                  <div className="bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200/80 dark:border-blue-800/60 rounded-lg p-3 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/20 flex items-center justify-center">
                        <Icon name="Book" className="w-3.5 h-3.5 text-[#1d4ed8] dark:text-blue-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[#1d4ed8] dark:text-blue-400">적용된 템플릿/라이브러리</span>
                        <span className="text-[12px] font-extrabold text-zinc-900 dark:text-zinc-100">{loadedPresetName}</span>
                      </div>
                    </div>
                    <button onClick={() => setLoadedPresetName('')} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800/40 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                      <Icon name="Close" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Editorial Prompt Input Area */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200/60 dark:border-zinc-800 shadow-2xs">
                    <label className="text-[12px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Icon name="AiAssistant" className="w-3.5 h-3.5 text-[#1d4ed8]" />
                      <span>어시스턴트에게 지시할 내용 (프롬프트)</span>
                    </label>
                    <span className="text-[10px] font-medium text-zinc-400">Ctrl + Enter 로 즉시 실행</span>
                  </div>
                  <textarea
                    value={editorialCommand}
                    onChange={e => {
                      const val = e.target.value;
                      setEditorialCommand(val);
                      // 🌟 프롬프트 수정 시 이전 실행의 지식 출처 요약 배너 및 완료 상태 즉시 리셋 (오래된 정보 잔류 차단)
                      if (citedSources.length > 0) {
                        setCitedSources([]);
                      }
                      if (generationComplete) {
                        setGenerationComplete(false);
                      }
                    }}
                    placeholder="예: 위 글의 문체와 레이아웃을 그대로 유지하면서, 최신 클라우드 기술 트렌드를 소개하는 새로운 글을 작성해줘."
                    className="flex-1 min-h-[160px] p-3.5 text-[13px] border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 outline-none focus:border-[#1d4ed8] resize-none leading-relaxed transition-all shadow-2xs font-sans"
                  />
                </div>

                {/* 🚨 에러 발생 시 즉시 좌측 프롬프트 하단에도 명확히 노출되는 오류 경고 배너 */}
                {(formattedError || lastError) && !isGenerating && (
                  <div className="p-3.5 rounded-xl bg-rose-50/95 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800/80 text-rose-800 dark:text-rose-200 flex flex-col gap-2 shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name="AlertError" className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span className="font-extrabold text-[13px] text-rose-700 dark:text-rose-300">
                          {formattedError?.title || "AI 실행 오류 발생"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setFormattedError(null); setLastError(null); }}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded cursor-pointer"
                        title="닫기"
                      >
                        <Icon name="Close" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-[12px] text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium bg-white/80 dark:bg-zinc-900/80 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60">
                      {formattedError?.description || lastError}
                    </div>
                    {formattedError?.solution && (
                      <div className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold bg-blue-50/80 dark:bg-blue-950/40 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/60">
                        💡 <strong>해결 방법:</strong> {formattedError.solution}
                      </div>
                    )}
                  </div>
                )}

                {/* Scope & Context Options */}
                <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/60 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">작업 대상 범위</span>
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleScopeChange('selection')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                          targetScope === 'selection'
                            ? 'bg-white dark:bg-zinc-700 text-[#1d4ed8] shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                      >
                        선택 영역만
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScopeChange('document')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                          targetScope === 'document'
                            ? 'bg-white dark:bg-zinc-700 text-[#1d4ed8] shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                      >
                        문서 전체
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScopeChange('none')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                          targetScope === 'none'
                            ? 'bg-white dark:bg-zinc-700 text-[#1d4ed8] shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                      >
                        새 글 작성 (본문 미참조)
                      </button>
                    </div>
                  </div>

                  {/* Context Scope Info Banner */}
                  <div className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                    {targetScope === 'document' && (
                      <span>
                        📄 <strong>현재 편집 문서 전체</strong> ({(editorContext?.fullText || '').trim().length.toLocaleString()}자)를 기반으로 작업합니다.
                      </span>
                    )}
                    {targetScope === 'selection' && (
                      <span>
                        ✂️ <strong>선택한 영역 텍스트</strong> ({(editorContext?.selectedText || '').trim().length.toLocaleString()}자)를 기반으로 작업합니다.
                      </span>
                    )}
                    {targetScope === 'none' && (
                      <span>
                        ✨ 기존 본문을 참조하지 않고 프롬프트 명령에 따라 새로운 글을 작성합니다.
                      </span>
                    )}
                  </div>

                  {/* Attachment Bar */}
                  {attachedFileName ? (
                    <div className="flex items-center justify-between bg-[#1d4ed8]/10 border border-[#1d4ed8]/30 px-3 py-2 rounded-xl">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Icon name="Paperclip" className="w-4 h-4 text-[#1d4ed8] shrink-0" />
                        <span className="text-[12px] font-bold text-[#1d4ed8] truncate">{attachedFileName}</span>
                      </div>
                      <button onClick={handleRemoveAttachment} className="p-1 hover:bg-[#1d4ed8]/20 rounded-md text-[#1d4ed8] transition-colors shrink-0">
                        <Icon name="Close" className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isGenerating}
                      className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-zinc-200 dark:border-zinc-700/80 hover:border-[#1d4ed8]/50 hover:bg-[#1d4ed8]/5 rounded-xl py-2.5 text-[12px] font-bold text-zinc-500 dark:text-zinc-400 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Icon name="Paperclip" className="w-4 h-4" />
                      참조할 텍스트 문서(.md, .txt) 첨부하기
                    </button>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileAttach}
                    accept=".txt,.md,.json,.csv"
                    className="hidden"
                  />
                </div>

                {/* 🧠 [ONRIVI-KNOWLEDGE-PALETTE] 지식 보관함 검색 & 첨부 팔레트 (데스크톱 전용) */}
                {isDesktop && (
                  <KnowledgeAttachmentPalette
                    resourceFolder={effectiveResourceFolder}
                    resourceFolderHandle={effectiveResourceFolderHandle}
                    attachedChunks={attachedKnowledgeChunks}
                    onAttachChunk={(chunk) => {
                      if (!attachedKnowledgeChunks.some(c => c.chunkId === chunk.chunkId)) {
                        setAttachedKnowledgeChunks(prev => [...prev, chunk]);
                        showToast(`'${chunk.headingPath || chunk.headingTitle}' 청크가 첨부되었습니다.`, 'success');
                      }
                    }}
                    onDetachChunk={(chunkId) => {
                      setAttachedKnowledgeChunks(prev => prev.filter(c => c.chunkId !== chunkId));
                    }}
                    onClearAllChunks={() => setAttachedKnowledgeChunks([])}
                    isAutoRagEnabled={isAutoRagEnabled}
                    onToggleAutoRag={setIsAutoRagEnabled}
                    includeCitations={includeCitations}
                    onToggleIncludeCitations={setIncludeCitations}
                    defaultExpanded={true}
                    currentCharsUsed={
                      attachedKnowledgeChunks.reduce((acc, c) => acc + (c.snippet?.length || 0), 0) +
                      (attachedFileContent?.length || 0)
                    }
                    showToast={showToast}
                  />
                )}

              </div>

            </div>

            {/* Fixed Bottom Controls: Provider/Model Selector + AI 실행 Button */}
            <div className="absolute bottom-6 left-6 right-6 z-10 bg-slate-50/95 dark:bg-zinc-800/95 backdrop-blur-xs pt-2 flex items-center gap-2.5">
              {/* AI 제조사 및 모델 선택기 */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-700/80 shadow-2xs shrink-0">
                {/* 제조사 선택 */}
                <div className="flex items-center px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700">
                  <div className="relative flex items-center">
                    <select
                      value={selectedProviderId}
                      onChange={(e) => handleProviderSelect(e.target.value as any)}
                      disabled={isGenerating}
                      className="appearance-none bg-transparent pr-4 text-[12px] font-bold text-[#1d4ed8] dark:text-blue-400 outline-none cursor-pointer disabled:opacity-50"
                      title="AI 서비스 제조사를 선택하세요"
                    >
                      {providers.map((p) => (
                        <option key={p.id} value={p.id} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-medium">
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <Icon name="ArrowDown" className="w-3.5 h-3.5 text-zinc-400 absolute right-0 pointer-events-none" />
                  </div>
                </div>

                {/* 모델 선택 */}
                <div className="flex items-center px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700">
                  <div className="relative flex items-center">
                    {selectedProviderId === 'custom' ? (
                      <input
                        type="text"
                        value={currentModel}
                        onChange={(e) => handleModelSelect(e.target.value)}
                        placeholder="모델명 직접 입력"
                        className="bg-transparent text-[12px] font-mono font-bold text-[#1d4ed8] dark:text-blue-400 outline-none w-32"
                      />
                    ) : (
                      <>
                        <select
                          value={currentModel}
                          onChange={(e) => handleModelSelect(e.target.value)}
                          disabled={isGenerating}
                          className="appearance-none bg-transparent pr-5 text-[12px] font-bold text-[#1d4ed8] dark:text-blue-400 outline-none cursor-pointer disabled:opacity-50 max-w-[210px] truncate"
                          title="사용할 AI 모델을 선택하세요"
                        >
                          {currentProviderModels.map((m) => (
                            <option key={m.id} value={m.id} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-medium">
                              {m.label}
                            </option>
                          ))}
                          {!currentProviderModels.some(m => m.id === currentModel) && (
                            <option value={currentModel} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-medium">
                              ✏️ {currentModel}
                            </option>
                          )}
                        </select>
                        <Icon name="ArrowDown" className="w-3.5 h-3.5 text-zinc-400 absolute right-0 pointer-events-none" />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* AI 실행 버튼 */}
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={isGenerating}
                className="flex-1 py-3.5 text-[14px] font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] disabled:bg-[#1d4ed8]/50 dark:disabled:bg-zinc-700 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm shadow-[#1d4ed8]/20 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Icon name="Loading" className="w-5 h-5 animate-spin" />
                    <span>
                      {generatingStep === 'rag' && '[1/3] 지식 검색 중...'}
                      {generatingStep === 'prompt' && '[2/3] AI 추론 준비 중...'}
                      {generatingStep === 'stream' && '[3/3] 본문 스트리밍 수신 중...'}
                      {generatingStep === 'idle' && 'AI 작업 수행 중...'}
                    </span>
                  </>
                ) : generationComplete ? (
                  <>
                    <Icon name="AiAssistant" className="w-5 h-5" />
                    프롬프트 수정하여 다시 실행
                  </>
                ) : (
                  <>
                    <Icon name="AiAssistant" className="w-5 h-5" />
                    AI 실행
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Result Preview */}
          <div className="flex-1 min-h-0 bg-white dark:bg-zinc-900 flex flex-col relative overflow-hidden">
            
            {/* Right Pane Header */}
            <div className="px-8 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  AI 작성 결과 미리보기
                </span>
                {draftResult.trim() && (
                  <button
                    type="button"
                    onClick={handleCopyResult}
                    className={`p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-2xs ${
                      aiCopied
                        ? 'bg-emerald-500 text-white border-emerald-600 scale-105'
                        : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border-zinc-200/90 dark:border-zinc-700'
                    }`}
                    title={aiCopied ? "클립보드에 복사되었습니다!" : "결과 미리보기 전체 복사"}
                  >
                    {aiCopied ? <Icon name="Checkmark" className="w-3.5 h-3.5 text-white" /> : <Icon name="Copy" className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
              
              {/* Apply Buttons (Only visible when generated) */}
              {generationComplete && !isGenerating && draftResult.trim() && (
                <div className="flex items-center gap-2">
                  {targetScope !== 'none' && (
                    <>
                      <button
                        onClick={() => handleApply('replace')}
                        className="px-3 py-1.5 text-[11px] font-bold text-[#1d4ed8] border border-[#1d4ed8]/30 hover:bg-[#1d4ed8]/10 rounded-md transition-colors cursor-pointer"
                        title="기존 내용을 지우고 이 결과로 덮어씁니다."
                      >
                        덮어쓰기
                      </button>
                      <button
                        onClick={() => handleApply('append')}
                        className="px-3 py-1.5 text-[11px] font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                        title="기존 내용은 유지하고 그 아래에 결과를 이어서 붙입니다."
                      >
                        <Icon name="Checkmark" className="w-3 h-3" />
                        아래에 추가
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleApply('insert')}
                    className="px-3 py-1.5 text-[11px] font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] rounded-md transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="에디터에서 현재 깜빡이고 있는 커서 위치에 결과를 삽입합니다."
                  >
                    <Icon name="Checkmark" className="w-3 h-3" />
                    커서 위치에 삽입
                  </button>
                </div>
              )}
            </div>

            {/* 참조된 지식 출처 요약 배너 및 실시간 단계별 진행 배너 */}
            {isGenerating ? (
              <div className="mx-8 mb-3 p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/80 flex items-center justify-between shrink-0 shadow-2xs animate-pulse">
                <span className="text-[12px] font-bold text-[#1d4ed8] dark:text-blue-300 flex items-center gap-2">
                  <Icon name="Loading" className="w-4 h-4 animate-spin text-[#1d4ed8] shrink-0" />
                  {generatingStep === 'rag' && '[1/3] 📚 지식 보관함에서 관련 문서 및 청크 검색 중...'}
                  {generatingStep === 'prompt' && '[2/3] 🧠 Gemini 모델 분석 및 프롬프트 추론 준비 중...'}
                  {generatingStep === 'stream' && '[3/3] ✍️ 실시간 초안 본문 스트리밍 수신 중...'}
                  {generatingStep === 'idle' && 'AI 작업 수행 중...'}
                </span>
                <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-900/50 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                  {currentModel}
                </span>
              </div>
            ) : (!isGenerating && citedSources.length > 0) ? (
              <div className="mx-8 mb-3 p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-[#1d4ed8]/30 flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-[#1d4ed8] flex items-center gap-1.5">
                    <Icon name="Book" className="w-3.5 h-3.5" />
                    참조된 지식 문서 ({citedSources.length}건)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-zinc-400">
                      단일 진실 공급원(SSOT) 기반 생성
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCitedSources([]);
                        setAttachedKnowledgeChunks([]);
                        showToast('참조 지식 배너가 해제되었습니다.', 'info');
                      }}
                      className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer flex items-center gap-0.5 text-[10px] font-medium"
                      title="참조 지식 배너 닫기 및 해제"
                    >
                      <Icon name="Close" className="w-3.5 h-3.5" />
                      <span>해제</span>
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar">
                  {citedSources.map((c) => (
                    <span
                      key={c.chunkId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white dark:bg-zinc-800 border border-[#1d4ed8]/20 text-zinc-800 dark:text-zinc-200 shadow-2xs"
                      title={`${c.filePath} (L${c.startLine}~L${c.endLine})`}
                    >
                      <span className="font-bold text-[#1d4ed8]">{c.documentTitle}</span>
                      <span className="text-zinc-400">›</span>
                      <span className="truncate max-w-[130px]">{c.headingPath || c.headingTitle}</span>
                      <span className="font-mono text-zinc-400">L{c.startLine}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Right Pane Content */}
            <div className="flex-1 overflow-hidden relative">
              {(formattedError || lastError) && !isGenerating ? (
                // Dedicated High-Contrast User-Friendly Error State (Rule 8 compliant)
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 overflow-y-auto custom-scrollbar">
                  <div className="max-w-md w-full bg-rose-50/90 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800/70 rounded-2xl p-6 shadow-md flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon name="AlertError" className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-[15px] font-extrabold text-rose-700 dark:text-rose-300 leading-tight">
                            {formattedError?.title || "AI 응답 생성 일시 지연"}
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setFormattedError(null);
                              setLastError(null);
                            }}
                            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md transition cursor-pointer"
                            title="안내 닫기"
                          >
                            <Icon name="Close" className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono font-bold text-rose-900 dark:text-rose-200 bg-rose-200/70 dark:bg-rose-900/50 px-2 py-0.5 rounded-md inline-block">
                          현재 선택된 모델: {ONRIVI_AI_MODELS.find(m => m.id === currentModel)?.name || currentModel}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5 bg-white dark:bg-zinc-900/95 p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 shadow-2xs">
                      <div>
                        <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-0.5">발생 원인</div>
                        <div className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
                          {formattedError?.description || lastError}
                        </div>
                      </div>
                      {formattedError?.solution && (
                        <div className="pt-2.5 border-t border-rose-100 dark:border-zinc-800">
                          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-0.5">권장 조치 방법</div>
                          <div className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {formattedError.solution}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 text-center">
                        원하시는 모델로 변경하거나 다시 실행할 수 있습니다:
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            handleModelSelect('gemini-3.8-flash');
                            showToast('AI 모델이 최신 플래그십 Gemini 3.8 Flash로 변경되었습니다. 이제 다시 실행하실 수 있습니다.', 'info');
                          }}
                          className={`flex-1 py-2 px-3 rounded-xl text-[12px] font-bold border shadow-2xs active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            currentModel === 'gemini-3.8-flash'
                              ? 'bg-[#1d4ed8] text-white border-[#1d4ed8]'
                              : 'text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border-zinc-300 dark:border-zinc-700'
                          }`}
                          title="최신 플래그십 버전 Gemini 3.8 Flash로 모델을 변경합니다"
                        >
                          <Icon name="AiAssistant" className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">Gemini 3.8 Flash로 변경</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleModelSelect('gemini-3.7-flash');
                            showToast('AI 모델이 Gemini 3.7 Flash로 변경되었습니다. 이제 다시 실행하실 수 있습니다.', 'info');
                          }}
                          className={`flex-1 py-2 px-3 rounded-xl text-[12px] font-bold border shadow-2xs active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            currentModel === 'gemini-3.7-flash'
                              ? 'bg-[#1d4ed8] text-white border-[#1d4ed8]'
                              : 'text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border-zinc-300 dark:border-zinc-700'
                          }`}
                          title="차세대 고성능 버전 Gemini 3.7 Flash로 모델을 변경합니다"
                        >
                          <Icon name="FastSpeed" className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate">Gemini 3.7 Flash로 변경</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleGenerate()}
                        className="w-full py-2.5 px-4 rounded-xl text-[13px] font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] shadow-xs active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer mt-1"
                      >
                        <Icon name="RotateCcw" className="w-4 h-4" />
                        현재 선택된 모델({currentModel})로 실행
                      </button>

                      <div className="flex items-center gap-2 pt-1 border-t border-rose-200 dark:border-rose-900/60 mt-1">
                        <button
                          type="button"
                          onClick={handleReset}
                          className="flex-1 py-2 px-3 rounded-xl text-[12px] font-bold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          title="모든 입력 및 에러 내용 초기화"
                        >
                          <Icon name="RotateCcw" className="w-3.5 h-3.5" />
                          <span>초기화</span>
                        </button>
                        <button
                          type="button"
                          onClick={onClose}
                          className="flex-1 py-2 px-3 rounded-xl text-[12px] font-bold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          title="AI 모달을 닫고 에디터로 복귀"
                        >
                          <Icon name="Close" className="w-3.5 h-3.5" />
                          <span>에디터 이동</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (!isGenerating && !generationComplete && !draftResult) ? (
                // Empty State
                <div className="absolute inset-0 flex flex-col items-center justify-center pb-20">
                  <div className="w-16 h-16 bg-[#faf5ff] dark:bg-[#8b5cf6]/10 rounded-[20px] flex items-center justify-center mb-5">
                    <svg className="w-8 h-8 text-[#a855f7]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z" />
                    </svg>
                  </div>
                  <h4 className="text-[15px] font-bold text-zinc-800 dark:text-zinc-200 mb-2">
                    AI 생성이 대기 중입니다
                  </h4>
                  <p className="text-[12px] text-zinc-500 dark:text-zinc-400 text-center leading-relaxed">
                    좌측 탭에서 모드를 선택하고 필요한 내용을 입력한 뒤<br/>
                    하단의 <span className="text-[#8b5cf6] font-bold">시작</span> 버튼을 눌러주세요.
                  </p>
                </div>
              ) : (
                // Generating or Generated State
                <div 
                  ref={previewRef}
                  className="absolute inset-0 px-8 pb-8 text-[13px] text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap overflow-y-auto custom-scrollbar select-text"
                  style={{ lineHeight: '1.8' }}
                >
                  {draftResult}
                  {isGenerating && (
                    <span className="inline-block w-2 h-4 ml-1 bg-[#8b5cf6] animate-pulse align-middle"></span>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* AI Prompt Library Overlay */}
        <AIPromptLibrary 
          isOpen={showLibrary}
          onClose={() => setShowLibrary(false)}
          templates={templatesDict}
          presets={presets}
          onSelectTemplate={handleSelectTemplate}
          onSelectPreset={handleLoadPreset}
          onDeletePreset={(id) => handleDeletePreset({ stopPropagation: () => {} } as any, id)}
          onRenamePreset={renamePreset}
        />

      </div>
    </div>
  );
}

