// ====================================================================
// 📊 [OMD-AI-ATTACH-0001] src/lib/ai/attachments.ts
// 🎯 @KICK  : AI 첨부 파일 파싱 및 시스템 프롬프트 조립 엔진
// 🛡️ @GUARD : Rule 1(소스코드 주석 관리), 첨부 파일 크기/형식 검증 및 자연스러운 일반 지식 질의응답 보장
// 🚨 @PATCH : **2026-10-21** — [AI 일반 질문 시 첨부자료 강제 요구 결함 해결 및 자연스러운 상식·지식 답변 보장]:
//             1) buildAIPrompt 개편: 첨부파일이 없을 때 빈 [첨부 참고자료] 블록 및 '사실과 출처를 만들어내지 마세요' 과잉 억제 문구를 제거하여 AI가 자체 지식으로 일반 질문에 즉시 풍부하게 답변하도록 정상화
//             2) 실제 텍스트 첨부파일이 존재할 때만 [첨부 참고자료] 블록을 조건부 주입하여 모델의 불필요한 첨부 요구 착각 원천 박멸
// ====================================================================

import type { AIAttachment } from './types';

export const ATTACH_ACCEPT = '.txt,.md,.csv,.json,.pdf,.docx,.png,.jpg,.jpeg,.webp';

export async function readAIAttachment(file: File): Promise<AIAttachment> {
  if (file.size > 10 * 1024 * 1024) throw Error('파일당 최대 10MB까지 첨부할 수 있습니다.');
  const ext = file.name.split('.').pop()?.toLowerCase(),
    base = { id: crypto.randomUUID(), name: file.name, size: file.size };

  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime =
      bytes[0] === 137 && bytes[1] === 80
        ? 'image/png'
        : bytes[0] === 255 && bytes[1] === 216
        ? 'image/jpeg'
        : String.fromCharCode(...Array.from(bytes.slice(0, 4))) === 'RIFF' &&
          String.fromCharCode(...Array.from(bytes.slice(8, 12))) === 'WEBP'
        ? 'image/webp'
        : '';
    if (!mime) throw Error('이미지 파일 형식을 확인해 주세요.');
    const image = await createImageBitmap(file);
    try {
      if (image.width * image.height > 40_000_000) throw Error('첨부 이미지 해상도가 너무 큽니다.');
    } finally {
      image.close();
    }
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(Error('이미지를 읽지 못했습니다.'));
      reader.readAsDataURL(new Blob([bytes], { type: mime }));
    });
    return { ...base, mime, data };
  }

  let text = '';
  if (['txt', 'md', 'csv', 'json'].includes(ext || '')) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.includes(0)) throw Error('텍스트 파일의 인코딩을 UTF-8로 저장해 주세요.');
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw Error('UTF-8 텍스트 파일만 첨부할 수 있습니다.');
    }
  } else if (ext === 'docx') {
    const mammoth = await import('mammoth');
    text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  } else if (ext === 'pdf') {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    const loading = pdfjs.getDocument({ data: await file.arrayBuffer() });
    try {
      const pdf = await loading.promise;
      if (pdf.numPages > 100) throw Error('PDF는 최대 100쪽까지 첨부할 수 있습니다.');
      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pages.push(
          `[${i}페이지]\n` +
            content.items.map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '')).join('')
        );
        if (pages.join('').length > 80000) throw Error('PDF 분량을 줄여 주세요.');
        page.cleanup();
      }
      text = pages.join('\n\n');
    } finally {
      await loading.destroy();
    }
  } else {
    throw Error('이 파일 형식은 아직 AI 첨부를 지원하지 않습니다.');
  }

  if (!text.trim() || (ext === 'pdf' && !text.replace(/\[\d+페이지\]/g, '').trim())) {
    throw Error('추출할 글자가 없습니다. 스캔 PDF는 텍스트가 있는 PDF로 변환해 주세요.');
  }
  if (text.length > 80000) throw Error('첨부 텍스트는 80,000자 이하로 줄여 주세요.');
  return { ...base, text };
}

export function buildAIPrompt(
  instruction: string,
  target: string,
  attachments: AIAttachment[],
  task: string,
  general = false
): string {
  const textAttachments = attachments.filter((a) => a.text && a.text.trim());
  const attachSection =
    textAttachments.length > 0
      ? '\n\n[첨부 참고자료]\n' + textAttachments.map((a) => `[파일: ${a.name}]\n${a.text}`).join('\n\n')
      : '';

  let prompt = '';
  if (general) {
    prompt =
      '당신은 친절하고 지식이 풍부한 한국어 AI 도우미입니다. 사용자의 질문에 대해 명확하고 유익하게 성실히 답변하세요. 일반적인 질문이나 지식에 대해서는 당신이 알고 있는 풍부한 상식과 사실 정보를 바탕으로 자세하고 알기 쉽게 설명해 주세요.';
    if (textAttachments.length > 0) {
      prompt += ' 제공된 첨부 참고자료가 있는 경우 그 내용을 최우선으로 반영하여 답변하세요.';
    }
    prompt += `\n\n[사용자 질문]\n${instruction}`;
    if (attachSection) {
      prompt += attachSection;
    }
  } else {
    prompt =
      '당신은 전문적인 한국어 문서 편집 도우미입니다. 사용자의 작업 지시에 따라 대상 글을 완성도 높게 작성·교정·편집하세요. 요청한 본문 결과만 출력하고 사고 과정이나 서론, 불필요한 메타 설명은 덧붙이지 마세요.';
    if (textAttachments.length > 0) {
      prompt += ' 제공된 첨부 참고자료가 있는 경우 그 내용을 참고하여 작업하세요.';
    }
    prompt += `\n\n[작업] ${task}\n[사용자 요청]\n${instruction}`;
    if (target && target.trim()) {
      prompt += `\n\n[편집 대상 자료]\n${target}`;
    }
    if (attachSection) {
      prompt += attachSection;
    }
  }

  if (prompt.length > 100000) throw Error('전송할 텍스트가 100,000자를 넘었습니다. 범위나 첨부를 줄여 주세요.');
  return prompt;
}
