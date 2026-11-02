// ====================================================================
// 📊 [OMD-LIB-restoreResourceFolder-0001] src/lib/gdrive/restoreResourceFolder.ts
// 🎯 @KICK  : 구글 드라이브 리소스 폴더(참조폴더) ID 자동 복원 및 재사용 엔진
// 🛡️ @GUARD : Rule 1(단일 주석 관리), 기존 참조폴더 100% 영구 보존 원칙
// 🚨 @PATCH : **2026-10-07** — [환경설정 지정 리소스 폴더(참조파일 등) 전역 자동 탐색 복원]:
//             1) resolveDriveResourceFolderByName을 연동하여 환경설정에 저장된 리소스 폴더명(참조파일 등)을 최우선으로 전역 복원
//             2) 구글 드라이브 재접속 시 참조파일이 참조폴더로 덮어써지거나 서식이 초기화되는 버그 원천 해결
// 🚨 @PATCH : **2026-10-07** — [환경설정 리소스 폴더명(참조파일 등) 기반 드라이브 폴더 안전 탐색 복원]:
//             1) folderId 누락 시에도 환경설정에 지정된 리소스 폴더명(saved.path, '참조파일' 등)으로 구글 드라이브 OnriviAuthor 하위에서 직접 탐색하여 안전 복원
//             2) 재접속 시 참조폴더/참조파일의 사용자 서식이 유실되거나 초기화되지 않고 100% 그대로 계승 보장
// 🚨 @PATCH : **2026-10-07** — [구글 드라이브 참조폴더 기존 폴더 무조건 재사용 보강]:
//             1) onrivi_resource_settings 및 onrivi_gdrive_workspace_info에서 기존 참조폴더 ID 이중 안전 복원
//             2) 재접속 시 참조폴더가 매번 초기화되거나 새로 생성되지 않고 기존 것을 100% 그대로 계승하도록 보장
// ====================================================================

import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import { getResourceSettings } from '@/lib/resourceSettings';

// Reuse the last destination; transient authorization/network failures must not reset it.
export async function restoreDriveResourceFolder(token: string): Promise<{id:string;name:string}|null> {
  const saved = getResourceSettings('cloud');
  const targetName = saved?.path || (typeof window !== 'undefined' ? localStorage.getItem('onrivi_cloud_resource_folder_path') : '') || '참조파일';
  try {
    const { resolveDriveResourceFolderByName } = await import('@/lib/gdrive/googleDriveClient');
    const resolved = await resolveDriveResourceFolderByName(token, targetName);
    return { id: resolved.folderId, name: resolved.name };
  } catch (e) {
    console.warn('[restoreDriveResourceFolder] 복원 오류:', e);
    throw e;
  }
}
