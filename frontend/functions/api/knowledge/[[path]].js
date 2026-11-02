// ====================================================================
// 📊 [OMD-CF-knowledgeCatchAll-0001] [[path]].js ➔ Cloudflare Knowledge API Fallback
// 🎯 @KICK  : 웹 프로덕션(Cloudflare Pages) 환경에서 /api/knowledge/* 호출 시 404/405 차단 및 데스크톱 전용 기능 안내 200 OK 반환
// 🛡️ @GUARD : CORS 사전요청(OPTIONS) 처리, 일관된 JSON 응답 스키마
// 🚨 @PATCH : **2026-09-06** — [웹 프로덕션 로컬 SQLite 격리 및 안내 API 탑재] 로컬 SQLite DB(onrivi_knowledge.db)는 데스크톱 전용 기능이므로 웹 환경 호출 시 404/405 콘솔 에러를 원천 차단하고 200 OK 빈 데이터 및 데스크톱 안내 응답 반환
// 🔗 @CALLS : ../admin/_shared.js
// ====================================================================

import { jsonResponse, handleOptions } from '../admin/_shared.js';

export const onRequestOptions = handleOptions;

export async function onRequest(context) {
  const { request, params } = context;
  const pathSegments = params.path || [];
  const subPath = Array.isArray(pathSegments) ? pathSegments.join('/') : String(pathSegments);

  // 1. 등록 문서 목록 (list)
  if (subPath === 'list') {
    return jsonResponse({
      ok: true,
      isDesktopOnly: true,
      message: '로컬 SQLite 지식 베이스는 PC 보안 정책에 따라 데스크톱 전용 프로그램에서 완벽 지원됩니다.',
      documents: []
    });
  }

  // 2. 큐 작업 현황 통계 (queue/stats)
  if (subPath === 'queue/stats') {
    return jsonResponse({
      ok: true,
      isDesktopOnly: true,
      stats: {
        total: 0,
        completed: 0,
        running: 0,
        queued: 0,
        failed: 0,
        percent: 0,
        activeWorkers: 0,
        maxWorkers: 2,
        isPaused: false,
        rateLimitStatus: 'NORMAL'
      }
    });
  }

  // 3. 지식 컬렉션 목록 (collection)
  if (subPath === 'collection') {
    return jsonResponse({
      ok: true,
      isDesktopOnly: true,
      collections: []
    });
  }

  // 4. 문서 상세 정보 (detail)
  if (subPath === 'detail') {
    return jsonResponse({
      ok: false,
      isDesktopOnly: true,
      message: '로컬 지식 문서 상세 정보는 데스크톱 전용 프로그램에서 조회 가능합니다.'
    }, 200);
  }

  // 5. 작업 큐 목록 (queue)
  if (subPath === 'queue') {
    return jsonResponse({
      ok: true,
      isDesktopOnly: true,
      jobs: [],
      total: 0
    });
  }

  // 6. 기타 모든 /api/knowledge/* 엔드포인트
  return jsonResponse({
    ok: true,
    isDesktopOnly: true,
    message: '로컬 지식 베이스(SQLite)는 Onrivi Author 데스크톱 전용 프로그램에서 지원됩니다.'
  });
}
