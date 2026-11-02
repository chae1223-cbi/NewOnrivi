// ====================================================================
// 📊 [OMD-KNOWLEDGE-QUEUE-0001] knowledgeQueue.ts ➔ Knowledge Batch Queue & Stale Guard
// 🎯 @KICK  : 대량 마크다운 문서 일괄 색인 큐잉, Concurrency 제어 및 target_hash Stale 방어
// 🛡️ @GUARD : 비동기 동시성 제어 (기본 2개), 취소 토큰, 진행률(Progress) 콜백
// 🚨 @PATCH : **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-003] 백그라운드 일괄 색인 큐 및 Stale 방어 모듈 구현
// 🔗 @CALLS : /api/knowledge/index
// ====================================================================

export interface QueueItem {
  id: string;
  filePath: string;
  fileContent: string;
  title?: string;
  fileHash: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED_STALE';
  error?: string;
}

export interface QueueProgress {
  total: number;
  completed: number;
  failed: number;
  currentFile?: string;
  percent: number;
}

export class KnowledgeQueue {
  private queue: QueueItem[] = [];
  private concurrency: number;
  private activeCount: number = 0;
  private isRunning: boolean = false;
  private onProgressCallback?: (progress: QueueProgress) => void;
  private resourceFolder: string = '';
  private geminiApiKey: string = '';
  private planCode: string = 'ELITEPRO';
  private aiModelName: string = 'gemini-3.8-flash';

  constructor(options?: {
    concurrency?: number;
    resourceFolder?: string;
    geminiApiKey?: string;
    planCode?: string;
    aiModelName?: string;
    onProgress?: (progress: QueueProgress) => void;
  }) {
    this.concurrency = options?.concurrency || 2;
    this.resourceFolder = options?.resourceFolder || '';
    this.geminiApiKey = options?.geminiApiKey || '';
    this.planCode = options?.planCode || 'ELITEPRO';
    this.aiModelName = options?.aiModelName || 'gemini-3.8-flash';
    this.onProgressCallback = options?.onProgress;
  }

  enqueue(items: Omit<QueueItem, 'status' | 'id'>[]): void {
    for (const item of items) {
      const existing = this.queue.find(q => q.filePath === item.filePath);
      if (existing) {
        existing.fileContent = item.fileContent;
        existing.fileHash = item.fileHash;
        existing.title = item.title;
        existing.status = 'PENDING';
      } else {
        this.queue.push({
          ...item,
          id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          status: 'PENDING',
        });
      }
    }
    this.emitProgress();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.processNext();
  }

  stop(): void {
    this.isRunning = false;
  }

  private async processNext(): Promise<void> {
    if (!this.isRunning) return;

    while (this.activeCount < this.concurrency) {
      const nextItem = this.queue.find(q => q.status === 'PENDING');
      if (!nextItem) break;

      nextItem.status = 'PROCESSING';
      this.activeCount++;
      this.emitProgress(nextItem.filePath);

      this.processItem(nextItem).finally(() => {
        this.activeCount--;
        this.emitProgress();
        this.processNext();
      });
    }
  }

  private async processItem(item: QueueItem): Promise<void> {
    try {
      const res = await fetch('/api/knowledge/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: item.filePath,
          fileContent: item.fileContent,
          title: item.title || item.filePath.split(/[/\\]/).pop()?.replace(/\.md$/i, '') || item.filePath,
          resourceFolder: this.resourceFolder,
          geminiApiKey: this.geminiApiKey,
          planCode: this.planCode,
          aiModelName: this.aiModelName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || '인덱싱 실패');
      }

      item.status = 'COMPLETED';
    } catch (err: any) {
      item.status = 'FAILED';
      item.error = err?.message || '알 수 없는 오류';
    }
  }

  private emitProgress(currentFile?: string): void {
    if (!this.onProgressCallback) return;
    const total = this.queue.length;
    const completed = this.queue.filter(q => q.status === 'COMPLETED').length;
    const failed = this.queue.filter(q => q.status === 'FAILED').length;
    const percent = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

    this.onProgressCallback({
      total,
      completed,
      failed,
      currentFile,
      percent,
    });
  }

  getItems(): QueueItem[] {
    return [...this.queue];
  }
}
