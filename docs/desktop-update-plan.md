# 데스크톱 앱 자동 업데이트 구현 계획

## 목표
`npm run dist`로 빌드된 exe를 사용자가 수동 재다운로드 없이 최신 버전으로 자동 업데이트

---

## 1. 업데이트 방식 (선택)

### Option A: electron-updater + GitHub Releases (권장)
- **electron-updater** 패키지 사용
- GitHub Releases에 최신 설치파일 업로드
- 앱 실행 시 GitHub Releases API로 최신 버전 확인 → 자동 다운로드 + 설치
- **장점:** GitHub만 있으면 서버 불필요, setup이 간단
- **단점:** GitHub Releases에 수동 업로드 필요 (또는 CI/CD)

### Option B: electron-updater + S3/Cloudflare R2
- R2에 설치파일 업로드, 버전 정보를 JSON 파일로 관리
- 앱 실행 시 R2의 `latest.json` 읽어서 버전 비교
- **장점:** 현재 R2 인프라 활용, GitHub 토큰 불필요
- **단점:** 업로드 스크립트 추가 필요

---

## 2. 필요 패키지

```json
{
  "dependencies": {
    "electron-updater": "^6.3.0"
  },
  "build": {
    "publish": ["github"]  // 또는 custom
  }
}
```

---

## 3. 구현 항목

### 3.1 main.js — autoUpdater 설정
- `app.isPackaged`일 때만 autoUpdater 활성화 (dev에선 skip)
- 업데이트 피드 URL 설정 (GitHub Releases or R2)
- 이벤트 리스너: `checking-for-update`, `update-available`, `update-not-available`, `download-progress`, `update-downloaded`
- `update-downloaded` 시 사용자에게 "업데이트 설치" 다이얼로그 표시 → `autoUpdater.quitAndInstall()`

### 3.2 preload.js — 업데이트 상태 IPC 노출
- `onUpdateAvailable(callback)` — 업데이트 감지 시 프론트 알림
- `onUpdateProgress(callback)` — 다운로드 진행률 표시
- `startUpdate()` — 사용자 확인 후 업데이트 트리거

### 3.3 프론트엔드 UI
- **업데이트 알림 배지:** 우측 하단 또는 메뉴바에 "업데이트 있음" 표시
- **진행률 바:** 다운로드 중 퍼센트 표시
- **설치 확인:** "업데이트가 다운로드되었습니다. 지금 설치할까요?" 다이얼로그

### 3.4 릴리스 워크플로우
- `npm version patch` → 버전 태그
- `npm run dist` → `dist/`에 exe 생성
- 수동 또는 GitHub Actions로 GitHub Releases에 업로드

---

## 4. 코드 구조 예시

### main.js
```javascript
const { autoUpdater } = require('electron-updater');

// dev 환경에서는 업데이트 체크 안 함
if (app.isPackaged) {
  autoUpdater.logger = log;
  autoUpdater.checkForUpdatesAndNotify();
}

autoUpdater.on('update-available', (info) => {
  mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('download-progress', (progress) => {
  mainWindow.webContents.send('update-progress', progress.percent);
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update-downloaded');
  // 또는 바로 설치
  // autoUpdater.quitAndInstall();
});
```

### preload.js
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_e, info) => cb(info)),
  onUpdateProgress: (cb) => ipcRenderer.on('update-progress', (_e, pct) => cb(pct)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', () => cb()),
  startUpdate: () => ipcRenderer.send('start-update'),
});
```

---

## 5. electron-builder 설정 (publish)

### GitHub Releases
```json
{
  "build": {
    "publish": [{
      "provider": "github",
      "owner": "anomalyco",
      "repo": "OnriviMarkDown"
    }]
  }
}
```

### R2 (custom)
```json
{
  "build": {
    "publish": [{
      "provider": "generic",
      "url": "https://onrivi.com/updates"
    }]
  }
}
```
R2에 `latest.yml` (win) + 설치파일 업로드 필요.

---

## 6. 주의사항
- **Windows 인증서(code sign):** 서명되지 않은 exe는 SmartScreen 차단 + 바이러스 오탐 가능
- **macOS notarization:** 추후 macOS 지원 시 Gatekeeper 통과 필수
- **업데이트 실패 fallback:** `autoUpdater` 에러 시 조용히 무시 (기존 버전 계속 사용)

---

## 7. 구현 순서

| 단계 | 내용 | 예상 시간 |
|------|------|-----------|
| 1 | `electron-updater` 설치 + 기본 설정 (main.js) | 1h |
| 2 | preload IPC 노출 | 0.5h |
| 3 | 프론트엔드 UI (알림/진행률/설치) | 2h |
| 4 | electron-builder publish 설정 | 0.5h |
| 5 | GitHub Actions 자동 릴리스 (선택) | 2h |
| 6 | 테스트 (dev 모드 → pack → 실제 업데이트 시뮬) | 1h |

**총 예상:** ~7h (GitHub Actions 포함 시 ~9h)
