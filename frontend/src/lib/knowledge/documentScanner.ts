// ====================================================================
// 📊 [OMD-CORE-documentScanner-0001] documentScanner.ts ➔ Local Document Scanner
// 🎯 @KICK  : 로컬 파일 시스템 또는 워크스페이스 트리를 사전 탐색하여 신규/변경/기존/미지원 문서를 고속 분류
// 🛡️ @GUARD : AI API 호출 없는 순수 로컬 선행 검증, 대용량 파일 가드(최대 50MB), SHA-256 해시 무결성
// 🚨 @PATCH : **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-002.1] KUI-004/KUI-005 대량 문서 수집 위저드용 로컬 파일 스캐너 및 해시 변경 감지 엔진 최초 구현
// 🔗 @CALLS : crypto-js, ./knowledgeDb
// ====================================================================

import CryptoJS from 'crypto-js';
import type { ScannedDocumentItem, ScanResultSummary } from '../../types/knowledge';

export interface RawScanTarget {
  path: string;
  name: string;
  size?: number;
  content?: string;
  modifiedAt?: string;
}

/**
 * 주어진 파일 목록을 데이터베이스 레코드와 대조하여
 * 신규(NEW), 변경(CHANGED), 기존(EXISTING), 미지원(UNSUPPORTED)으로 고속 분류합니다.
 */
export function classifyScannedDocuments(
  rawFiles: RawScanTarget[],
  existingDocs: Array<{ id: string; file_path: string; file_hash: string }> = []
): ScanResultSummary {
  const existingMap = new Map<string, { id: string; file_hash: string }>();
  for (const doc of existingDocs) {
    existingMap.set(doc.file_path, { id: doc.id, file_hash: doc.file_hash });
  }

  const items: ScannedDocumentItem[] = [];
  let newCount = 0;
  let changedCount = 0;
  let existingCount = 0;
  let unsupportedCount = 0;

  for (const file of rawFiles) {
    const isMarkdown = /\.md$/i.test(file.name) || /\.markdown$/i.test(file.name);
    const size = file.size || (file.content ? new Blob([file.content]).size : 0);
    const modifiedAt = file.modifiedAt || new Date().toISOString();

    if (!isMarkdown || size > 50 * 1024 * 1024) {
      unsupportedCount++;
      items.push({
        path: file.path,
        name: file.name,
        size,
        modifiedAt,
        hash: '',
        category: 'UNSUPPORTED',
        selected: false
      });
      continue;
    }

    const content = file.content || '';
    const hash = content ? CryptoJS.SHA256(content).toString() : `hash_${file.path}`;

    const existing = existingMap.get(file.path);
    if (!existing) {
      newCount++;
      items.push({
        path: file.path,
        name: file.name,
        size,
        modifiedAt,
        hash,
        category: 'NEW',
        selected: true // 신규는 기본 선택
      });
    } else if (existing.file_hash !== hash) {
      changedCount++;
      items.push({
        path: file.path,
        name: file.name,
        size,
        modifiedAt,
        hash,
        category: 'CHANGED',
        selected: true, // 변경 문서도 기본 선택
        existingDocId: existing.id
      });
    } else {
      existingCount++;
      items.push({
        path: file.path,
        name: file.name,
        size,
        modifiedAt,
        hash,
        category: 'EXISTING',
        selected: false, // 기존 문서는 기본 미선택 (필요 시 사용자 선택)
        existingDocId: existing.id
      });
    }
  }

  return {
    totalScanned: rawFiles.length,
    newCount,
    changedCount,
    existingCount,
    unsupportedCount,
    items
  };
}

/**
 * 파일 트리 노드(FileNode) 재귀 탐색 헬퍼
 */
export function flattenFileTreeNodes(nodes: any[]): RawScanTarget[] {
  const result: RawScanTarget[] = [];
  const traverse = (nodeList: any[], parentPath = '') => {
    for (const node of nodeList) {
      const fullPath = node.path || (parentPath ? `${parentPath}/${node.name}` : node.name);
      if (node.kind === 'file' || node.type === 'file') {
        result.push({
          path: fullPath,
          name: node.name,
          size: node.size || (node.content ? node.content.length : 0),
          content: node.content,
          modifiedAt: node.modifiedAt || node.lastModified
        });
      }
      if (node.children && Array.isArray(node.children)) {
        traverse(node.children, fullPath);
      }
    }
  };

  traverse(nodes);
  return result;
}
