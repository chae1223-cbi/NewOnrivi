// ====================================================================
// 📊 [OMD-TABLE-RATIO-0001] frontend/src/lib/tableColumnRatios.ts
// 🎯 @KICK  : 표 열의 기본 균등 비율과 수동 비율을 계산한다.
// 🛡️ @GUARD : 각 비율은 양수이고 전체 합계는 100%다. 부동소수점 오차 정밀 방어.
// 🚨 @PATCH : 2026-11-03 — 부동소수점 오차로 인한 mouseup 시 열 비율 리셋 결함 완전 해결 (0.1% 단위 정밀 반올림 적용)
// 🚨 @PATCH : 2026-11-03 — 열 수가 많거나 폭이 좁아도 이동하도록 5% 최소 폭 제한 해제
// ====================================================================

/**
 * ========================================================================================
 * [equalColumnRatios] 열 수에 맞춰 합계 100%의 균등 비율을 만든다.
 * @param {number} count - 열 수
 * @returns {number[]} 기본 비율
 * ========================================================================================
 */
export function equalColumnRatios(count: number): number[] {
  if (!Number.isInteger(count) || count < 1 || count > 100) return [];
  const base = Math.floor(100 / count);
  return Array.from({length: count}, (_, i) => base + (i < 100 % count ? 1 : 0));
}

/**
 * ========================================================================================
 * [validColumnRatios] 저장된 비율의 열 수와 합계를 검사한다.
 * @param {unknown} value - 저장된 값
 * @param {number} count - 현재 열 수
 * @returns {number[] | null} 유효한 비율 또는 null
 * ========================================================================================
 */
export function validColumnRatios(value: unknown, count: number): number[] | null {
  if (!Array.isArray(value) || value.length !== count || count < 1) return null;
  const widths = value.map(w => Math.round(Number(w) * 10) / 10);
  return widths.every(width => Number.isFinite(width) && width > 0)
    && Math.abs(widths.reduce((a, b) => a + b, 0) - 100) < 0.1 ? widths : null;
}

/**
 * ========================================================================================
 * [resizeTableBoundary] 드래그한 경계 양쪽의 두 열만 조절한다.
 * @param {number[]} current - 현재 열 비율
 * @param {number} boundary - 왼쪽 열 번호
 * @param {number} delta - 왼쪽 열에 더할 비율
 * @returns {number[]} 전체 합계가 유지되는 새 열 비율
 * ========================================================================================
 */
export function resizeTableBoundary(current: number[], boundary: number, delta: number): number[] {
  if (!validColumnRatios(current, current.length) || boundary < 0 || boundary >= current.length - 1) return current;
  const minimum = Math.min(1, 50 / current.length);
  const pair = Math.round((current[boundary] + current[boundary + 1]) * 10) / 10;
  const maxLeft = Math.round((pair - minimum) * 10) / 10;
  const left = Math.max(minimum, Math.min(maxLeft, Math.round((current[boundary] + delta) * 10) / 10));
  const right = Math.round((pair - left) * 10) / 10;
  const next = [...current];
  next[boundary] = left;
  next[boundary + 1] = right;
  return next;
}

/**
 * ========================================================================================
 * [ratiosBeforeTable] 표 직전 Markdown 주석에서 수동 열 비율을 읽는다.
 * @param {string} source - 문서 내용
 * @param {number} offset - 표 시작 위치
 * @param {number} count - 열 수
 * @returns {number[] | null} 수동 비율 또는 null
 * ========================================================================================
 */
export function ratiosBeforeTable(source: string, offset: number, count: number): number[] | null {
  if (!Number.isInteger(offset) || offset < 0) return null;
  const marker = source.slice(0, offset).match(/<!--\s*onrivi:table-widths=([\d.,]+)\s*-->\s*$/);
  return marker ? validColumnRatios(marker[1].split(',').map(Number), count) : null;
}
