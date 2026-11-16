// ====================================================================
// 📊 [OMD-AI-Settings-0001] src/components/ai/AIConnectionSettings.tsx
// 🎯 @KICK  : 다중 AI(Google, OpenAI, Claude, EXAONE, 직접 연결 OpenAI 호환) 제공자별 API 키 설정 및 연결 관리
// 🛡️ @GUARD : Rule 1(주석 최신화), Rule 6(Modern Technical Editorial), AES 보안 저장소 영구 보존
// 🚨 @PATCH : **2026-11-16** — [직접 연결(OpenAI 호환 · Custom) 및 자유 모델 입력 지원]: 다중 커스텀 OpenAI 호환 제공사 등록 UI 및 기본 제공사 API 조회/직접 모델 입력 추가
// 🚨 @PATCH : **2026-11-16** — [LG K-EXAONE 2.5 지원]: 다중 AI 연결 관리 카드에 'exaone' 제공사 추가 및 플레이스홀더/배지 반영
// 🚨 @PATCH : **2026-10-21** — [키 검증 사전 진단 안내 신설 (Google Drive OAuth ID 오입력 및 제공사별 키 식별)]:
//             1) Google OAuth 클라이언트 ID(googleusercontent.com) 유입 시 '구글 드라이브 연동용 ID'임을 친절히 안내하고 Google AI Studio(aistudio.google.com) 발급 안내 제공
//             2) Google Gemini 키는 반드시 AIza로 시작해야 함을 연결 전 사전 검증하여 모호한 '환경설정에서 등록해 주세요' 에러 원천 차단
//             3) 키 미입력 상태 클릭 시 입력 안내 문구 표시 및 실패 시 입력값 유지로 사용자 편의 대폭 강화
// 🚨 @PATCH : **2026-10-21** — [미연결 시 입력창 브라우저 비밀번호 자동완성 차단 및 입력값 완전 소거]:
//             1) 미연결 상태에서 브라우저 비밀번호 자동완성으로 유령 점(••••••••)이 채워지던 현상 원천 차단: 기본 type='text' 및 autoComplete='new-password' 적용
//             2) 연결 안 됨 상태 시 key 강제 초기화 및 클린 플레이스홀더 노출, 입력 내용 즉시 삭제(✕) 및 마스킹 보기(👁️) 토글 신설
//             3) onrivi:ai-connections 이벤트 동기화 시 미연결 제공자의 key 및 editingKey 즉각 리셋 연동
// 🚨 @PATCH : **2026-10-21** — [사용자 요청: Google Gemini 모델 선택 드롭다운 제거 및 자동 플래그십 고정]:
//             1) Google 연결 시 번거로운 모델 선택 드롭다운을 배제하고 Gemini 3.8 Flash 표준 플래그십으로 자동 적용
//             2) OpenAI/Claude 등 다중 모델 선택이 필요한 제공사만 선택 드롭다운 노출
// 🚨 @PATCH : **2026-10-21** — [다중 AI(Google, OpenAI, Claude) 모델 선택 드롭다운 즉시 노출 및 연결 영구 유지 완비]:
//             1) readConnections가 OpenAI/Claude 키 존재 시에도 기본 모델 및 추천 모델 목록을 정상 공급하도록 전면 개편
//             2) 연결 확인 즉시 1순위 대표 모델 자동 선택 및 리소스 폴더 저장으로 모달 닫기/새로고침 후에도 연결이 풀리지 않고 100% 지속 유지
// 🚨 @PATCH : **2026-10-20** — [등록된 API 키 마스킹 표준화 ('****************') 및 E2E 테스트 정합성 완료]:
//             1) 등록된 API 키의 마스킹 표기를 '****************'(16자리 고정)으로 통일하여 보안 가드 및 E2E 테스트 정합성 100% 보장
// 🚨 @PATCH : **2026-10-20** — [OpenAI/Claude API 키 로컬 암호화 영구 보관 및 새로고침 후 자동 복원 완비]:
//             1) 웹/데스크톱 공통 remember=true 기본 적용 및 saveSecureData(AES-256) 자동 연동으로 새로고침 후 키 소실 결함 원천 해결
//             2) 직관적인 연결 상태 배지 및 명확한 제공자별(OpenAI, Google, Claude) 안내 UI 제공
// ====================================================================
'use client';
import React, { useEffect, useState } from 'react';
import {
  AI_LABELS,
  configureAI,
  connectedAI,
  aiRequest,
  readConnections,
  saveConnection,
  removeConnection,
  selectConnection,
  selectedConnection,
  getProviderApiKey,
  readCustomConnections,
  saveCustomConnection,
  removeCustomConnection,
} from '@/lib/ai/client';
import { recommendedModels } from '@/lib/ai/recommendedModels';
import type { AIModel, AIProvider, CustomAIProviderConfig } from '@/lib/ai/types';

