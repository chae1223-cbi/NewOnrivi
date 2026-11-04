// ====================================================================
// 📊 [OMD-API-knowledgeQuery-0001] route.ts ➔ Knowledge Query & Answer API Route
// 🎯 @KICK  : 지식 보관함 대상 하이브리드 RAG 검색 및 Gemini 답변 생성
// 🛡️ @GUARD : Node.js 서버 환경 보장, 토큰 예산 관리, 출처 청크 반환
// 🚨 @PATCH : 2026-11-04 — [AI/지식문서 정밀 진단 로깅 연계] doing/target 컨텍스트 및 4xx 사전 경고 로깅 추가
// 🚨 @PATCH : 2026-11-02 — [로컬 SQLite 공통 오류 표준화] knowledgeErrorResponse 연동 및 진단 ID 부여
// 🚨 @PATCH : **2026-09-04** — [ONRIVI-KNOWLEDGE-ENGINE-003] 지식 기반 AI 질의응답 엔드포인트 구현
// 🔗 @CALLS : @/lib/knowledge/knowledgeService
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { knowledgeErrorResponse } from '@/lib/knowledge/knowledgeError';
import { KnowledgeService } from '@/lib/knowledge/knowledgeService';
import path from 'node:path';
import fs from 'node:fs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let targetQuery = 'QUERY';
  try {
    const body = await req.json();
    const { query, resourceFolder, geminiApiKey, planCode, aiModelName, files } = body;
    if (query) targetQuery = String(query).slice(0, 30);
if (!query || !query.trim()) {
      console.warn('[ClientWarn] HTTP 400 · INVALID_PARAMS · 검색할 질문(query)을 입력해 주세요. [경로: /api/knowledge/query]');
      return NextResponse.json(
        { ok: false, message: '검색할 질문(query)을 입력해 주세요.' },
        { status: 400 }
      );
    }

    if (!resourceFolder || !resourceFolder.trim()) {
      console.warn('[ClientWarn] HTTP 400 · NO_RESOURCE_FOLDER · 리소스 폴더가 설정되지 않았습니다. [경로: /api/knowledge/query]');
      return NextResponse.json(
        { ok: false, code: 'NO_RESOURCE_FOLDER', message: '공통 자원(리소스) 폴더가 설정되지 않았습니다. 환경설정에서 리소스 폴더를 먼저 지정해 주세요.' },
        { status: 400 }
      );
    }
    const effectiveResourceFolder = resourceFolder.trim();

    // 클라이언트가 보낸 파일 본문 맵 또는 서버 로컬 파일 읽기 슬라이서
    const fileMap: Record<string, string> = files || {};
    const readFileSlice = (filePath: string, start: number, end: number) => {
      let content = fileMap[filePath] || '';
      if (!content && fs.existsSync(filePath)) {
        try {
          content = fs.readFileSync(filePath, 'utf-8');
        } catch {}
      }
      if (!content) return '';
      const lines = content.split('\n');
      return lines.slice(Math.max(0, start - 1), end).join('\n');
    };

    const result = await KnowledgeService.queryAnswer(
      {
        query,
        resourceFolder: effectiveResourceFolder,
        geminiApiKey,
        planCode: planCode || 'ELITEPRO',
        limit: 20,
      },
      readFileSlice
    );

    return NextResponse.json({
      ok: true,
      answer: result.answer,
      evidenceList: result.evidenceList,
    });
  } catch (err: any) {
    return knowledgeErrorResponse(err, {
      source: 'api/knowledge/query',
      stage: 'query_knowledge_answer',
      doing: '지식 보관함 대상 하이브리드 RAG 질의 처리 중',
      target: targetQuery,
    });
  }
}
