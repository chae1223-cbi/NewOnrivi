export interface LocalFontSource {
  family: string;
  style?: string;
  fullName?: string;
  blob(): Promise<Blob>;
}
let sources: LocalFontSource[] = [];
export function rememberLocalFontSources(fonts: LocalFontSource[]) {
  sources = fonts;
}
export function getLocalFontSources() {
  return sources;
}
