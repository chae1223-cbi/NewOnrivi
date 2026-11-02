// ====================================================================
// 📊 [OMD-DOC-DOCUMENTPRINTSETTINGS-0001] documentPrintSettings.ts
// 🎯 @KICK  : 문서 단위 인쇄·워터마크 설정 및 전역 기본 워터마크(환경설정) 직렬화/역직렬화 관리
// 🚨 @PATCH : **2026-10-20** — [워터마크 frontmatter base64 바이너리 주입 원천 차단 및 고아 메타데이터 자동 정돈]:
//             1) writePrintSettings 시 data: URL(base64 바이너리)이 frontmatter에 직접 주입되는 현상 원천 차단 (image: ''로 치환 저장)
//             2) compactLegacyPrintMetadata에서 기존 문서에 잔존하는 orphaned 워터마크 찌꺼기(iL59...base64 및 닫는 ---) 자동 제거
//             3) legacy JSON의 data: base64 이미지 바이너리 자동 제거로 파일 용량 비대화 및 파서 오작동 방어
// 🚨 @PATCH : **2026-10-19** — [워터마크 디폴트 이미지 및 Onrivi Author 문구 자동 적용]:
//             1) 워터마크 이미지 미지정 시 공식 엠블럼(512x512 투명) 자동 기본값 지정 및 기본 종류를 'image'로 설정
//             2) 워터마크 문구 미지정 시 'Onrivi Author' 자동 기본값 지정
// ====================================================================
import { extractFrontmatter } from './frontmatter';
import { browserAccountStorage as localStorage } from './browserAccountStorage';
import { DEFAULT_WATERMARK_IMAGE, DEFAULT_WATERMARK_TEXT } from './defaultWatermark';

export { DEFAULT_WATERMARK_IMAGE, DEFAULT_WATERMARK_TEXT };

export type WatermarkPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface DocumentPrintSettings {
  version: 1;
  enabled: boolean;
  kind: 'text' | 'image';
  text: string;
  image: string;
  opacity: number;
  rotation: number;
  width: number;
  fontSize: number;
  position: WatermarkPosition;
  excludeFirst: boolean;
  imageResource?: string;
}

export const DEFAULT_PRINT_SETTINGS: DocumentPrintSettings = {
  version: 1,
  enabled: false,
  kind: 'image',
  text: DEFAULT_WATERMARK_TEXT,
  image: DEFAULT_WATERMARK_IMAGE,
  opacity: 15,
  rotation: 0,
  width: 45,
  fontSize: 48,
  position: 'center',
  excludeFirst: false
};

export const DEFAULT_WATERMARK_STORAGE_KEY = 'onrivi_default_watermark_settings';
export function watermarkSettingsForStorage(settings:DocumentPrintSettings){
  return {...settings,image:settings.image.startsWith('data:')?'':settings.image};
}

const clamp = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;

export function normalizePrintSettings(raw: any): DocumentPrintSettings {
  const d = DEFAULT_PRINT_SETTINGS;
  const rawText = typeof raw?.text === 'string' ? raw.text.trim() : '';
  const text = rawText && rawText !== '초안' ? rawText.slice(0, 200) : DEFAULT_WATERMARK_TEXT;
  const rawImage = typeof raw?.image === 'string' ? raw.image.trim() : '';
  const image = rawImage || DEFAULT_WATERMARK_IMAGE;
  const kind = raw?.kind === 'text' ? 'text' : 'image';

  return {
    version: 1,
    enabled: raw?.enabled === true,
    kind,
    text,
    image,
    opacity: clamp(raw?.opacity, 0, 100, d.opacity),
    rotation: clamp(raw?.rotation, -90, 90, typeof raw?.rotation === 'number' ? raw.rotation : (kind === 'image' ? 0 : d.rotation)),
    width: clamp(raw?.width, 5, 95, d.width),
    fontSize: clamp(raw?.fontSize, 8, 160, d.fontSize),
    position: ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(raw?.position) ? raw.position : 'center',
    excludeFirst: raw?.excludeFirst === true,
    imageResource: typeof raw?.imageResource === 'string' ? raw.imageResource : undefined
  };
}

export function getDefaultWatermarkSettings(): DocumentPrintSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_PRINT_SETTINGS };
  try {
    const raw = localStorage.getItem(DEFAULT_WATERMARK_STORAGE_KEY);
    if (raw) {
      return normalizePrintSettings(JSON.parse(raw));
    }
  } catch (e) {
    console.warn('[Watermark] 기본 워터마크 설정 로드 실패:', e);
  }
  return { ...DEFAULT_PRINT_SETTINGS };
}

