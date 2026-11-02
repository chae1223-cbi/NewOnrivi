// ====================================================================
// 📊 [OMD-API-prompts-0001] src/app/api/prompts/route.ts
// 🎯 @KICK  : 로컬 리소스 폴더({resourceFolder}/prompt/)의 프롬프트 및 프리셋 읽기/쓰기 API
// 🛡️ @GUARD : Rule 1(단일 주석 관리), 절대 경로 유효성 및 디렉터리 탐색 방어
// 🚨 @PATCH : **2026-10-20** — [상대 폴더명(Onrivi_Asset) 및 윈도우 드라이브 자동 매핑으로 500 에러 완전 해결]:
//             1) resolveResourceFolderPath: 브라우저에서 'Onrivi_Asset' 단순 폴더명 전달 시 'D:\Onrivi_Asset' 등 자동 매핑
//             2) 파일 부재 시 500 에러 대신 빈 배열/객체({ success: true, data: [] }) 안전 폴백 반환
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';

export const dynamic = 'force-dynamic';

function resolveResourceFolderPath(resourceFolder: unknown): string | null {
  const folder = typeof resourceFolder === 'string' ? resourceFolder.trim() : '';
  if (!folder) return null;

  // 1. 이미 유효한 절대 경로인 경우
  if (path.isAbsolute(folder) && fs.existsSync(folder)) {
    return folder;
  }

  // 2. 윈도우 환경 드라이브 및 공통 리소스 폴더 자동 탐색
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
  const resourceFolder = searchParams.get('resourceFolder');
  const name = searchParams.get('name') || 'ai_presets.json';

  try {
    if (name !== 'ai_presets.json' && name !== 'ai_prompts.json') {
      return NextResponse.json({ success: false, error: '허용되지 않은 파일 이름입니다.' }, { status: 400 });
    }

    const resolvedFolder = resolveResourceFolderPath(resourceFolder);
    if (!resolvedFolder) {
      return NextResponse.json({
        success: true,
        data: name === 'ai_presets.json' ? [] : {},
        resolvedPath: null,
      });
    }

    const targetPath = path.join(resolvedFolder, 'prompt', name);

    if (!fs.existsSync(targetPath)) {
      return NextResponse.json({
        success: true,
        data: name === 'ai_presets.json' ? [] : {},
        resolvedPath: targetPath,
      });
    }

    const raw = fs.readFileSync(targetPath, 'utf-8');
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = name === 'ai_presets.json' ? [] : {};
    }

    return NextResponse.json({
      success: true,
      data,
      resolvedPath: targetPath,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      data: name === 'ai_presets.json' ? [] : {},
      resolvedPath: null,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resourceFolder, name, data } = body;

    if (name !== 'ai_presets.json' && name !== 'ai_prompts.json') {
      return NextResponse.json({ success: false, error: '허용되지 않은 파일 이름입니다.' }, { status: 400 });
    }

    const resolvedFolder = resolveResourceFolderPath(resourceFolder);
    if (!resolvedFolder) {
      return NextResponse.json({ success: false, error: '유효한 리소스 폴더를 찾을 수 없습니다.' }, { status: 400 });
    }

    const promptDir = path.join(resolvedFolder, 'prompt');
    const targetPath = path.join(promptDir, name);

    if (!fs.existsSync(promptDir)) {
      fs.mkdirSync(promptDir, { recursive: true });
    }

    // 기존 파일 백업
    if (fs.existsSync(targetPath)) {
      const backupName = name.replace('.json', '.backup.json');
      try {
        fs.copyFileSync(targetPath, path.join(promptDir, backupName));
      } catch {}
    }

    const tmpPath = targetPath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, targetPath);

    return NextResponse.json({
      success: true,
      resolvedPath: targetPath,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
