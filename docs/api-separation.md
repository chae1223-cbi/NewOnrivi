# API 실행 경계

2026-11-02 기준. 클라우드 업무 API의 단일 원본은 저장소 루트 `functions/api`다.

| 실행 위치 | API 소스 | 용도 |
| --- | --- | --- |
| Cloudflare Pages 배포 | `functions/api` | 관리자, 사용자, 구독, 요금제, 문의, 파일 업로드 등 클라우드 업무 |
| 로컬 웹 개발 | `functions/api`를 `wrangler pages dev`로 실행 | `next dev`의 해당 `/api/*` 요청은 8788 포트로 전달 |
| 로컬 Next 개발 서버 | `frontend/src/app/api` | PC 파일 작업, SQLite 지식 DB, 로컬 설정, 개발용 작업 |

`frontend/functions` 미러와 클라우드 업무용 Next API 라우트는 제거했다. 정적 웹 및 Electron 빌드에서는 Next API 라우트를 임시 제외한다. Cloudflare Functions는 빌드 중 복사하지 않고 루트 원본을 그대로 사용한다.

## 로컬 실행

루트에서 `npm run dev`를 실행하면 Next 화면(3100), 로컬 백엔드, Wrangler API(8788)가 함께 시작된다. `frontend/.env.local`의 `DATABASE_URL`은 로컬 Hyperdrive 연결에 사용된다. Wrangler는 빌드 없이 `frontend/public`을 정적 자산 디렉터리로 사용하며 로컬 상태는 Git에서 제외된 `scratch/wrangler-state`에 저장한다. 화면은 Next 개발 서버에서 제공하고, Wrangler의 정적 자산은 개발 API 실행을 위한 최소 입력으로만 사용한다.

로컬 전용 Next API: `knowledge/**`, `create-file`, `create-folder`, `save`, `delete`, `rename`, `file-content`, `view`, `upload-pasted-image`, `profiles`, `prompts`, `ai-credentials`, `system/emoji`, `cron/cleanup-users`. `cron/cleanup-users`는 로컬 Next에만 존재하며 Cloudflare Pages 배포 경로에는 포함되지 않는다.

## 변경 시 확인

클라우드 업무 기능은 `functions/api`에서만 수정한다. 로컬 Node/SQLite 기능은 남은 Next API에서 수정한다. 두 영역의 URL이 겹치면 `frontend/next.config.js`의 클라우드 경로 목록을 먼저 확인한다. 배포 전에 타입 검사, `scripts/check-unified-session.cjs`, Cloudflare Functions 번들 검사를 실행한다.