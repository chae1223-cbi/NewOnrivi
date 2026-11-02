// TODO(payment): 결제 승인 검증을 구현한 뒤 데스크톱 유료 구독 신청을 개방한다.
export async function onRequestOptions() {
  return new Response(null, { headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  } });
}

export async function onRequestPost() {
  return new Response(JSON.stringify({
    success: false,
    code: 'PAYMENT_NOT_READY',
    message: 'Elite Pro는 결제 서비스 준비 중입니다.',
  }), { status: 503, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
