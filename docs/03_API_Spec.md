# [API Spec] Onrivi Author: 백엔드 API 명세서 (v1.0)

## 1. 개요

* **Base URL:** `http://localhost:4000`
* **Content-Type:** `application/json`
* **Root Path:** `D:\워크스페이스` (모든 경로는 이 루트를 기준으로 한 상대 경로임)

## 2. 공통 에러 응답

성공하지 못한 모든 요청은 다음 형식을 반환합니다.

```json
{ "error": "에러 메시지 내용" }
```

---

## 3. API 목록

### 3.1 워크스페이스 경로 설정

워크스페이스의 로컬 루트 경로를 변경합니다.

* **URL:** `POST /api/set-root`
* **Body:** `{ "newRoot": "D:\\MyWorkspace" }`
* **Response:** `{ "status": "success", "currentRoot": "..." }`

### 3.2 이미지 업로드

이미지 파일을 서버의 `images` 폴더에 저장합니다.

* **URL:** `POST /api/upload-image`
* **Query Params:** `name` (파일명, 선택사항)
* **Body:** Binary Image Data
* **Response:** `{ "status": "success", "path": "images/filename.png" }`

### 3.3 이미지/파일 뷰 (정적 리소스)

워크스페이스 내의 리소스를 직접 브라우저에서 봅니다.

* **URL:** `GET /api/view/:path`
* **Response:** File Content (Image, etc.)

---

## 4. 기존 API 목록

### 4.1 워크스페이스 트리 가져오기

전체 파일 및 폴더 구조를 재귀적으로 가져옵니다.

* **URL:** `GET /api/files`
* **Response:** `FileNode[]`

```json
[
  {
    "name": "folder_name",
    "kind": "directory",
    "path": "folder_name",
    "children": [...]
  },
  {
    "name": "memo.md",
    "kind": "file",
    "path": "memo.md"
  }
]
```

### 4.2 파일 내용 읽기

특정 파일의 전체 텍스트를 읽어옵니다.

* **URL:** `GET /api/file-content`
* **Query Params:** `path` (상대 경로)
* **Response:** `{ "content": "파일의 실제 텍스트 내용..." }`

### 4.3 파일 생성

새로운 마크다운 파일을 생성합니다.

* **URL:** `POST /api/create-file`
* **Body:** `{ "parentPath": "부모폴더명", "name": "new_file.md" }`
* **Response:** `{ "status": "success", "path": "부모폴더명\\new_file.md" }`

### 4.4 폴더 생성

새로운 디렉토리를 생성합니다.

* **URL:** `POST /api/create-folder`
* **Body:** `{ "parentPath": "부모폴더명", "name": "new_folder" }`
* **Response:** `{ "status": "success" }`

### 4.5 파일 저장 (업데이트)

편집된 내용을 파일에 기록합니다. (자동 저장 시 사용)

* **URL:** `POST /api/save`
* **Body:** `{ "path": "file_path.md", "content": "저장할 텍스트..." }`
* **Response:** `{ "status": "success" }`

### 4.6 이름 변경 (Rename)

파일이나 폴더의 이름을 변경하거나 위치를 이동합니다.

* **URL:** `POST /api/rename`
* **Body:** `{ "oldPath": "old_name.md", "newPath": "new_name.md" }`
* **Response:** `{ "status": "success" }`

### 4.7 삭제 (Delete)

파일 또는 폴더를 삭제합니다. (폴더의 경우 재귀적 삭제 수행)

* **URL:** `POST /api/delete`
* **Body:** `{ "path": "target_path" }`
* **Response:** `{ "status": "success" }`

### 4.8 전역 검색 (Global Search)

모든 마크다운 파일 내에서 특정 검색어가 포함된 라인을 찾아 반환합니다.

* **URL:** `GET /api/search`
* **Query Params:** `q` (검색어)
* **Response:** `SearchResult[]`

```json
[
  {
    "fileName": "memo.md",
    "path": "memo.md",
    "count": 5,
    "snippets": ["검색어가 포함된 라인 1", "검색어가 포함된 라인 2"]
  }
]
```

### 4.9 로컬 백업 자동 복원 (Restore Backup)

최근 수정된 에디터(VS Code/Cursor)의 로컬 파일 히스토리 내 백업 파일을 수색하여 훼손된 `page.tsx` 소스 코드를 강제 복원합니다.

* **URL:** `GET /api/restore-backup`
* **Response:**

```json
{
  "status": "success",
  "file": "C:\\Users\\Username\\AppData\\Roaming\\Code\\User\\History\\...",
  "scanCount": 235,
  "matchCount": 1
}
```

### 4.10 외부 브라우저 창 열기 (Open External)

데스크톱 앱 외부의 기본 웹브라우저 창을 통해 지정된 외부 URL을 엽니다.

* **URL:** `POST /api/open-external`
* **Body:** `{ "url": "https://example.com" }`
* **Response:** `{ "status": "success" }`

### 4.11 클립보드 붙여넣기 이미지 업로드 (Upload Pasted Image)

클립보드로부터 붙여넣은 Base64 형식의 이미지 데이터를 워크스페이스 내의 `assets/` 디렉토리에 고유 파일명으로 영구 저장하고 상대 경로를 반환합니다.

* **URL:** `POST /api/upload-pasted-image`
* **Body:** `{ "base64Data": "data:image/png;base64,..." }`
* **Response:**

```json
{
  "status": "success",
  "relativePath": "assets/paste_20260520084012.png",
  "fullPath": "D:\\Workspace\\assets\\paste_20260520084012.png"
}
```

### 4.12 다중 파일 병합 (Merge Files)

여러 개의 마크다운 파일을 하나로 합쳐 새로운 대상 경로 파일로 생성합니다. 원본 소스 파일들의 삭제 여부 및 병합 시 구분선/제목 삽입 등의 세부 옵션을 제공합니다.

* **URL:** `POST /api/merge-files`
* **Body:**

```json
{
  "sourcePaths": ["file1.md", "file2.md"],
  "targetPath": "merged_file.md",
  "deleteSources": true,
  "separator": "divider"
}
```

* `separator` 옵션: `"divider"` (--- 구분선), `"title"` (파일명 H2 제목화), `"none"` (개행), 그 외는 일반 줄바꿈
* **Response:** `{ "status": "success", "path": "merged_file.md" }`

### 4.13 가공된 파비콘/빌드 아이콘 저장 (Save Processed Icon)

브라우저에서 크롭 및 투명화 처리가 끝난 아이콘 이미지를 프론트엔드의 파비콘 및 데스크톱 빌드용 정적 리소스로 저장합니다.

* **URL:** `POST /api/save-processed-icon`
* **Body:** `{ "image": "data:image/png;base64,..." }`
* **Response:** `{ "status": "success" }`

### 4.14 내보내기 파일의 로컬 다운로드 폴더 저장 (Save Export)

마크다운을 PDF, HTML, PNG로 내보낸 파일을 사용자의 시스템 다운로드 폴더(`Downloads`)에 영구 저장합니다.

* **URL:** `POST /api/save-export`
* **Body:**

```json
{
  "filename": "document.pdf",
  "content": "base64_or_text_content...",
  "type": "base64"
}
```

* `type` 옵션: `"base64"` 이면 Base64 디코딩 후 바이너리로 저장하고, 그렇지 않으면 텍스트(UTF-8)로 저장합니다.
* **Response:** `{ "status": "success", "path": "C:\\Users\\Username\\Downloads\\document.pdf" }`
