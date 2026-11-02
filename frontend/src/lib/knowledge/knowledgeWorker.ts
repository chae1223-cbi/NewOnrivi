// ====================================================================
// 📊 [OMD-CORE-knowledgeWorker-0001] knowledgeWorker.ts ➔ Knowledge Worker & Resource Controller
// 🎯 @KICK  : 로컬 SQLite 큐 기반 비동기 워커 풀, 에디터 타이핑 시 동시성 자동 감속(자원 제어), 429 지수 백오프 관리
// 🛡️ @GUARD : Rule 1, Rule 2, Rule 7 (원트랜잭션 무결성 및 실패 시 클린 롤백), 실시간 진행 가시성
// 🚨 @PATCH : **2026-09-16** — [지식 색인 단계별 실시간 진행 브로드캐스트 및 친절한 오류 진단]:
//             1) 단계별 세부 진행(PARSE/EMBED) 및 현재 처리 파일명을 브라우저 UI로 실시간 브로드캐스트하여 가시성 100% 보장
//             2) AI 실패 시(429 할당량 초과, 401 키 오류, 503 서버 지연) 친절한 한글 오류 진단(knowledge:error) 및 전체 완료 이벤트(knowledge:all-completed) 연동
//             **2026-09-04** — [서버 부하 방어] 큐가 비어있고 활성 워커가 0일 때 무한 1초 pop 반복 루프를 즉시 중단하고 완전 유휴(Idle) 전이하여 불필요한 백엔드 API 호출 및 CPU 부하 원천 제거
//             **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] KUI-007/KUI-008 대량 문서 백그라운드 워커 및 리소스 컨트롤러 최초 구현
// 🔗 @CALLS : ./knowledgeDb, ./documentScanner
// ====================================================================

import type { KnowledgeJob, KnowledgeJobStep, QueueProgressStats } from '../../types/knowledge';

/**
 * 🎮 리소스 컨트롤러 (ResourceController)
 * 사용자가 Monaco 에디터에서 타이핑/편집 중일 때 대량 AI 워커의 Concurrency를 1로 낮춰
 * UI 렌더링과 키 입력을 최우선으로 보호합니다.
 */
export class ResourceController {
  private static instance: ResourceController;
  private isUserTyping: boolean = false;
  private typingTimer: any = null;
  private listeners: Array<(isTyping: boolean) => void> = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('editor:typing', this.handleTypingActivity);
      window.addEventListener('keydown', this.handleTypingActivity, { passive: true });
    }
  }

  public static getInstance(): ResourceController {
    if (!ResourceController.instance) {
      ResourceController.instance = new ResourceController();
    }
    return ResourceController.instance;
  }

  private handleTypingActivity = () => {
    if (!this.isUserTyping) {
      this.isUserTyping = true;
      this.notifyListeners();
    }

    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    // 1.5초간 추가 입력이 없으면 유휴(Idle) 상태로 복원
    this.typingTimer = setTimeout(() => {
      this.isUserTyping = false;
      this.notifyListeners();
    }, 1500);
  };

  private throttlingEnabled: boolean = true;

  public setEditorTypingThrottling(enabled: boolean): void {
    this.throttlingEnabled = enabled;
  }

  public getEffectiveConcurrency(configuredConcurrency: number): number {
    // 에디터 타이핑 중에는 Worker Concurrency를 1로 강제 감속 (활성화된 경우)
    if (this.throttlingEnabled && this.isUserTyping) {
      return 1;
    }
    return Math.max(1, Math.min(configuredConcurrency, 5));
  }

  public isTyping(): boolean {
    return this.isUserTyping;
  }

  public subscribe(callback: (isTyping: boolean) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.isUserTyping);
    }
  }
}

export interface WorkerOptions {
  resourceFolder: string;
  geminiApiKey: string;
  planCode?: string;
  aiModelName?: string;
  concurrency?: number; // 1 ~ 5 (기본 3)
  maxWorkers?: number;  // concurrency 별칭
  onProgress?: (stats: QueueProgressStats) => void;
}

