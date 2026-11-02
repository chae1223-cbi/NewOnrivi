"""Generate reproducible, account-free fixtures for the one-hour manual run."""
from pathlib import Path
import csv, struct, zlib

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/testing/integration-60min'
FIX = OUT / 'fixtures'
FIX.mkdir(parents=True, exist_ok=True)

def write(name, text):
    (FIX / name).write_text(text.strip() + '\n', encoding='utf-8', newline='\n')

def png(name, color, digit):
    # Deterministic PNG, with a large 1/2 marker and contrasting alignment grid.
    width, height = 640, 360
    glyph = {'1':['00100','01100','00100','00100','00100','00100','01110'],
             '2':['01110','10001','00001','00010','00100','01000','11111']}[digit]
    rows = bytearray()
    for y in range(height):
        rows.append(0)
        for x in range(width):
            pixel = color
            if x % 80 < 2 or y % 60 < 2: pixel = (230, 235, 240)
            gx, gy = (x-245)//30, (y-75)//30
            if 0 <= gx < 5 and 0 <= gy < 7 and glyph[gy][gx] == '1': pixel = (255,255,255)
            rows.extend(pixel)
    def chunk(kind, data):
        return struct.pack('>I',len(data)) + kind + data + struct.pack('>I',zlib.crc32(kind+data) & 0xffffffff)
    content = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,2,0,0,0)) + chunk(b'IDAT',zlib.compress(rows,9)) + chunk(b'IEND',b'')
    dest = FIX / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(content)

png('assets/original/qa-photo.png', (36,93,190), '1')
png('assets/replacement/qa-photo.png', (209,94,35), '2')

write('01-기본편집.md', '''---
title: "QA 기본 편집"
css_profile: system-1
css_profile_name: "Onrivi 기본서식"
---

# QA 기본 편집

## 입력 구역 A

여기에 한글을 연속 입력하세요. 입력한 글이 사라지거나 커서가 다른 곳으로 이동하면 실패입니다.
앞뒤 공백 확인: 가    나        다
줄 끝 테스트: 여기 끝에 스페이스를 추가하세요.

## 제목 전환 구역 B

이 줄 아래에서 Enter를 누르고 ###를 입력하여 제목 3을 만드세요.

## 서식 선택 구역 C

굵게 적용할 문장입니다.
취소선을 적용할 문장입니다.
되돌리기와 다시 실행으로 원래 문장을 복원합니다.

## 동기화 구역 D

ANCHOR-01 첫 번째 위치

ANCHOR-02 두 번째 위치

ANCHOR-03 마지막 위치

[연결할 문서](<02-목록과인용문.md>)
''')

write('02-목록과인용문.md', '''---
title: "QA 목록·인용문"
css_profile: system-1
---

# QA 목록·인용문

## 목록 변환 대상

회의 안건을 작성합니다.
담당자를 지정합니다.
결과를 저장합니다.

## 숫자 목록

1. 부모 항목 A
2. 하위 항목으로 바꿀 B
3. 원래 레벨로 돌아올 C

## 일반 목록

- 부모 항목
- 들여쓰기 할 항목
- 내어쓰기 할 항목

## 체크리스트

- [ ] 첫 번째 할 일
- [ ] 두 번째 할 일
- [x] 완료한 할 일

## 다섯 가지 콜아웃

> [!NOTE]
> 파란 배경 NOTE

> [!TIP]
> 초록 배경 TIP
> 여기서 Enter로 다음 줄을 입력하세요.

> [!IMPORTANT]
> 보라 배경 IMPORTANT

> [!WARNING]
> 주황 배경 WARNING

> [!CAUTION]
> 분홍 배경 CAUTION

## 인용문 다음 본문

QUOTE-OUTSIDE 여기에 Ctrl+Enter로 나온 뒤 작성한 문장이 있어야 합니다.
''')

write('03-표.md', '''---
title: "QA 표"
css_profile: system-1
---

# QA 표

| 품목 | 수량 | 금액 |
| :--- | :---: | ---: |
| 사과 | 2 | 3000 |
| **배** | 3 | 4500 |
| 셀 줄바꿈 | 첫 줄<br>두 번째 줄 | 0 |

| 제목 A | 제목 B | 제목 C |
| :--- | :---: | ---: |
| 값 A | 값 B | 값 C |

TABLE-OUTSIDE 표 밖의 본문입니다.
''')

