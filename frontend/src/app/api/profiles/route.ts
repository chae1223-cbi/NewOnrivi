import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';

export const dynamic = 'force-dynamic';

function getProfilesPath(resourceFolder: unknown): string {
  const folder = typeof resourceFolder === 'string' ? resourceFolder.trim() : '';
  if (!folder || !path.isAbsolute(folder) || !fs.statSync(folder).isDirectory()) {
    throw new Error('RESOURCE_FOLDER_NOT_SET: 리소스 폴더를 다시 연결해 주세요.');
  }
  return path.join(folder, 'profiles', 'userCssProfiles.json');
}


/**
 * GET /api/profiles?resourceFolder=...
 * 리소스 폴더의 profiles/userCssProfiles.json에서 사용자 정의 CSS 서식 프로필 목록을 읽어옵니다.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetPath = getProfilesPath(searchParams.get('resourceFolder'));

    if (!fs.existsSync(targetPath)) {
      return NextResponse.json({
        success: true,
        profiles: [],
        resolvedPath: targetPath,
      });
    }

    const raw = fs.readFileSync(targetPath, 'utf-8');
    const profiles = JSON.parse(raw);
    if (!Array.isArray(profiles)) throw new Error('INVALID_PROFILES_ARRAY');

    return NextResponse.json({
      success: true,
      profiles: Array.isArray(profiles) ? profiles : [],
      resolvedPath: targetPath,
    });
  } catch (err: any) {
    console.error('GET /api/profiles 에러:', err);
    return NextResponse.json(
      { success: false, error: err.message, profiles: [] },
      { status: 500 }
    );
  }
}

/** profiles/userCssProfiles.json만 저장한다. 개별 CSS 파일은 생성하지 않는다. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { profiles, resourceFolder } = body;

    if (!Array.isArray(profiles)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PROFILES_ARRAY' },
        { status: 400 }
      );
    }

    const jsonPath = getProfilesPath(resourceFolder);
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(profiles, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      count: profiles.length,
      savedPath: jsonPath,
    });
  } catch (err: any) {
    console.error('POST /api/profiles 에러:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