/**
 * ⚙️ 로컬 지식 워커 엔진 (KnowledgeWorkerEngine)
 */
export class KnowledgeWorkerEngine {
  private static instance: KnowledgeWorkerEngine | null = null;
  private options: WorkerOptions;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private activeWorkers: number = 0;
  private timer: any = null;
  private resourceController = ResourceController.getInstance();

  constructor(options: WorkerOptions) {
    this.options = {
      ...options,
      concurrency: options.concurrency ?? 3,
      planCode: options.planCode ?? 'ELITEPRO',
      aiModelName: options.aiModelName ?? 'gemini-3.8-flash'
    };
  }

  public static getInstance(options?: WorkerOptions): KnowledgeWorkerEngine {
    if (!KnowledgeWorkerEngine.instance && options) {
      KnowledgeWorkerEngine.instance = new KnowledgeWorkerEngine(options);
    } else if (options && KnowledgeWorkerEngine.instance) {
      KnowledgeWorkerEngine.instance.updateOptions(options);
    }
    return KnowledgeWorkerEngine.instance!;
  }

  public updateOptions(options: Partial<WorkerOptions>) {
    this.options = { ...this.options, ...options };
  }

  public start() {
    if (this.isRunning && !this.isPaused) return;
    this.isRunning = true;
    this.isPaused = false;
    this.scheduleNextTick(100);
  }

  public pause() {
    this.isPaused = true;
    this.broadcastProgress();
  }