longline = 'GET /api/qa/session?device_uuid=TEST-ONLY-NO-REAL-CREDENTIALS&value=' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_' * 18 + ' END-OF-LONG-LINE'
write('04-코드와다이어그램.md', '''---
title: "QA 코드·Mermaid·수식"
css_profile: system-1
---

# QA 코드·Mermaid·수식

```text
CODE-BEGIN
    four spaces before this line
'''+longline+'''
CODE-END
```

```javascript
const message = 'QA 한글·English';
console.log(message);
```

CODE-OUTSIDE 다음 본문입니다.

## 정상 Mermaid

```mermaid
flowchart LR
  V[문서 직접 편집] --> C[공통 문서 명령]
  M[마크다운 원문] --> C
  A[AI·사진·표 도구] --> C
  C --> S[탭별 문서 세션]
  S --> V
  S --> M
  S --> F[MD 저장소]
  S --> R[출력 렌더러]
  R --> E[PDF·EPUB]
```

## 수식

인라인 수식 $E=mc^2$ 뒤의 본문이 유지되어야 합니다.

$$
\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}
$$

FORMULA-OUTSIDE 수식 다음 본문입니다.
''')
write('05-Mermaid오류복구.md', '''# QA Mermaid 오류와 복구

```mermaid
flowchart LR
  A[닫히지 않은 노드 --> B[결과]
```

위 오류를 코드 편집에서 다음 내용으로 교체하세요.

```text
flowchart LR
  A[복구] --> B[정상 표시]
```

ERROR-OUTSIDE 오류 블록 밖의 본문은 계속 입력할 수 있어야 합니다.
''')
write('06-미디어.md', '''---
title: "QA 미디어"
css_profile: system-1
---

# QA 미디어 삽입

## 사진 위치

PHOTO-HERE 이 아래에서 사진 삽입 도구로 original/qa-photo.png를 선택하세요.

## 동영상 위치

VIDEO-HERE 이 아래에서 동영상 도구로 original/qa-video.webm을 선택하세요.

## 지도 위치

MAP-HERE 이 아래에 서울시청(37.5665, 126.9780)을 삽입하세요.

## 복사 대상

COPY-HERE 위 미디어의 참조를 복사해 이 아래에 붙여넣으세요.
''')
write('07-그림책.md', '''---
title: "QA 그림책"
css_profile: system-1
---

:::scene {cover}
![QA 표지](media/qa-photo.png)

# QA 그림책

표지입니다.
:::

:::scene
![QA 첫 장면](media/qa-photo.png)

## 첫 번째 장면

SCENE-ONE 이 문장만 수정합니다.
:::

:::scene
![QA 두 번째 장면](media/qa-photo.png)

## 두 번째 장면

SCENE-TWO 다른 장면을 수정해도 이 문장은 유지합니다.
:::
''')

paragraphs=[]
for i in range(1,61):
    paragraphs.append(f'## ANCHOR-{i:02d}\n\n'+f'{i:02d}번째 문단입니다. 한글 입력·스크롤·커서 위치를 비교하는 반복 본문입니다. '*8)
write('08-스크롤과장문.md', '# QA 장문 스크롤\n\n'+'\n\n'.join(paragraphs))
write('09-내보내기.md', '''---
title: "QA 내보내기"
css_profile: system-1
css_profile_name: "Onrivi 기본서식"
---

# QA 내보내기

## 텍스트

EXPORT-KOREAN 한글과 English 123이 함께 보입니다. **굵은 글씨**와 ~~취소선~~을 확인합니다.

- 일반 목록 A
- 일반 목록 B

1. 숫자 목록 A
2. 숫자 목록 B

> [!TIP]
> EXPORT-TIP 출력에 보일 안내입니다.

| 품목 | 금액 |
| :--- | ---: |
| EXPORT-TABLE | 12345 |

![EXPORT-PHOTO](media/qa-photo.png)

```mermaid
flowchart LR
  A[입력] --> B[출력 확인]
```

본문의 각주입니다.[^qa]

[^qa]: EXPORT-FOOTNOTE 각주 내용입니다.

EXPORT-END 마지막 문장이 잘리지 않아야 합니다.
''')
write('10-저장복구.md', '''---
title: "QA 저장 복구"
css_profile: system-1
---

# QA 저장 복구

SAVE-BASE 원본 문장입니다.

이 파일은 복사본으로 열고 SAVE-ONE, SAVE-TWO, RECOVERY-DRAFT 표식을 순서대로 입력하세요.
''')

