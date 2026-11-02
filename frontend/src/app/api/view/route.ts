// ====================================================================
// 📊 [OMD-API-VIEW-0001] src/app/api/view/route.ts
// 🎯 @KICK  : 로컬 및 워크스페이스 이미지 프록시 뷰 서빙 엔드포인트
// 🚨 @PATCH : **2026-10-20** — [url 파라미터 호환 및 쿼리스트링 분리 처리 지원]: filePath 외에 url 쿼리 파라미터도 지원하고, 경로 뒤의 캐시 무효화 쿼리(?v=...)를 분리하여 파일 검사 시 400 에러 방지
// ====================================================================
import { NextResponse } from 'next/server';

let fs: any;
let path: any;
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  try {
    fs = eval('require("fs")');
    path = eval('require("path")');
  } catch (e) {}
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPath = (searchParams.get('filePath') || searchParams.get('url') || '').trim();

    if (!rawPath) {
      return new NextResponse('Missing filePath', { status: 400 });
    }

    const filePath = rawPath.split('?')[0];
    let actualPath = filePath;

    if (!fs.existsSync(actualPath)) {
      const parentWorkspacePath = path.join(process.cwd(), '..', filePath);
      const fileName = path.basename(filePath);
      const publicAssetsPath = path.join(process.cwd(), 'public', 'assets', fileName);
      
      if (fs.existsSync(parentWorkspacePath)) {
        actualPath = parentWorkspacePath;
      } else if (fs.existsSync(publicAssetsPath)) {
        actualPath = publicAssetsPath;
      } else {
        // [ONR-FIX] 브라우저 콘솔 404 에러 방지를 위해, 파일을 찾을 수 없는 경우
        // 404 상태코드 대신 '이미지 없음' 안내용 SVG를 200 OK로 반환합니다.
        const notFoundSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">
          <rect width="100%" height="100%" fill="#f1f5f9" rx="8" ry="8"/>
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#94a3b8">
            이미지를 찾을 수 없습니다
          </text>
        </svg>`;
        return new NextResponse(notFoundSvg, { 
          status: 200, 
          headers: { 'Content-Type': 'image/svg+xml' } 
        });
      }
    }

    // 파일 수정 시간 기반 ETag 생성 (브라우저 캐싱용)
    const stat = fs.statSync(actualPath);
    const etag = `"${stat.mtimeMs.toString(36)}-${stat.size.toString(36)}"`;
    const ifNoneMatch = request.headers.get('if-none-match');
    
    // 브라우저가 이미 최신 버전을 가지고 있으면 304 Not Modified 반환 (로그 없음)
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { 'ETag': etag } });
    }

    const fileBuffer = fs.readFileSync(actualPath);
    
    // Determine content type
    const ext = path.extname(actualPath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.webp') contentType = 'image/webp';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        // 1시간 캐싱 (개발 환경에서 반복 요청 및 로그 억제)
        'Cache-Control': 'private, max-age=3600',
        'ETag': etag,
      }
    });
  } catch (error: any) {
    if (error?.code === 'NEXT_STATIC_GEN_BAILOUT' || (error?.message && error.message.includes('NEXT_STATIC_GEN_BAILOUT'))) {
      // 빌드 시점에 발생하는 정상적인 Bailout 에러이므로 로그를 생략하고 넘어갑니다.
      return new NextResponse('Static Generation Bailout', { status: 200 });
    }
    console.error('View API Error:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}

