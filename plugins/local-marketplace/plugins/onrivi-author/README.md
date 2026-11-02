# 온리비 어서 로컬 플러그인

대화에서 `read_markdown`(읽기), `replace_markdown`(수정),
`list_style_profiles`(서식 조회), `create_style_profile`(신규 서식 생성),
`list_workspace_files`(작업장 파일 목록), `search_workspace`(작업장 검색),
`create_markdown`(새 문서 생성), `edit_markdown_section`(제목 아래 문구 수정),
`update_style_profile`(기존 사용자 서식 수정) 도구를 제공합니다.
AI 템플릿에는 `list_ai_templates`(목록), `get_ai_template`(본문 열람),
`create_ai_template`(새 프롬프트 템플릿/프리셋 등록),
`execute_ai_template`(변수·사용자 입력을 적용해 채팅 AI에서 실행) 도구를 제공합니다.
Node.js 20 이상에서 로컬로 실행되며 별도의 npm 패키지가 필요하지 않습니다.
현재 앱에서 선택한 로컬 작업장 또는 리소스 폴더 안에 있는
기존 `.md` 또는 `.markdown` 파일의 절대경로를 입력하세요. 문서를 먼저 읽고,
수정할 때 반환된 `sha256` 값을 `expectedSha256`으로 전달합니다.
그 사이 파일이 바뀌었다면 저장을 거부합니다.

이 폴더가 플러그인 패키지입니다. Codex에 로컬 플러그인으로 설치한 뒤
플러그인 검색을 다시 실행하거나 앱을 다시 시작하세요. MCP 실행 설정은
`mcp.json`에 있습니다. MCP 도구 사용 시 온리비 어서 데스크톱 앱 실행과
온라인 라이선스 검증이 필요합니다. 서버가 활성 유료 데스크톱 구독과 이 기기의
활성 세션을 확인하지 못하면 읽기와 쓰기를 모두 거부합니다. 무료 체험판,
네트워크 연결 실패, 만료·회수된 라이선스도 허용하지 않습니다. 서버 권한은
최대 60초간 메모리에 보관하고, 앱 종료·라이선스 파일 변경 시 재확인합니다.

새 서식은 온리비 어서 데스크톱 앱에서 **현재 선택한 로컬 리소스 폴더**의
`profiles/userCssProfiles.json`에 추가됩니다. 앱을 실행한 상태에서
`get_current_folders`로 작업장과 리소스 폴더를 확인하고,
`list_style_profiles`로 서식 ID와 두 SHA-256 값을 조회하세요. 이어서
`create_style_profile`에 `expectedContextSha256`, `expectedSha256`,
복제할 `baseProfileId`, 새 이름을 전달합니다. `pageStyle`과 `rules`로 일부 속성을
바꿀 수 있습니다. 기존 이름과
중복되거나 조회 뒤 앱의 선택 폴더·서식 파일이 바뀌면 저장을 거부합니다.
앱이 실행 중이지 않거나 폴더 정보를 90초 이상 갱신하지 못한 경우에도 저장하지
않습니다. Google Drive 리소스 폴더는 이 로컬 MCP 버전에서 지원하지 않습니다.

`list_workspace_files`는 한 번에 최대 100개, `search_workspace`는 최대 30개의
결과를 반환합니다. 이어지는 결과는 `nextCursor`로 조회합니다. 숨김 폴더와
심볼릭 링크는 제외하며, 검색은 파일당 512 KiB, 호출당 8 MiB까지만 읽습니다.
새 문서는 `get_current_folders`의 `contextSha256`과 작업장 기준 상대경로를
`create_markdown`에 전달해 만듭니다. 기존 파일과 작업장 밖 경로는 거부합니다.
`edit_markdown_section`은 `read_markdown`의 SHA-256, 고유한 제목, 기존 문구와
새 문구를 받아 제목 아래에서 정확히 한 번 일치하는 부분만 교체합니다.
`update_style_profile`은 `list_style_profiles`의 두 SHA-256 값과 사용자 서식 ID를
받아 이름·설명·페이지 속성·태그 규칙을 일부 수정합니다. 시스템 서식은 수정하지
않으며, 파일이 조회 후 바뀌면 저장을 거부합니다.

AI 템플릿은 현재 로컬 리소스 폴더의 `prompt/ai_presets.json`과
`prompt/ai_prompts.json`을 읽습니다. 목록 결과의 `kind`와 `id` 또는
`domain`·`docType`으로 본문을 열고, 반환된 `sha256`을
`execute_ai_template.expectedSha256`에 전달하세요. 프리셋의 `{{변수}}`는
`values`로 채우며, 문서 프롬프트에는 `input`을 입력합니다. 파일이 조회 후
변경되면 실행 입력 구성을 거부합니다. 목록은 본문을 반환하지 않고, 한 번에
최대 100개를 조회합니다. 앱에 내장된 기본 프롬프트는 파일에 저장되어 있지
않으면 이 로컬 MCP 목록에 나타나지 않습니다.

`create_ai_template`는 대화에서 작성한 AI 프롬프트를 리소스 폴더의
`prompt/ai_presets.json`(편집 프리셋) 또는 `prompt/ai_prompts.json`(분야별 문서 템플릿)에
신규 등록합니다. 프리셋은 이름과 `{{변수}}`가 포함된 프롬프트 본문을 전달하며,
문서 템플릿은 분야(domain)와 문서 종류(docType) 및 시스템 프롬프트를 전달합니다.
파일 변경 감지용 `expectedSha256`을 함께 전달할 수 있으며, 저장은 원자적으로 수행됩니다.

`execute_ai_template`는 **현재 채팅 AI가 답변을 생성할 입력**을 반환합니다.
MCP 서버가 온리비 어서의 암호화된 AI API 키를 읽거나 별도의 유료 API를
호출하지는 않습니다. 또한 생성 결과를 문서에 자동으로 쓰지 않습니다.