export default function AIConnectionSettings({ scope }: { scope: string }) {
  return (
    <section aria-label="여러 AI 연결 설정" className="space-y-4">
      <div className="flex items-center justify-between border-b pb-2 border-outline-variant/20 dark:border-white/10">
        <h3 className="font-serif text-[20px] font-semibold text-on-surface">다중 AI 연결 관리</h3>
        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-[#1d4ed8]/10 text-[#1d4ed8] dark:text-blue-400">
          Google · OpenAI · Claude · EXAONE
        </span>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Google Gemini, OpenAI(GPT), Claude, LG K-EXAONE 2.5를 각각 연결해 함께 사용할 수 있습니다. 제공사별 API 키를 등록하면 이 기기의 암호화 저장소에 안전하게 보관되어 새로고침 후에도 유지됩니다.
      </p>
      {(['google', 'openai', 'anthropic', 'exaone'] as AIProvider[]).map((provider) => (
        <AIProviderConnection key={scope + ':' + provider} scope={scope} provider={provider} />
      ))}
      <CustomAIProvidersSection scope={scope} />
    </section>
  );
}

function AIProviderConnection({ scope, provider }: { scope: string; provider: AIProvider }) {
  const [key, setKey] = useState('');
  const [showPlain, setShowPlain] = useState(true);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [connections, setConnections] = useState(readConnections);
  const [editingKey, setEditingKey] = useState(false);
  const [customModelInput, setCustomModelInput] = useState('');

  useEffect(() => {
    const sync = () => {
      setConnections(readConnections());
      const hasExisting = Boolean(getProviderApiKey(scope, provider));
      setConnected(hasExisting);
      if (!hasExisting) {
        setKey('');
        setEditingKey(false);
      }
    };
    window.addEventListener('onrivi:ai-connections', sync);
    return () => window.removeEventListener('onrivi:ai-connections', sync);
  }, [provider, scope]);

  useEffect(() => {
    let live = true;
    setKey('');
    // 런타임 및 보안 저장소 키 조회
    const hasExisting = Boolean(getProviderApiKey(scope, provider));
    if (hasExisting && live) {
      setConnected(true);
    } else if (live) {
      setConnected(false);
      setKey('');
    }

    void connectedAI(scope, provider).then((value) => {
      if (live) {
        const isConn = Boolean(value || hasExisting);
        setConnected(isConn);
        if (!isConn) {
          setKey('');
        }
      }
    });
    return () => {
      live = false;
    };
  }, [provider, scope]);

  const connect = async () => {
    setBusy(true);
    setMessage('');
    try {
      const cleanKey = key.trim();
      if (!cleanKey && !connected) {
        setMessage(`위 입력창에 ${AI_LABELS[provider]} API 키를 먼저 입력해 주세요.`);
        return;
      }

      if (cleanKey) {
        if (provider === 'google') {
          if (cleanKey.includes('googleusercontent.com') || cleanKey.startsWith('771142699427')) {
            setMessage('❌ 입력하신 값은 구글 드라이브 연동용 OAuth 클라이언트 ID입니다. Gemini AI를 사용하려면 Google AI Studio(aistudio.google.com)에서 발급받은 API 키(AIza...로 시작)를 입력해 주세요.');
            return;
          }
          if (cleanKey.startsWith('sk-')) {
            setMessage('❌ 입력하신 키는 OpenAI(ChatGPT) API 키입니다. 아래 OpenAI 카드에 등록해 주세요.');
            return;
          }
          if (!cleanKey.startsWith('AIza')) {
            setMessage('❌ Google Gemini API 키는 반드시 "AIza"로 시작해야 합니다. Google AI Studio(aistudio.google.com)에서 무료 발급받아 입력해 주세요.');
            return;
          }
        } else if (provider === 'openai') {
          if (!cleanKey.startsWith('sk-') || cleanKey.startsWith('sk-ant-')) {
            setMessage('❌ OpenAI API 키는 "sk-"로 시작해야 합니다. (OpenAI 플랫폼 발급 키)');
            return;
          }
        } else if (provider === 'anthropic') {
          if (!cleanKey.startsWith('sk-ant-')) {
            setMessage('❌ Claude API 키는 "sk-ant-"로 시작해야 합니다. (Anthropic 콘솔 발급 키)');
            return;
          }
        }
        await configureAI(scope, provider, cleanKey, remember);
      }
      const controller = new AbortController(),
        timer = setTimeout(() => controller.abort(), 30000);
      try {
        const rawModels = await aiRequest(scope, provider, 'models', undefined, controller.signal);
        const providerShortlist = recommendedModels(provider, rawModels);
        const mergedModels = [...new Map([...providerShortlist, ...rawModels].map((m) => [m.id, m])).values()];
        const prevConn = readConnections()[provider];
        const defaultModel = prevConn?.model || providerShortlist[0]?.id || rawModels[0]?.id || '';

        await saveConnection(provider, { model: defaultModel, models: mergedModels, updatedAt: Date.now() });
        selectConnection(provider, defaultModel);
        setConnected(true);
        setKey('');
        setEditingKey(false);
        setConnections(readConnections());
        if (provider === 'google') {
          setMessage('✅ Google Gemini API가 정상 연결되었습니다. (Gemini 3.8 Flash 기본 적용)');
        } else {
          setMessage(`✅ 추천 모델 ${providerShortlist.length}개를 확인했습니다. 아래에서 사용할 모델을 선택해 주세요.`);
        }
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      setMessage(`❌ 연결 실패: ${error instanceof Error ? error.message : '연결을 확인하지 못했습니다.'}`);
    } finally {
      setBusy(false);
    }
  };

  const shortlist = recommendedModels(provider, connections[provider]?.models || []);
  const locked = connected && !editingKey;

  return (
    <section
      className="rounded-xl border border-purple-200 dark:border-zinc-700 p-4 space-y-3 text-sm bg-white dark:bg-zinc-900/60 shadow-xs"
      aria-label={AI_LABELS[provider] + ' 연결'}
    >
      <div className="flex justify-between items-center">
        <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
          <span>🤖</span> {AI_LABELS[provider]}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            connected
              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
          }`}
        >
          {connected ? '● 연결 등록됨' : '○ 연결 안 됨'}
        </span>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          API 키 {locked ? '(등록됨 · 암호화 보호)' : ''}
        </span>
        <div className="relative">
          <input
            aria-label={locked ? '등록된 AI API 키' : '새 AI API 키'}
            type={locked ? 'password' : (showPlain ? 'text' : 'password')}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            data-form-type="other"
            name={`api_token_${provider}_${scope}`}
            id={`api_token_${provider}_${scope}`}
            readOnly={locked}
            disabled={busy}
            className={`block w-full p-2.5 rounded-lg border text-xs font-mono transition outline-none ${
              locked
                ? 'bg-blue-50/70 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 select-none'
                : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
            } ${!locked && key ? 'pr-16' : !locked ? 'pr-9' : ''}`}
            value={locked ? '****************' : key}
            onCopy={(e) => {
              if (locked) e.preventDefault();
            }}
            onCut={(e) => {
              if (locked) e.preventDefault();
            }}
            onChange={(e) => {
              if (!locked) setKey(e.target.value);
            }}
            placeholder={`${AI_LABELS[provider]} 발급 API 키 입력 (예: ${provider === 'openai' ? 'sk-...' : provider === 'google' ? 'AIza...' : provider === 'anthropic' ? 'sk-ant-...' : 'EXAONE API 키'})`}
          />
          {!locked && key && (
            <button
              type="button"
              onClick={() => setKey('')}
              className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-bold transition cursor-pointer"
              title="입력 내용 지우기"
            >
              ✕
            </button>
          )}
          {!locked && (
            <button
              type="button"
              onClick={() => setShowPlain((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs transition cursor-pointer"
              title={showPlain ? 'API 키 마스킹' : 'API 키 표시'}
            >
              {showPlain ? '🙈' : '👁️'}
            </button>
          )}
        </div>
      </label>

      {connected && (
        <div className="text-xs flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
            onClick={() => {
              setKey('');
              setEditingKey((v) => !v);
              setMessage('');
            }}
          >
            {editingKey ? '키 변경 취소' : '키 변경'}
          </button>
          <span className="text-zinc-400 text-[11px]">
            {locked ? '🔒 등록된 키는 안전하게 암호화 보관 중입니다.' : '새 키를 붙여넣은 뒤 [연결 · 모델 확인]을 누르세요.'}
          </span>
        </div>
      )}

      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
        <span>🛡️</span> 등록된 키는 이 기기(PC/브라우저)의 로컬 AES 보안 저장소에 암호화 보관되어 새로고침 후에도 안전하게 유지됩니다.
      </p>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={busy || (!key.trim() && (!connected || editingKey))}
          onClick={() => void connect()}
          className="rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 text-xs font-bold disabled:opacity-40 transition cursor-pointer shadow-xs"
        >
          {busy ? '연결 확인 중…' : '연결 · 모델 목록 확인'}
        </button>
        <button
          type="button"
          disabled={busy}
          className="border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          onClick={() => {
            void configureAI(scope, provider, '', false, true)
              .then(() => {
                removeConnection(provider);
                setConnected(false);
                setKey('');
                setEditingKey(false);
                if (selectedConnection().provider === provider) selectConnection(provider, '');
                setMessage('연결을 해제했습니다.');
              })
              .catch((error) => setMessage(error instanceof Error ? error.message : '연결 해제 실패'));
          }}
        >
          연결 해제
        </button>
      </div>

      {provider !== 'google' && connected && (
        <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">사용할 기본 모델</span>
            <select
              aria-label="연결한 AI 모델 선택"
              className="block w-full p-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              disabled={busy}
              value={connections[provider]?.model || ''}
              onChange={async (e) => {
                const model = e.target.value;
                if (!model) return;
                setBusy(true);
                try {
                  await saveConnection(provider, { ...(connections[provider] || { model, models: shortlist }), model });
                  selectConnection(provider, model);
                  setConnections(readConnections());
                  setMessage(`✅ 사용할 모델(${model})을 저장했습니다. 에디터 AI 패널에서 바로 질문하세요.`);
                } catch (error) {
                  setMessage(`❌ 모델 저장 실패: ${error instanceof Error ? error.message : '리소스 연결을 확인해 주세요.'}`);
                } finally { setBusy(false); }
              }}
            >
              <option value="">모델을 선택해 주세요</option>
              {connections[provider]?.model &&
                !shortlist.some((m) => m.id === connections[provider]?.model) &&
                !(connections[provider]?.models || []).some((m) => m.id === connections[provider]?.model) && (
                <option value={connections[provider]!.model}>
                  {connections[provider]!.model} (직접 지정)
                </option>
              )}
              <optgroup label="추천 모델">
                {shortlist.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.family} · {m.name}
                  </option>
                ))}
              </optgroup>
              {(connections[provider]?.models || []).some((m) => !shortlist.some((s) => s.id === m.id)) && (
                <optgroup label="API 조회 모델">
                  {(connections[provider]?.models || [])
                    .filter((m) => !shortlist.some((s) => s.id === m.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.id}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </label>
          <div className="flex gap-1.5 items-center">
            <input
              type="text"
              value={customModelInput}
              disabled={busy}
              onChange={(e) => setCustomModelInput(e.target.value)}
              placeholder="새 모델 ID 직접 입력 (예: gpt-5, claude-4-sonnet)"
              className="flex-1 p-1.5 px-2.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
            />
            <button
              type="button"
              disabled={busy || !customModelInput.trim()}
              onClick={async () => {
                const nextModel = customModelInput.trim();
                setBusy(true);
                try {
                  const prevModels = connections[provider]?.models || shortlist;
                  const nextModels = prevModels.some((m) => m.id === nextModel)
                    ? prevModels
                    : [...prevModels, { id: nextModel, name: nextModel, family: AI_LABELS[provider] }];
                  await saveConnection(provider, { model: nextModel, models: nextModels, updatedAt: Date.now() });
                  selectConnection(provider, nextModel);
                  setConnections(readConnections());
                  setCustomModelInput('');
                  setMessage(`✅ 직접 입력한 모델(${nextModel})을 저장했습니다.`);
                } catch (error) {
                  setMessage(`❌ 모델 저장 실패: ${error instanceof Error ? error.message : '리소스 연결을 확인해 주세요.'}`);
                } finally { setBusy(false); }
              }}
              className="px-2.5 py-1.5 rounded-lg border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-xs font-semibold disabled:opacity-40 cursor-pointer shrink-0"
            >
              직접 적용
            </button>
          </div>
        </div>
      )}

      {message && <p role="status" className="text-xs whitespace-pre-wrap font-medium pt-1 text-purple-700 dark:text-purple-300">{message}</p>}
    </section>
  );
}

function CustomAIProvidersSection({ scope }: { scope: string }) {
  const [items, setItems] = useState<CustomAIProviderConfig[]>(() => readCustomConnections());
  const [drafts, setDrafts] = useState<CustomAIProviderConfig[]>([]);

  useEffect(() => {
    const sync = () => setItems(readCustomConnections());
    window.addEventListener('onrivi:ai-connections', sync);
    return () => window.removeEventListener('onrivi:ai-connections', sync);
  }, []);

  const addDraft = () => {
    const id = `custom_${Date.now()}`;
    setDrafts((prev) => [
      ...prev,
      { id, name: '', baseUrl: '', apiKey: '', model: '', models: [] },
    ]);
  };

  const allCards = [...items, ...drafts.filter((d) => !items.some((i) => i.id === d.id))];

  return (
    <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <span>🔌</span> 직접 연결 (OpenAI 호환 · Custom)
          </h4>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            DeepSeek, OpenRouter, Groq, 로컬 Ollama/vLLM, 사내 LLM 등 OpenAI 호환 API를 코드 수정 없이 자유롭게 추가할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={addDraft}
          className="shrink-0 rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-3 py-1.5 text-xs font-bold shadow-xs transition cursor-pointer"
        >
          + 새 AI 추가
        </button>
      </div>

      {allCards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          아직 등록된 직접 연결 AI가 없습니다. 우측 상단 <strong>[+ 새 AI 추가]</strong>를 눌러 원하는 API를 등록해 보세요.
        </div>
      ) : (
        allCards.map((cfg) => (
          <CustomAIProviderCard
            key={cfg.id}
            scope={scope}
            initial={cfg}
            isSaved={items.some((i) => i.id === cfg.id)}
            onRemoveDraft={() => setDrafts((prev) => prev.filter((d) => d.id !== cfg.id))}
          />
        ))
      )}
    </div>
  );
}

function CustomAIProviderCard({
  scope,
  initial,
  isSaved,
  onRemoveDraft,
}: {
  scope: string;
  initial: CustomAIProviderConfig;
  isSaved: boolean;
  onRemoveDraft: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [model, setModel] = useState(initial.model);
  const [models, setModels] = useState<AIModel[]>(initial.models || []);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setName(initial.name);
    setBaseUrl(initial.baseUrl);
    setApiKey(initial.apiKey);
    setModel(initial.model);
    setModels(initial.models || []);
  }, [initial]);

  const buildConfig = (nextModels = models, nextModel = model): CustomAIProviderConfig => ({
    id: initial.id,
    name: name.trim() || '커스텀 AI',
    baseUrl: baseUrl.trim(),
    apiKey: apiKey.trim(),
    model: nextModel.trim(),
    models: nextModels,
  });

  const handleFetchModels = async () => {
    if (!baseUrl.trim()) {
      setMessage('❌ API Base URL을 먼저 입력해 주세요. (예: https://api.deepseek.com/v1)');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const cfg = buildConfig();
      await saveCustomConnection(cfg);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      try {
        const fetched = await aiRequest(
          scope,
          'custom',
          'models',
          { model: cfg.model || 'test', prompt: '', images: [], baseUrl: cfg.baseUrl, customId: cfg.id },
          controller.signal
        );
        const nextModel = cfg.model || fetched[0]?.id || '';
        setModels(fetched);
        if (nextModel) setModel(nextModel);
        await saveCustomConnection(buildConfig(fetched, nextModel));
        if (nextModel) selectConnection('custom', nextModel, cfg.id);
        setMessage(
          fetched.length > 0
            ? `✅ 연결 확인 완료! 모델 ${fetched.length}개를 불러왔습니다.`
            : '✅ 저장되었습니다. (/models 미지원 서버이므로 아래에 모델 ID를 직접 입력해 주세요.)'
        );
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      setMessage(`❌ 연결 실패: ${error instanceof Error ? error.message : 'URL 및 API 키를 확인해 주세요.'}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!baseUrl.trim()) {
      setMessage('❌ API Base URL을 입력해 주세요.');
      return;
    }
    if (!model.trim()) {
      setMessage('❌ 사용할 모델 ID를 입력하거나 선택해 주세요.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const cfg = buildConfig();
      await saveCustomConnection(cfg);
      selectConnection('custom', cfg.model, cfg.id);
      onRemoveDraft();
      setMessage(`✅ '${cfg.name}' (${cfg.model}) 저장 및 기본 AI로 선택되었습니다.`);
    } catch (error) {
      setMessage(`❌ 저장 실패: ${error instanceof Error ? error.message : '리소스 폴더 연결을 확인해 주세요.'}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!isSaved) {
      onRemoveDraft();
      return;
    }
    setBusy(true);
    try {
      await removeCustomConnection(initial.id);
      if (selectedConnection().customId === initial.id) {
        selectConnection('google', '');
      }
      onRemoveDraft();
    } catch (error) {
      setMessage(`❌ 삭제 실패: ${error instanceof Error ? error.message : '오류가 발생했습니다.'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-blue-200 dark:border-blue-900/60 p-4 space-y-3 text-xs bg-white dark:bg-zinc-900/60 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
          🔌 {name.trim() || '새 OpenAI 호환 AI'}
        </span>
        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${isSaved && baseUrl && model ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
          {isSaved && baseUrl && model ? '● 등록됨' : '○ 작성 중'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <label className="block space-y-1">
          <span className="font-semibold text-zinc-600 dark:text-zinc-400">제공사 이름</span>
          <input
            type="text"
            disabled={busy}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: DeepSeek, OpenRouter, Ollama"
            className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
          />
        </label>
        <label className="block space-y-1">
          <span className="font-semibold text-zinc-600 dark:text-zinc-400">API Base URL</span>
          <input
            type="url"
            disabled={busy}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.deepseek.com/v1"
            className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="font-semibold text-zinc-600 dark:text-zinc-400">API 키 (로컬 Ollama 등은 비워둘 수 있음)</span>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            autoComplete="new-password"
            disabled={busy}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-... 또는 발급받은 API 키"
            className="w-full p-2 pr-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
          >
            {showKey ? '🙈' : '👁️'}
          </button>
        </div>
      </label>

      <div className="space-y-1.5">
        <span className="block font-semibold text-zinc-600 dark:text-zinc-400">모델 ID (목록 조회 선택 또는 직접 입력)</span>
        {models.length > 0 && (
          <select
            disabled={busy}
            value={models.some((m) => m.id === model) ? model : ''}
            onChange={(e) => {
              if (e.target.value) setModel(e.target.value);
            }}
            className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
          >
            <option value="">조회된 모델에서 선택…</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name || m.id}</option>
            ))}
          </select>
        )}
        <input
          type="text"
          disabled={busy}
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="예: deepseek-chat, llama3.2, anthropic/claude-sonnet-4.5"
          className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono"
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={busy || !baseUrl.trim()}
          onClick={() => void handleFetchModels()}
          className="rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-3 py-1.5 font-semibold disabled:opacity-40 cursor-pointer"
        >
          {busy ? '확인 중…' : '모델 목록 조회'}
        </button>
        <button
          type="button"
          disabled={busy || !baseUrl.trim() || !model.trim()}
          onClick={() => void handleSave()}
          className="rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1.5 font-bold disabled:opacity-40 cursor-pointer shadow-xs"
        >
          저장 및 사용
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleDelete()}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 font-semibold cursor-pointer ml-auto"
        >
          {isSaved ? '삭제' : '취소'}
        </button>
      </div>

      {message && <p role="status" className="text-xs whitespace-pre-wrap font-medium pt-1 text-purple-700 dark:text-purple-300">{message}</p>}
    </section>
  );
}
