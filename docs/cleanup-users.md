# 탈퇴 회원 예약 정리

Cloudflare Worker `onriviauthor-cleanup-users`가 매일 03:00(Asia/Seoul)에 실행된다. Cloudflare Cron Trigger는 UTC를 사용하므로 `workers/cleanup-users/wrangler.toml`에 `0 18 * * *`로 설정했다. 30일이 지난 탈퇴 회원을 한 번에 최대 100명 처리한다. 실패한 회원은 다음 실행에서 재시도한다.

Worker는 기존 Pages와 같은 Hyperdrive ID를 사용한다. Supabase Auth Admin API용 `NEXT_PUBLIC_SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`는 이 Worker의 비밀값으로 별도 설정해야 한다. 기존 Pages 비밀값은 Worker에 자동 공유되지 않는다. 비밀값을 설정한 뒤 루트에서 `npm run deploy:cleanup`을 실행한다. 정적 웹 배포(`npm run deploy`)에는 예약 Worker 배포가 포함되지 않는다.

예약 작업은 HTTP API를 공개하지 않는다. 대상 행을 잠그고 30일 경과 및 탈퇴 상태를 다시 확인한 다음 Auth를 삭제하고 DB 행을 삭제한다. Auth 삭제 후 DB 삭제가 실패하면 다음 예약 실행에서 재시도한다. 오류 로그에는 회원 ID와 비밀값을 기록하지 않는다.

로컬 검증 시 실제 예약 호출은 운영 회원을 삭제하므로 사용하지 않는다. `npx wrangler deploy --config workers/cleanup-users/wrangler.toml --dry-run --outdir scratch/tests/cleanup-worker`로 번들을 검증한다.
