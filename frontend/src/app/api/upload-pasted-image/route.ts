// ====================================================================
// 🚨 @PATCH : **2026-10-02** — [붙여넣기 이미지 업로드 대상 폴더 쓰기 예외 방어]: targetFolder 유효성 및 디렉터리 존재 여부 검사, try/catch 가드 추가로 잘못된 경로 요청 시 500 크래시 방어
import { NextResponse } from 'next/server';
let fs: any;
let path: any;
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  try {
    fs = eval('require("fs")');
    path = eval('require("path")');
  } catch (e) {}
}

export async function POST(request: Request) {
  try {
    const { base64Data, fileName: clientFileName, targetFolder } = await request.json();
    if (!base64Data) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    const ext = clientFileName ? (clientFileName.split('.').pop()?.toLowerCase() || 'png') : 'png';
    
    // 🛡️ [보안 필터] 확장자 화이트리스트 검사 (해킹 스크립트 업로드 차단)
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'];
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json({ error: '허용되지 않는 파일 형식입니다.' }, { status: 400 });
    }

    const baseName = clientFileName || `file_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    const fileName = `inquiry_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;

    const cleanBase64 = base64Data.replace(/^data:\w+\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // 🛡️ [보안 필터] 파일 용량 제한 (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      return NextResponse.json({ error: '파일 용량은 5MB를 초과할 수 없습니다.' }, { status: 413 });
    }

    const webAssetsDir = path.join(process.cwd(), 'public', 'assets');
    if (!fs.existsSync(webAssetsDir)) {
      fs.mkdirSync(webAssetsDir, { recursive: true });
    }
    const webFilePath = path.join(webAssetsDir, fileName);
    fs.writeFileSync(webFilePath, buffer);

    if (targetFolder && fs && path) {
      try {
        const isFile = targetFolder.toLowerCase().endsWith('.md') || targetFolder.toLowerCase().endsWith('.markdown');
        const dirPath = isFile ? path.dirname(targetFolder) : targetFolder;
        if (dirPath && fs.existsSync(dirPath)) {
          const localAssetsDir = path.join(dirPath, 'assets');
          if (!fs.existsSync(localAssetsDir)) {
            fs.mkdirSync(localAssetsDir, { recursive: true });
          }
          const localFilePath = path.join(localAssetsDir, fileName);
          fs.writeFileSync(localFilePath, buffer);
        }
      } catch (targetErr) {
        console.warn('[upload-pasted-image] targetFolder local write skipped:', targetErr);
      }
    }

    return NextResponse.json({
      status: 'success',
      relativePath: `/assets/${fileName}`
    });
  } catch (error: any) {
    if (error?.message && error.message.includes('NEXT_STATIC_GEN_BAILOUT')) {
      return new NextResponse('Dynamic route bailout', { status: 500 });
    }
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
