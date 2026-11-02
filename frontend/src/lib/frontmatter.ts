/**
 * frontmatter.ts
 * 마크다운 파일 최상단의 YAML 메타데이터(Frontmatter)를 파싱하고 업데이트하는 유틸리티
 * 🚨 @PATCH : **2026-10-20** — [불필요한 '메타영역', '#서식설정' 텍스트 강제 주입 완전 삭제 및 비활성 워터마크 Frontmatter 누출 방어]:
 *             1) updateCssProfileInFrontmatter 시 하드코딩되었던 '메타영역', '#서식설정' 텍스트를 제거하여 표준 YAML 규격(---) 준수
 *             2) onrivi_print 내 잔존 base64 data: URL 이미지 바이너리 제거 및 enabled: false(비활성) 상태 시 Frontmatter 불필요 적재 배제
 * 🚨 @PATCH : **2026-10-17** — [공식 기본 서식(system-1) 메타데이터 불필요 강제 주입 방어]:
 *             기본 서식('default' 및 'system-1')이고 문서에 기존 css_profile이 지정되어 있지 않은 순수 마크다운 문서의 경우 불필요한 Frontmatter 강제 주입을 배제하여 5초 자동 저장 무한 루프 및 한글 타이핑 방해 원천 차단
 */

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*(\n|$)/;

export interface FrontmatterData {
  css_profile?: string;
  [key: string]: string | undefined;
}

/**
 * 텍스트에서 Frontmatter 영역과 순수 마크다운 영역을 분리하여 파싱합니다.
 * @param content 전체 마크다운 텍스트
 * @returns { content: 순수 마크다운 텍스트, data: 파싱된 키-값 쌍 }
 */
export function extractFrontmatter(content: string): { content: string; data: FrontmatterData } {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match) return { content, data: {} };
  
  const rawYaml = match[1];
  const restContent = content.slice(match[0].length);
  
  const data: FrontmatterData = {};
  const lines = rawYaml.split('\n');
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      data[key] = value;
    }
  }
  
  return { content: restContent, data };
}

/**
 * 주어진 텍스트의 Frontmatter에 css_profile 및 css_profile_name 값을 주입하거나 업데이트합니다.
 * @param content 전체 마크다운 텍스트
 * @param profileId 새롭게 지정할 서식 ID
 * @param profileName 새롭게 지정할 서식 이름 (선택사항)
 * @returns 업데이트된 새로운 마크다운 텍스트
 */
export function updateCssProfileInFrontmatter(content: string, profileId: string, profileName?: string, options: { persistDefault?: boolean } = {}): string {
  const { data, content: restContent } = extractFrontmatter(content);
  
  const currentProfile = data['css_profile']?.replace(/^["']|["']$/g, '');
  const currentName = data['css_profile_name']?.replace(/^["']|["']$/g, '');

  // 💡 이미 동일한 profileId와 name이 설정되어 있다면 불필요한 모델 치환 방지를 위해 원본 content 그대로 반환
  if (currentProfile === profileId && (!profileName || currentName === profileName)) {
    return content;
  }

  // 💡 기본 프로필('default' 또는 'system-1')이고 문서에 원래 css_profile이 지정되어 있지 않은 경우,
  //    순수 마크다운 문서에 불필요하게 YAML 메타데이터를 강제 주입하지 않고 원본 유지
  if (!options.persistDefault && (!profileId || profileId === 'default' || profileId === 'system-1') && !currentProfile) {
    return content;
  }
  
  // Update or set the profile ID
  data['css_profile'] = profileId;
  if (profileName) {
    data['css_profile_name'] = `"${profileName}"`;
  }
  
  // Reconstruct frontmatter
  let newYaml = '---\n';
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      if (k === 'onrivi_print') {
        try {
          const parsed = JSON.parse(v);
          if (parsed && typeof parsed === 'object') {
            if (parsed.image && typeof parsed.image === 'string' && parsed.image.startsWith('data:')) {
              parsed.image = '';
            }
            if (parsed.enabled === false) {
              continue; // Skip useless disabled watermark in frontmatter
            }
            newYaml += `${k}: ${JSON.stringify(parsed)}\n`;
            continue;
          }
        } catch {}
      }
      newYaml += `${k}: ${v}\n`;
    }
  }
  newYaml += '---\n\n';
  
  return newYaml + restContent;
}
