# Requires an authenticated Wrangler session or CLOUDFLARE_API_TOKEN.
# Only API logs expire; existing media and other lifecycle rules are preserved.
$ErrorActionPreference = 'Stop'
npx --no-install wrangler r2 bucket lifecycle add onrivi-images onrivi-api-logs-14-days _system-logs/ --expire-days 14
if ($LASTEXITCODE -ne 0) { throw '로그 보관 규칙 설정에 실패했습니다.' }
npx --no-install wrangler r2 bucket lifecycle list onrivi-images
if ($LASTEXITCODE -ne 0) { throw '로그 보관 규칙 확인에 실패했습니다.' }
