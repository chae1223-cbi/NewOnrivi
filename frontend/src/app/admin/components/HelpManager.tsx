// ====================================================================
// 📊 [OMD-ADMIN-HelpManager-0001] HelpManager.tsx ➔ 관리자 도움말 관리
// 🎯 @KICK  : 공식 도움말 30개 문서 편집 및 R2 클라우드 실시간 게시(Publish)
// 🛡️ @GUARD : 공식 asset ID(help_X) 일치 매핑으로 웹(/docs) 및 앱 모달 100% 자동 반영 확립
// 🚨 @PATCH : **2026-10-11** — [공식 문서 asset ID(help_X) 직결 매핑 및 게시 상태 뱃지 연동]:
//             1) importFile 시 randomUUID 대신 asset.id(help_X)를 유지하여 게시 시 사용자 화면(/docs 및 HelpModal)과 100% 일치 자동 반영 보장
//             2) 공식 문서 목록에서 R2 게시 여부([게시 중]/[초안]) 상태 뱃지 표시
// 🚨 @PATCH : **2026-10-10** — 공식 문서 목록 30종 기본 노출 탭 분리 개편
// ====================================================================
"use client";
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { adminFetch } from '@/lib/adminFetch';
import { showToast } from '@/utils/toast';
import initialFiles from '@/lib/helpAssets.json';
import { BookOpen, FileText, Cloud, CheckCircle, Clock } from 'lucide-react';

type Doc = { id: string; title: string; content: string; order: number; updated_at?: string };

