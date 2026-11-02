"use client";

import { useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import type { BlogPost } from '@/lib/blogData';
import { createAdminBlogDraft } from '@/lib/blogApi';
import { useBlogCategories } from '@/lib/blogCategories';
import { showToast } from '@/utils/toast';

type Category = BlogPost['category'];
type DraftForm = {
  title: string;
  excerpt: string;
  category: Category;
  tags: string;
  content: string;
  filename: string;
};

// 첫 제목과 YAML 머리말을 제외한 첫 문단을 요약 후보로 제안한다.
function suggestExcerpt(markdown: string): string {
  return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '')
    .split(/\n\s*\n/)
    .filter(part => !/^\s*#/.test(part))
    .map(part => part.replace(/^#+\s*/gm, '').replace(/[`*_>\[\]()]/g, '').trim())
    .find(part => part && !part.startsWith('!'))?.slice(0, 600) || '';
}

// ====================================================================
// 📊 [OMD-ADMIN-BlogDocumentImport-0001] BlogDocumentImport ➔ 관리자 문서 선택·초안 저장
// 🎯 @KICK  : 로컬 마크다운 문서를 검토 가능한 DB 초안으로 등록한다.
// 🛡️ @GUARD : 확장자·크기·필수 입력값을 검증하고 파일 내용은 관리자 API로만 보낸다.
// 🔗 @CALLS : File.text(), createAdminBlogDraft(), showToast()
// ====================================================================
export default function BlogDocumentImport({ onSaved }: { onSaved: () => Promise<void> }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<DraftForm | null>(null);
  const [saving, setSaving] = useState(false);
  const categories = useBlogCategories().filter(category => category.active);

  const selectFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(md|markdown)$/i.test(file.name) || file.size > 1024 * 1024) {
      showToast('.md 또는 .markdown 파일(1MB 이하)을 선택해 주세요.', 'error');
      return;
    }
    const content = await file.text();
    if (!content.trim() || content.length > 300000) {
      showToast('빈 문서이거나 본문 길이 제한(30만 자)을 넘었습니다.', 'error');
      return;
    }
    const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
    setForm({
      filename: file.name, content,
      title: heading || file.name.replace(/\.(md|markdown)$/i, ''),
      excerpt: suggestExcerpt(content),
      category: categories[0]?.value || '', tags: '',
    });
  };

  const save = async () => {
    if (!form) return;
    if (!form.title.trim() || !form.excerpt.trim() ||
        !categories.some(category => category.value === form.category)) {
      showToast('제목·요약·분류를 확인해 주세요.', 'error');
      return;
    }
    setSaving(true);
    try {
      const saved = await createAdminBlogDraft({
        title: form.title.trim(), excerpt: form.excerpt.trim(),
        category: form.category, content: form.content,
        tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      });
      setForm(null);
      if (fileInput.current) fileInput.current.value = '';
      await onSaved();
      showToast(`초안을 저장했습니다. 글 주소: ${saved.post.slug}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '문서 초안 저장 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-zinc-950 dark:text-white">문서에서 새 글 만들기</h2>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">마크다운 문서를 선택하고 내용을 확인한 뒤 초안으로 저장하세요.</p>
        </div>
        <input ref={fileInput} type="file" accept=".md,.markdown,text/markdown" className="hidden"
          onChange={event => { void selectFile(event.target.files?.[0]); }} />
        <button type="button" onClick={() => fileInput.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1d4ed8] px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">
          <FileUp size={16} /> 문서 선택
        </button>
      </div>
      {form && (
        <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 dark:border-zinc-800 sm:grid-cols-2">
          <p className="text-xs text-zinc-500 sm:col-span-2">선택한 파일: {form.filename}</p>
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">제목
            <input value={form.title} maxLength={200} onChange={event => setForm({ ...form, title: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
          </label>
          <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">글 주소
            <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-2 font-normal text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              저장할 때 자동 발급됩니다. 예: post-000001
            </p>
          </div>
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">분류
            <select value={form.category} onChange={event => setForm({ ...form, category: event.target.value as Category })}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
              <option value="" disabled>분류를 선택해 주세요</option>
              {categories.map(category => <option key={category.value} value={category.value}>{category.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">태그 (쉼표로 구분)
            <input value={form.tags} onChange={event => setForm({ ...form, tags: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
          </label>
          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 sm:col-span-2">요약
            <textarea value={form.excerpt} maxLength={600} rows={3} onChange={event => setForm({ ...form, excerpt: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
          </label>
          <details className="sm:col-span-2"><summary className="cursor-pointer text-xs font-bold text-zinc-700 dark:text-zinc-300">본문 미리보기</summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs dark:bg-zinc-950">{form.content}</pre>
          </details>
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" disabled={saving} onClick={() => { void save(); }}
              className="rounded-xl bg-[#1d4ed8] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? '저장 중...' : '초안 저장'}</button>
            <button type="button" onClick={() => setForm(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold dark:border-zinc-700">취소</button>
          </div>
        </div>
      )}
    </section>
  );
}
