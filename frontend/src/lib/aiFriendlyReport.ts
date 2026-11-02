// ====================================================================
// 📊 [OMD-REPORT-aiFriendlyReport-0001] aiFriendlyReport.ts ➔ 행안부 AI 친화적 보고서 핵심 원칙 및 미디어 캡션 헬퍼
// 🚨 @PATCH : **2026-10-22** — [미디어 종류별 캡션 설정 해석(resolveCaptionConfig) 신설]: 서식 프로필의 kindOverrides를 공통 설정 위에 병합하여 표·그림·지도·동영상별 캡션 위치/구문을 반환
// 🚨 @PATCH : **2026-10-21** — [미디어 설명(캡션) 포맷 다변화 및 커스텀 표현 구문(formatMediaCaption) 신설]:
//             1) 그림/표/지도/동영상 캡션 포맷(표준/대괄호/화살괄호/일반텍스트/제목만/커스텀) 생성 엔진 formatMediaCaption 신설
//             2) nextReportNumber에서 표·그림뿐만 아니라 지도·영상 및 대괄호/화살괄호 구문까지 폭넓게 순번 자동 탐지하도록 정규식 확장
// ====================================================================

// Based only on the supplied 2026-08-24 MOIS press release; these are optional authoring aids.
export const AI_REPORT_PRINCIPLES = `문서의 사실·수치·출처와 의미를 보존한다. 문장은 의미가 완결된 서술식으로 작성한다.
표·그림은 필요한 경우 사용하며 없애도록 강요하지 않는다. 각각 상단에 제목을 쓰고 '표 1.', '그림 1.'처럼 순서를 표시한다.
표 안의 표 등 복잡한 양식을 피하고 셀 병합은 단순하게 한다. 복잡한 원본 표는 자동으로 풀거나 누락시키지 말고 확인할 위치와 대안을 제시한다.
항목 계층은 Ⅰ., 1., 가., 1), 가) 순서로 통일한다. 항목 표시는 원문에 남기는 텍스트로 작성한다.
장식용 표·그림·이모지·과도한 강조를 추가하지 않는다. 요지·키워드·결재란·직인·특정 여백 수치를 의무 항목으로 추가하지 않는다.
정부 공식 인증이나 모든 기관에 대한 법적 의무라고 표현하지 않는다.`;

export function resolveCaptionConfig(
  structure: import('@/types/cssProfile').MediaCaptionStructure | undefined,
  kind: import('@/types/cssProfile').MediaCaptionKind
): import('@/types/cssProfile').MediaCaptionStructure | undefined {
  if (!structure) return undefined;
  const { kindOverrides, ...base } = structure;
  return { ...base, ...(kindOverrides?.[kind] || {}) } as import('@/types/cssProfile').MediaCaptionStructure;
}

export function reportCaption(kind: string, number: number, title: string): string {
  return formatMediaCaption(kind, number, title, 'standard');
}

export function formatMediaCaption(
  kind: string,
  number: number,
  title: string,
  format: 'standard' | 'bracket' | 'angle' | 'plain' | 'title-only' | 'custom' | 'none' = 'standard',
  customTemplate?: string
): string {
  if (format === 'none') return '';
  const plain = title.replace(/[\r\n]+/g, ' ').trim();
  if (!plain) return '';
  const escaped = plain.replace(/([\\`*_\[\]<>])/g, '\\$1');
  const n = Math.max(1, Math.floor(number) || 1);

  switch (format) {
    case 'bracket':
      return `**[${kind} ${n}] ${escaped}**`;
    case 'angle':
      return `**<${kind} ${n}> ${escaped}**`;
    case 'plain':
      return `${kind} ${n}. ${escaped}`;
    case 'title-only':
      return `**${escaped}**`;
    case 'custom':
      if (customTemplate && customTemplate.trim()) {
        return customTemplate
          .replace(/{kind}/g, kind)
          .replace(/{n}/g, String(n))
          .replace(/{title}/g, escaped);
      }
      return `**${kind} ${n}. ${escaped}**`;
    case 'standard':
    default:
      return `**${kind} ${n}. ${escaped}**`;
  }
}

export function nextReportNumber(source: string, kind: string): number {
  if (!source) return 1;
  // Ignore fenced examples so their sample numbering does not affect this document.
  const text = source.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '');
  let maximum = 0;
  // 정규식: "**그림 1.", "[그림 1]", "<그림 1>", "그림 1." 등 다양한 캡션 형식에서 최대 번호 추출
  const regex = new RegExp(`(?:\\*\\*)?(?:\\[|<)?${kind}\\s+(\\d+)(?:[\\].>]|\\.)?`, 'gm');
  for (const match of Array.from(text.matchAll(regex))) {
    const val = Number(match[1]);
    if (!isNaN(val)) maximum = Math.max(maximum, val);
  }
  return maximum + 1;
}
