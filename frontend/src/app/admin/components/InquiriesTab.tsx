/** 🚨 @PATCH : 2026-11-02 — 문의 상태 코드와 관리자 권한 표시를 서버 API로 조회한다. */
/** 🚨 @PATCH : 2026-09-30 — [문의 상세 및 답변 화면 UI 전면 개편 및 실시간 이메일 발송 양식 미리보기 탑재]:
 *             1. 넓고 쾌적한 2열 스플릿 뷰(max-w-6xl) 적용 (좌측: 답변 작성 폼 / 우측: 실시간 완성형 이메일 프리뷰)
 *             2. 모바일/데스크톱 탭 전환 지원 (작성 폼 / 실시간 미리보기 / 나란히 보기)
 *             3. 보낸사람, 받는사람, 제목, 인사말, 접수 문의, 공식 답변, 맺음말, 첨부파일이 조립된 실제 메일 렌더링 카드 제공
 *             4. 접수 문의 접이식 아코디언 카드화 및 폼 입력 시 우측 메일 실시간 반영
 */
/** 🚨 @PATCH : 2026-09-28 — 관리자 문의 API 실패 시 응답 본문의 인증·권한 오류 사유를 화면에 표시 */
/** 🚨 @PATCH : 2026-09-28 — 문의 답변 모달의 취소 버튼을 관리자 공통 보조 버튼으로 통일 */
'use client';

