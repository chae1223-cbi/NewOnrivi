import {NextResponse} from 'next/server';
export async function GET(){return NextResponse.json({error:'로컬 개발 환경에서는 기본 도움말을 사용합니다.'},{status:503});}
