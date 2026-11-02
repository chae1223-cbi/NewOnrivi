# 온리비 마크다운 에디터 코드 인덱스 대시보드 (CODE_INDEX)

> [!NOTE]
> 본 문서는 소스 코드의 핵심 로직 위치를 도메인 단위로 조감하고 이동하기 위한 최상위 인덱스 허브 문서입니다.
> 상세 세부 코드 흐름과 함수 맵핑 정보는 각 도메인 영역별 인덱스 마크다운을 통해 관리됩니다.

## 1. 도메인 영역별 인덱스 허브 (Index Hub)

* [**`APP` 코어 영역 코드 인덱스 (`INDEX_APP`)**](file:///d:/developer/OnriviMarkDown/docs/code_index/INDEX_APP.md)
  * 에디터 메인 라이프사이클 제어 및 전역 상태 관리
* [**`UI` 화면 영역 코드 인덱스 (`INDEX_UI`)**](file:///d:/developer/OnriviMarkDown/docs/code_index/INDEX_UI.md)
  * 상단 툴바, 사이드바, 상태 표시줄 등 레이아웃 구성요소 및 사용자 상호작용 관련 매핑
* [**`IO` 입출력 영역 코드 인덱스 (`INDEX_IO`)**](file:///d:/developer/OnriviMarkDown/docs/code_index/INDEX_IO.md)
  * 파일 읽기/쓰기, VFS 권한 획득, 로컬 스토리지 연동 및 외부 문서 파일 fetch 브라우저 폴백 가드
* [**`MD` 뷰어/스타일 영역 코드 인덱스 (`INDEX_MD`)**](file:///d:/developer/OnriviMarkDown/docs/code_index/INDEX_MD.md)
  * 마크다운 렌더러, remark 플러그인, 실시간 CSS 컴파일러 및 페이지 나눔 제어
* [**`EXP` 내보내기 영역 코드 인덱스 (`INDEX_EXP`)**](file:///d:/developer/OnriviMarkDown/docs/code_index/INDEX_EXP.md)
  * HTML, PDF, EPUB 포맷 문서 파일 생성 및 내보내기 연동
* [**`BLD` 빌드 영역 코드 인덱스 (`INDEX_BLD`)**](file:///d:/developer/OnriviMarkDown/docs/code_index/INDEX_BLD.md)
  * 정적 빌드, 파일 수동 가공 및 크롬 확장프로그램 폴더 이식 자동화 패키징 스크립트
