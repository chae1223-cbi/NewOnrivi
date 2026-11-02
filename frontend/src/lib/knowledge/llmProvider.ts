// ====================================================================
// 📊 [OMD-CORE-llmProvider-0001] llmProvider.ts ➔ Knowledge LLM Provider
// 🎯 @KICK  : Gemini JSON Mode 기반 정형 분석(요약, 핵심요점, 태그, 검색어) 및 질의응답 프로바이더 구현
// 🛡️ @GUARD : API 키 미연결 방어, JSON Mode 강제 파싱, Rate-Limit(429) 지수 백오프 재시도, 다중 블록 병합
// 🚨 @PATCH : **2026-09-16** — [문서 본질 중심의 심층 정형 분석 프롬프트 고도화]:
//             1) 형식적 문구("~마크다운 문서입니다") 및 무의미한 메타 태그(#마크다운, #지식문서) 생성을 원천 차단하고 실제 법안/주제/핵심도메인 기반 요약 및 태그 강제
//             2) 목차명(개요/서론) 단순 복사를 금지하고 본문의 실제 수치, 조항, 주장 중심 핵심 요점(key_points) 및 검색어(search_terms) 추출 지침 명시
//             **2026-09-12** — [모든 AI 질의 표준 재시도 적용]: 1회 실패 후 3초 대기 -> 2회차 시도 후 3초 대기 -> 3회차 시도에서도 실패 시 최종 에러 메시지 표출 규칙을 analyzeDocument 및 answerQuestion에 전면 적용
// 🚨 @PATCH : **2026-09-12** — [Google AI Studio 공식 모델 한정 및 Gemini 3.1 이하 제거 반영]: 404/500/503 진단 안내 시 레거시 모델(< 3.1) 언급을 배제하고 플래그십(Gemini 3.8 Flash, 3.7 Flash) 안내로 일원화
// 🚨 @PATCH : **2026-09-12** — [사용자 선택 모델 존중: 임의 모델 폴백 배제 및 503/404 상세 진단 제공] answerQuestion 호출 시 사용자가 지정한 모델만 호출하며, 503(과부하) 또는 404(미지원) 발생 시 임의 모델로 바꿔치기하지 않고 명확한 에러 원인 및 권장 모델 변경 안내를 반환
//             **2026-09-05** — [사용자 지시 반영: 임의 모델 폴백 전면 제거 및 실패 원인 진단 고도화] gemini-2.5-flash 등 레거시 모델로의 임의 자동 폴백 로직을 전면 제거하고 사용자가 지정한 모델만 호출하도록 단일화; 404(모델 미지원/폐기), 503(일시적 트래픽 폭증/High Demand), 429(할당량 초과) 등 구체적 실패 원인과 조치 방법을 명확히 진단 메시지로 전달하도록 개편
//             **2026-09-04** — [503 Service Unavailable 및 고수요 모델 자동 폴백] gemma 등 특정 모델의 일시적 고수요(503 high demand) 또는 404 발생 시 gemini-2.5-flash/1.5-flash 안정 모델로 자동 폴백 및 503 재시도 로직 구축
//             **2026-09-04** — [Gemma 등 다중 JSON 블록 분할 및 비정형 출력 복원] llmJsonParser 연동, 균형 잡힌 중괄호 추출 및 다중 블록 자동 병합(Object.assign), 트레일링 콤마 보정 탑재
//             **2026-09-04** — [비정형 텍스트 및 사족 자동 정제] Gemma 등 모델이 JSON 서두에 설명문/사족을 붙이거나 코드블록을 출력할 때 순수 JSON 블록 자동 슬라이싱 및 파싱 안전 가드 탑재
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] LLMProvider 추상화 인터페이스 및 GeminiKnowledgeProvider 최초 구현
// 🔗 @CALLS : @google/generative-ai, ./knowledgeValidator.ts, ./llmJsonParser.ts
// ====================================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider, KnowledgeAnalysisResult } from '../../types/knowledge';
import { validateKnowledgeAnalysis } from './knowledgeValidator';
import { parseAndRepairLlmJson } from './llmJsonParser';

