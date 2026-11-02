import { NextResponse } from 'next/server';

// TODO(payment): 결제 승인 검증을 구현한 뒤 데스크톱 유료 구독 신청을 개방한다.
export async function POST() {
  return NextResponse.json({
    success: false,
    code: 'PAYMENT_NOT_READY',
    message: 'Elite Pro는 결제 서비스 준비 중입니다.',
  }, { status: 503 });
}
