// ====================================================================
// 📊 [OMD-CORE-knowledgeGuard-0001] knowledgeGuard.ts ➔ Knowledge Engine Guard
// 🎯 @KICK  : 지식 엔진 사용 전 3대 필수 조건(리소스 폴더 지정, AI 연결 상태, 요금제 라이선스) 검증 및 UI 활성화/차단 제어
// 🛡️ @GUARD : 리소스 폴더 없음/AI 미연결/라이선스 부족 시 지식 엔진 비활성화 및 안내 메시지 반환
// 🚨 @PATCH : **2026-09-04** — [사용자 지시 반영] AI 미연결 시 기능 비활성화 가드 및 리소스 폴더 필수 검증 모듈 최초 구현
// 🔗 @CALLS : 없음
// ====================================================================

export type KnowledgeBlockReason =
  | 'NO_RESOURCE_FOLDER'
  | 'NO_AI_CONNECTION'
  | 'NO_KNOWLEDGE_PLAN';

export interface KnowledgeGuardStatus {
  canUseKnowledge: boolean;
  hasResourceFolder: boolean;
  hasAiConnected: boolean;
  hasKnowledgePlan: boolean;
  blockReason?: KnowledgeBlockReason;
  blockMessage?: string;
}

/**
 * 지식 엔진 기능 활성화 가능 여부를 3대 필수 조건 기준으로 검증합니다.
 */
export function checkKnowledgeGuard(params: {
  resourceFolder?: string | null;
  geminiApiKey?: string | null;
  planCode?: string | null;
}): KnowledgeGuardStatus {
  const hasResourceFolder = Boolean(params.resourceFolder && params.resourceFolder.trim().length > 0);
  const hasAiConnected = Boolean(params.geminiApiKey && params.geminiApiKey.trim().length > 0);
  
  // 사용자 요청("일단 요금제가없으니까 ELITEPRO 이것으로 테스트하자...")에 따른 테스트 프리패스
  // 명시적 무료 차단 플랜(PLAN_EDITOR, READER)이 아닌 경우 모두 ELITEPRO 등급으로 허용
  const plan = (params.planCode || 'ELITEPRO').toUpperCase();
  const isExplicitlyBlocked = plan === 'PLAN_EDITOR' || plan === 'READER' || plan === 'PLAN_READER';
  const hasKnowledgePlan = !isExplicitlyBlocked;

  // 1. 리소스 폴더 미지정 가드
  if (!hasResourceFolder) {
    return {
      canUseKnowledge: false,
      hasResourceFolder: false,
      hasAiConnected,
      hasKnowledgePlan,
      blockReason: 'NO_RESOURCE_FOLDER',
      blockMessage: '공통 자원(리소스) 폴더가 설정되지 않았습니다. 환경설정에서 리소스 폴더를 먼저 지정해 주세요.',
    };
  }

  // 2. AI 미연결 가드
  if (!hasAiConnected) {
    return {
      canUseKnowledge: false,
      hasResourceFolder: true,
      hasAiConnected: false,
      hasKnowledgePlan,
      blockReason: 'NO_AI_CONNECTION',
      blockMessage: 'AI(Gemini)가 연결되어 있지 않습니다. 환경설정에서 API 키를 먼저 등록해 주세요.',
    };
  }

  // 3. 요금제 라이선스 가드
  if (!hasKnowledgePlan) {
    return {
      canUseKnowledge: false,
      hasResourceFolder: true,
      hasAiConnected: true,
      hasKnowledgePlan: false,
      blockReason: 'NO_KNOWLEDGE_PLAN',
      blockMessage: '개인 지식 엔진 기능은 [Apprentice / Regular / Elite Pro 플랜] 전용 기능입니다. 플랜을 확인해 주세요.',
    };
  }

  // 모든 가드 통과
  return {
    canUseKnowledge: true,
    hasResourceFolder: true,
    hasAiConnected: true,
    hasKnowledgePlan: true,
  };
}

/**
 * 서비스 레이어 강제 검증 함수 (미통과 시 예외 발생)
 */
export function assertKnowledgeAccess(params: {
  resourceFolder?: string | null;
  geminiApiKey?: string | null;
  planCode?: string | null;
}): void {
  const guard = checkKnowledgeGuard(params);
  if (!guard.canUseKnowledge) {
    throw new Error(`KNOWLEDGE_ACCESS_BLOCKED: ${guard.blockMessage}`);
  }
}
