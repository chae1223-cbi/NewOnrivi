// ====================================================================
// 🚀 [OMD-LIB-AiFormatter-0001] aiFormatter
// 📝 @KICK : 추출된 원본 텍스트를 AI를 통해 구조화된 마크다운으로 변환
// 🚨 @PATCH : **2026-08-20** HWP 문서에서 추출된 표 데이터(뭉쳐진 텍스트)를 정확히 행/열로 분리하여 마크다운 표로 복원하도록 프롬프트 지시 강화.
// ====================================================================
import { GoogleGenerativeAI } from '@google/generative-ai';
import { runAIRequest, AI_REQUEST_TIMEOUT_MS } from './aiRequest';

/**
 * 추출된 거친 텍스트(Raw Text)를 Gemini AI를 사용하여
 * 서식이 잘 갖춰진 마크다운(Markdown)으로 재구성(포맷팅)합니다.
 * @param rawText 외부 문서에서 추출한 원시 텍스트
 * @param apiKey Google Gemini API 키
 * @param modelName 사용할 모델 (기본: gemini-3.8-flash)
 */
export async function formatRawTextToMarkdown(
  rawText: string,
  apiKey: string,
  modelName: string = 'gemini-3.8-flash',
  onRetry?: (attempt: number, delayMs: number) => void,
): Promise<string> {
  if (!apiKey) {
    throw new Error('AI API 키가 설정되지 않았습니다.');
  }

  // Keep image locations intact without sending large embedded images to the model.
  const images: string[] = [];
  const input = rawText.replace(/!\[[^\]]*\]\((?:<[^>\n]*>|[^\s)]*)(?:\s+["'][^'"\n]*["'])?\)|<img\b[^>]*>/gi, value => {
    const marker = `ONRIVI_IMAGE_${images.length}_END`;
    images.push(value.replace(/<img[^>]*src="([^"]+)"[^>]*>/gi, '![]($1)'));
    return marker;
  });
  if (!input.trim()) throw new Error('AI로 변환할 문서 내용이 없습니다.');
  if (input.length > 30000) throw new Error('AI 변환 문서가 30,000자를 초과합니다. 문서를 나누어 가져와 주세요.');
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: modelName });
  const prompt = `외부 문서의 내용을 마크다운으로 변환하세요.
제목, 목록, 표의 구조를 복원하되 내용을 생략하거나 추가하지 마세요.
HTML 대신 마크다운 문법을 사용하세요. ONRIVI_IMAGE_숫자_END 표시는 원래 위치에 그대로 유지하세요.
생각 과정이나 설명을 출력하지 말고 [출력형식] 뒤에 완성된 마크다운 본문만 출력하세요.
문서:
${input}`;
  return runAIRequest(modelName, prompt.length, async signal => {
    const result = await model.generateContent(prompt, { signal });
    const candidate = result.response.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      throw new Error(`AI 변환이 완료되지 않았습니다: ${candidate.finishReason}`);
    }
    let markdown = result.response.text().trim();
    const marker = markdown.lastIndexOf('[출력형식]');
    if (marker >= 0) markdown = markdown.slice(marker + '[출력형식]'.length).trim();
    markdown = markdown.replace(/^```[a-zA-Z0-9-]*\r?\n/, '').replace(/\r?\n```$/, '').trim();
    if (!markdown || /<\/?(?:html|body|p|div|table|h[1-6])\b/i.test(markdown)) {
      throw new Error('AI가 유효한 마크다운을 반환하지 않았습니다.');
    }
    for (let i = 0; i < images.length; i++) {
      const placeholder = `ONRIVI_IMAGE_${i}_END`;
      if (!markdown.includes(placeholder)) throw new Error('AI 변환 결과에서 이미지가 누락되었습니다.');
      markdown = markdown.split(placeholder).join(images[i]);
    }
    return markdown;
  }, AI_REQUEST_TIMEOUT_MS, { onRetry });
}
