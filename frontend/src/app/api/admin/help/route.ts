import {NextResponse} from 'next/server';
import {verifyAdmin} from '@/lib/adminAuth';
export async function GET(request:Request){const auth=await verifyAdmin(request);if(!auth.user)return NextResponse.json({error:auth.error},{status:403});return NextResponse.json({error:'도움말 저장·게시 기능은 R2가 연결된 Cloudflare 환경에서 확인해 주세요.'},{status:503});}
export const POST=GET;
