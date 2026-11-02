# 리소스 폴더 사용 기능

코드 기준 확인일: 2026-10-13.

| 하위 폴더 | 자료 | 사용하는 기능 |
|---|---|---|
| media | 이미지·로컬 동영상 | 삽입·교체·붙여넣기·드래그, 그림책, 미리보기·내보내기 |
| profiles | userCssProfiles.json | 서식관리, 문서 메타 서식 연결, 미리보기·내보내기 |
| prompt | ai_prompts.json | AI 명령 프롬프트 |
| prompt | ai_presets.json | AI 프리셋 |
| prompt | promptTemplates.json | 프롬프트 템플릿 |
| bible | references.bib | 참고문헌·인용 |
| db | onrivi_knowledge.db | 지식 베이스 색인·검색 |

로컬/Google Drive 문서 이동은 참조하는 미디어도 대상 리소스 폴더에 복사한다.
원고 MD는 사용자가 선택한 문서 폴더에 저장한다.
외부 YouTube·지도 URL, 코드 블록·Mermaid 원문, 이모지 문자는 MD 본문에 저장한다.

확인 코드: resourceMedia.ts, resourceMediaPicker.ts, documentTransfer.ts,
googleDriveClient.ts의 initializeDriveResourceFolder, main.js의 리소스 초기화 및 저장 처리.