// 🚨 @PATCH : **2026-09-17** — [AI 프롬프트 내 특정 도메인(식품위생법/인디공연) 하드코딩 예시 전면 제거 및 도메인 중립 템플릿화]: 소형 모델(Gemma 등)이 프롬프트 예시를 그대로 베껴 타 문서(치과의원, 규약서 등)에 오염시키는 현상을 방지하기 위해 중립적 포맷 템플릿으로 정규화
const ANALYSIS_SYSTEM_PROMPT = `
당신은 개인 지식 베이스(RAG)를 구축하는 전문 문서 분석 AI입니다.
주어진 마크다운 문서를 깊이 있게 읽고, 반드시 유효한 단 하나의 JSON 객체 { ... } 로만 응답해야 합니다.

[분석 및 추출 핵심 지침]:
1. summary (요약): 단순 파일명이나 마크다운 형식("~마크다운 문서입니다")을 언급하지 말고, 문서가 다루는 실질적인 핵심 내용, 대상, 주요 목표/요구사항/주제를 2~3문장으로 명확히 요약하세요.
2. key_points (핵심 요점): 제목 껍데기(예: '프로젝트 개요', '기능 요구사항', '주의사항')를 절대로 그대로 적지 마세요. 반드시 해당 소제목과 그 아래에 기술된 구체적인 하위 항목, 수치, 조항, 세부 스펙, 비즈니스 규칙 내용을 종합하여 핵심 가치가 담긴 완성된 서술문으로 3~6개 추출하세요.
3. tags (태그): "#마크다운", "#지식문서", "#텍스트" 같은 무의미한 형식 태그를 절대 생성하지 마세요. 오직 제공된 문서 내용에서 직접 도출되는 실제 도메인, 제품명, 기관, 핵심 기술명, 주제어 위주로 5~10개 추출하고 관련도(score: 60~100)를 부여하세요. 절대로 다른 도메인의 무관한 태그를 생성하지 마세요.
4. search_terms (연관 검색어): 사용자가 지식 보관함에서 이 문서를 찾을 때 입력할 만한 구체적 검색 질의어(동의어, 유의어, 연관 단어)를 5~10개 추출하세요.

[응답 JSON 포맷]:
{
  "summary": "해당 문서의 핵심 주제, 목적, 주요 요구사항 또는 결론을 명확히 서술한 요약문 (2~3문장)",
  "key_points": [
    "[핵심영역 1] 세부 실질 내용 및 요구사항 1",
    "[핵심영역 2] 세부 실질 내용 및 요구사항 2",
    "[핵심영역 3] 세부 실질 내용 및 요구사항 3"
  ],
  "document_type": "guide",
  "tags": [
    { "name": "문서_핵심_키워드1", "score": 98 },
    { "name": "도메인_고유_용어2", "score": 95 }
  ],
  "search_terms": ["문서 관련 검색어 1", "문서 관련 검색어 2"]
}
`.trim();

