// 🚨 @PATCH : **2026-11-04** — [KST(한국표준시 UTC+9) 기준 일자 파티셔닝 적용]: UTC 자정 시차(00~09시)로 인한 날짜 불일치 해결
// 🚨 @PATCH : **2026-11-04** — [R2 시스템 로그 적재 환경변수 스위치(ENABLE_R2_LOGS) 적용]: 기본 적재 비활성화(false) 및 console.error 콘솔 출력 유지로 Cloudflare 실시간 로그 지원
// 🚨 @PATCH : **2026-11-03** — [전 API 라우트 target 및 doing 자동 추출 전면 확장]: 이미지, 파라미터(path, email, user_id, plan, id 등), REST ID 및 X-Error-Target/Doing 전역 연계
// 🚨 @PATCH : **2026-11-03** — [HTTP 로그 target 식별자 추출 및 prod/preview 환경 분리]:
//             1) extractLogTarget 추가로 이미지(/api/image/*) 및 파라미터 기반 대상 식별자(target) 자동 기록
//             2) hostname 기반 prod/preview 환경 분기 및 R2 저장 경로 분리 (_system-logs/{prod|preview}/YYYY-MM-DD/)
// 🚨 @PATCH : 2026-11-01 — 요청 ID와 서버 오류 위치를 API 응답·R2 진단 로그에 연결한다.
const operationRoutes = {
  "/api/upload-image": "이미지 업로드",
  "/api/image": "이미지 불러오기",
  "/api/knowledge": "지식보관함",
  "/api/user/check": "사용자 확인",
  "/api/user/upsert": "사용자 정보 저장",
  "/api/user/delete": "사용자 삭제",
  "/api/subscription/get": "구독 정보 조회",
  "/api/subscription/create": "구독 생성",
  "/api/subscription/cancel": "구독 취소",
  "/api/subscription/expire": "구독 만료 처리",
  "/api/subscription/subscribe-desktop": "데스크톱 구독 등록",
  "/api/license/activate": "라이선스 활성화",
  "/api/license/check-session": "라이선스 세션 확인",
  "/api/license/verify-desktop": "데스크톱 라이선스 확인",
  "/api/device/session-status": "기기 세션 확인",
  "/api/device/dashboard-sessions": "기기 세션 목록 조회",
  "/api/device/logout-session": "기기 로그아웃",
  "/api/device/deactivate": "기기 등록 해제",
  "/api/password/request": "비밀번호 재설정 요청",
  "/api/password/confirm": "비밀번호 재설정 확인",
  "/api/auth/request-password-reset": "비밀번호 재설정 요청",
  "/api/auth/reset-password-confirm": "비밀번호 변경",
  "/api/plans": "요금제",
  "/api/faqs": "자주 묻는 질문",
  "/api/oembed": "외부 콘텐츠 미리보기",
  "/api/blog/drafts": "블로그 임시글",
  "/api/blog/categories": "블로그 카테고리",
  "/api/admin/users/plan": "관리자 사용자 요금제",
  "/api/admin/users": "관리자 사용자 관리",
  "/api/admin/admins": "관리자 계정 관리",
  "/api/admin/contents": "관리자 콘텐츠 관리",
  "/api/admin/blog": "관리자 블로그 관리",
  "/api/admin/inquiries": "관리자 문의 관리",
  "/api/admin/plans": "관리자 요금제 관리",
  "/api/admin/audit-logs": "관리자 감사 로그",
  "/api/admin/log-check": "로그 기록 테스트",
  "/api/admin/subscriptions": "관리자 구독 관리",
  "/api/admin/common-codes": "관리자 공통 코드 관리",
  "/api/admin/mfa/reset": "관리자 추가 인증 초기화",
  "/api/beta/register": "베타 참여 등록",
  "/api/beta/active-promotion": "베타 프로모션 조회",
  "/api/rpc/support/insert": "문의 등록",
  "/api/rpc/device/delete": "기기 삭제"
};
function describeOperation(path, method) {
  const matched = Object.keys(operationRoutes).sort((a,b) => b.length-a.length).find(route => path === route || path.startsWith(route + "/"));
  const verb = { GET: "조회", POST: "처리", PUT: "저장", PATCH: "변경", DELETE: "삭제" }[method] || method;
  return matched ? `${operationRoutes[matched]} · ${verb}` : `API ${verb}`;
}
const publicRouteSegments = new Set(["activate", "active-promotion", "admin", "admins", "api", "audit-logs", "beta", "blog", "cancel", "categories", "check", "check-session", "common-codes", "confirm", "contents", "create", "dashboard-sessions", "deactivate", "delete", "device", "devices", "drafts", "expire", "faqs", "get", "groups", "image", "inquiries", "insert", "knowledge", "license", "log-check", "logout-session", "mfa", "oembed", "password", "plan", "plans", "register", "request", "reset", "rpc", "session-status", "subscribe-desktop", "subscription", "subscriptions", "support", "system", "upload-image", "upsert", "user", "users", "verify-desktop"]);

