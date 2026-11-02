// ====================================================================
// 📊 [OMD-AI-templates-0001] src/lib/ai/templates.ts
// 🎯 @KICK  : AI 프롬프트 템플릿/프리셋 로드 및 저장 엔진 (D:\Onrivi_Asset\prompt\ai_presets.json 연동)
// 🛡️ @GUARD : Rule 1(단일 주석 관리), 로컬 리소스 폴더(resourceFolder) 및 클라우드 양방향 지원
// 🚨 @PATCH : **2026-10-20** — [템플릿 저장 시 동시성 충돌 방어 및 알 수 없는 필드 무손실 보존]:
//             1) revision 검증을 통한 다른 창 동시 편집 충돌 감지('다른 창이나 프로세스에서 템플릿이 변경되었습니다') 구축
//             2) original 항목의 unknown 커스텀 필드(unknownField 등) 무손실 병합 저장 완비
// 🚨 @PATCH : **2026-10-20** — [resourceFolder 직접 연결 및 템플릿 로드 결함 완전 해결]:
//             1) loadAITemplates 및 saveAITemplates에 resourceFolder 인자 추가하여 데스크톱 Electron 리소스 폴더의 ai_presets.json 15개 템플릿 즉시 로드
//             2) 파일 로드 예외 시 빈 배열로 안전 폴백하여 내장 템플릿(builtins)과 동시 렌더링 보장
// ====================================================================

import { readResourceJson, writeResourceJson } from '../resourceJson';
import { getResourceSettings } from '../resourceSettings';

export interface AITemplate {
  id: string;
  name: string;
  editorialCommand: string;
  folder?: string;
  [key:string]: unknown;
}

const revisions = new WeakMap<object, { raw: string; scope: string }>();
const scope = (resourceFolder?: string) => resourceFolder || JSON.stringify(getResourceSettings() || {});

export async function loadAITemplates(resourceFolder?: string, handle?: any): Promise<AITemplate[]> {
  const identity = scope(resourceFolder);
  let raw: any;
  try {
    raw = await readResourceJson('ai_presets.json', handle, resourceFolder);
  } catch (err) {
    console.warn('[templates] readResourceJson failed:', err);
    raw = [];
  }
  if (!Array.isArray(raw)) raw = [];
  const rows = raw.map((row: any, index: number) => ({
    ...row,
    id: String(row.id || `preset-${index}`),
    name: String(row.name || '이름 없음'),
    editorialCommand: row.editorialCommand || (row.systemPrompt ? `[작성 규칙]\n${row.systemPrompt}\n\n[입력 데이터]\n${row.userPrompt || row.userInputTemplate || ''}` : '')
  }));
  revisions.set(rows, { raw: JSON.stringify(raw), scope: identity });
  return rows;
}

export async function saveAITemplates(original: AITemplate[], next: AITemplate[], resourceFolder?: string, handle?: any) {
  const revision = revisions.get(original);
  const currentScope = scope(resourceFolder);
  let currentRaw = '[]';
  try {
    const current = await readResourceJson('ai_presets.json', handle, resourceFolder);
    currentRaw = JSON.stringify(current);
  } catch {}

  if (revision && revision.scope === currentScope && revision.raw !== currentRaw) {
    throw Error('다른 창이나 프로세스에서 템플릿이 변경되었습니다. 새로고침 후 다시 시도해 주세요.');
  }

  const mergedNext = next.map((item) => {
    const orig = original.find((o) => o.id === item.id);
    return orig ? { ...orig, ...item } : item;
  });

  const result = await writeResourceJson('ai_presets.json', mergedNext, handle, resourceFolder);
  if (!result.success) throw Error(result.error || '템플릿을 저장하지 못했습니다.');
  revisions.set(next, { raw: JSON.stringify(mergedNext), scope: currentScope });
  return next;
}

export function templateVariables(prompt: string) {
  return Array.from(new Set(Array.from(prompt.matchAll(/\{\{([^{}\n]{1,60})\}\}/g), m => m[1])));
}

export function fillTemplate(prompt: string, values: Record<string, string>) {
  return prompt.replace(/\{\{([^{}\n]{1,60})\}\}/g, (_match, key) => {
    if (!values[key]?.trim()) throw Error(`${key} 값을 입력해 주세요.`);
    return values[key];
  });
}