export class GeminiKnowledgeProvider implements LLMProvider {
  public readonly name = 'GeminiKnowledgeProvider';
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'gemini-3.8-flash') {
    if (!apiKey || !apiKey.trim()) {
      throw new Error('MISSING_API_KEY: Google Gemini API 키가 제공되지 않았습니다.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey.trim());
    this.modelName = modelName.trim() || 'gemini-3.8-flash';
  }

  /**
   * 마크다운 텍스트를 입력받아 LLM 정형 분석을 수행합니다.
   * 특정 모델(gemma 등)이 503(high demand) 또는 404를 반환할 경우 표준 안정 모델로 자동 폴백합니다.
   */
  async analyzeDocument(markdownText: string): Promise<KnowledgeAnalysisResult> {
    if (!markdownText || !markdownText.trim()) {
      return {
        summary: '',
        keyPoints: [],
        documentType: 'note',
        tags: [],
        searchTerms: [],
      };
    }

    const selectedModel = this.modelName;
    const prompt = `${ANALYSIS_SYSTEM_PROMPT}\n\n[분석할 마크다운 원문]:\n${markdownText.slice(0, 15000)}`;

    const isGemma = selectedModel.toLowerCase().startsWith('gemma');
    const generationConfig: any = {
      temperature: 0.2,
    };
    if (!isGemma) {
      generationConfig.responseMimeType = 'application/json';
    }

    const model = this.genAI.getGenerativeModel({
      model: selectedModel,
      generationConfig,
    });

    let attempts = 0;
    const maxAttempts = 3; // 🔁 1초 주기 3회 재시도 (1회 실패 후 1초 대기 -> 2회 시도 후 1초 대기 -> 3회 시도 후 최종 실패 에러 표출)

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const result = await model.generateContent(prompt);
        const rawText = result.response.text().trim();

        const parsed = parseAndRepairLlmJson(rawText);
        const validated = validateKnowledgeAnalysis(parsed);
        return validated;
      } catch (err: any) {
        const status = err?.status;
        const msg = String(err?.message || '').toLowerCase();
        const isAuthError = status === 401 || status === 403 || msg.includes('api_key') || msg.includes('api key') || msg.includes('permission_denied') || msg.includes('unauthorized');
        const isNotFoundError = status === 404 || msg.includes('404') || msg.includes('no longer available') || msg.includes('not found');
        const canRetry = !isAuthError && !isNotFoundError;

        if (canRetry && attempts < maxAttempts) {
          console.warn(`[GeminiKnowledgeProvider] '${selectedModel}' ${attempts}회차 문서 분석 오류 (${status || '일시 오류'}). 1초 후 ${attempts + 1}회차 재시도합니다...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // 404 / 지원 중단 에러 진단
        if (isNotFoundError) {
          throw new Error(
            `MODEL_NOT_FOUND: 선택하신 AI 모델 '${selectedModel}'을(를) Google API에서 찾을 수 없거나 사용 중단되었습니다 (404 Not Found).\n` +
            `상세 사유: ${msg}\n` +
            `조치 방법: 에디터 하단 또는 환경설정에서 현재 서비스 중인 다른 Gemini 모델(예: gemini-3.8-flash, gemini-3.7-flash 등)을 선택해 주세요.`
          );
        }

        // 500/503 서버 오류 및 과부하
        if (status === 500 || status === 503 || msg.includes('500') || msg.includes('503') || msg.includes('high demand') || msg.includes('internal error')) {
          throw new Error(
            `SERVER_ERROR: 선택하신 AI 모델 '${selectedModel}' 처리 중 Google 서버 일시 오류(500/503)가 3회 연속 발생했습니다.\n` +
            `잠시 후 다시 시도하시거나, 에디터 하단에서 플래그십 모델(Gemini 3.8 Flash 또는 Gemini 3.7 Flash)로 변경해 주세요.`
          );
        }

        // 429 요청 한도 초과
        if (status === 429 || msg.includes('429') || msg.includes('quota')) {
          throw new Error(
            `RATE_LIMIT_EXCEEDED: Google Gemini API 요청 한도(Quota/Rate Limit)를 초과했습니다 (429).\n` +
            `약 1~2분 정도 잠시 기다리신 후 다시 시도해 주세요.`
          );
        }

        // 400 잘못된 요청 또는 JSON 모드 미지원
        if (status === 400 || msg.includes('400')) {
          throw new Error(
            `INVALID_REQUEST: 모델 '${selectedModel}' 호출 중 오류가 발생했습니다 (400 Bad Request).\n` +
            `상세 사유: ${msg}`
          );
        }

        throw new Error(`ANALYSIS_FAILED: 선택한 모델 '${selectedModel}' 분석 실패 (${msg || '알 수 없는 오류'})`);
      }
    }

    throw new Error(`ANALYSIS_FAILED: 선택한 모델 '${selectedModel}' 호출 실패`);
  }

  /**
   * 검색된 컨텍스트를 근거로 사용자의 질의에 답변을 생성합니다.
   * 사용자가 선택한 모델만을 단일 호출하며, 임의의 모델 폴백을 수행하지 않습니다.
   */
  async answerQuestion(query: string, contextText: string): Promise<{ answer: string; tokensUsed?: number }> {
    const prompt = `
당신은 사용자의 마크다운 지식 보관함을 기반으로 정확하게 답변하는 친절한 AI 어시스턴트입니다.
아래 제공된 [참고 지식 컨텍스트]를 최우선 근거로 활용하여 사용자의 질문에 한국어로 명확하고 구조적으로 답변하세요.

[참고 지식 컨텍스트]:
${contextText}

[사용자 질문]:
${query}

지침:
1. 제공된 지식 컨텍스트에 포함된 내용만을 사실 기반으로 답변하세요.
2. 답변 마지막에 어떤 문서의 내용을 참조했는지 언급하지 마세요 (UI에서 자동으로 출처 카드가 렌더링됩니다).
3. 컨텍스트만으로 알 수 없는 내용인 경우 추측하지 말고 "보관함 내 관련 문서에서 해당 내용을 찾을 수 없습니다"라고 정직하게 답변하세요.
`.trim();

    const selectedModel = this.modelName;

    let attempts = 0;
    const maxAttempts = 3; // 🔁 1초 주기 3회 재시도 (1회 실패 후 1초 대기 -> 2회 시도 후 1초 대기 -> 3회 시도 후 최종 실패 에러 표출)

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const model = this.genAI.getGenerativeModel({
          model: selectedModel,
          generationConfig: {
            temperature: 0.3,
          },
        });

        const result = await model.generateContent(prompt);
        const answer = result.response.text().trim();
        return { answer };
      } catch (err: any) {
        const status = err?.status;
        const msg = String(err?.message || '').toLowerCase();
        const isAuthError = status === 401 || status === 403 || msg.includes('api_key') || msg.includes('api key') || msg.includes('permission_denied') || msg.includes('unauthorized');
        const isNotFoundError = status === 404 || msg.includes('404') || msg.includes('no longer available') || msg.includes('not found');
        const canRetry = !isAuthError && !isNotFoundError;

        if (canRetry && attempts < maxAttempts) {
          console.warn(`[GeminiKnowledgeProvider] '${selectedModel}' ${attempts}회차 답변 생성 오류 (${status || '일시 오류'}). 1초 후 ${attempts + 1}회차 재시도합니다...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        if (isNotFoundError) {
          throw new Error(
            `MODEL_NOT_FOUND: 선택하신 AI 모델 '${selectedModel}'을(를) Google API에서 찾을 수 없거나 사용 중단되었습니다 (404 Not Found).\n` +
            `상세 사유: ${msg}\n` +
            `조치 방법: 에디터 또는 환경설정에서 다른 Gemini 모델(예: gemini-3.8-flash, gemini-3.7-flash 등)을 선택해 주세요.`
          );
        }

        if (status === 500 || status === 503 || msg.includes('500') || msg.includes('503') || msg.includes('high demand') || msg.includes('internal error')) {
          throw new Error(
            `SERVER_ERROR: 선택하신 AI 모델 '${selectedModel}' 처리 중 Google 서버 오류(500/503)가 3회 연속 발생했습니다.\n` +
            `잠시 후 다시 시도하시거나, 공식 플래그십 모델(Gemini 3.8 Flash, Gemini 3.7 Flash 등)을 선택해 주세요.`
          );
        }

        if (status === 429 || msg.includes('429') || msg.includes('quota')) {
          throw new Error(`RATE_LIMIT_EXCEEDED: API 요청 한도(429)를 초과했습니다. 약 1~2분 후 다시 시도해 주세요.`);
        }

        throw new Error(`답변 생성 실패 (${msg || '알 수 없는 오류'})`);
      }
    }

    throw new Error(`답변 생성 실패: 선택한 모델 '${selectedModel}'이 응답하지 않았습니다.`);
  }
}

/**
 * LLM 프로바이더 팩토리 함수
 */
export function createKnowledgeLLMProvider(
  providerType: 'gemini' | 'openai' | 'claude' = 'gemini',
  apiKey: string,
  modelName?: string
): LLMProvider {
  switch (providerType) {
    case 'gemini':
    default:
      return new GeminiKnowledgeProvider(apiKey, modelName);
  }
}