  public resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.scheduleNextTick(100);
  }

  public stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public isBusy(): boolean {
    return this.activeWorkers > 0;
  }

  public getStatus(): { isRunning: boolean; isPaused: boolean; activeWorkers: number } {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      activeWorkers: this.activeWorkers
    };
  }

  private scheduleNextTick(delayMs = 500) {
    if (this.timer) clearTimeout(this.timer);
    if (!this.isRunning || this.isPaused) return;
    this.timer = setTimeout(() => this.tick(), delayMs);
  }

  private async tick() {
    if (!this.isRunning || this.isPaused) return;

    const effectiveConcurrency = this.resourceController.getEffectiveConcurrency(this.options.concurrency || 3);

    let anySpawned = false;
    while (this.activeWorkers < effectiveConcurrency) {
      // 다음 작업 실행
      const started = await this.spawnWorker();
      if (!started) break;
      anySpawned = true;
    }

    // 🛡️ [서버 부하 방어] 큐가 비어있고 현재 활성 워커도 모두 종료된 경우:
    // 무한 1초 pop 반복 루프를 즉시 중단하고 완전 유휴(Idle) 상태로 전환하여 서버 부하 0% 달성
    if (!anySpawned && this.activeWorkers === 0) {
      this.isRunning = false;
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      this.broadcastProgress();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('knowledge:all-completed'));
      }
      return;
    }

    // 작업이 아직 남아있거나 실행 중인 작업이 있는 경우에만 다음 틱 스케줄
    if (this.isRunning && !this.isPaused) {
      this.scheduleNextTick(1000);
    }
  }

  private async spawnWorker(): Promise<boolean> {
    if (this.isPaused) return false;

    try {
      // API 라우트를 통해 원자적으로 다음 작업 팝
      const popRes = await fetch('/api/knowledge/queue/pop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceFolder: this.options.resourceFolder })
      });

      if (!popRes.ok) return false;
      const popData = await popRes.json();
      if (!popData.ok || !popData.job) return false;

      const job: KnowledgeJob = popData.job;
      this.activeWorkers++;
      this.broadcastProgress({ currentFile: job.filePath, currentStep: 'HASH' });

      // 비동기로 작업 파이프라인 실행
      this.processJob(job)
        .catch(err => {
          console.error(`[Worker Error on job ${job.id}]:`, err);
        })
        .finally(() => {
          this.activeWorkers--;
          this.broadcastProgress();
          this.scheduleNextTick(100);
        });

      return true;
    } catch {
      return false;
    }
  }

  private async processJob(job: KnowledgeJob) {
    try {
      // 1. 단계별 상태 갱신: PARSE & CHUNK
      await this.reportStep(job.id, 'PARSE');
      this.broadcastProgress({ currentFile: job.filePath, currentStep: 'PARSE' });

      // 2. 파일 색인 API 호출 (선행 검증 -> LLM 정형 분석 -> FTS/청크 단일 트랜잭션)
      this.broadcastProgress({ currentFile: job.filePath, currentStep: 'AI_ANALYSIS' });
      const indexRes = await fetch('/api/knowledge/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: job.filePath,
          title: job.title,
          resourceFolder: this.options.resourceFolder,
          geminiApiKey: this.options.geminiApiKey,
          planCode: this.options.planCode,
          aiModelName: this.options.aiModelName,
          priority: job.priority
        })
      });

      const data = await indexRes.json();
      if (!indexRes.ok || !data.ok) {
        throw new Error(data.message || '인덱싱 처리에 실패했습니다.');
      }

      // 3. 성공 완료
      await fetch('/api/knowledge/queue/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          success: true,
          resourceFolder: this.options.resourceFolder
        })
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('knowledge:updated'));
      }
    } catch (err: any) {
      const rawErrMsg = err?.message || '알 수 없는 오류';
      let friendlyMsg = rawErrMsg;

      if (rawErrMsg.includes('429') || rawErrMsg.includes('Quota') || rawErrMsg.includes('RESOURCE_EXHAUSTED')) {
        friendlyMsg = 'Gemini API 분당 요청 한도(429 Quota Exceeded)에 도달했습니다. 잠시 후 자동 재시도합니다.';
      } else if (rawErrMsg.includes('401') || rawErrMsg.includes('API_KEY_INVALID')) {
        friendlyMsg = 'Gemini API 키가 유효하지 않습니다. 환경설정에서 API 키를 확인해주세요.';
      } else if (rawErrMsg.includes('503') || rawErrMsg.includes('Overloaded') || rawErrMsg.includes('UNAVAILABLE')) {
        friendlyMsg = 'Gemini AI 서버가 일시적으로 과부하 상태입니다. 백오프 대기 후 재시도합니다.';
      }

      const isRateLimit = rawErrMsg.includes('429') || rawErrMsg.includes('Quota') || rawErrMsg.includes('Rate Limit');
      const backoffSeconds = isRateLimit ? Math.pow(2, (job.retryCount || 0) + 1) * 2 : undefined;

      await fetch('/api/knowledge/queue/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          success: false,
          errorLog: friendlyMsg,
          backoffSeconds,
          resourceFolder: this.options.resourceFolder
        })
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('knowledge:error', {
          detail: {
            filePath: job.filePath,
            error: friendlyMsg
          }
        }));
      }
    }
  }

  private async reportStep(jobId: string, step: KnowledgeJobStep) {
    try {
      await fetch('/api/knowledge/queue/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          step,
          resourceFolder: this.options.resourceFolder
        })
      });
    } catch {}
  }

  private async broadcastProgress(extra?: Partial<QueueProgressStats>) {
    try {
      const statsRes = await fetch('/api/knowledge/queue/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceFolder: this.options.resourceFolder })
      });
      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data.ok && data.stats) {
          const stats: QueueProgressStats = {
            ...data.stats,
            activeWorkers: this.activeWorkers,
            maxWorkers: this.options.concurrency || 3,
            isPaused: this.isPaused,
            rateLimitStatus: 'NORMAL',
            ...extra
          };
          this.options.onProgress?.(stats);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('knowledge:queue-progress', { detail: stats }));
          }
        }
      }
    } catch {}
  }
}
