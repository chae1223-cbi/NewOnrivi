# 📝 온리비 어서(Onrivi Author) 구조화 단위 마스터 주석 가이드라인

## 📌 1. 기본 원칙 (Core Principle)

* **단일 원칙:** 온리비 어서 프로젝트의 모든 소스코드 파일(`js`, `tsx`) 내에 존재하는 '모든 독립적 구조화 단위(함수, 독립 컴포넌트, 네이티브 라우터)'는 예외 없이 상단에 본 표준 주석 인덱스를 의무적으로 주입하여 목록화합니다.
* **제외 대상:** 단순 텍스트 폭 연산이나 주소 빌더와 같은 비즈니스 로직이 없는 순수 연산 유틸리티 함수, 그리고 단순 Tailwind CSS 마크업 스타일링 디자인 요소는 인덱싱 노이즈가 되므로 발급 대상에서 전면 제외합니다.

---

## 🔢 2. 주석 고유번호 포맷 규칙

모든 구조화 단위의 선언부 바로 상단에 아래의 표준 규격을 고정 마킹합니다.

> **`// [OMD-도메인-일련번호(4자리)] 소스위치/소스명 ➔ 구조화단위명`**

* **프로그램 기호 (`OMD`):** Onrivi Markdown Author 프로젝트 오피셜 식별자
* **일련번호:** 도메인 카테고리별로 `0001`부터 공백 없이 순차적으로 발급되는 고유 번호

### 🗂️ 비즈니스 핵심 도메인(Domain) 분류 6대 약어

도메인은 코드를 단순히 기술적 기능으로 쪼개지 않고, 소프트웨어가 해결하고자 하는 **비즈니스 목적의 경계**에 따라 다음과 같이 철저히 격리 분류합니다.

| 도메인 기호 | 도메인 명칭 | 도메인의 핵심 역할 및 비즈니스 경계 설명 |
| --- | --- | --- |
| **`AUTH`** | **인증/회원 (Authentication)** | 구글 소셜 및 이메일 로그인, 회원 가입 및 탈퇴(`is_deleted = false`), 세션 권한 통제 가드레일 |
| **`EDIT`** | **편집/집필 (Editor Core)** | Monaco 에디터 컨트롤, 한글 IME composition 조합 버퍼 방어, 에디터 단축키 및 슬래시 명령어 통제 |
| **`CORE`** | **구문 해석 (Parsing Engine)** | 마크다운 파서, remark/rehype 커스텀 플러그인, Mermaid 실시간 SVG 미리보기 렌더링 연산 |
| **`FILE`** | **가상 스토리지 (File System)** | 로컬 파일 시스템 CRUD, 가상 파일 시스템(VFS) 배관, **구글 드라이브(G:) 탐색기 직결 원장 제어** |
| **`PAY`** | **결제/정산 (Settle/Billing)** | Stripe 결제 수금, 자동화 웹훅 완충 원장 적재, 서명된 JWT 확인 인증키(`verifyKey`) 발급 및 정산 마감 |
| **`IO`** | **입출력/통신 (Input/Output)** | 브라우저 애드온 외부 메시징(`onMessageExternal`) 통신, 크롬 API 새 탭 릴레이 제어 및 다중 문서 포맷 내보내기 |

---

## 🏷️ 3. 필수 구조화 명세 4대 태그 (Call Stack 명시)

모든 주석 블록 내부에 누락 없이 채워 넣어야 하는 4대 영점 속성 명세입니다.

1. **`// 🎯 @KICK : [기능명]` — 구조화 단위의 비즈니스 가치**
* 해당 함수나 컴포넌트가 온리비 서비스 내에서 담당하는 독자적인 핵심 가치와 비즈니스 역할을 기술합니다.


2. **`// 🛡️ @GUARD : [방어목적]` — 예외 처리 및 가드레일**
* 악성 경로 우회 차단, 데이터 유실 예방, 널 포인터 에러 및 웹 브라우저 보안 제약을 회피하기 위해 심어둔 방어벽을 기술합니다.


3. **`// 🚨 @PATCH : [버그원인]` — 플랫폼/언어 결함 우회 수술**
* 한글 IME composition 버퍼 유실 버그, 렌더링 무한 스레드 락 등 환경 결함을 우회 패치한 기술적 수술 내역을 명시합니다.


