// 로컬 Next 개발 서버도 Cloudflare Pages와 동일한 DB 처리 경로를 사용한다.
import { onRequestPost } from '../../../../../functions/api/password/request.js';

export async function POST(request: Request): Promise<Response> {
  return onRequestPost({ request, env: process.env });
}
