// ====================================================================
// 📊 [OMD-CORE-knowledge-0001] knowledge.ts ➔ Knowledge Types & Contracts
// 🎯 @KICK  : Onrivi 지능형 개인 지식 관리 & 하이브리드 AI 질의 엔진 데이터 모델 및 인터페이스 정의
// 🛡️ @GUARD : DocumentStatus / JobStatus 분리, 점수 범위(0~100) 및 우선순위(1~5) 엄격 제한
// 🚨 @PATCH : **2026-09-16** — [의미 기반 RAG 표준 청킹(Semantic Chunking) 구조화 메타데이터 확장]: DocumentChunk에 chunkType('section' | 'paragraph' | 'table' | 'code'), parentChunkId, contextHeader 필드 추가하여 표 원자성 및 단독 청크 독립성 보장
// 🚨 @PATCH : **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] KUI-001~KUI-012 명세 준수를 위한 KnowledgeCollection, KnowledgeJob, ScannedDocumentItem, QueueProgressStats 등 핵심 타입 대규모 확장
//             **2026-09-04** — [지식 문서 상세 정보 모델 정의] KnowledgeDocumentDetail 인터페이스 추가 (청크 계층, 태그 점수, 확장 검색어, AI 요약 포괄)
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] 지식 엔진 v1용 데이터 모델, 쿼리 파라미터, 하이브리드 후보자 인터페이스 최초 생성
// 🔗 @CALLS : 없음
// ====================================================================

/**
 * 지식 컬렉션 (분류 카테고리)
 */
export interface KnowledgeCollection {
  id: string;
  name: string;
  description?: string | null;
  color?: string;
  createdAt: string;
  documentCount?: number;
}

/**
 * 문서 인덱싱 생명주기 상태
 */
export type KnowledgeDocumentStatus =
  | 'REGISTERED' // 등록됨 (분석 대기 중)
  | 'INDEXING'   // AI 분석 및 인덱싱 진행 중
  | 'READY'      // 검색 및 질의 준비 완료
  | 'OUTDATED'   // 파일 내용이 변경되어 재색인 필요 (Stale)
  | 'DISABLED'   // 사용자가 일시적으로 지식 비활성화
  | 'ERROR';     // 분석 또는 청킹 실패

/**
 * 백그라운드 큐 작업 상태
 */
export type KnowledgeJobStatus =
  | 'QUEUED'     // 대기열 등록됨
  | 'RUNNING'    // 워커가 실행 중
  | 'SUCCESS'    // 성공적으로 완료
  | 'FAILED'     // 오류 발생
  | 'CANCELLED'  // 사용자에 의해 취소됨
  | 'RETRY_WAIT';// 429 등으로 인한 지수 백오프 대기 중

export type KnowledgeJobStep = 
  | 'QUEUED'
  | 'HASH'
  | 'PARSE'
  | 'CHUNK'
  | 'AI_ANALYSIS'
  | 'VALIDATION'
  | 'FTS_INDEX'
  | 'COMPLETED'
  | 'FAILED';

export type KnowledgeJobType = 'INDEX' | 'REINDEX' | 'DELETE';

/**
 * 백그라운드 인덱싱 Job 레코드
 */
export interface KnowledgeJob {
  id: string;
  documentId: string;
  filePath: string;
  title?: string;
  jobType: KnowledgeJobType;
  targetHash: string;
  priority: number; // 1 ~ 5 (기본 3)
  status: KnowledgeJobStatus;
  currentStep?: KnowledgeJobStep;
  retryCount: number;
  maxRetries: number;
  retryAfter?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  errorLog?: string | null;
  collectionName?: string;
}

/**
 * 로컬 파일 스캔 결과 아이템 (KUI-005)
 */
export interface ScannedDocumentItem {
  path: string;
  name: string;
  size: number;
  modifiedAt: string;
  hash: string;
  category: 'NEW' | 'CHANGED' | 'EXISTING' | 'UNSUPPORTED';
  selected: boolean;
  existingDocId?: string;
}

/**
 * 스캔 결과 통계
 */
export interface ScanResultSummary {
  totalScanned: number;
  newCount: number;
  changedCount: number;
  existingCount: number;
  unsupportedCount: number;
  items: ScannedDocumentItem[];
}

/**
 * 대량 등록 설정 (KUI-006)
 */
export interface ImportConfig {
  collectionId?: string;
  defaultPriority: number; // 1 ~ 5
  options: {
    summary: boolean;
    keyPoints: boolean;
    searchTerms: boolean;
    documentType: boolean;
  };
  startImmediately: boolean;
}

/**
 * 실시간 큐 진행률 통계 (KUI-007)
 */
export interface QueueProgressStats {
  total: number;
  completed: number;
  running: number;
  queued: number;
  failed: number;
  percent: number;
  currentFile?: string;
  currentStep?: KnowledgeJobStep;
  activeWorkers: number;
  maxWorkers: number;
  isPaused: boolean;
  rateLimitStatus: 'NORMAL' | 'BACKOFF' | 'BLOCKED';
  backoffCountdown?: number;
  rateLimitCooldownSec?: number;
}