# CSV is a runnable checklist: every case is initially NOT RUN, never PASS.
cases = [
('T00','준비',0,5,'P0','테스트 복사본과 전용 작업장/리소스 폴더 연결. 실행 환경·버전 기록, 탭 간격 4, 자동 저장 기존값 기록. 개발자 콘솔 열기.','파일 접근·리소스 쓰기 가능. 기존 원고를 건드리지 않음. 준비가 끝나지 않으면 이후 의존 항목 BLOCKED.'),
('T01','시작 화면',5,6,'P1','앱을 실행하고 01 기본편집 복사본 열기. 문서 보기와 왼쪽 탐색기 확인.','일반 파일 열기는 문서 보기. 탐색기가 나타남. 새 문서 생성의 나란히 보기 분기는 별도 기록.'),
('T02','공백·탭·Enter·IME',6,8,'P0','입력 구역 A에 한글 20자 입력. 줄 끝에 Space 3번, Enter 2번 후 추가 글 입력. 중간 Tab 1번. 탭 간격 8로 바꿔 반복하고 4로 복원.','조합 문자 유실·화면 점프 없음. 연속/끝 공백과 줄바꿈 유지. Tab은 각각 ASCII 스페이스 4/8개. 원문에 일반 줄바꿈용 역슬래시/HTML가 추가되지 않음.'),
('T03','제목·해제',8,9,'P1','구역 B 새 줄에서 ### 입력 후 QA제목 입력. Home, Backspace로 제목 해제. Ctrl+Z/Y.','제목3 전환 및 일반 문단 해제. 앞 인용문/다른 블록으로 합쳐지지 않음. 취소/재실행 결과 일치.'),
('T04','툴바·한글 명령·설정',9,11,'P1','문장 선택만 했을 때 툴바 확인. Ctrl+Space로 굵게/취소선 적용. /제목3 실행. 환경설정에서 h3 명령을 qa3로 바꿔 /qa3 실행 후 원래 값 복원.','선택만으로 자동 툴바 없음. 선택 범위에 적용. 한글·사용자 명령 실행되고 /입력 원문이 남지 않음.'),
('T05','문서→원문 동기화',11,13,'P0','08 장문 열고 나란히 보기. 왼쪽 휠/스크롤바로 ANCHOR-30 이동, ANCHOR-45 클릭·방향키 이동. 오른쪽 스크롤 시도.','왼쪽 세로 스크롤바 표시. 왼쪽 위치에 원문이 대응. 커서도 원문 위치로 이동. 오른쪽 독립 휠·세로 스크롤로 기준 위치가 바뀌지 않음.'),
('T06','목록 전환·들여쓰기',13,16,'P0','02 변환 대상 세 줄 전체 선택. 숫자→일반→체크→태그 취소. 숫자 목록 B 끝 Tab, Shift+Tab. 체크 클릭 후 Enter.','전체 선택 항목에 적용. - 목록 생성, 불필요한 빈 줄·앞 목록 밀착 없음. 계층 변화/복원. 새 체크는 미완료, 완료 상태 원문 반영.'),
('T07','인용문·색·나가기',16,18,'P1','02 다섯 콜아웃 색과 태그 표시 확인. TIP 마지막 줄 Enter 두 번 후 글 입력. Ctrl+Enter 후 OUTSIDE-NEW 입력.','유형별 배경·왼쪽 선. [!TIP] 대신 TIP. Enter는 인용문 유지, 문단 간 빈 공간 과다 없음. Ctrl+Enter 문장만 바깥 본문.'),
('T08','링크·날짜·이모지',18,20,'P1','01 문서 링크로 02 열기. 돌아와 Ctrl+K 웹링크 입력. /날짜로 2026-10-14 삽입. 이모지 패널로 😀 삽입 후 Esc.','문서 링크가 대상 파일 열기. 링크/날짜/이모지가 기존 커서 위치에 반영. 날짜 텍스트와 원문 일치. Esc 패널 닫힘.'),
('T09','표 입력·여백',20,22,'P0','03 사과 셀 중간 마우스 클릭, 문자 삽입. 다른 셀 Enter로 새 줄 입력. 연속 두 표 확인.','마우스는 전체 선택 안 함. 선택 셀만 변경. 셀 내부 줄바꿈 유지(<br>). 과도한 문단 여백 없이 셀 여백만 있고 두 표 사이 간격.'),
('T10','표 키보드 이동·나가기',22,24,'P0','표 셀에서 Tab/Shift+Tab. 대상 글 입력으로 교체. 마지막 셀 Tab. Ctrl+Enter 후 TABLE-AFTER 입력.','Tab 대상 셀 글 전체 선택. 인접 셀 유실 없음. 마지막 Tab 새 행. Ctrl+Enter 표 밖 본문, 언어 입력칸 등으로 포커스 이동 없음.'),
('T11','표 도구·정렬·복사',24,26,'P1','표 셀 클릭해 도구 확인. 한 열 본문 오른쪽/중앙 변경. 복사 후 텍스트 편집기에 붙여넣고 Markdown 표 확인.','도구 문서 영역 상단에 보임. 대상 열 본문 정렬, 헤더 중앙. 복사에 헤더/구분선/전체 셀·강조·<br> 유지, 문서 메타 제외.'),
('T12','표 구조·실행 취소',26,27,'P1','행·열 추가/삭제 1회씩, Undo/Redo. 헤더행 또는 마지막 열 삭제 제한 확인.','다른 셀 내용 유지. Undo/Redo 복원. 헤더/마지막 열 제한에서 문서 손실 없음.'),
('T13','코드 언어·복사·가로스크롤',27,30,'P0','04 코드에서 언어 text→javascript→text. 가로 스크롤로 END-OF-LONG-LINE 보기. 복사 후 텍스트 편집기에 붙이기. Ctrl+Enter 후 CODE-AFTER 입력.','블록 간 24px 간격. 끝 표식까지 가로 스크롤. 복사는 코드만, 공백/개행 유지. 바깥 본문 입력 가능, 코드 원문 손실 없음.'),
('T14','Mermaid 정상·오류 복구',30,32,'P0','04 그래프 자동 표시, 코드 편집에서 MD 저장소→QA 저장소, 편집 완료. 05 오류 코드 수정. 그래프 이미지 복사 또는 저장 1회.','자동 갱신·접힘/펼침. 순환참조 오류 없음. 오류 블록 밖 입력 가능, 올바른 코드로 복구. 이미지 생성.'),
('T15','수식 삽입·편집',32,34,'P1','04 인라인/블록 수식 더블클릭 수정. /수식으로 새 수식 삽입 후 다음 문장 입력.','KaTeX 표시·수정 반영. 기존 앞뒤 문장 유지, 다음 본문 입력. 원문에 수식 구분/내용 유지.'),
('T16','사진 삽입·편집·복사',34,36,'P0','06 사진 위치에서 original/qa-photo.png 찾아보기 삽입. 편집 옵션 변경, 참조 복사·붙여넣기.','현재 환경 리소스 폴더에서 찾아보기 시작. media 저장, 파랑 1 표시. 편집/복사 단일 버튼, 복사 참조 재표시.'),
('T17','같은 이름 사진 덮어쓰기',36,38,'P0','같은 문서에서 replacement/qa-photo.png 선택. 리소스 media 목록과 이전/새 참조 확인.','동일 qa-photo.png 내용이 주황 2로 갱신. 불필요한 중복 이름·파일 생성 없음. 기존 참조도 새 파일 표시. 원본 source 파일은 그대로.'),
('T18','영상·덮어쓰기',38,40,'P0','06에 original/qa-video.webm 삽입·재생. replacement의 같은 이름으로 교체. 편집/복사 확인.','재생 가능한 2초 영상. 파랑 V1→주황 V2. 현재 환경 media에 같은 이름 갱신. 복사한 참조 재생 가능.'),
('T19','지도·환경 분리',40,42,'P1','06 지도 서울시청 삽입·편집·참조 복사. 해당 환경 리소스와 문서 경로 비교. Drive 준비된 경우 설정된 Drive 폴더에서 찾아보기 확인.','지도 위치·옵션 반영. 외부 지도는 온라인 의존. 로컬 리소스와 Drive 리소스 혼용 없음. 준비되지 않은 다른 환경은 미실행으로 기록.'),
('T20','저장·자동저장·다시 열기',42,45,'P0','10 복사본에 SAVE-ONE 입력 Ctrl+S. SAVE-TWO 추가 후 자동저장 간격+2초 대기. 파일 닫고 다시 열기.','저장 상태 성공. 실제 파일의 두 표식 유지. 화면/커서 불필요한 이동 없음. 로컬/Drive 저장 대상 정확. 자동저장 OFF면 수동저장만 판정.'),
('T21','서식 변경·흔들림 회귀',45,47,'P0','10 스크롤 중간 커서 고정. 서식관리에서 기본→다른 서식→기본. 한글 10자 연속 입력, 저장.','다른 문서로 이동·커서 이동·매 글자 화면 점프 없음. 서식만 변경. 현재 알려진 DOM 유지 회귀를 집중 관찰하고 화면 녹화.'),
('T22','세션 복구',47,48,'P1','RECOVERY-DRAFT 입력 후 정상 저장하고 앱 재실행/새로고침. 복원 탭 확인.','저장된 내용·탭 복원 상태 확인. 강제 종료/저장 전 내용 100% 복구를 PASS 조건으로 삼지 않음. 다시 실제 파일 저장 가능.'),
('T23','그림책 장면 편집',48,51,'P1','07 복사본에 그림책 사용자 서식 적용. 표지/2장면 확인. 첫 장면 본문 수정, 복제/이동 후 Undo.','그림 표시, 선택 장면만 수정. SCENE-TWO 유지. 표지 이동 제한. 넘침 경고 확인. 자동 후속 장면 생성 없음.'),
('T24','PDF·인쇄',51,53,'P0','09를 문서보기에서 PDF로 출력. 파일 열고 표·그림·TIP·그래프·EXPORT-END 확인.','편집 도구/메타/오류 가드 코드 노출 없음. 불필요한 빈 페이지, 끝 문장/표/그림 잘림 없음. 출력 종료 후 편집 재개 가능.'),
('T25','다른 형식 출력',53,55,'P1','09 일반 문서 DOCX 또는 HWPX 1개, EPUB 1개 출력. 뷰어에서 열기. 그림책 출력 선택지도 확인.','파일 열기 가능·핵심 표식 유지. 일반 문서 Word/한글 출력, 그림책 해당 형식 제외. 뷰어 미설치면 내용 검증 BLOCKED, 생성만으로 PASS 아님.'),
('T26','정리·판정',55,60,'P0','CSV 결과·증거·오류 정리. 변경한 설정 복원. 전용 작업장 저장. 실패 1개만 재현해 버그 양식 작성.','27개 상태 기입. P0 실패/차단 여부와 미실행 범위 표시. 기존 자료 안전, 60분 종료.'),
]
assert cases[0][2]==0 and cases[-1][3]==60
assert all(a[3]==b[2] for a,b in zip(cases,cases[1:]))
assert sum(case[3]-case[2] for case in cases)==60
result_path = OUT/'결과기록.csv'
if not result_path.exists():
    with result_path.open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.writer(f)
        writer.writerow(['ID','영역','시작(분)','종료(분)','배정(분)','우선순위','실행 절차','기대 결과','상태','실제 결과','증거 파일','환경','버그 ID'])
        for case in cases:
            ident,area,start,end,priority,steps,expected=case
            writer.writerow([ident,area,start,end,end-start,priority,steps,expected,'NOT RUN','','','',''])
else:
    print('Preserved existing result CSV; no recorded results were overwritten.')

detail=['# 60분 통합 테스트 케이스', '', '한 번의 실행은 하나의 기본 작업 환경을 기준으로 합니다. 상태는 PASS / FAIL / BLOCKED / NOT RUN으로 기록합니다.', '',
        '| ID | 시간 | 영역 | 우선순위 |','| --- | --- | --- | --- |']
for ident,area,start,end,priority,steps,expected in cases:detail.append(f'| {ident} | {start:02d}~{end:02d}분 | {area} | {priority} |')
for ident,area,start,end,priority,steps,expected in cases:
    detail += ['',f'## {ident} · {area} ({start:02d}~{end:02d}분)', '',f'**절차:** {steps}', '',f'**기대 결과:** {expected}', '', '**기록:** 상태 / 실제 결과 / 증거 파일 / 버그 ID.']
(OUT/'테스트케이스.md').write_text('\n'.join(detail)+'\n',encoding='utf-8',newline='\n')
print(f'Generated {len(cases)} cases, exactly 60 minutes, 10 Markdown fixtures and 2 PNG revisions.')