4. **`// 🔗 @CALLS : [호출하는 구조화 목록] (🌟 필수)`**
* **해당 함수/블록 내부 본문에서 호출하여 사용하는 하위 함수, 외부 API, 또는 라이브러리 함수 리스트를 작동 순서대로 나열합니다. 내부에서 호출하는 다른 함수가 아예 없는 순수 리프(Leaf) 함수일 경우 `None`으로 마킹합니다.**



---

## 💻 4. 가이드라인 적용 실전 소스코드 양식 (Template)

### 💡 예시 ①: `js` 인프라 파이프라인 파일 적용 (`FILE` 도메인)

```javascript
// ====================================================================
// 📊 [OMD-FILE-0001] main.js ➔ registerMediaProtocol
// 🎯 @KICK  : 로컬 절대경로 미디어 바이패스 시 브라우저 보안 제약을 우회하는 특수 프로토콜 등록
// 🛡️ @GUARD : 인젝션 공격 방지를 위해 허용되지 않은 디렉토리 경로 진입 원천 차단 가드
// 🔗 @CALLS : protocol.registerFileProtocol(), path.normalize(), console.error()
// ====================================================================
function registerMediaProtocol() {
  protocol.registerFileProtocol('media', (request, callback) => {
    const url = request.url.replace('media://', '');
    const decodedUrl = decodeURIComponent(url);
    try {
      return callback({ path: path.normalize(decodedUrl) });
    } catch (error) {
      console.error(error);
    }
  });
}

```

### 💡 예시 ②: `tsx` 프론트엔드 컴포넌트 함수 적용 (`EDIT` 도메인)

```typescript
// ====================================================================
// 📊 [OMD-EDIT-0034] frontend/src/hooks/useEditorHandlers.ts ➔ cleanDoc
// 🎯 @KICK  : 본문 텍스트 내 불필요 서식 및 연속 <br> 코드를 제거하여 명품 가독성 문서로 빌드
// 🚨 @PATCH : 자바스크립트 IME 조합 버퍼 유실 버그 방지를 위해 실행 직후 포커스 리프레시 강제 패치
// 🔗 @CALLS : sanitizePastedText(), editor.pushUndoStop(), editor.executeEdits(), showToast()
// ====================================================================
const cleanDoc = () => {
  const text = editor.getValue(); //
  const cleanedText = sanitizePastedText(text, true); //
  if (text !== cleanedText) { //
    editor.pushUndoStop(); //
    editor.executeEdits("cleanDoc", [{ range: editor.getModel().getFullModelRange(), text: cleanedText }]); //
    editor.pushUndoStop(); //
    showToast("문서 내 서식이 일괄 정리되었습니다.", "success"); //
  }
};

```

---

## 🚀 5. AI 에이전트 자율주행 목록화 지시 프롬프트

이 가이드 명세를 바탕으로, 통합 소스 파일(`repomix-output.xml`) 전체를 한 번에 인덱싱 테이블로 추출할 때 제아이에게 하달하는 마스터 명령어입니다.

```text
제아이, 새롭게 확정된 [온리비 어서 호출구조 결합형 전수 함수 주석 가이드라인] 지침에 맞춰서, 제공된 전체 소스코드(repomix-output.xml)를 전수 조사해라.

1. 무거운 기획용 WBS 항목은 전면 생략하고 제거한다.
2. 파일 내부에 존재하는 크고 작은 '모든 구조화 단위(함수)'를 누락 없이 식별하여 [OMD-도메인-0000] 고유 번호를 도메인별로 시퀀셜하게 부여해라.
3. 특히 각 함수 내부 본문에서 또 다른 어떤 함수들을 호출해서 체인을 형성하고 있는지 `@CALLS` 태그에 완벽하게 리스팅해라.
4. 조사가 마감되면 아래 마크다운 테이블 규격 레포트로 완벽하게 카탈로그를 정렬하여 사출해라.

[인덱스 카탈로그 리포트 규격]
| 주석 고유번호 | 소스 위치 / 소스명 (Path/File) | 대상 함수명 (Function) | 상호 호출 함수 목록 (Calls) | 핵심 비즈니스 기능 요약 |

```