/**
 * 지식 문서 마스터 레코드
 */
export interface KnowledgeDocument {
  id: string;
  collectionId?: string | null;
  filePath: string;
  title: string;
  fileHash: string;
  fileSize: number;
  modifiedAt: string;
  summary?: string;
  keyPoints: string[];
  documentType: 'technical' | 'meeting' | 'guide' | 'memo' | 'note' | 'other';
  priority: number; // 1 ~ 5 (기본 3)
  status: KnowledgeDocumentStatus;
  errorMessage?: string | null;
  analysisVersion: number;
  analyzerModel?: string;
  analyzedAt?: string;
  indexedAt?: string;
  chunksCount?: number;
}

/**
 * 마크다운 헤딩 청크 레코드
 */
export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  headingTitle: string;
  headingLevel: number;
  headingPath: string; // 예: "시스템 개요 > 아키텍처 > 저장소"
  startLine: number;   // 1-indexed
  endLine: number;     // 1-indexed
  chunkSummary?: string;
  keywords?: string;   // 콤마 구분 한국어 확장 키워드
  chunkText: string;   // FTS 인덱스용 텍스트
  chunkType?: 'section' | 'paragraph' | 'table' | 'code'; // 청크 구조 유형 (표 원자성 식별)
  parentChunkId?: string; // 상위 섹션 청크 ID (Parent-Child 맥락 연계)
  contextHeader?: string; // 단독 검색 시 완결성을 위한 문맥 접두사 (예: [문서명 > 섹션])
}

/**
 * 지식 태그 레코드
 */
export interface DocumentTag {
  id?: number;
  documentId: string;
  tagName: string;
  score: number;       // 0 ~ 100
  source: 'AI' | 'USER';
}

/**
 * LLM 정형 분석 결과 (JSON Mode 검증용)
 */
export interface KnowledgeAnalysisResult {
  summary: string;
  keyPoints: string[];
  documentType: 'technical' | 'meeting' | 'guide' | 'memo' | 'note' | 'other';
  tags: Array<{ name: string; score: number }>;
  searchTerms: string[]; // 한국어 검색용 확장 키워드
}

/**
 * 지식 문서 상세 내역 (청크, 태그, 검색어, 메타데이터 포함)
 */
export interface KnowledgeDocumentDetail {
  documentId: string;
  filePath: string;
  title: string;
  fileSize?: number;
  modifiedAt?: string;
  status?: string;
  summary: string;
  keyPoints: string[];
  documentType: string;
  tags: Array<{ name: string; score: number }>;
  searchTerms?: string[];
  analyzerModel?: string;
  chunksCount: number;
  chunks: Array<{
    id: string;
    chunkIndex: number;
    headingTitle: string;
    headingLevel: number;
    headingPath: string;
    startLine: number;
    endLine: number;
    chunkSummary?: string;
    keywords?: string | string[];
    chunkText?: string;
  }>;
}

/**
 * 하이브리드 검색 후보자 청크
 */
export interface RetrievalCandidate {
  documentId: string;
  chunkId: string;
  filePath: string;
  documentTitle: string;
  headingTitle: string;
  headingPath: string;
  startLine: number;
  endLine: number;
  fileHash: string;

  // 개별 점수 보존 (디버깅 및 랭킹 튜닝)
  rawBm25: number;
  normalizedFtsScore: number;  // 0 ~ 100
  tagScore: number;            // 0 ~ 100
  headingScore: number;        // 0 ~ 100
  priorityScore: number;       // 0 ~ 100
  finalScore: number;          // 0 ~ 100
  snippet?: string;            // 표시용 청크 스니펫 본문
  score?: number;              // 표시용 종합 관련도 점수
}

/**
 * 질의 입력 파라미터
 */
export interface KnowledgeQuery {
  query: string;
  collectionId?: string;
  limit?: number; // 기본 Top 20
  tokenBudget?: number; // 기본 4,000자
}

/**
 * LLM 컨텍스트 아이템 (출처 및 근거)
 */
export interface ContextEvidenceItem {
  documentTitle: string;
  filePath: string;
  headingPath: string;
  startLine: number;
  endLine: number;
  content: string;
  relevanceScore: number;
}

/**
 * AI 질의 최종 응답
 */
export interface KnowledgeAnswerResult {
  answer: string;
  evidenceList: ContextEvidenceItem[];
  tokensUsed?: number;
}

/**
 * LLM 프로바이더 인터페이스 (특정 벤더 종속 배제)
 */
export interface LLMProvider {
  name: string;
  analyzeDocument(markdownText: string): Promise<KnowledgeAnalysisResult>;
  answerQuestion(query: string, contextText: string): Promise<{ answer: string; tokensUsed?: number }>;
}
