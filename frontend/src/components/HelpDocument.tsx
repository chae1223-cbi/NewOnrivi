'use client';

import { useMemo } from 'react';
import MarkdownViewer from './MarkdownViewer';
import { syncMarkdownHeadingNumbers } from '@/lib/headingNumbering';
import { HELP_PROFILE } from '@/constants/cssProfile';

const root = '.onrivi-help-document';
const selectors: Record<string, string> = { codeBlock: 'pre', code: ':not(pre) > code' };
const tags = ['h1','h2','h3','h4','h5','h6','p','li','ol','table','th','td','a','blockquote','codeBlock','code'];
const css = `${root}{font-family:${HELP_PROFILE.pageStyle.fontFamily};font-size:16px;line-height:1.8;max-width:900px;margin-inline:auto;overflow-wrap:anywhere;}
${tags.map(key => `${root} ${selectors[key] || key}{${Object.entries(HELP_PROFILE.rules[key as 'h1'] || {}).map(([property,value]) => `${property}:${value}!important;`).join('')}}`).join('\n')}
${root} pre{overflow-x:auto;white-space:pre!important;}
${root} pre code{font-size:inherit!important;background:transparent!important;color:inherit!important;padding:0!important;}
${root} :is(h1,h2,h3,h4,h5,h6)::before{content:none!important;}
.dark ${root} :is(p,li,td){color:#e2e8f0!important;}
.dark ${root} :is(h1,h2,a){color:#93c5fd!important;}
.dark ${root} :is(h3,h4,h5,h6){color:#f1f5f9!important;}
.dark ${root} :is(th,blockquote){background-color:#172554!important;color:#dbeafe!important;}
.dark ${root} :is(th,td){border-color:#475569!important;}
.dark ${root} pre{background-color:#0f172a!important;color:#e2e8f0!important;}
.dark ${root} :not(pre)>code{background-color:#172554!important;color:#bfdbfe!important;}`;

/** Shared help styling, scoped to this article so the open document is unaffected. */
export default function HelpDocument({ content }: { content: string }) {
  const numberedContent = useMemo(() => syncMarkdownHeadingNumbers(content, HELP_PROFILE.headingNumbering), [content]);
  return <article className="onrivi-help-document" data-help-profile={HELP_PROFILE.id}>
    <style>{css}</style>
    <MarkdownViewer content={numberedContent} />
  </article>;
}
