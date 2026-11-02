// ====================================================================
// 📊 [OMD-CORE-paperSizes-0001] paperSizes ➔ PAPER_SIZES
// 🎯 @KICK  : 선택 가능한 용지 규격 상수 맵 — mm 단위 width/height 제공
// 🛡️ @GUARD : 키는 jsPDF format 이름과 호환 ('a4' → jsPDF 'a4')
// 🚨 @PATCH : **2026-10-27** — [SNS 카드뉴스 전용 용지 규격(sns_square 1:1 정사각, sns_portrait 4:5 세로형) 추가]:
//             인스타그램·쓰레드·링크드인·블로그 카드뉴스 제작을 위한 1:1 정사각형(200×200mm) 및 4:5 세로형(200×250mm) 판형 탑재
// 🚨 @PATCH : **2026-07-07** — 46판(saryuk) 출판 규격 추가
// 🔗 @CALLS : mmToPixels
// ====================================================================
export const PAPER_SIZES: Record<string, { label: string; width: number; height: number }> = {
  a3:           { label: 'A3',                      width: 297, height: 420 },
  a4:           { label: 'A4',                      width: 210, height: 297 },
  a5:           { label: 'A5 (국판)',               width: 148, height: 210 },
  b4:           { label: 'B4',                      width: 250, height: 353 },
  b5:           { label: 'B5 (46판 변형)',          width: 176, height: 250 },
  saryuk:       { label: '46판',                    width: 188, height: 257 },
  shinseo:      { label: '신서판 (단행본)',         width: 128, height: 188 },
  letter:       { label: 'Letter',                  width: 216, height: 279 },
  legal:        { label: 'Legal',                   width: 216, height: 356 },
  sns_square:   { label: 'SNS 카드뉴스 (1:1 정사각)', width: 200, height: 200 },
  sns_portrait: { label: 'SNS 카드뉴스 (4:5 세로형)', width: 200, height: 250 },
};

export const DEFAULT_PAPER_SIZE = 'a4';

// ====================================================================
// 📊 [OMD-CORE-paperSizes-0002] paperSizes ➔ mmToPixels
// 🎯 @KICK  : mm 값을 주어진 DPI 기준 px로 변환
// 🛡️ @GUARD : 기본 DPI는 96 (브라우저 표준)
// 🚨 @PATCH : 없음
// 🔗 @CALLS : 없음
// ====================================================================
export function mmToPixels(mm: number, dpi = 96): number {
  return Math.round(mm / 25.4 * dpi);
}