export default function HelpManager() {
  const [drafts, setDrafts] = useState<Doc[]>([]);
  const [published, setPublished] = useState<Doc[]>([]);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<'official' | 'drafts'>('official');

  async function load() {
    try {
      const response = await adminFetch('/api/admin/help');
      const data = await response.json();
      if (!response.ok) throw Error(data.error || '도움말 조회 실패');
      setDrafts(data.drafts || []);
      setPublished(data.published || []);
    } catch (e: any) {
      console.warn('Help fetch failed:', e);
    }
  }

  useEffect(() => {
    void load().catch(e => setError(e.message));
  }, []);

  function select(next: Doc) {
    if (dirty && !confirm('저장하지 않은 변경사항을 버릴까요?')) return;
    setDoc({ ...next });
    setDirty(false);
  }

  async function save(action: string) {
    if (!doc) return;
    if (action === 'publish' && !confirm('이 내용을 사용자 도움말에 게시할까요?')) return;
    setBusy(true);
    try {
      const response = await adminFetch('/api/admin/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...doc, action })
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      if (action !== 'unpublish') setDirty(false);
      await load();
      showToast(action === 'publish' ? '도움말이 게시되었습니다. 웹(/docs) 및 앱에 즉시 자동 반영됩니다.' : action === 'unpublish' ? '게시가 내려갔습니다.' : '초안이 저장되었습니다.', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : '저장 실패', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function importFile(url: string, index: number) {
    setBusy(true);
    try {
      const asset = initialFiles.find(x => x.url === url);
      const targetId = asset?.id || `help_${index}`;

      // 이미 R2 drafts 또는 published에 저장된 데이터가 있으면 그것을 최우선 로드
      const existingDraft = drafts.find(d => d.id === targetId);
      const existingPub = published.find(p => p.id === targetId);
      if (existingPub && !existingDraft) {
        select(existingPub);
        return;
      }
      if (existingDraft) {
        select(existingDraft);
        return;
      }

      const response = await fetch(url);
      if (!response.ok) throw Error('기존 파일을 불러오지 못했습니다.');
      const content = await response.text();
      select({
        id: targetId,
        title: asset?.source_title || '도움말',
        content: content.replace(/\]\((?:\.\/)?assets\//g, '](https://onrivi.com/help/assets/'),
        order: index
      });
    } catch (e) {
      showToast(e instanceof Error ? e.message : '불러오기 실패', 'error');
    } finally {
      setBusy(false);
    }
  }

  const officialDocs = initialFiles.filter(x => x.file_name.endsWith('.md'));

  return (
    <section className="admin-glass-card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--admin-border)] pb-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            도움말 작성 및 게시 관리
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            공식 30개 마크다운 문서를 선택하여 수정하고, 클라우드(R2)에 즉시 게시하여 온라인 사용자에게 반영합니다.
          </p>
        </div>
        <button
          disabled={busy}
          className="admin-btn-primary px-4 py-2 text-xs font-bold shrink-0"
          onClick={() => select({ id: crypto.randomUUID(), title: '새 도움말', content: '# 새 도움말\n', order: drafts.length })}
        >
          + 새 도움말 작성
        </button>
      </div>

      {error && <p role="alert" className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">{error}</p>}

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* 좌측 사이드바: 탭 전환 (공식 30개 문서 vs R2 초안/게시) */}
        <aside className="space-y-3">
          {/* 탭 토글 */}
          <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-[var(--admin-border)] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('official')}
              className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'official'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>공식 문서 ({officialDocs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('drafts')}
              className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'drafts'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>R2 초안 ({drafts.length})</span>
            </button>
          </div>

          {/* 공식 30개 문서 목록 (기본 노출) */}
          {activeTab === 'official' && (
            <div className="space-y-1 max-h-[620px] overflow-y-auto pr-1">
              <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 px-2 py-1 uppercase tracking-wider">
                최신 공식 마스터 목차
              </div>
              {officialDocs.map((item, index) => {
                const isCurrent = doc?.id === item.id || doc?.title === item.source_title;
                const isPub = published.some(p => p.id === item.id);
                const isDraft = drafts.some(d => d.id === item.id);

                return (
                  <button
                    disabled={busy}
                    key={item.id}
                    onClick={() => void importFile(item.url, index)}
                    className={`block w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isCurrent
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-900/40 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-zinc-700 dark:text-zinc-300 border border-[var(--admin-border)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate">{item.source_title}</span>
                      {isPub ? (
                        <span className={`text-[9px] px-1 py-0.5 rounded font-bold shrink-0 ${isCurrent ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'}`}>
                          게시 중
                        </span>
                      ) : isDraft ? (
                        <span className={`text-[9px] px-1 py-0.5 rounded font-bold shrink-0 ${isCurrent ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'}`}>
                          초안
                        </span>
                      ) : null}
                    </div>
                    <div className={`text-[10px] mt-0.5 truncate ${isCurrent ? 'text-blue-100' : 'text-zinc-400'}`}>
                      {item.file_name}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* R2 저장소 초안/게시 목록 */}
          {activeTab === 'drafts' && (
            <div className="space-y-1 max-h-[620px] overflow-y-auto pr-1">
              <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 px-2 py-1 uppercase tracking-wider">
                클라우드 저장 문서
              </div>
              {drafts.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-400 border border-dashed rounded-lg">
                  저장된 초안이 없습니다.
                </div>
              ) : (
                drafts.map(item => {
                  const isCurrent = doc?.id === item.id;
                  const isPub = published.some(x => x.id === item.id);
                  return (
                    <button
                      disabled={busy}
                      key={item.id}
                      onClick={() => select(item)}
                      className={`block w-full text-left p-2.5 rounded-lg text-xs transition-all border ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                          : 'border-[var(--admin-border)] bg-zinc-50 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <strong className="block truncate font-semibold">{item.title}</strong>
                      <span className="flex items-center gap-1 mt-1 text-[10px] text-zinc-500">
                        {isPub ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-bold">
                            <CheckCircle className="w-3 h-3" /> 게시 중
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> 초안
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </aside>

        {/* 우측 편집기 영역 */}
        {doc ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-[1fr_120px] gap-3">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                문서 제목
                <input
                  disabled={busy}
                  className="admin-input w-full mt-1.5 p-2 text-sm font-semibold"
                  value={doc.title}
                  onChange={e => {
                    setDoc({ ...doc, title: e.target.value });
                    setDirty(true);
                  }}
                />
              </label>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                표시 순서
                <input
                  disabled={busy}
                  type="number"
                  min="0"
                  max="9999"
                  className="admin-input w-full mt-1.5 p-2 text-sm font-mono text-center"
                  value={doc.order}
                  onChange={e => {
                    setDoc({ ...doc, order: Number(e.target.value) });
                    setDirty(true);
                  }}
                />
              </label>
            </div>

            <div className="grid xl:grid-cols-2 gap-4">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Markdown 본문
                <textarea
                  disabled={busy}
                  className="admin-input block w-full min-h-[460px] mt-1.5 p-3.5 font-mono text-xs leading-relaxed"
                  value={doc.content}
                  onChange={e => {
                    setDoc({ ...doc, content: e.target.value });
                    setDirty(true);
                  }}
                />
              </label>
              <div>
                <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">실시간 조판 미리보기</h3>
                <div className="prose dark:prose-invert max-w-none border border-[var(--admin-border)] rounded-xl p-5 min-h-[460px] max-h-[600px] overflow-auto bg-white dark:bg-zinc-950 text-sm">
                  <ReactMarkdown>{doc.content}</ReactMarkdown>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--admin-border)]">
              <div className="flex items-center gap-2">
                <button
                  disabled={busy}
                  onClick={() => void save('save')}
                  className="admin-btn-secondary px-4 py-2 text-xs font-bold"
                >
                  초안 저장
                </button>
                <button
                  disabled={busy}
                  onClick={() => void save('publish')}
                  className="admin-btn-primary px-4 py-2 text-xs font-bold"
                >
                  🚀 사용자 도움말에 게시 (Publish)
                </button>
                {published.some(x => x.id === doc.id) && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (confirm('이 도움말을 공개 목록에서 내릴까요?')) void save('unpublish');
                    }}
                    className="admin-btn-secondary px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    게시 내리기
                  </button>
                )}
              </div>
              <span className="text-xs text-zinc-400 font-medium">
                {dirty ? '⚠️ 저장되지 않은 수정 사항이 있습니다' : '✓ 모든 변경사항 동기화됨'}
              </span>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-[var(--admin-border)] rounded-2xl p-16 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
            <BookOpen className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm font-semibold">
              좌측 목록에서 편집할 공식 도움말 문서를 선택하거나, [새 도움말 작성]을 눌러주세요.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