/**
 * 프로그램명 : 1:1 문의사항 탭 컴포넌트 (InquiriesTab Component)
 * 버전 정보 : 1.0.0
 * 프로그램 ID : oaar-admin-inquiries-tab-001
 * -----------------------------------------------------------------------
 * 변경내역
 * -----------------------------------------------------------------------
 * <2026.05.29> 최초작성
//             **2026-08-12** — 답변 저장 시 처리 상태를 자동으로 'RESOLVED'(완료됨)로 변경하도록 PATCH 데이터 전송 강제화 및 드롭다운/필터 목록에서 'IN_PROGRESS'(처리중) 상태 배제 처리
 * -----------------------------------------------------------------------
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { adminFetch } from '@/lib/adminFetch';
import { showToast } from '@/utils/toast';
import { Eye, Mail, CheckCircle2, MessageSquare, Clock, X, Paperclip, Trash2, Download, Columns, FileText, ChevronDown, ChevronUp, Send } from 'lucide-react';

interface Inquiry {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  type: string;
  type_name: string;
  title: string;
  content: string;
  attachment_urls: string[];
  status: string;
  status_name: string;
  created_at: string;
  answer_content: string | null;
  answered_at: string | null;
  answered_by: string | null;
  answer_attachment_urls: string[];
}

export default function InquiriesTab() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [statusCodes, setStatusCodes] = useState<Array<{ code_value: string; code_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState('');
  const [isAdminSuper, setIsAdminSuper] = useState(false);
  const [isAdminSupport, setIsAdminSupport] = useState(false);

  // 필터링 상태
  const [statusFilter, setStatusFilter] = useState('ALL');

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  
  // 답변 폼 상태
  const [answerContent, setAnswerContent] = useState('');
  const [statusToUpdate, setStatusToUpdate] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [replySubject, setReplySubject] = useState('');
  const [replyGreeting, setReplyGreeting] = useState('');
  const [replyClosing, setReplyClosing] = useState('');

  // 모달 뷰 모드 ('split': 나란히 보기, 'edit': 작성 폼만, 'preview': 이메일 미리보기만)
  const [modalViewMode, setModalViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  // 고객 문의 원문 접기/펼치기 상태
  const [isInquiryExpanded, setIsInquiryExpanded] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionToken(session.access_token);
        fetchAdminRole(session.access_token);
        fetchStatusCodes(session.access_token);
        fetchInquiries(session.access_token);
      }
    };
    init();
  }, []);

  const fetchStatusCodes = async (token: string) => {
    try {
      const response = await adminFetch('/api/admin/common-codes?group_code=INQUIRY_STATUS', { headers: { Authorization: `Bearer ${token}` } });
      const result = response.ok ? await response.json() : null;
      if (result?.success) {
        setStatusCodes(result.data.filter((code: { is_use: boolean }) => code.is_use));
      }
    } catch (err) {
      console.error('Failed to fetch status codes', err);
    }
  };

  const [openedLinkedInquiry, setOpenedLinkedInquiry] = useState<string | null>(null);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('inquiry');
    if (!id || id === openedLinkedInquiry) return;
    const linked = inquiries.find(item => String(item.id) === id);
    if (linked) { openModal(linked); setOpenedLinkedInquiry(id); }
  }, [inquiries, openedLinkedInquiry]);

  const fetchAdminRole = async (token: string) => {
    const response = await adminFetch('/api/admin/role', { headers: { Authorization: `Bearer ${token}` } });
    const data = response.ok ? await response.json() : null;
    if (data?.admin_role === 'SUPER') setIsAdminSuper(true);
    if (data?.admin_role === 'SUPPORT') setIsAdminSupport(true);
  };

  const fetchInquiries = async (token: string) => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/inquiries', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const failure = await res.json().catch(() => null);
        throw new Error(failure?.error || `문의 목록을 불러오지 못했습니다. (HTTP ${res.status})`);
      }
      const data = await res.json();
      setInquiries(data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setAnswerContent(inquiry.answer_content || '');
    // 💡 답변 저장 시 자동으로 RESOLVED로 완료 처리되므로 기본 표시 상태를 'RESOLVED'로 설정
    setStatusToUpdate('RESOLVED');
    setSendEmail(true);
    setReplyFiles([]);
    setExistingUrls(inquiry.answer_attachment_urls || []);
    setReplySubject(`[답변] ${inquiry.title} 문의에 대한 답변입니다.`);
    setReplyGreeting(`안녕하세요, ${inquiry.name}님. ${inquiry.title}과(와) 관련하여 추가로 궁금하신 점이 있으셨던 것 같아 답변 정리하여 보내드립니다.`);
    setReplyClosing('답변 드린 내용 외에 추가로 궁금하신 점이나 확인이 필요한 사항이 있으시면 언제든 편하게 말씀해 주시기 바랍니다.');
    setModalViewMode('split');
    setIsInquiryExpanded(true);
    setModalOpen(true);
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Brevo API 허용 확장자 필터링 (보안상 차단되는 sql, exe 등 방지)
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar', '7z'];
      const invalidFiles = newFiles.filter(f => {
        const ext = f.name.split('.').pop()?.toLowerCase();
        return !ext || !allowedExtensions.includes(ext);
      });

      if (invalidFiles.length > 0) {
        showToast('보안상 첨부할 수 없는 파일 형식입니다. (zip으로 압축 권장)', 'warning');
        return;
      }

      const totalSize = [...replyFiles, ...newFiles].reduce((acc, f) => acc + f.size, 0);
      if (totalSize > 20 * 1024 * 1024) {
        showToast('총 첨부파일 용량은 20MB를 초과할 수 없습니다.', 'warning');
        return;
      }
      setReplyFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setReplyFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (replyFiles.length === 0) return [];
    const urls: string[] = [];
    for (const file of replyFiles) {
      try {
        const base64Data = await readFileAsBase64(file);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;

        const resp = await adminFetch('/api/upload-image', {
          method: 'POST',
          headers,
          body: JSON.stringify({ base64Data, fileName: file.name, targetFolder: 'inquiry_reply' }),
        });

        if (resp.ok) {
          const d = await resp.json();
          if (d.status === 'success' && d.relativePath) {
            const fullUrl = d.relativePath.startsWith('http')
              ? d.relativePath
              : 'https://onrivi.com' + d.relativePath + '?name=' + encodeURIComponent(file.name);
            urls.push(fullUrl);
          }
        }
      } catch (err) {
        console.error('R2 업로드 실패:', err);
      }
    }
    return urls;
  };

  const handleSaveReply = async () => {
    if (!selectedInquiry) return;
    if (!answerContent.trim()) {
      showToast('답변 내용을 입력해주세요.', 'warning');
      return;
    }

    setSaving(true);
    setUploading(true);
    try {
      const uploadedUrls = await uploadFiles();
      const finalAttachmentUrls = [
        ...existingUrls,
        ...uploadedUrls
      ];

      const res = await adminFetch('/api/admin/inquiries', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          id: selectedInquiry.id,
          status: 'RESOLVED', // 💡 답변 저장 시 자동으로 'RESOLVED'(완료됨)로 변경
          answer_content: answerContent,
          send_email: sendEmail,
          answer_attachment_urls: finalAttachmentUrls,
          reply_subject: replySubject,
          reply_greeting: replyGreeting,
          reply_closing: replyClosing
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      showToast(`답변이 저장되었습니다. ${json.emailSent ? '(이메일 발송 완료)' : ''}`, 'success');
      setModalOpen(false);
      fetchInquiries(sessionToken);
    } catch (err: any) {
      showToast(err.message || '저장에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const filteredInquiries = inquiries.filter(inq => 
    statusFilter === 'ALL' ? true : inq.status === statusFilter
  );

  const getStatusBadge = (status: string, statusName: string) => {
    switch (status) {
      case 'PENDING': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Clock size={12}/> {statusName}</span>;
      case 'IN_PROGRESS': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><MessageSquare size={12}/> {statusName}</span>;
      case 'RESOLVED': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle2 size={12}/> {statusName}</span>;
      default: return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">{statusName}</span>;
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-[var(--admin-text-muted)]">로딩 중...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold font-montserrat text-[var(--admin-text)] tracking-tight">문의 및 지원</h1>
          <p className="text-[var(--admin-text-muted)] mt-1">고객의 1:1 문의 내역을 확인하고 답변을 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-[var(--admin-surface)] border-[var(--admin-border)] border text-[var(--admin-text)] rounded-xl text-sm font-medium hover:bg-[var(--admin-surface-bright)] transition-colors outline-none"
          >
            <option value="ALL">모든 문의</option>
            {statusCodes.filter(code => code.code_value !== 'IN_PROGRESS').map(code => (
              <option key={code.code_value} value={code.code_value}>{code.code_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="admin-glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--admin-surface-bright)] text-[var(--admin-text-muted)] text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">상태</th>
                <th className="px-6 py-4 font-medium">유형</th>
                <th className="px-6 py-4 font-medium">문의 제목</th>
                <th className="px-6 py-4 font-medium">작성자</th>
                <th className="px-6 py-4 font-medium">등록일</th>
                <th className="px-6 py-4 font-medium text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {filteredInquiries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[var(--admin-text-muted)]">
                    조회된 문의 내역이 없습니다.
                  </td>
                </tr>
              ) : filteredInquiries.map((inq) => (
                <tr key={inq.id} className="hover:bg-[var(--admin-surface)] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(inq.status, inq.status_name)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--admin-text-muted)]">{inq.type_name}</td>
                  <td className="px-6 py-4 font-medium text-[var(--admin-text)] max-w-xs truncate">{inq.title}</td>
                  <td className="px-6 py-4 text-sm text-[var(--admin-text-muted)]">
                    <div className="flex flex-col">
                      <span className="font-medium">{inq.name}</span>
                      <span className="text-xs">{inq.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--admin-text-muted)] whitespace-nowrap">
                    {new Date(inq.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button 
                      onClick={() => openModal(inq)}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      {inq.status === 'RESOLVED' ? <><Eye size={14}/> 조회</> : <><Mail size={14}/> 답변 작성</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
          <div className="bg-[var(--admin-surface)] text-[var(--admin-text)] rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl border border-[var(--admin-border)] my-auto overflow-hidden">
            {/* 1. 상단 모달 헤더 바 */}
            <div className="flex flex-wrap justify-between items-center px-6 py-4 border-b border-[var(--admin-border)] shrink-0 gap-3 bg-[var(--admin-surface-bright)]/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-xs">
                  <Mail size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[var(--admin-text)]">문의 상세 및 답변</h3>
                    {getStatusBadge(selectedInquiry.status, selectedInquiry.status_name)}
                  </div>
                  <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                    작성자: <span className="font-semibold text-[var(--admin-text)]">{selectedInquiry.name}</span> ({selectedInquiry.email}) • 등록일: {new Date(selectedInquiry.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* 뷰 모드 탭 컨트롤러 (작성 폼 / 이메일 미리보기 / 분할 화면) */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 bg-[var(--admin-background)] border border-[var(--admin-border)] rounded-xl text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setModalViewMode('edit')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      modalViewMode === 'edit'
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
                    }`}
                  >
                    <FileText size={13} />
                    <span>작성 폼</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalViewMode('preview')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      modalViewMode === 'preview'
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
                    }`}
                  >
                    <Mail size={13} />
                    <span>이메일 미리보기</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalViewMode('split')}
                    className={`hidden lg:flex px-3 py-1.5 rounded-lg transition-all items-center gap-1.5 ${
                      modalViewMode === 'split'
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
                    }`}
                  >
                    <Columns size={13} />
                    <span>나란히 보기</span>
                  </button>
                </div>

                <button 
                  onClick={() => setModalOpen(false)} 
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  title="닫기"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* 2. 모달 본문 영역 (2열 스플릿 또는 단일 뷰) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className={`grid gap-6 ${modalViewMode === 'split' ? 'lg:grid-cols-12' : 'grid-cols-1'}`}>
                
                {/* 📝 [좌측 영역] 문의 원문 및 답변 작성 폼 */}
                {(modalViewMode === 'edit' || modalViewMode === 'split') && (
                  <div className={`${modalViewMode === 'split' ? 'lg:col-span-6' : 'col-span-1'} space-y-5`}>
                    
                    {/* (1) 접수된 고객 문의 아코디언 카드 */}
                    <div className="bg-[var(--admin-background)] rounded-xl border border-[var(--admin-border)] overflow-hidden shadow-xs transition-all">
                      <div 
                        onClick={() => setIsInquiryExpanded(prev => !prev)}
                        className="px-4 py-3 bg-[var(--admin-surface-bright)]/70 flex items-center justify-between cursor-pointer select-none hover:bg-[var(--admin-surface-bright)] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                            [{selectedInquiry.type_name}]
                          </span>
                          <span className="text-sm font-bold text-[var(--admin-text)] truncate max-w-xs sm:max-w-md">
                            {selectedInquiry.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)]">
                          <span>{isInquiryExpanded ? '접기' : '상세보기'}</span>
                          {isInquiryExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {isInquiryExpanded && (
                        <div className="p-4 space-y-3 text-sm">
                          <div className="bg-[var(--admin-surface)] p-3.5 rounded-lg border border-[var(--admin-border)] text-xs sm:text-sm whitespace-pre-wrap leading-relaxed text-[var(--admin-text)] max-h-48 overflow-y-auto custom-scrollbar">
                            {selectedInquiry.content}
                          </div>

                          {selectedInquiry.attachment_urls && selectedInquiry.attachment_urls.length > 0 && (
                            <div className="pt-2 border-t border-[var(--admin-border)]">
                              <div className="text-xs text-[var(--admin-text-muted)] mb-1.5 font-medium">고객 첨부파일:</div>
                              <div className="flex flex-wrap gap-2">
                                {selectedInquiry.attachment_urls.map((url, i) => {
                                  const nameMatch = url.match(/name=([^&]+)/);
                                  const fileName = nameMatch ? decodeURIComponent(nameMatch[1]) : `첨부파일 ${i + 1}`;
                                  return (
                                    <a key={i} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg text-xs hover:bg-[var(--admin-surface-bright)] hover:text-blue-600 transition-colors">
                                      <Download size={13} className="text-gray-400" />
                                      <span className="truncate max-w-[180px] font-medium">{fileName}</span>
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* (2) 관리자 답변 작성 및 발송 폼 */}
                    <fieldset disabled={!(isAdminSuper || isAdminSupport)} className="space-y-4 min-w-0 border-none p-0 m-0">
                      
                      {/* 처리 상태 및 발송 토글 옵션 바 */}
                      <div className="p-4 bg-[var(--admin-surface-bright)]/80 rounded-xl border border-[var(--admin-border)] flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-[var(--admin-text)]">처리 상태:</label>
                          <select 
                            value={statusToUpdate}
                            onChange={(e) => setStatusToUpdate(e.target.value)}
                            className="px-3 py-1.5 bg-[var(--admin-background)] text-[var(--admin-text)] text-xs font-semibold rounded-lg border border-[var(--admin-border)] focus:border-blue-500 outline-none"
                          >
                            {statusCodes.length > 0 ? statusCodes.filter(code => code.code_value !== 'IN_PROGRESS').map(code => (
                              <option key={code.code_value} value={code.code_value}>{code.code_name} ({code.code_value})</option>
                            )) : (
                              <>
                                <option value="PENDING">대기중 (PENDING)</option>
                                <option value="RESOLVED">완료됨 (RESOLVED)</option>
                              </>
                            )}
                          </select>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={sendEmail} 
                            onChange={(e) => setSendEmail(e.target.checked)} 
                            className="w-4 h-4 text-blue-600 rounded accent-blue-600 cursor-pointer" 
                          />
                          <span className="text-xs font-bold text-[var(--admin-text)] flex items-center gap-1">
                            <Send size={12} className={sendEmail ? 'text-blue-500' : 'text-gray-400'} />
                            저장 시 고객에게 이메일 발송
                          </span>
                        </label>
                      </div>

                      {/* 이메일 발송 양식 작성 영역 */}
                      <div className="p-4 bg-[var(--admin-surface)] rounded-xl border border-[var(--admin-border)] space-y-4 shadow-xs">
                        <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                          <Mail size={13} />
                          <span>이메일 발송 구성 요소</span>
                        </div>

                        {/* 1. 이메일 제목 */}
                        <div>
                          <label className="block text-xs font-bold mb-1 text-[var(--admin-text)]">
                            이메일 제목 <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="text"
                            value={replySubject}
                            onChange={(e) => setReplySubject(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-blue-500 outline-none font-medium"
                            placeholder="고객에게 전송될 이메일 제목"
                          />
                        </div>

                        {/* 2. 도입부 인사말 */}
                        <div>
                          <label className="block text-xs font-bold mb-1 text-[var(--admin-text)]">
                            도입부 인사말 (Greeting)
                          </label>
                          <input 
                            type="text"
                            value={replyGreeting}
                            onChange={(e) => setReplyGreeting(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-blue-500 outline-none"
                            placeholder="예: 문의하신 내용에 대한 답변입니다."
                          />
                        </div>

                        {/* 3. 공식 답변 본문 */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-bold text-[var(--admin-text)]">
                              관리자 답변 본문 <span className="text-red-500">*</span>
                            </label>
                            <span className="text-[11px] text-[var(--admin-text-muted)]">
                              {answerContent.length}자 입력됨
                            </span>
                          </div>
                          <textarea 
                            rows={8}
                            value={answerContent}
                            onChange={(e) => setAnswerContent(e.target.value)}
                            placeholder="고객에게 전달할 상세 답변 내용을 작성하세요... (오른쪽 미리보기에 실시간 반영됩니다)"
                            className="w-full px-3.5 py-2.5 text-sm bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-blue-500 outline-none resize-y leading-relaxed font-sans"
                          />
                        </div>

                        {/* 4. 맺음말 */}
                        <div>
                          <label className="block text-xs font-bold mb-1 text-[var(--admin-text)]">
                            맺음말 (Closing)
                          </label>
                          <input 
                            type="text"
                            value={replyClosing}
                            onChange={(e) => setReplyClosing(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-[var(--admin-background)] text-[var(--admin-text)] rounded-xl border border-[var(--admin-border)] focus:border-blue-500 outline-none"
                            placeholder="예: 추가로 궁금하신 점이 있으시면 편하게 말씀해 주시기 바랍니다."
                          />
                        </div>

                        {/* 5. 첨부파일 */}
                        <div className="pt-2 border-t border-[var(--admin-border)]">
                          <label className="block text-xs font-bold mb-2 text-[var(--admin-text)]">
                            답변 첨부파일
                          </label>
                          <div className="flex flex-col gap-2.5">
                            <label className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--admin-background)] border border-[var(--admin-border)] border-dashed rounded-xl cursor-pointer hover:bg-[var(--admin-surface-bright)] hover:border-blue-500 transition-colors">
                              <Paperclip size={15} className="text-blue-500" />
                              <span className="text-xs text-[var(--admin-text-muted)] font-medium">새 파일 첨부하기</span>
                              <input type="file" multiple className="hidden" onChange={handleFileChange} />
                            </label>

                            {/* 새로 첨부할 파일 리스트 */}
                            {replyFiles.length > 0 && (
                              <div className="space-y-1.5 mt-1">
                                {replyFiles.map((f, i) => (
                                  <div key={i} className="flex items-center justify-between p-2 bg-[var(--admin-background)] border border-[var(--admin-border)] rounded-lg text-xs">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <Paperclip size={13} className="text-blue-500 shrink-0" />
                                      <span className="truncate text-[var(--admin-text)] font-medium">{f.name}</span>
                                      <span className="text-[11px] text-gray-400 shrink-0">({(f.size / 1024).toFixed(1)} KB)</span>
                                    </div>
                                    <button onClick={() => removeFile(i)} className="text-red-500 hover:text-red-600 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* 기존 답변 첨부파일 (삭제 가능) */}
                            {existingUrls.length > 0 && (
                              <div className="mt-1 space-y-1">
                                <div className="text-[11px] text-[var(--admin-text-muted)] font-medium">기존 첨부된 파일:</div>
                                {existingUrls.map((url, i) => {
                                  const nameMatch = url.match(/name=([^&]+)/);
                                  const fileName = nameMatch ? decodeURIComponent(nameMatch[1]) : `기존 첨부파일 ${i + 1}`;
                                  return (
                                    <div key={i} className="flex items-center justify-between p-2 bg-[var(--admin-background)] border border-[var(--admin-border)] rounded-lg text-xs">
                                      <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 overflow-hidden hover:text-blue-500 transition-colors">
                                        <Download size={13} className="text-blue-500 shrink-0" />
                                        <span className="truncate text-[var(--admin-text)] font-medium">{fileName}</span>
                                      </a>
                                      <button 
                                        onClick={() => setExistingUrls(prev => prev.filter((_, idx) => idx !== i))} 
                                        className="text-red-500 hover:text-red-600 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-2"
                                        title="기존 첨부파일 삭제"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </fieldset>
                  </div>
                )}

                {/* ✉️ [우측 영역] 실시간 완성형 이메일 발송 양식 미리보기 */}
                {(modalViewMode === 'preview' || modalViewMode === 'split') && (
                  <div className={`${modalViewMode === 'split' ? 'lg:col-span-6' : 'col-span-1'} flex flex-col space-y-2`}>
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--admin-text-muted)] flex items-center gap-1.5">
                          <Eye size={14} className="text-blue-500" />
                          수신자 시점 실시간 메일 미리보기
                        </span>
                        {sendEmail ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            이메일 발송 활성
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">
                            내부 저장 전용 (발송 안함)
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[var(--admin-text-muted)] hidden sm:inline">
                        * 고객 화면에 표시될 실제 양식입니다
                      </span>
                    </div>

                    {/* 이메일 클라이언트 브라우저 프레임 */}
                    <div className="rounded-2xl border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden flex flex-col flex-1">
                      {/* 메일 윈도우 상단 장식 바 */}
                      <div className="px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-400/90 inline-block" />
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/90 inline-block" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/90 inline-block" />
                          </div>
                          <span className="text-slate-600 dark:text-zinc-300 font-semibold ml-2">Inbox Mail Preview</span>
                        </div>
                        <span className="text-slate-400 dark:text-zinc-500 text-[11px] font-mono">Onrivi Mail Service</span>
                      </div>

                      {/* 메일 수신 메타데이터 카드 */}
                      <div className="p-4 bg-slate-50/70 dark:bg-zinc-850/60 border-b border-slate-200/80 dark:border-zinc-700/70 space-y-1.5 text-xs text-slate-700 dark:text-zinc-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-400 dark:text-zinc-500 w-16 shrink-0">보낸사람:</span>
                            <span className="font-medium text-slate-800 dark:text-zinc-200">
                              온리비 어서 고객지원팀 &lt;support@onrivi.com&gt;
                            </span>
                          </div>
                          <span className="text-slate-400 dark:text-zinc-500 text-[11px]">방금 전</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-400 dark:text-zinc-500 w-16 shrink-0">받는사람:</span>
                          <span className="font-medium text-slate-800 dark:text-zinc-200">
                            {selectedInquiry.name} &lt;{selectedInquiry.email}&gt;
                          </span>
                        </div>
                        <div className="flex items-start gap-2 pt-1 border-t border-slate-200/60 dark:border-zinc-700/50">
                          <span className="font-semibold text-slate-400 dark:text-zinc-500 w-16 shrink-0 pt-0.5">제목:</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white break-all">
                            {replySubject || `[답변] ${selectedInquiry.title} 문의에 대한 답변입니다.`}
                          </span>
                        </div>
                      </div>

                      {/* 이메일 본문 캔버스 */}
                      <div className="p-5 sm:p-6 space-y-5 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 flex-1 text-sm leading-relaxed overflow-y-auto custom-scrollbar">
                        
                        {/* 1. 상단 브랜드 헤더 */}
                        <div className="pb-3 border-b-2 border-blue-600 flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-extrabold text-blue-600 tracking-wider">
                              ONRIVI AUTHOR SUPPORT
                            </span>
                            <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                              {replyGreeting || '문의하신 내용에 대한 답변입니다.'}
                            </h4>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold text-xs">
                            OA
                          </div>
                        </div>

                        {/* 2. [접수된 문의내용] 인용 카드 */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-2">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                            <MessageSquare size={13} className="text-blue-500" />
                            <span>[접수된 문의내용]</span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                            Q. {selectedInquiry.title}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed bg-white/80 dark:bg-zinc-900/80 p-3 rounded-lg border border-slate-200/60 dark:border-zinc-700/50">
                            {selectedInquiry.content}
                          </div>
                          {selectedInquiry.attachment_urls && selectedInquiry.attachment_urls.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <span className="text-[11px] text-slate-400 dark:text-zinc-500 self-center">고객 첨부:</span>
                              {selectedInquiry.attachment_urls.map((url, i) => {
                                const nameMatch = url.match(/name=([^&]+)/);
                                const fileName = nameMatch ? decodeURIComponent(nameMatch[1]) : `첨부파일 ${i + 1}`;
                                return (
                                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded text-[11px] text-slate-600 dark:text-zinc-300">
                                    <Download size={10} />
                                    {fileName}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* 3. [온리비 어서 공식 답변] 카드 */}
                        <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border-l-4 border-blue-600 border-r border-t border-b border-blue-100 dark:border-blue-900/40 space-y-2 shadow-xs">
                          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                            <CheckCircle2 size={13} />
                            <span>[온리비 어서 공식 답변]</span>
                          </div>
                          <div className="text-sm text-slate-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed min-h-[60px] font-sans">
                            {answerContent ? (
                              answerContent
                            ) : (
                              <span className="text-slate-400 dark:text-zinc-500 italic text-xs">
                                (좌측 폼의 관리자 답변란에 내용을 입력하시면 여기에 실시간으로 렌더링됩니다.)
                              </span>
                            )}
                          </div>

                          {/* 첨부파일 칩 목록 (발송 예정 첨부파일) */}
                          {(replyFiles.length > 0 || existingUrls.length > 0) && (
                            <div className="pt-2.5 border-t border-blue-200/60 dark:border-blue-800/40">
                              <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1">
                                <Paperclip size={11} />
                                <span>답변 첨부파일 ({replyFiles.length + existingUrls.length}개):</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {existingUrls.map((url, i) => {
                                  const nameMatch = url.match(/name=([^&]+)/);
                                  const fileName = nameMatch ? decodeURIComponent(nameMatch[1]) : `기존 첨부 ${i + 1}`;
                                  return (
                                    <span key={`ex-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-900 rounded text-[11px] text-blue-700 dark:text-blue-300">
                                      <Paperclip size={10} />
                                      {fileName}
                                    </span>
                                  );
                                })}
                                {replyFiles.map((file, i) => (
                                  <span key={`new-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 border border-blue-300 dark:border-blue-800 rounded text-[11px] text-blue-800 dark:text-blue-200 font-medium">
                                    <Paperclip size={10} />
                                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 4. 맺음말 */}
                        <div className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed pt-1">
                          {replyClosing || '답변 드린 내용 외에 추가로 궁금하신 점이나 확인이 필요한 사항이 있으시면 언제든 편하게 말씀해 주시기 바랍니다.'}
                        </div>

                        {/* 5. 발신 전용 푸터 */}
                        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 text-center space-y-1">
                          <p className="text-xs text-slate-400 dark:text-zinc-500">
                            본 메일은 발신 전용 메일입니다. 추가 문의사항이 있으시면 온리비 공식 웹사이트를 이용해 주세요.
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-zinc-600 font-mono">
                            © Onrivi Author Support Team. All rights reserved.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. 하단 모달 액션 바 */}
            <div className="px-6 py-4 border-t border-[var(--admin-border)] flex flex-wrap justify-between items-center gap-3 shrink-0 bg-[var(--admin-surface-bright)]/40">
              <div className="text-xs text-[var(--admin-text-muted)]">
                {sendEmail ? (
                  <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                    <Send size={12} /> 저장 즉시 고객의 이메일({selectedInquiry.email})로 회신 메일이 자동 발송됩니다.
                  </span>
                ) : (
                  <span>* 이메일 발송이 해제되어 있으므로 데이터베이스에 답변 내역만 저장됩니다.</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setModalOpen(false)} className="admin-btn-secondary">
                  취소
                </button>
                {(isAdminSuper || isAdminSupport) && (
                  <button 
                    onClick={handleSaveReply} 
                    disabled={saving || uploading}
                    className="px-5 py-2.5 admin-btn-primary text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                  >
                    {(saving || uploading) ? (
                      '업로드 및 저장 중...'
                    ) : (
                      <>
                        <CheckCircle2 size={16}/> 
                        <span>{sendEmail ? '이메일 발송 및 답변 저장' : '답변 내용만 저장'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
