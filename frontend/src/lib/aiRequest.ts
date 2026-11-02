// Covers the complete response, including consumption of streaming bodies.
export const AI_REQUEST_TIMEOUT_MS = 120_000;

export interface AIRetryOptions {
  onRetry?: (attempt: number, delayMs: number) => void;
  /** Override only for deterministic tests. */
  baseDelayMs?: number;
}

function serverStatus(error: unknown): number {
  const e = error as { status?: number; message?: string };
  return e?.status || Number(String(e?.message || '').match(/\b(400|401|403|404|429|500|503|504)\b/)?.[1]);
}

export function describeAIRequestError(error: unknown): string {
  const e = error as { status?: number; message?: string; name?: string };
  const message = String(e?.message || error);
  const status = e?.status || Number(message.match(/\b(400|401|403|404|429|500|503|504)\b/)?.[1]);
  if (/^AI(?: (?:변환|생성|응답이)|가 유효한)/.test(message)) return message;
  if (e?.name === 'AbortError' || /timeout|timed out|deadline|시간 초과/i.test(message) || status === 504) {
    return 'AI 응답 시간 초과: 서버가 제한 시간 안에 응답하지 않았습니다. 문서 분량을 줄이거나 잠시 후 다시 시도해 주세요.';
  }
  if (status === 503 || status === 500) return `Google AI 서버 오류(${status}): 서버 과부하 또는 처리 오류입니다. 잠시 후 다시 시도해 주세요.`;
  if (status === 429) return 'AI 요청 한도 초과(429): API 프로젝트의 할당량과 호출 한도를 확인해 주세요.';
  if (status === 404) return 'AI 모델 호출 실패(404): 선택한 모델이 API에서 제공되는지 확인해 주세요.';
  if (status === 401 || status === 403) return `AI 인증 오류(${status}): API 키와 프로젝트 권한을 확인해 주세요.`;
  if (status === 400) return 'AI 요청 오류(400): 선택한 모델과 요청 내용이 API 요구사항에 맞지 않습니다.';
  if (/parse stream/i.test(message)) return 'AI 응답 스트림이 끊기거나 손상되었습니다. 네트워크 연결을 확인하고 다시 시도해 주세요.';
  // Do not expose API URLs, document content, or credentials from SDK errors.
  return 'AI 처리에 실패했습니다. 네트워크 연결과 API 설정을 확인해 주세요.';
}

export async function runAIRequest<T>(
  model: string,
  inputChars: number,
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs = AI_REQUEST_TIMEOUT_MS,
  retryOptions: AIRetryOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        for (let attempt = 1; ; attempt++) {
          try {
            return await operation(controller.signal);
          } catch (error) {
            // Only retry transient server responses, never invalid output, credentials or quota errors.
            if (controller.signal.aborted || attempt >= 3 || ![500, 503, 504].includes(serverStatus(error))) throw error;
            const baseDelayMs = retryOptions.baseDelayMs ?? 3000;
            const delayMs = baseDelayMs * 2 ** (attempt - 1) + (baseDelayMs ? Math.floor(Math.random() * 1000) : 0);
            console.info('[AI request retry]', { model, attempt: attempt + 1, delayMs, status: serverStatus(error) });
            retryOptions.onRetry?.(attempt + 1, delayMs);
            await new Promise<void>((resolve, reject) => {
              const onAbort = () => { clearTimeout(delay); reject(new Error('AI 응답 시간 초과')); };
              const delay = setTimeout(() => { controller.signal.removeEventListener('abort', onAbort); resolve(); }, delayMs);
              controller.signal.addEventListener('abort', onAbort, { once: true });
            });
            if (controller.signal.aborted) throw new Error('AI 응답 시간 초과');
          }
        }
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          const error = new Error('AI 응답 시간 초과');
          error.name = 'AbortError';
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    const reason = describeAIRequestError(error);
    console.warn('[AI request failed]', { model, inputChars, elapsedMs: Date.now() - started, reason });
    throw new Error(reason);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
