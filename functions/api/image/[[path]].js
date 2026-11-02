/**
 * Cloudflare Pages Function: /api/image/[...path]
 * R2 버킷에서 이미지를 읽어 서빙합니다. (퍼블릭 R2 URL 불필요)
 * 
 * 요청 형식: GET /api/image/users/{userId}/img_xxx.png
 * R2 키:   users/{userId}/img_xxx.png
 */
export async function onRequestGet(context) {
  try {
    const { request, env, params } = context;

    // URL에서 이미지 경로 추출 (/api/image/ 이후 부분)
    const url = new URL(request.url);
    // pathname: /api/image/users/xxx/img.png → key: users/xxx/img.png
    let rawKey = url.pathname.replace(/^\/api\/image\//, '');
    let key = rawKey;
    try {
      key = decodeURIComponent(rawKey);
      if (key.includes('%')) {
        key = decodeURIComponent(key); // 이중 인코딩 방어용
      }
    } catch (_) {
      key = rawKey;
    }

    if (!key) {
      return new Response('Missing image path', { status: 400 });
    }

    if (!env.R2_BUCKET) {
      return new Response('R2_BUCKET binding missing', { status: 500 });
    }

    // R2에서 객체 읽기
    const object = await env.R2_BUCKET.get(key);

    if (!object) {
      return new Response('Image not found', { status: 404 });
    }

    // Content-Type 결정
    const ext = key.split('.').pop()?.toLowerCase() || '';
    const contentTypeMap = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'ogg': 'video/ogg',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mkv': 'video/x-matroska',
      'md': 'text/markdown; charset=utf-8',
      'txt': 'text/plain; charset=utf-8',
      'pdf': 'application/pdf',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      'hwp': 'application/x-hwp',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };
    const contentType = contentTypeMap[ext] || object.httpMetadata?.contentType || 'application/octet-stream';

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    
    // 이미지/비디오 이외의 일반 첨부파일 다운로드 속성(Content-Disposition) 헤더 강제 주입
    const mediaTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm'];
    if (!mediaTypes.includes(contentType)) {
      const originalFilename = key.split('/').pop() || 'attachment';
      headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(originalFilename)}`);
    }

    // 1주일 캐싱
    headers.set('Cache-Control', 'public, max-age=604800, immutable');
    headers.set('ETag', object.httpEtag);

    // ETag 캐시 검증
    const ifNoneMatch = request.headers.get('If-None-Match');
    if (ifNoneMatch === object.httpEtag) {
      return new Response(null, { status: 304, headers });
    }

    return new Response(object.body, { status: 200, headers });

  } catch (err) {
    console.error('Image serve error:', err);
    return new Response(err.message, { status: 500 });
  }
}