function redactLogMessage(value) {
  if (typeof value !== 'string') return '';
  return value.slice(0, 2000)
    .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [가림]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[토큰 가림]')
    .replace(/((?:password|passwd|token|secret|authorization|api[_-]?key)\s*[=:]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1[가림]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[이메일 가림]')
    .replace(/\b01[016789][- ]?\d{3,4}[- ]?\d{4}\b/g, '[전화번호 가림]')
    .replace(/https?:\/\/[^\s]+/gi, '[URL 가림]')
    .replace(/\b(?:postgres(?:ql)?|mysql):\/\/[^\s]+/gi, '[연결정보 가림]');
}
async function readErrorMessage(response) {
  const type = response.headers.get('content-type') || '';
  if (!/json|text\/plain/i.test(type) || !response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) return '';
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const text = new TextDecoder().decode(bytes);
    if (!/json/i.test(type)) return redactLogMessage(text);
    const data = JSON.parse(text);
    // Store only explicit error fields, never the complete response object.
    return [data.code, typeof data.error === 'string' ? data.error : data.error?.message, data.message]
      .filter(value => typeof value === 'string').map(redactLogMessage).filter(Boolean).join(' · ');
  } catch { return ''; }
  finally { void reader.cancel().catch(() => {}); }
}


function extractLogTarget(url, headers) {
  // 1. 응답 헤더에 명시된 대상 식별자 우선 사용
  const headerTarget = headers?.get('X-Error-Target');
  if (headerTarget) {
    try {
      return redactLogMessage(decodeURIComponent(headerTarget));
    } catch {
      return redactLogMessage(headerTarget);
    }
  }

  const pathname = url.pathname;

  // 2. /api/image/* (이미지 서빙 라우트)
  if (pathname.startsWith('/api/image/')) {
    const rawKey = pathname.replace(/^\/api\/image\//, '');
    try {
      return redactLogMessage(decodeURIComponent(rawKey));
    } catch {
      return redactLogMessage(rawKey);
    }
  }

  // 3. /api/blog/* (블로그 슬러그)
  if (pathname.startsWith('/api/blog/')) {
    const slug = pathname.replace(/^\/api\/blog\//, '');
    if (slug && !slug.includes('/')) return `blog:${decodeURIComponent(slug)}`;
  }

  // 4. /api/help/* (도움말 문서)
  if (pathname.startsWith('/api/help/')) {
    const doc = pathname.replace(/^\/api\/help\//, '');
    if (doc) return `help:${decodeURIComponent(doc)}`;
  }

  // 5. 전 API 라우트 파라미터 기반 대상 식별자 자동 추출 (우선순위 순서)
  const targetKeys = [
    'path', 'filePath', 'file', 'fileName',
    'p_email', 'email', 'user_id', 'userId', 'p_user_id',
    'p_plan_name', 'plan_name', 'plan',
    'subscription_id', 'p_device_uuid', 'device_uuid', 'session_id', 'p_session_id',
    'license_key', 'search', 'date', 'slug', 'id'
  ];

  for (const key of targetKeys) {
    if (url.searchParams.has(key)) {
      const val = url.searchParams.get(key);
      if (val) return `${key}=${redactLogMessage(val)}`;
    }
  }

  // 6. REST 스타일 경로의 마지막 세그먼트가 ID인 경우 (/api/admin/users/12345)
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 3) {
    const last = segments[segments.length - 1];
    if (/^[0-9a-f-]{8,}$/i.test(last) || /^\d+$/.test(last)) {
      return `${segments[segments.length - 2]}:${last}`;
    }
  }

  return '-';
}

// Store metadata and redacted error messages only.
export async function onRequest(context) {
  const started = Date.now();
  const url = new URL(context.request.url);
  const requestId = crypto.randomUUID();
  const route = url.pathname.split('/').map(segment => !segment || publicRouteSegments.has(segment) ? segment : ':value').join('/');
  let unhandled = false;
  let exceptionMessage = "";
  let response;
  const downstreamHeaders = new Headers(context.request.headers);
  downstreamHeaders.set('x-onrivi-request-id', requestId);
  try { response = await context.next(new Request(context.request, { headers: downstreamHeaders })); }
  catch (error) { exceptionMessage = redactLogMessage(error instanceof Error ? error.message : 'Unknown server exception'); unhandled = true; response = new Response('Internal server error', { status: 500 }); }
  // Temporary diagnostic window ends at 2026-10-10 00:00 KST.
  const captureAllToday = Date.now() < Date.parse('2026-10-10T00:00:00+09:00');
  const enableR2Logs = context.env.ENABLE_R2_LOGS === 'true';
  const shouldLog = (captureAllToday || response.status >= 400 || (context.request.method !== 'GET' && ['/api/subscription/create','/api/subscription/cancel','/api/subscription/subscribe-desktop','/api/admin/users/plan'].includes(url.pathname))) && !url.pathname.startsWith('/api/admin/system') && url.pathname !== '/api/client-log' && !(response.status < 400 && ['/api/device/session-status','/api/license/check-session'].includes(url.pathname));

  if (shouldLog) {
    const hostname = url.hostname;
    const isProd = hostname === 'onrivi.com' || hostname === 'www.onrivi.com';
    const envType = isProd ? 'prod' : 'preview';
    const logTarget = extractLogTarget(url, response.headers);
    const doingHeader = response.headers.get('X-Error-Doing');
    let operationText = describeOperation(url.pathname, context.request.method);
    if (doingHeader) {
      try { operationText += ` · ${decodeURIComponent(doingHeader)}`; } catch {}
    }

    // Cloudflare Pages 실시간 로그 콘솔(Workers & Pages Logs)에는 항상 출력
    if (response.status >= 400 || unhandled) {
      console.error(`[ServerLog] [${envType.toUpperCase()}] HTTP ${response.status} · ${context.request.method} ${url.pathname} · 대상: ${logTarget} · ${operationText}`);
    }

    // R2 스토리지 저장은 ENABLE_R2_LOGS === 'true' 일 때만 수행 (기본값 false: R2 적재 중단)
    if (enableR2Logs && context.env.R2_BUCKET) {
      const entry = { id: requestId, timestamp: new Date().toISOString(), environment: envType.toUpperCase(), hostname, level: response.status >= 500 ? 'ERROR' : response.status >= 400 ? 'WARN' : 'INFO', module: 'HTTP', action: context.request.method, message: `HTTP ${response.status} · ${Date.now() - started}ms`, actor: 'SERVER', target: logTarget, status: response.status, route, operation: operationText, duration_ms: Date.now() - started, request_id: requestId, outcome: unhandled ? 'UNHANDLED_EXCEPTION' : 'HTTP_RESPONSE', region: context.request.cf?.colo || null, source_file: response.headers.get('X-Error-Source') || undefined, source_function: response.headers.get('X-Error-Stage') || undefined, db_code: response.headers.get('X-Error-Db-Code') || undefined };
      const date = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
      const errorResponse = response.status >= 400 && !unhandled ? response.clone() : null;
      context.waitUntil((async () => {
        const detail = exceptionMessage || (errorResponse ? await readErrorMessage(errorResponse) : '');
        if (detail) entry.message += ` · ${detail}`;
        await context.env.R2_BUCKET.put(`_system-logs/${envType}/${date}/${entry.timestamp}_${requestId}.json`, JSON.stringify(entry));
      })().catch(() => console.error('[ServerLog] Storage write failed')));
    }
  }
  const result = new Response(response.body, response);
  result.headers.delete('X-Error-Source');
  result.headers.delete('X-Error-Stage');
  result.headers.delete('X-Error-Db-Code');
  result.headers.delete('X-Error-Target');
  result.headers.delete('X-Error-Doing');
  result.headers.set('X-Request-ID', requestId);
  return result;
}
