import type { FrontmatterData } from '@/lib/frontmatter';
import hancomProfile from '@/data/blogProfiles/hancom-blog-style.json';

type StyleRule = Record<string, string>;

const PROFILE_CLASS = 'blog-hancom-profile';
const PROFILE_IDS = new Set([hancomProfile.id, 'profile-hancom-blog-visual-20260925']);

// 공개 글에서는 원고에 지정된 서식만 사용한다. 편집기의 로컬 프로필 저장소에는 접근하지 않는다.
export function getBlogProfileClass(frontmatter: FrontmatterData): string | undefined {
  const name = frontmatter.css_profile_name?.replace(/^['"]|['"]$/g, '').trim();
  return PROFILE_IDS.has(frontmatter.css_profile || '') || name === hancomProfile.name
    ? PROFILE_CLASS
    : undefined;
}

const tagSelectors: Record<string, string> = {
  h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h5', h6: 'h6',
  p: 'p', strong: 'strong', em: 'em', u: 'u', del: 'del',
  ul: 'ul', ol: 'ol', li: 'li', hr: 'hr', table: 'table', th: 'th', td: 'td',
  blockquote: 'blockquote', codeBlock: 'pre', a: 'a', img: 'img',
  code: ':not(pre) > code', video: 'video',
};

const allowedProperties = new Set([
  'background-color', 'border', 'border-bottom', 'border-bottom-color', 'border-bottom-style',
  'border-bottom-width', 'border-collapse', 'border-color', 'border-left', 'border-left-color',
  'border-left-width', 'border-radius', 'border-style', 'border-top-color', 'border-top-style',
  'border-top-width', 'border-width', 'box-shadow', 'color', 'display', 'float', 'font-size',
  'font-style', 'font-weight', 'height', 'letter-spacing', 'line-height', 'list-style-type',
  'margin-bottom', 'margin-left', 'margin-right', 'margin-top', 'max-width', 'object-fit',
  'overflow', 'padding', 'padding-bottom', 'padding-inline-start', 'padding-left',
  'text-align', 'text-decoration', 'text-decoration-color', 'text-decoration-style',
  'text-indent', 'text-underline-offset', 'width',
]);

function ruleToCss(rule: StyleRule, heading: boolean): string {
  const declarations = Object.entries(rule)
    .filter(([property, value]) => allowedProperties.has(property) && value.trim())
    .map(([property, value]) => `${property}: ${value};`);

  // 빈 제목 밑줄은 '선 없음'이라는 설정이다. 추가 CSS의 h2 선보다 우선한다.
  if (heading && !rule['border-bottom']?.trim()) declarations.push('border-bottom: none;');
  return declarations.join('\n');
}

// 서식 JSON의 태그 설정을 블로그 본문에만 적용한다. customCss의 전역 body/:root 및
// 충돌하는 h2 규칙을 주입하지 않아, 왼쪽 설정과 공개 화면의 우선순위가 일치한다.
export const hancomBlogCss = (() => {
  const { pageStyle, rules } = hancomProfile;
  const base = `.${PROFILE_CLASS} {
    font-family: ${pageStyle.fontFamily};
    font-size: ${pageStyle.fontSize};
    line-height: ${pageStyle.lineHeight};
    letter-spacing: ${pageStyle.letterSpacing};
    background-color: ${pageStyle.backgroundColor};
    color: #333333;
    overflow-wrap: break-word;
  }`;
  const tags = Object.entries(tagSelectors).map(([tag, selector]) => {
    const rule = (rules as unknown as Record<string, StyleRule>)[tag];
    return rule ? `.${PROFILE_CLASS} ${selector} { ${ruleToCss(rule, /^h[1-6]$/.test(tag))} }` : '';
  }).join('\n');

  return `${base}\n.${PROFILE_CLASS} hr { border: 0; }\n${tags}\n
    .${PROFILE_CLASS} p { word-break: keep-all; }
    .${PROFILE_CLASS} img { display: block; max-width: 100%; height: auto; }
    .${PROFILE_CLASS} pre { overflow-x: auto; tab-size: ${pageStyle.tabSize}; }
    .${PROFILE_CLASS} pre code { background: transparent; color: inherit; border: 0; padding: 0; }
    .${PROFILE_CLASS} blockquote p { color: inherit; }
    .${PROFILE_CLASS} input[type='checkbox'] { width: ${hancomProfile.checkboxStructure.boxSize}; height: ${hancomProfile.checkboxStructure.boxSize}; }
    @media (max-width: 767px) { .${PROFILE_CLASS} table { display: block; overflow-x: auto; } }
  `;
})();