export function saveDefaultWatermarkSettings(settings: DocumentPrintSettings): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized = normalizePrintSettings(settings);
    // Keep old embedded user images until the user migrates them from Settings.
    if(normalized.image.startsWith('data:')&&normalized.image!==DEFAULT_WATERMARK_IMAGE)return;
    localStorage.setItem(DEFAULT_WATERMARK_STORAGE_KEY, JSON.stringify(watermarkSettingsForStorage(normalized)));
  } catch (e) {
    console.warn('[Watermark] 기본 워터마크 설정 저장 실패:', e);
  }
}

export function hasDocumentPrintSettings(source: string): boolean {
  return Boolean(extractFrontmatter(source).data.onrivi_print);
}

export function readPrintSettings(source: string): DocumentPrintSettings {
  try {
    return normalizePrintSettings(JSON.parse(extractFrontmatter(source).data.onrivi_print || '{}'));
  } catch {
    return { ...DEFAULT_PRINT_SETTINGS };
  }
}

/**
 * 환경설정에 저장한 기본값을 우선 사용합니다.
 * 아직 기본값을 저장하지 않은 환경에서는 기존 문서 설정을 호환용으로 읽습니다.
 */
export function readEffectivePrintSettings(source: string): DocumentPrintSettings {
  if(typeof window!=='undefined' && localStorage.getItem(DEFAULT_WATERMARK_STORAGE_KEY))return getDefaultWatermarkSettings();
  if (hasDocumentPrintSettings(source)) {
    return readPrintSettings(source);
  }
  return getDefaultWatermarkSettings();
}

export function writePrintSettings(source: string, settings: DocumentPrintSettings): string {
  const normalized = normalizePrintSettings(settings);
  // Text watermarks and embedded data URLs never store base64 bytes in frontmatter.
  const value = JSON.stringify({
    ...normalized,
    image: normalized.kind === 'text' || normalized.image.startsWith('data:') ? '' : normalized.image
  });
  const match = source.match(/^(?:\uFEFF)?---[^\S\r\n]*\r?\n([\s\S]*?)\r?\n---[^\S\r\n]*(?:\r?\n|$)/);
  if (!match) return `---\nonrivi_print: ${value}\n---\n\n${source}`;
  const newline = match[0].includes('\r\n') ? '\r\n' : '\n';
  const lines = match[1].split(/\r?\n/).filter(line => !/^onrivi_print\s*:/.test(line));
  lines.push(`onrivi_print: ${value}`);
  return `---${newline}${lines.join(newline)}${newline}---${newline}` + source.slice(match[0].length);
}

/** Compact legacy JSON without rewriting unrelated frontmatter or user image data. */
export function compactLegacyPrintMetadata(source:string):string {
  // 🛡️ [고아/깨진 워터마크 메타 찌꺼기 제거]: 앞쪽 ---가 잘려 본문 상단에 노출된 base64 및 워터마크 JSON 찌꺼기 감지 및 정돈
  const ORPHANED_WATERMARK_PATTERNS = [
    /^(?:\uFEFF)?[A-Za-z0-9+/=]{10,}[\s\S]*?(?:"opacity":\s*-?\d+|"rotation":\s*-?\d+|"position":\s*"[^"]+"|"excludeFirst":\s*(?:true|false))[\s\S]*?\}\s*\r?\n---\s*(\r?\n|$)/,
    /^(?:\uFEFF)?onrivi_print:\s*\{[\s\S]*?\}\s*\r?\n---\s*(\r?\n|$)/,
    /^(?:\uFEFF)?---[^\S\r\n]*\r?\n[A-Za-z0-9+/=]{10,}[\s\S]*?(?:"opacity":\s*-?\d+|"rotation":\s*-?\d+|"position":\s*"[^"]+"|"excludeFirst":\s*(?:true|false))[\s\S]*?\}\s*\r?\n---\s*(\r?\n|$)/
  ];
  for (const pattern of ORPHANED_WATERMARK_PATTERNS) {
    if (pattern.test(source)) {
      source = source.replace(pattern, '');
    }
  }
  const match=source.match(/^(?:\uFEFF)?---[^\S\r\n]*\r?\n([\s\S]*?)\r?\n---[^\S\r\n]*(?:\r?\n|$)/);
  if(!match)return source;
  const compact=match[0].replace(/^(onrivi_print\s*:\s*)([^\r\n]*)/m,(line,prefix,json)=>{
    try {
      const raw=JSON.parse(json);
      if(!raw||typeof raw!=='object'||Array.isArray(raw))return line;
      if(typeof raw.image!=='string'||!raw.image.startsWith('data:'))return line;
      delete raw.image;
      return prefix+JSON.stringify(raw);
    }catch{return line;}
  });
  return compact+source.slice(match[0].length);
}

