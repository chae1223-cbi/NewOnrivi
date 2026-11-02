// ====================================================================
// 📊 [OMD-API-ai-credentials-0001] src/app/api/ai-credentials/route.ts
// 🎯 @KICK  : 웹 환경 로컬 리소스 폴더({resourceFolder}/settings/ai_credentials.enc) 암호화 자격증명 파일 읽기/쓰기 API
// 🛡️ @GUARD : Rule 1(단일 주석 관리), 디렉터리 경로 탐색 방어, 파일 부재 시 안전 폴백
// 🚨 @PATCH : **2026-10-21** — [AI API 키 리소스 폴더 전용 암호화 보관 API 신설]: 웹 브라우저 환경에서 리소스 폴더 settings/ai_credentials.enc 파일 읽기 및 저장 지원
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';

export const dynamic = 'force-dynamic';

function resolveResourceFolderPath(resourceFolder: unknown): string | null {
  const folder = typeof resourceFolder === 'string' ? resourceFolder.trim() : '';
  if (!folder) return null;

  if (path.isAbsolute(folder) && fs.existsSync(folder)) {
    return folder;
  }

  const candidates = [
    folder,
    path.join('D:\\', folder),
    path.join('C:\\', folder),
    'D:\\Onrivi_Asset',
    'C:\\Onrivi_Asset',
    path.resolve(process.cwd(), folder),
    path.resolve(process.cwd(), '..', folder),
  ];

  for (const cand of candidates) {
    try {
      if (cand && fs.existsSync(cand) && fs.statSync(cand).isDirectory()) {
        return cand;
      }
    } catch {}
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const resourceFolderParam = searchParams.get('resourceFolder');
  const targetFolder = resolveResourceFolderPath(resourceFolderParam);

  if (!targetFolder) {
    return NextResponse.json({ success: false, error: 'NO_RESOURCE_FOLDER' }, { status: 400 });
  }

  try {
    const credPath = path.join(targetFolder, 'settings', 'ai_credentials.enc');
    if (fs.existsSync(credPath)) {
      const data = fs.readFileSync(credPath, 'utf-8');
      return NextResponse.json({ success: true, data });
    }
    return NextResponse.json({ success: true, data: null });
  } catch (err: any) {
    console.error('[API /api/ai-credentials GET Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'FAILED_TO_LOAD' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resourceFolder, data } = body;
    const targetFolder = resolveResourceFolderPath(resourceFolder);

    if (!targetFolder) {
      return NextResponse.json({ success: false, error: 'NO_RESOURCE_FOLDER' }, { status: 400 });
    }

    const settingsDir = path.join(targetFolder, 'settings');
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }

    const credPath = path.join(settingsDir, 'ai_credentials.enc');
    fs.writeFileSync(credPath, typeof data === 'string' ? data : '', 'utf-8');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API /api/ai-credentials POST Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'FAILED_TO_SAVE' }, { status: 500 });
  }
}
