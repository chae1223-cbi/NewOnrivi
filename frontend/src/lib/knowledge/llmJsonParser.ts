// ====================================================================
// 📊 [OMD-CORE-llmJsonParser-0001] llmJsonParser.ts ➔ LLM JSON Robust Parser & Repair
// 🎯 @KICK  : LLM(특히 Gemma, Llama 등 소형/오픈소스 계열)의 비정형 JSON 응답(코드블록, 서두/꼬리말 사족, 다중 JSON 블록 분할, 트레일링 콤마, 미따옴표 타입값 등) 완벽 복원 및 정규화
// 🛡️ @GUARD : 균형 잡힌 중괄호(Brace Balanced) 블록 추출, 멀티 블록 병합(Object.assign), 트레일링 콤마 자동 제거, 파싱 에러 시 원문 디버그 로깅
// 🚨 @PATCH : **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.3] LLM JSON 파서 및 자동 복원 엔진 신규 구현
// 🔗 @CALLS : 없음 (순수 정규식 및 균형 중괄호 알고리즘 기반 독립 모듈)
// ====================================================================

/**
 * 텍스트 내부에서 문자열 리터럴과 이스케이프(\")를 고려하여
 * 균형 잡힌 최상위 중괄호 '{' ~ '}' 블록들을 모두 추출합니다.
 */
export function extractBalancedJsonBlocks(text: string): string[] {
  const blocks: string[] = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let startIndex = -1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        if (depth === 0) {
          startIndex = i;
        }
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && startIndex !== -1) {
          blocks.push(text.substring(startIndex, i + 1));
          startIndex = -1;
        }
      }
    }
  }

  return blocks;
}

/**
 * LLM이 출력한 불완전하거나 비표준인 JSON 문자열을 표준 JSON 문법으로 보정합니다.
 */
export function repairJsonString(raw: string): string {
  let s = raw.trim();

  // 1. 외곽 마크다운 코드블록 제거 (```json ... ``` 또는 ``` ... ```)
  if (s.startsWith('```')) {
    s = s.replace(/^```[a-zA-Z0-9-]*\r?\n?/, '').replace(/\r?\n?```$/, '').trim();
  }

  // 2. 타입 명칭 치환 (Gemma 등 소형 모델의 스키마 에코 방어)
  // 예: "name": string -> "name": "string", "score": number -> "score": 80
  s = s
    .replace(/:\s*string\b/gi, ': "string"')
    .replace(/:\s*number\b/gi, ': 80')
    .replace(/:\s*boolean\b/gi, ': true');

  // 3. 트레일링 콤마 제거 (배열 또는 객체 닫는 괄호 앞의 콤마)
  // 예: [1, 2, ] -> [1, 2], { "a": 1, } -> { "a": 1 }
  s = s.replace(/,\s*([\]}])/g, '$1');

  // 4. 큰따옴표가 전혀 없고 작은따옴표만 쓰인 경우 (Python dict 스타일) 큰따옴표로 변환
  if (!s.includes('"') && s.includes("'")) {
    s = s.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
  }

  // 5. 따옴표 없는 영문 키 감싸기: { summary: "..." } -> { "summary": "..." }
  s = s.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  return s;
}

/**
 * LLM 응답 텍스트로부터 최선의 JSON 객체를 파싱 및 복원하여 반환합니다.
 */
export function parseAndRepairLlmJson(rawText: string): any {
  if (!rawText || !rawText.trim()) {
    throw new Error('LLM 응답이 비어 있습니다.');
  }

  const trimmed = rawText.trim();

  // 1단계: 원문 그대로 JSON.parse 시도
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    // 계속 진행
  }

  // 2단계: 코드블록 내부 내용 추출 시도
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const inside = codeBlockMatch[1].trim();
    try {
      return JSON.parse(inside);
    } catch (_) {
      try {
        return JSON.parse(repairJsonString(inside));
      } catch (_) {
        // 계속 진행
      }
    }
  }

  // 3단계: 균형 잡힌 중괄호 '{ ... }' 블록 추출
  const blocks = extractBalancedJsonBlocks(trimmed);
  if (blocks.length > 0) {
    if (blocks.length === 1) {
      // 단일 블록
      const candidate = blocks[0];
      try {
        return JSON.parse(candidate);
      } catch (_) {
        try {
          return JSON.parse(repairJsonString(candidate));
        } catch (_) {
          // 계속 진행
        }
      }
    } else {
      // 복수 블록이 발견된 경우 (Gemma 등이 필드별로 분할 출력하거나 서두/본문 분리 출력)
      const merged: Record<string, any> = {};
      let parseSuccessCount = 0;

      for (const block of blocks) {
        let blockParsed: any = null;
        try {
          blockParsed = JSON.parse(block);
        } catch (_) {
          try {
            blockParsed = JSON.parse(repairJsonString(block));
          } catch (_) {
            // 해당 블록 파싱 실패 시 무시
          }
        }

        if (blockParsed && typeof blockParsed === 'object' && !Array.isArray(blockParsed)) {
          Object.assign(merged, blockParsed);
          parseSuccessCount++;
        }
      }

      if (parseSuccessCount > 0) {
        return merged;
      }
    }
  }

  // 4단계: 첫 번째 '{'부터 마지막 '}'까지 전체 슬라이싱 및 정제 파싱
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const slice = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(repairJsonString(slice));
    } catch (finalErr: any) {
      console.error('[LLM JSON Parsing Failed. Raw Response]:\n', rawText);
      throw new Error(`JSON_PARSE_ERROR: ${finalErr.message}`);
    }
  }

  console.error('[LLM JSON Parsing Failed. Raw Response]:\n', rawText);
  throw new Error('JSON_NOT_FOUND: LLM 응답에서 JSON 객체를 찾을 수 없습니다.');
}
