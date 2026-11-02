/**
 * 🚨 @PATCH : 2026-11-02 — [DB 접근 서버 API 일원화] 브라우저 직접 supabase.from('common_codes')를 서버 /api/common-codes 호출로 전환
 * 🚨 @PATCH (2026-07-22): 공통코드(common_codes) INQUIRY_TYPE 그룹을 DB에서 동적으로 조회하고 등록 시 대문자 코드값(GENERAL, BILLING, TECH, SUGGESTION)으로 저장되도록 개편
 */
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useToast } from "@/components/ToastProvider";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const FALLBACK_INQUIRY_TYPES = [
  { code_value: "GENERAL", code_name: "일반 문의 / 기타" },
  { code_value: "BILLING", code_name: "요금제 / 결제 / 환불 문의" },
  { code_value: "TECH", code_name: "기술 지원 / 오류 제보" },
  { code_value: "SUGGESTION", code_name: "서비스 건의 / 파트너 제휴" },
];

export default function ContactPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("GENERAL");
  const [inquiryTypes, setInquiryTypes] = useState<Array<{ code_value: string; code_name: string }>>(FALLBACK_INQUIRY_TYPES);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    async function loadInquiryTypes() {
      try {
        const res = await fetch("/api/common-codes?group_code=INQUIRY_TYPE");
        const json = await res.json();
        if (res.ok && json.success && json.data?.length > 0) {
          setInquiryTypes(json.data);
        }
      } catch (err) {
        console.warn("[Contact] common_codes 조회 실패 (폴백 사용):", err);
      }
    }
    loadInquiryTypes();
  }, []);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (files.length + selected.length > MAX_FILES) {
      showToast(`파일은 최대 ${MAX_FILES}개까지 첨부할 수 있습니다.`, "warning");
      return;
    }
    const oversized = selected.find(f => f.size > MAX_FILE_SIZE);
    if (oversized) {
      showToast("파일 크기는 10MB를 초과할 수 없습니다.", "warning");
      return;
    }
    setFiles(prev => [...prev, ...selected]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getApiUrl = (path: string) => {
    return `https://onrivi.com${path}`;
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // strip data:...;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (files.length === 0) return [];
    const urls: string[] = [];
    for (const file of files) {
      try {
        const base64Data = await readFileAsBase64(file);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const resp = await fetch('/api/upload-image', {
          method: 'POST',
          headers,
          body: JSON.stringify({ base64Data, fileName: file.name, targetFolder: 'inquiry' }),
        });

        if (resp.ok) {
          const d = await resp.json();
          if (d.status === 'success' && d.relativePath) {
            const fullUrl = d.relativePath.startsWith('http')
              ? d.relativePath
              : 'https://onrivi.com' + d.relativePath + '?name=' + encodeURIComponent(file.name);
            urls.push(fullUrl);
          } else {
            console.error('[Contact] R2 업로드 실패:', d.error);
          }
        } else {
          console.error('[Contact] R2 HTTP 오류:', resp.status);
        }
      } catch (err) {
        console.error('[Contact] R2 파일 업로드 예외:', err);
      }
    }
    return urls;
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { showToast("이름을 입력해 주세요.", "warning"); return; }
    if (!email.trim() || !email.includes("@")) { showToast("올바른 이메일 주소를 입력해 주세요.", "warning"); return; }
    if (!title.trim()) { showToast("문의 제목을 입력해 주세요.", "warning"); return; }
    if (!content.trim() || content.trim().length < 10) { showToast("문의 내용을 최소 10자 이상 작성해 주세요.", "warning"); return; }
    setLoading(true);
    try {
      let attachmentUrls: string[] = [];
      if (files.length > 0) { setUploading(true); attachmentUrls = await uploadFiles(); setUploading(false); }
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/rpc/support/insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_name: name.trim(), p_email: email.trim(), p_type: type, p_title: title.trim(),
          p_content: content.trim(), p_user_id: session?.user?.id || null,
          p_attachment_urls: attachmentUrls.length > 0 ? attachmentUrls : null
        })
      });

      if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`);
      const rpcResult = await response.json();
      
      if (!rpcResult.success) throw new Error(`접수 실패: ${rpcResult.message}`);
      showToast("문의가 성공적으로 접수되었습니다. 최대한 빠른 시일 내에 답변해 드리겠습니다.", "success");
      setName(""); setEmail(""); setType("GENERAL"); setTitle(""); setContent(""); setFiles([]);
      setTimeout(() => router.push("/"), 3000);
    } catch (err: any) {
      console.error("[Contact] 문의 전송 오류:", err);
      showToast(err.message || "문의 전송 중 예기치 않은 오류가 발생했습니다.", "error");
    } finally { setLoading(false); setUploading(false); }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface dark:bg-gray-950 text-on-surface dark:text-gray-100 font-sans transition-colors duration-200">
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1" rel="stylesheet" />

      <Navbar />

      <main className="flex-grow flex items-center justify-center px-4 pt-32 pb-24 relative z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-200/40 dark:bg-sky-900/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-200/30 dark:bg-indigo-900/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-2xl w-full glass-card p-8 md:p-10">
          <section className="space-y-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="material-symbols-outlined text-sky-500 text-5xl">mail</span>
                <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">문의하기</h1>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                궁금하신 점이나 서비스 제안이 있으신가요? 내용을 접수해 주시면 기재하신 이메일 주소로 신속하게 답변해 드립니다.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">이름 / 단체명</label>
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동" disabled={loading}
                    className="input-arctic w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">답변받을 이메일 주소</label>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@onrivi.com" disabled={loading}
                    className="input-arctic w-full"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">문의 유형</label>
                <select
                  value={type} onChange={(e) => setType(e.target.value)} disabled={loading}
                  className="input-arctic w-full appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230ea5e9' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em'
                  }}
                >
                  {inquiryTypes.map((item) => (
                    <option key={item.code_value} value={item.code_value}>
                      {item.code_name}
                    </option>
                  ))}
                </select>
              </div>


              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">문의 제목</label>
                <input
                  type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="문의사항의 제목을 입력해 주세요." disabled={loading}
                  className="input-arctic w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">상세 문의 내용</label>
                <textarea
                  value={content} onChange={(e) => setContent(e.target.value)}
                  placeholder="문의하실 구체적인 내용을 작성해 주세요. (최소 10자 이상)" rows={6} disabled={loading}
                  className="input-arctic w-full resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">파일 첨부 (선택, 최대 {MAX_FILES}개, 각 10MB)</label>
                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" disabled={loading || uploading} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || uploading || files.length >= MAX_FILES}
                    className="btn-secondary flex items-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-lg">attach_file</span>
                    파일 선택
                  </button>
                  {files.length > 0 && (
                    <span className="text-xs text-slate-500">{files.length}개 선택됨</span>
                  )}
                </div>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {files.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 glass rounded-lg px-3 py-1.5 text-xs">
                        <span className="material-symbols-outlined text-base text-sky-500">description</span>
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <button type="button" onClick={() => removeFile(idx)} disabled={loading || uploading} className="text-red-400 hover:text-red-600 ml-1 disabled:opacity-50">
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    {uploading ? '파일 업로드 중...' : '문의 전송 중...'}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">send</span>
                    문의 제출하기
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
