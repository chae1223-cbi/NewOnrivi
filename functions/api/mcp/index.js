// ====================================================================
// 📊 [OMD-MCP-REMOTE-HTTP-0001] functions/api/mcp/index.js
// 🎯 @KICK  : 온리비 어서 웹 사용자용 원격 Streamable HTTP MCP 서버 (/api/mcp)
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Bearer MCP 토큰 SHA-256 검증, 활성 유료 구독 검증, Google Drive 작업장/리소스 격리
// 🚨 @PATCH : 2026-11-19 — [MCP 하이브리드 단계 4: 로컬 장치 상태 조회(get_mcp_device_status) 및 단일 연결 GDRIVE/LOCAL 하이브리드 라우팅 구현]:
//             1) set_mcp_workspace / set_mcp_resource_folder에서 GDRIVE·LOCAL(deviceId+rootId) 전환 지원
//             2) 작업장이 LOCAL일 때 dispatchLocalAgentJob으로 라우팅하고 Google Drive 토큰 조회를 지연(lazy) 분리하여 Drive 철회 시에도 로컬 도구 정상 동작 보장
// 🚨 @PATCH : 2026-11-19 — [MCP 하이브리드 단계 3: Drive 재귀 목록·검색, 페이지네이션 및 edit_markdown_section 부분 수정 도구 신설]
// 🚨 @PATCH : 2026-11-19 — [MCP 하이브리드 단계 2: 계정·연결 상태 조회(get_mcp_connection_status) 및 쓰기 직전 실시간 구독·연결 활성 재검증 강화]
// 🚨 @PATCH : 2026-11-19 — [MCP 하이브리드 단계 1: MCP 전용 폴더 관리 도구 및 연결별 설정 버전 검증 도입]:
//             1) get_mcp_folders, list_mcp_folder_candidates, set_mcp_workspace, set_mcp_resource_folder, clear_mcp_folder 도구 신설
//             2) 연결별 독립 폴더 설정(getMcpConnectionConfig) 조회 및 쓰기 직전 configVersion·WRITE 권한 재검증(assertWriteConfigUnchanged) 적용
// 🚨 @PATCH : 2026-11-19 — [MCP 하이브리드 단계 0: Drive 폴더 경계 강제·빈 슬롯 폴백 제거·수정 기준 해시 필수화]:
//             1) list_workspace_files, read_markdown, create_markdown, replace_markdown 전 경로에 assertDriveDescendant 경계 검증 적용
//             2) 리소스 폴더 미설정 시 작업장 폴더로 자동 폴백하던 동작 제거(Rule 9 준수)
//             3) replace_markdown의 expectedSha256 필수 검증 강화 및 도구 오류 선제 진단 로깅 적용
// 🚨 @PATCH : 2026-11-16 — [웹 원격 MCP 서버 신설] Google Drive 문서·AI 템플릿·서식 프로필 CRUD 전체 도구 지원
// 🔗 @CALLS : functions/api/mcp/_shared.js, Google Drive API v3
// ====================================================================
import {
  assertDriveDescendant,
  createDriveTextFile,
  dispatchLocalAgentJob,
  findDriveFileByName,
  findOrCreateDriveSubfolder,
  getDriveItemMeta,
  getMcpConnectionConfig,
  getMcpTokenByHash,
  getUserMcpDevices,
  getValidDriveAccessToken,
  listDriveChildren,
  listDriveChildrenPage,
  listDriveFolders,
  listDriveTreeRecursive,
  readDriveFileText,
  sha256Hex,
  updateDriveTextFile,
  updateMcpFolderSlot,
  verifyActivePaidPlan,
} from './_shared.js';

const corsHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
};

const rpcReply = (id, result) =>
  new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), { status: 200, headers: corsHeaders });

const rpcError = (id, code, message, status = 200) =>
  new Response(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }), { status, headers: corsHeaders });

export const onRequestOptions = () => new Response(null, { headers: corsHeaders });

const TOOLS = [
  {
    name: 'get_mcp_connection_status',
    description: '현재 MCP 연결의 계정·구독·Google Drive 연결 상태, 설정된 작업장/리소스 폴더 및 수행 가능한 작업 목록을 실시간 조회합니다.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_mcp_folders',
    description: '현재 MCP 연결 전용 작업장·리소스 폴더 설정과 설정 버전(configVersion)을 조회합니다.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_mcp_folder_candidates',
    description: 'MCP 작업장 또는 리소스 폴더로 등록할 수 있는 Google Drive 폴더 후보 목록을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        parentFolderId: { type: 'string', description: '특정 상위 폴더 하위만 조회할 때 지정 (생략 시 전체 Drive 폴더 후보 검색)' },
        query: { type: 'string', maxLength: 100, description: '폴더 이름 검색어 (선택)' },
        pageSize: { type: 'integer', minimum: 1, maximum: 100, description: '조회 개수 (기본 50)' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_mcp_device_status',
    description: '현재 계정에 등록된 로컬 PC 에이전트 장치 목록, 온라인/오프라인 상태 및 승인된 로컬 폴더(rootId) 후보를 조회합니다.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'set_mcp_workspace',
    description: '현재 MCP 연결의 작업장 폴더를 Google Drive(folderId) 또는 승인된 로컬 PC 폴더(storageType="LOCAL", deviceId, rootId)로 등록·변경합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        storageType: { type: 'string', enum: ['GDRIVE', 'LOCAL'], description: '저장소 유형 (기본 GDRIVE)' },
        folderId: { type: 'string', description: 'GDRIVE일 때 등록할 Google Drive 폴더 ID' },
        deviceId: { type: 'string', description: 'LOCAL일 때 등록할 PC 장치 ID' },
        rootId: { type: 'string', description: 'LOCAL일 때 해당 PC에서 승인된 로컬 폴더 rootId' },
        expectedConfigVersion: { type: 'integer', minimum: 1, description: 'get_mcp_folders에서 조회한 현재 configVersion' },
        permissions: {
          type: 'array',
          items: { type: 'string', enum: ['READ', 'WRITE'] },
          description: '허용할 작업 권한 (기본: ["READ", "WRITE"])',
        },
      },
      required: ['expectedConfigVersion'],
      additionalProperties: false,
    },
  },
  {
    name: 'set_mcp_resource_folder',
    description: '현재 MCP 연결의 리소스 폴더를 Google Drive(folderId) 또는 승인된 로컬 PC 폴더(storageType="LOCAL", deviceId, rootId)로 등록·변경합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        storageType: { type: 'string', enum: ['GDRIVE', 'LOCAL'], description: '저장소 유형 (기본 GDRIVE)' },
        folderId: { type: 'string', description: 'GDRIVE일 때 등록할 Google Drive 리소스 폴더 ID' },
        deviceId: { type: 'string', description: 'LOCAL일 때 등록할 PC 장치 ID' },
        rootId: { type: 'string', description: 'LOCAL일 때 해당 PC에서 승인된 로컬 폴더 rootId' },
        expectedConfigVersion: { type: 'integer', minimum: 1, description: 'get_mcp_folders에서 조회한 현재 configVersion' },
        permissions: {
          type: 'array',
          items: { type: 'string', enum: ['READ', 'WRITE'] },
          description: '허용할 작업 권한 (기본: ["READ", "WRITE"])',
        },
      },
      required: ['expectedConfigVersion'],
      additionalProperties: false,
    },
  },
  {
    name: 'clear_mcp_folder',
    description: '현재 MCP 연결의 작업장(WORKSPACE) 또는 리소스(RESOURCE) 폴더 슬롯을 해제합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['WORKSPACE', 'RESOURCE'] },
        expectedConfigVersion: { type: 'integer', minimum: 1, description: 'get_mcp_folders에서 조회한 현재 configVersion' },
      },
      required: ['role', 'expectedConfigVersion'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_current_folders',
    description: '(호환용) 현재 원격 MCP 연결의 작업장·리소스 폴더 ID와 configVersion을 조회합니다.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_workspace_files',
    description: 'Google Drive 작업장(또는 지정한 하위 폴더)의 마크다운 파일과 폴더 목록을 조회합니다. recursive=true로 하위 폴더까지 재귀 조회하거나 cursor로 페이지네이션할 수 있습니다.',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: { type: 'string', description: '생략 시 연결된 작업장 루트 폴더 조회' },
        recursive: { type: 'boolean', description: 'true일 때 하위 폴더까지 재귀 탐색 (기본 false)' },
        pageSize: { type: 'integer', minimum: 1, maximum: 200, description: '단일 페이지 조회 개수 (기본 100)' },
        cursor: { type: 'string', description: '이전 응답의 nextCursor (recursive=false일 때 사용)' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'search_workspace',
    description: 'Google Drive 작업장 내 마크다운(.md, .markdown) 파일을 파일명·상대경로 기준으로 검색합니다(기본 재귀 검색, 본문 전문 검색 미포함).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 100 },
        recursive: { type: 'boolean', description: '하위 폴더까지 검색 여부 (기본 true)' },
        maxItems: { type: 'integer', minimum: 1, maximum: 200, description: '최대 결과 개수 (기본 100)' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'read_markdown',
    description: 'Google Drive의 마크다운 파일 내용과 SHA-256 해시를 읽어옵니다. fileId 또는 파일명(relativePath)을 지정하세요.',
    inputSchema: {
      type: 'object',
      properties: {
        fileId: { type: 'string' },
        relativePath: { type: 'string', description: '작업장 루트 기준 파일명 또는 상대경로 (예: report.md)' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'create_markdown',
    description: 'Google Drive 작업장 폴더에 새 마크다운(.md) 문서를 생성·업로드합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '생성할 파일명 (예: 새기획안.md)' },
        content: { type: 'string' },
        parentFolderId: { type: 'string', description: '생략 시 작업장 루트 폴더에 생성' },
        expectedConfigVersion: { type: 'integer', minimum: 1, description: '선택 사항. 지정 시 현재 폴더 설정 버전과 일치해야 저장' },
      },
      required: ['name', 'content'],
      additionalProperties: false,
    },
  },
  {
    name: 'replace_markdown',
    description: '기존 마크다운 파일 내용을 교체합니다(Drive는 fileId, 로컬은 relativePath 지정). 동시 수정 충돌 방지를 위해 expectedSha256이 필수입니다.',
    inputSchema: {
      type: 'object',
      properties: {
        fileId: { type: 'string', description: 'Google Drive 파일 ID (Drive 작업장일 때)' },
        relativePath: { type: 'string', description: '로컬 작업장 상대경로 (LOCAL 작업장일 때)' },
        content: { type: 'string' },
        expectedSha256: { type: 'string', minLength: 64, maxLength: 64, description: '필수. read_markdown 또는 create_markdown에서 받은 SHA-256' },
        expectedConfigVersion: { type: 'integer', minimum: 1, description: '선택 사항. 지정 시 현재 폴더 설정 버전과 일치해야 저장' },
      },
      required: ['content', 'expectedSha256'],
      additionalProperties: false,
    },
  },
  {
    name: 'edit_markdown_section',
    description: '마크다운 파일의 특정 제목 섹션(targetHeading) 또는 고유 문구(oldText)만 안전하게 부분 수정합니다. expectedSha256이 필수입니다.',
    inputSchema: {
      type: 'object',
      properties: {
        fileId: { type: 'string', description: 'Google Drive 파일 ID (Drive 작업장일 때)' },
        relativePath: { type: 'string', description: '로컬 작업장 상대경로 (LOCAL 작업장일 때)' },
        expectedSha256: { type: 'string', minLength: 64, maxLength: 64, description: '필수. read_markdown에서 받은 기준 SHA-256' },
        expectedConfigVersion: { type: 'integer', minimum: 1, description: '선택 사항. 지정 시 현재 폴더 설정 버전과 일치해야 저장' },
        targetHeading: { type: 'string', description: '수정할 마크다운 제목 (예: "## 2. 배경" 또는 "2. 배경"). 해당 제목 아래 본문만 newText로 교체' },
        oldText: { type: 'string', description: '교체할 기존 원문 문자열(문서 내 정확히 1회만 일치해야 함)' },
        newText: { type: 'string', description: '새로 반영할 내용' },
      },
      required: ['expectedSha256', 'newText'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_ai_templates',
    description: 'Google Drive 리소스 폴더의 AI 프리셋 및 문서 템플릿 목록을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: { kind: { type: 'string', enum: ['preset', 'prompt'] }, query: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'get_ai_template',
    description: 'Google Drive 리소스 폴더에서 AI 템플릿 본문과 SHA-256을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['preset', 'prompt'] },
        id: { type: 'string' },
        domain: { type: 'string' },
        docType: { type: 'string' },
      },
      required: ['kind'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_ai_template',
    description: 'Google Drive 리소스 폴더에 새 AI 프리셋 또는 문서 템플릿을 등록합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['preset', 'prompt'] },
        name: { type: 'string' },
        prompt: { type: 'string' },
        folder: { type: 'string' },
        domain: { type: 'string' },
        docType: { type: 'string' },
        systemPrompt: { type: 'string' },
        userInputTemplate: { type: 'string' },
      },
      required: ['name', 'prompt'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_ai_template',
    description: 'Google Drive 리소스 폴더의 기존 AI 프리셋 또는 문서 템플릿을 수정합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['preset', 'prompt'] },
        id: { type: 'string' },
        domain: { type: 'string' },
        docType: { type: 'string' },
        name: { type: 'string' },
        prompt: { type: 'string' },
        folder: { type: 'string' },
        systemPrompt: { type: 'string' },
        userInputTemplate: { type: 'string' },
        expectedSha256: { type: 'string' },
      },
      required: ['expectedSha256'],
      additionalProperties: false,
    },
  },
  {
    name: 'delete_ai_template',
    description: 'Google Drive 리소스 폴더의 기존 AI 프리셋 또는 문서 템플릿을 삭제합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['preset', 'prompt'] },
        id: { type: 'string' },
        domain: { type: 'string' },
        docType: { type: 'string' },
        expectedSha256: { type: 'string' },
      },
      required: ['expectedSha256'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_style_profiles',
    description: 'Google Drive 리소스 폴더의 사용자 서식(CSS 프로필) 목록과 SHA-256을 조회합니다.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'delete_style_profile',
    description: 'Google Drive 리소스 폴더의 사용자 정의 서식 프로필을 삭제합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        profileId: { type: 'string' },
        expectedSha256: { type: 'string' },
      },
      required: ['profileId', 'expectedSha256'],
      additionalProperties: false,
    },
  },
];

/**
 * ========================================================================================
 * [함수명] resolveDriveFileByPath - 작업장 루트 폴더 기준 상대경로로 Drive 파일 ID를 조회합니다.
 * 상위 경로 이탈('..', '.')을 차단하여 허용된 작업장 폴더 밖 탐색을 방지합니다.
 * ==========================================================================================
 */
async function resolveDriveFileByPath(accessToken, rootFolderId, relativePath) {
  const parts = String(relativePath || '').replace(/\\/g, '/').split('/').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error('파일 경로 또는 fileId를 지정하세요.');
  if (parts.some((part) => part === '.' || part === '..')) {
    throw new Error('상위 폴더 이동(..)이 포함된 경로는 허용되지 않습니다.');
  }
  let currentFolder = rootFolderId;
  for (let i = 0; i < parts.length - 1; i++) {
    const sub = await findOrCreateDriveSubfolder(accessToken, currentFolder, parts[i], false);
    if (!sub) throw new Error(`폴더를 찾지 못했습니다: ${parts[i]}`);
    currentFolder = sub;
  }
  const file = await findDriveFileByName(accessToken, currentFolder, parts[parts.length - 1]);
  if (!file) throw new Error(`파일을 찾지 못했습니다: ${relativePath}`);
  return file.id;
}

async function loadDriveJson(accessToken, resourceFolderId, folderName, fileName, fallbackValue, allowCreate = false) {
  const folderId = await findOrCreateDriveSubfolder(accessToken, resourceFolderId, folderName, allowCreate);
  if (!folderId) return { folderId: null, fileId: null, data: fallbackValue, sha256: await sha256Hex(JSON.stringify(fallbackValue)) };
  const file = await findDriveFileByName(accessToken, folderId, fileName);
  if (!file) return { folderId, fileId: null, data: fallbackValue, sha256: await sha256Hex(JSON.stringify(fallbackValue)) };
  const { text, sha256 } = await readDriveFileText(accessToken, file.id);
  const parsed = JSON.parse(text.replace(/^\uFEFF/, '') || JSON.stringify(fallbackValue));
  return { folderId, fileId: file.id, data: parsed, sha256 };
}

async function saveDriveJson(accessToken, folderId, fileId, fileName, data) {
  const text = JSON.stringify(data, null, 2);
  if (fileId) {
    await updateDriveTextFile(accessToken, fileId, text, 'application/json');
  } else {
    await createDriveTextFile(accessToken, folderId, fileName, text, 'application/json');
  }
  return sha256Hex(text);
}

/**
 * ========================================================================================
 * [함수명] applyMarkdownSectionEdit - 마크다운 원문에서 지정된 제목 섹션(targetHeading)
 * 또는 정확히 1회 일치하는 기존 문구(oldText)를 newText로 안전하게 부분 치환합니다.
 * 코드 펜스 내부의 '#' 줄은 제목으로 오인하지 않으며, 중복·미일치 시 오류를 발생시킵니다.
 * ==========================================================================================
 */
export function applyMarkdownSectionEdit(sourceText, { targetHeading = '', oldText = '', newText = '' }) {
  const eol = sourceText.includes('\r\n') ? '\r\n' : '\n';
  const normalized = String(sourceText || '').replace(/\r\n/g, '\n');
  const replacement = String(newText ?? '').replace(/\r\n/g, '\n');

  const cleanOld = String(oldText || '').replace(/\r\n/g, '\n');
  const cleanHeading = String(targetHeading || '').trim();

  if (!cleanOld && !cleanHeading) {
    throw new Error('부분 수정을 위해 targetHeading 또는 oldText 중 하나를 지정해 주세요.');
  }

  if (cleanOld) {
    const firstIdx = normalized.indexOf(cleanOld);
    if (firstIdx === -1) {
      throw new Error('지정한 oldText를 문서에서 찾지 못했습니다. 문서를 다시 읽고 정확한 문구를 지정해 주세요.');
    }
    if (normalized.indexOf(cleanOld, firstIdx + 1) !== -1) {
      throw new Error('지정한 oldText가 문서에 2곳 이상 존재합니다. 주변 문맥을 포함해 유일하게 지정해 주세요.');
    }
    const updated = normalized.slice(0, firstIdx) + replacement + normalized.slice(firstIdx + cleanOld.length);
    return eol === '\r\n' ? updated.replace(/\n/g, '\r\n') : updated;
  }

  const normalizedTarget = cleanHeading.replace(/^#{1,6}\s+/, '').trim();
  const lines = normalized.split('\n');
  let fence = '';
  const matched = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1];
      else if (fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = '';
      continue;
    }
    if (fence) continue;
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (!headingMatch) continue;
    const level = headingMatch[1].length;
    const rawLine = line.trim();
    const titleOnly = headingMatch[2].trim();
    if (rawLine === cleanHeading || titleOnly === normalizedTarget) {
      matched.push({ index: i, level });
    }
  }

  if (matched.length === 0) {
    throw new Error(`지정한 제목 섹션을 찾지 못했습니다: ${cleanHeading}`);
  }
  if (matched.length > 1) {
    throw new Error(`동일한 제목 섹션이 2곳 이상 존재합니다: ${cleanHeading}. oldText로 고유 문맥을 지정해 주세요.`);
  }

  const start = matched[0];
  let endIndex = lines.length;
  fence = '';
  for (let i = start.index + 1; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1];
      else if (fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = '';
      continue;
    }
    if (fence) continue;
    const nextHeading = line.match(/^(#{1,6})\s+/);
    if (nextHeading && nextHeading[1].length <= start.level) {
      endIndex = i;
      break;
    }
  }

  const bodyLines = replacement.length > 0 ? ['', ...replacement.split('\n'), ''] : [''];
  const resultLines = [
    ...lines.slice(0, start.index + 1),
    ...bodyLines,
    ...lines.slice(endIndex),
  ];
  const updated = resultLines.join('\n').replace(/\n{3,}/g, '\n\n');
  return eol === '\r\n' ? updated.replace(/\n/g, '\r\n') : updated;
}

/**
 * ========================================================================================
 * [함수명] assertSlotPermission - 지정된 폴더 슬롯이 설정되어 있고 요청된 권한(READ/WRITE)을 보유하는지 검증합니다.
 * ==========================================================================================
 */
function isSlotConfigured(slot) {
  if (!slot) return false;
  return slot.storageType === 'LOCAL' ? Boolean(slot.deviceId && slot.rootId) : Boolean(slot.folderId);
}

function assertSlotPermission(slot, requiredPermission, label) {
  if (!isSlotConfigured(slot)) {
    throw new Error(`연결된 ${label}가 설정되어 있지 않습니다. 먼저 폴더를 지정해 주세요.`);
  }
  const perms = Array.isArray(slot.permissions) ? slot.permissions : ['READ', 'WRITE'];
  if (!perms.includes(requiredPermission)) {
    throw new Error(`${label}에 ${requiredPermission} 권한이 없습니다.`);
  }
}

/**
 * ========================================================================================
 * [함수명] assertWriteConfigUnchanged - 저장 직전에 MCP 연결 폴더 설정 버전과 WRITE 권한을
 * 재조회하여, 진행 중 폴더 변경·권한 철회가 발생했을 때 쓰기를 충돌로 중단합니다.
 * ==========================================================================================
 */
async function assertWriteConfigUnchanged(env, record, initialConfig, role, expectedConfigVersion, verifyPlanFn = verifyActivePaidPlan) {
  if (expectedConfigVersion !== undefined) {
    const expected = Number(expectedConfigVersion);
    if (!Number.isInteger(expected) || expected < 1 || expected !== initialConfig.configVersion) {
      throw new Error(`폴더 설정 버전이 일치하지 않습니다(현재 버전: ${initialConfig.configVersion}). 최신 폴더 설정을 다시 조회해 주세요.`);
    }
  }
  if (env.R2_BUCKET && record?.tokenHash) {
    const stillActiveToken = await getMcpTokenByHash(env, record.tokenHash);
    if (!stillActiveToken?.userId) {
      throw new Error('쓰기 진행 중 MCP 연결이 폐기되어 작업을 중단했습니다.');
    }
  }
  if (typeof verifyPlanFn === 'function' && (env.HYPERDRIVE || env.DATABASE_URL || verifyPlanFn !== verifyActivePaidPlan)) {
    const stillPaid = await verifyPlanFn(env, record.userId);
    if (!stillPaid) {
      throw new Error('쓰기 직전 활성 유료 구독이 확인되지 않아 작업을 중단했습니다.');
    }
  }
  const latest = await getMcpConnectionConfig(env, record);
  if (latest.configVersion !== initialConfig.configVersion) {
    throw new Error('쓰기 진행 중 MCP 폴더 설정이 변경되어 작업을 중단했습니다. 최신 설정을 확인 후 다시 시도해 주세요.');
  }
  const slot = role === 'RESOURCE' ? latest.resource : latest.workspace;
  assertSlotPermission(slot, 'WRITE', role === 'RESOURCE' ? '리소스 폴더' : '작업장 폴더');
  return latest;
}

export async function executeTool(name, args, { env, record, paidSub = null, verifyPlanFn = verifyActivePaidPlan }) {
  const config = await getMcpConnectionConfig(env, record);
  const workspaceSlot = config.workspace;
  const resourceSlot = config.resource;
  const workspaceId = workspaceSlot.folderId;
  const resourceId = resourceSlot.folderId;

  if (name === 'get_mcp_connection_status') {
    let driveStatus = record?.driveRefreshToken ? 'CONNECTED' : 'DISCONNECTED';
    if (record?.driveRefreshToken) {
      try {
        await getValidDriveAccessToken(env, record);
        driveStatus = 'CONNECTED';
      } catch {
        driveStatus = 'REAUTH_REQUIRED';
      }
    }
    const allowedActions = [];
    if (driveStatus === 'CONNECTED') {
      allowedActions.push('LIST_FOLDER_CANDIDATES', 'MANAGE_FOLDERS');
      if (workspaceId && workspaceSlot.permissions.includes('READ')) allowedActions.push('READ_WORKSPACE');
      if (workspaceId && workspaceSlot.permissions.includes('WRITE')) allowedActions.push('WRITE_WORKSPACE');
      if (resourceId && resourceSlot.permissions.includes('READ')) allowedActions.push('READ_RESOURCE');
      if (resourceId && resourceSlot.permissions.includes('WRITE')) allowedActions.push('WRITE_RESOURCE');
    }
    return {
      connectionId: config.connectionId,
      clientName: record?.clientName || 'DEFAULT',
      authMode: 'BEARER_TOKEN',
      accountStatus: 'ACTIVE',
      planName: paidSub?.plan_name || '',
      planStatus: paidSub?.plan_status ? String(paidSub.plan_status).toUpperCase() : 'ACTIVE',
      driveStatus,
      configVersion: config.configVersion,
      workspace: { ...workspaceSlot, configured: Boolean(workspaceId) },
      resource: { ...resourceSlot, configured: Boolean(resourceId) },
      allowedActions,
      updatedAt: config.updatedAt,
    };
  }

  if (name === 'get_mcp_device_status') {
    const devices = await getUserMcpDevices(env, record.userId);
    return {
      connectionId: config.connectionId,
      devices,
      boundWorkspaceDeviceId: workspaceSlot.storageType === 'LOCAL' ? workspaceSlot.deviceId : null,
      boundResourceDeviceId: resourceSlot.storageType === 'LOCAL' ? resourceSlot.deviceId : null,
    };
  }

  let cachedDriveToken = null;
  const requireDriveAccessToken = async () => {
    if (!cachedDriveToken) cachedDriveToken = await getValidDriveAccessToken(env, record);
    return cachedDriveToken;
  };

  if (name === 'get_mcp_folders') {
    return {
      connectionId: config.connectionId,
      configVersion: config.configVersion,
      workspace: { ...workspaceSlot, configured: isSlotConfigured(workspaceSlot) },
      resource: { ...resourceSlot, configured: isSlotConfigured(resourceSlot) },
      updatedAt: config.updatedAt,
    };
  }

  if (name === 'list_mcp_folder_candidates') {
    const accessToken = await requireDriveAccessToken();
    const items = await listDriveFolders(accessToken, {
      parentFolderId: args?.parentFolderId ? String(args.parentFolderId).trim() : '',
      query: args?.query ? String(args.query).trim() : '',
      pageSize: args?.pageSize,
    });
    const devices = await getUserMcpDevices(env, record.userId);
    return {
      storageType: 'GDRIVE',
      configVersion: config.configVersion,
      items: items.map((f) => ({ folderId: f.id, name: f.name, parents: f.parents || [], modifiedTime: f.modifiedTime || '' })),
      localDevices: devices,
    };
  }

  if (name === 'set_mcp_workspace' || name === 'set_mcp_resource_folder') {
    const role = name === 'set_mcp_workspace' ? 'WORKSPACE' : 'RESOURCE';
    const targetStorage = String(args?.storageType || 'GDRIVE').trim().toUpperCase();
    if (targetStorage === 'LOCAL') {
      const deviceId = String(args?.deviceId || '').trim();
      const rootId = String(args?.rootId || '').trim();
      if (!deviceId || !rootId) {
        throw new Error('로컬 폴더 등록에는 deviceId와 PC에서 승인된 rootId가 필요합니다.');
      }
      const devices = await getUserMcpDevices(env, record.userId);
      const dev = devices.find((d) => d.deviceId === deviceId);
      if (!dev) throw new Error('등록되지 않은 로컬 장치(deviceId)입니다.');
      const approved = dev.approvedRoots.find((r) => r.rootId === rootId);
      if (!approved) throw new Error('해당 PC에서 사전 승인되지 않은 로컬 폴더(rootId)입니다.');
      const updated = await updateMcpFolderSlot(env, record, {
        role,
        storageType: 'LOCAL',
        deviceId: dev.deviceId,
        rootId: approved.rootId,
        folderName: approved.name,
        permissions: args?.permissions || approved.permissions,
        expectedConfigVersion: args?.expectedConfigVersion,
      });
      return {
        success: true,
        connectionId: updated.connectionId,
        configVersion: updated.configVersion,
        workspace: { ...updated.workspace, configured: isSlotConfigured(updated.workspace) },
        resource: { ...updated.resource, configured: isSlotConfigured(updated.resource) },
      };
    }

    const accessToken = await requireDriveAccessToken();
    const targetFolderId = String(args?.folderId || '').trim();
    const meta = await getDriveItemMeta(accessToken, targetFolderId);
    if (!meta?.id || meta.trashed) {
      throw new Error('지정한 Google Drive 폴더를 찾을 수 없거나 휴지통에 있습니다.');
    }
    if (meta.mimeType !== 'application/vnd.google-apps.folder') {
      throw new Error('지정한 Drive 항목이 일반 폴더가 아닙니다.');
    }
    const updated = await updateMcpFolderSlot(env, record, {
      role,
      folderId: meta.id,
      folderName: meta.name || '',
      storageType: 'GDRIVE',
      permissions: args?.permissions,
      expectedConfigVersion: args?.expectedConfigVersion,
    });
    return {
      success: true,
      connectionId: updated.connectionId,
      configVersion: updated.configVersion,
      workspace: { ...updated.workspace, configured: isSlotConfigured(updated.workspace) },
      resource: { ...updated.resource, configured: isSlotConfigured(updated.resource) },
    };
  }

  if (name === 'clear_mcp_folder') {
    const updated = await updateMcpFolderSlot(env, record, {
      role: args?.role,
      folderId: '',
      folderName: '',
      storageType: null,
      deviceId: '',
      rootId: '',
      permissions: [],
      expectedConfigVersion: args?.expectedConfigVersion,
    });
    return {
      success: true,
      connectionId: updated.connectionId,
      configVersion: updated.configVersion,
      workspace: { ...updated.workspace, configured: isSlotConfigured(updated.workspace) },
      resource: { ...updated.resource, configured: isSlotConfigured(updated.resource) },
    };
  }

  if (name === 'get_current_folders') {
    return {
      connectionId: config.connectionId,
      configVersion: config.configVersion,
      workspaceType: workspaceSlot.storageType || 'GDRIVE',
      workspaceFolderId: workspaceSlot.storageType === 'LOCAL' ? workspaceSlot.rootId : workspaceId,
      resourceFolderId: resourceSlot.storageType === 'LOCAL' ? resourceSlot.rootId : resourceId,
      workspaceConfigured: isSlotConfigured(workspaceSlot),
      resourceConfigured: isSlotConfigured(resourceSlot),
    };
  }

  if (name === 'list_workspace_files') {
    assertSlotPermission(workspaceSlot, 'READ', '작업장 폴더');
    if (workspaceSlot.storageType === 'LOCAL') {
      const localResult = await dispatchLocalAgentJob(env, record.userId, {
        deviceId: workspaceSlot.deviceId,
        job: { op: 'LIST', rootId: workspaceSlot.rootId, subPath: args?.folderId || '', recursive: Boolean(args?.recursive), pageSize: args?.pageSize || 100 },
      });
      return { ...localResult, configVersion: config.configVersion };
    }
    const accessToken = await requireDriveAccessToken();
    const targetFolder = args?.folderId ? String(args.folderId).trim() : workspaceId;
    await assertDriveDescendant(accessToken, targetFolder, workspaceId, { allowRoot: true, requireFolder: true });
    if (args?.recursive === true) {
      const { items, truncated } = await listDriveTreeRecursive(accessToken, targetFolder, {
        includeFolders: true,
        maxItems: args?.pageSize || 200,
      });
      return {
        storageType: 'GDRIVE',
        folderId: targetFolder,
        recursive: true,
        truncated,
        configVersion: config.configVersion,
        items,
      };
    }
    const { files, nextPageToken } = await listDriveChildrenPage(accessToken, targetFolder, {
      pageSize: args?.pageSize || 100,
      pageToken: args?.cursor || '',
    });
    return {
      storageType: 'GDRIVE',
      folderId: targetFolder,
      recursive: false,
      nextCursor: nextPageToken || null,
      configVersion: config.configVersion,
      items: files.filter((f) => f.mimeType === 'application/vnd.google-apps.folder' || /\.(md|markdown)$/i.test(f.name)),
    };
  }

  if (name === 'search_workspace') {
    assertSlotPermission(workspaceSlot, 'READ', '작업장 폴더');
    const query = String(args?.query || '').trim();
    const recursive = args?.recursive !== false;
    if (workspaceSlot.storageType === 'LOCAL') {
      const localResult = await dispatchLocalAgentJob(env, record.userId, {
        deviceId: workspaceSlot.deviceId,
        job: { op: 'SEARCH', rootId: workspaceSlot.rootId, query, recursive, maxItems: args?.maxItems || 100 },
      });
      return { ...localResult, configVersion: config.configVersion };
    }
    const accessToken = await requireDriveAccessToken();
    if (recursive) {
      const { items, truncated } = await listDriveTreeRecursive(accessToken, workspaceId, {
        query,
        includeFolders: false,
        maxItems: args?.maxItems || 100,
      });
      return {
        storageType: 'GDRIVE',
        query,
        recursive: true,
        truncated,
        configVersion: config.configVersion,
        searchScope: 'WORKSPACE_RECURSIVE_FILENAME_ONLY',
        contentSearchSupported: false,
        items,
      };
    }
    const files = await listDriveChildren(accessToken, workspaceId, `name contains '${query.replace(/'/g, "\\'")}'`);
    return {
      storageType: 'GDRIVE',
      query,
      recursive: false,
      truncated: false,
      configVersion: config.configVersion,
      searchScope: 'WORKSPACE_ROOT_FILENAME_ONLY',
      contentSearchSupported: false,
      items: files.filter((f) => /\.(md|markdown)$/i.test(f.name)),
    };
  }

  if (name === 'read_markdown') {
    assertSlotPermission(workspaceSlot, 'READ', '작업장 폴더');
    if (workspaceSlot.storageType === 'LOCAL') {
      const localResult = await dispatchLocalAgentJob(env, record.userId, {
        deviceId: workspaceSlot.deviceId,
        job: { op: 'READ', rootId: workspaceSlot.rootId, relativePath: args?.relativePath || args?.fileId || '' },
      });
      return { ...localResult, configVersion: config.configVersion };
    }
    const accessToken = await requireDriveAccessToken();
    const fileId = args?.fileId
      ? String(args.fileId).trim()
      : await resolveDriveFileByPath(accessToken, workspaceId, args?.relativePath);
    await assertDriveDescendant(accessToken, fileId, workspaceId, { allowRoot: false, requireMarkdownFile: true });
    const { meta, text, sha256 } = await readDriveFileText(accessToken, fileId);
    return {
      storageType: 'GDRIVE',
      availability: 'ONLINE',
      fileId: meta.id,
      name: meta.name,
      modifiedTime: meta.modifiedTime,
      sha256,
      configVersion: config.configVersion,
      permissions: workspaceSlot.permissions,
      content: text,
    };
  }

  if (name === 'create_markdown') {
    assertSlotPermission(workspaceSlot, 'WRITE', '작업장 폴더');
    const fileName = String(args?.name || '').trim();
    if (!fileName || /[/\\]/.test(fileName) || fileName.includes('..') || !/\.(md|markdown)$/i.test(fileName)) {
      throw new Error('파일명은 경로 구분자 없이 .md 또는 .markdown으로 끝나야 합니다.');
    }
    if (workspaceSlot.storageType === 'LOCAL') {
      await assertWriteConfigUnchanged(env, record, config, 'WORKSPACE', args?.expectedConfigVersion, verifyPlanFn);
      const localResult = await dispatchLocalAgentJob(env, record.userId, {
        deviceId: workspaceSlot.deviceId,
        job: { op: 'CREATE', rootId: workspaceSlot.rootId, subPath: args?.parentFolderId || '', name: fileName, content: String(args?.content ?? '') },
      });
      return { ...localResult, configVersion: config.configVersion };
    }
    const accessToken = await requireDriveAccessToken();
    const parentId = args?.parentFolderId ? String(args.parentFolderId).trim() : workspaceId;
    await assertDriveDescendant(accessToken, parentId, workspaceId, { allowRoot: true, requireFolder: true });
    const existing = await findDriveFileByName(accessToken, parentId, fileName);
    if (existing) throw new Error(`동일한 이름의 파일이 이미 존재합니다: ${fileName}`);
    await assertWriteConfigUnchanged(env, record, config, 'WORKSPACE', args?.expectedConfigVersion, verifyPlanFn);
    const bodyText = String(args?.content ?? '');
    const created = await createDriveTextFile(accessToken, parentId, fileName, bodyText, 'text/markdown');
    return { storageType: 'GDRIVE', success: true, fileId: created.id, name: created.name, modifiedTime: created.modifiedTime, configVersion: config.configVersion, sha256: await sha256Hex(bodyText) };
  }

  if (name === 'replace_markdown') {
    assertSlotPermission(workspaceSlot, 'WRITE', '작업장 폴더');
    const expectedSha256 = String(args?.expectedSha256 || '').trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(expectedSha256)) {
      throw new Error('동시 수정 충돌 방지를 위해 유효한 expectedSha256(64자리 SHA-256 해시)을 함께 전달해 주세요.');
    }
    if (workspaceSlot.storageType === 'LOCAL') {
      await assertWriteConfigUnchanged(env, record, config, 'WORKSPACE', args?.expectedConfigVersion, verifyPlanFn);
      const localResult = await dispatchLocalAgentJob(env, record.userId, {
        deviceId: workspaceSlot.deviceId,
        job: { op: 'REPLACE', rootId: workspaceSlot.rootId, relativePath: args?.relativePath || args?.fileId || '', content: String(args?.content ?? ''), expectedSha256 },
      });
      return { ...localResult, configVersion: config.configVersion };
    }
    const accessToken = await requireDriveAccessToken();
    const fileId = String(args?.fileId || '').trim();
    if (!fileId) throw new Error('fileId를 지정하세요.');
    await assertDriveDescendant(accessToken, fileId, workspaceId, { allowRoot: false, requireMarkdownFile: true });
    const current = await readDriveFileText(accessToken, fileId);
    if (current.sha256 !== expectedSha256) {
      throw new Error('문서가 조회 후 변경되었습니다. 다시 읽은 뒤 수정해 주세요.');
    }
    await assertWriteConfigUnchanged(env, record, config, 'WORKSPACE', args?.expectedConfigVersion, verifyPlanFn);
    const nextContent = String(args?.content ?? '');
    const updated = await updateDriveTextFile(accessToken, fileId, nextContent, 'text/markdown');
    return { storageType: 'GDRIVE', success: true, fileId: updated.id, name: updated.name, modifiedTime: updated.modifiedTime, configVersion: config.configVersion, sha256: await sha256Hex(nextContent) };
  }

  if (name === 'edit_markdown_section') {
    assertSlotPermission(workspaceSlot, 'WRITE', '작업장 폴더');
    const expectedSha256 = String(args?.expectedSha256 || '').trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(expectedSha256)) {
      throw new Error('동시 수정 충돌 방지를 위해 유효한 expectedSha256(64자리 SHA-256 해시)을 함께 전달해 주세요.');
    }
    if (workspaceSlot.storageType === 'LOCAL') {
      await assertWriteConfigUnchanged(env, record, config, 'WORKSPACE', args?.expectedConfigVersion, verifyPlanFn);
      const localResult = await dispatchLocalAgentJob(env, record.userId, {
        deviceId: workspaceSlot.deviceId,
        job: {
          op: 'EDIT_SECTION',
          rootId: workspaceSlot.rootId,
          relativePath: args?.relativePath || args?.fileId || '',
          expectedSha256,
          targetHeading: args?.targetHeading,
          oldText: args?.oldText,
          newText: args?.newText,
        },
      });
      return { ...localResult, configVersion: config.configVersion };
    }
    const accessToken = await requireDriveAccessToken();
    const fileId = String(args?.fileId || '').trim();
    if (!fileId) throw new Error('fileId를 지정하세요.');
    await assertDriveDescendant(accessToken, fileId, workspaceId, { allowRoot: false, requireMarkdownFile: true });
    const current = await readDriveFileText(accessToken, fileId);
    if (current.sha256 !== expectedSha256) {
      throw new Error('문서가 조회 후 변경되었습니다. 다시 읽은 뒤 수정해 주세요.');
    }
    const nextContent = applyMarkdownSectionEdit(current.text, {
      targetHeading: args?.targetHeading,
      oldText: args?.oldText,
      newText: args?.newText,
    });
    await assertWriteConfigUnchanged(env, record, config, 'WORKSPACE', args?.expectedConfigVersion, verifyPlanFn);
    const updated = await updateDriveTextFile(accessToken, fileId, nextContent, 'text/markdown');
    return { storageType: 'GDRIVE', success: true, fileId: updated.id, name: updated.name, modifiedTime: updated.modifiedTime, configVersion: config.configVersion, sha256: await sha256Hex(nextContent) };
  }

  const isResourceWriteTool = name === 'create_ai_template' || name === 'update_ai_template' || name === 'delete_ai_template' || name === 'delete_style_profile';
  assertSlotPermission(resourceSlot, isResourceWriteTool ? 'WRITE' : 'READ', '리소스 폴더');
  if (isResourceWriteTool) {
    await assertWriteConfigUnchanged(env, record, config, 'RESOURCE', args?.expectedConfigVersion, verifyPlanFn);
  }
  const accessToken = await requireDriveAccessToken();

  if (name === 'list_ai_templates') {
    const kind = args?.kind;
    const kinds = kind ? [kind] : ['preset', 'prompt'];
    const items = [];
    for (const k of kinds) {
      const fileName = k === 'preset' ? 'ai_presets.json' : 'ai_prompts.json';
      const loaded = await loadDriveJson(accessToken, resourceId, 'prompt', fileName, k === 'preset' ? [] : {});
      if (k === 'preset' && Array.isArray(loaded.data)) {
        for (let i = 0; i < loaded.data.length; i++) {
          const row = loaded.data[i];
          items.push({ kind: 'preset', id: String(row.id || `preset-${i}`), name: String(row.name || ''), folder: String(row.folder || ''), sha256: loaded.sha256 });
        }
      } else if (k === 'prompt' && loaded.data && typeof loaded.data === 'object') {
        for (const [domain, group] of Object.entries(loaded.data)) {
          for (const docType of Object.keys(group || {})) {
            items.push({ kind: 'prompt', domain, docType, name: docType, sha256: loaded.sha256 });
          }
        }
      }
    }
    const needle = String(args?.query || '').trim().toLowerCase();
    const filtered = needle ? items.filter((it) => `${it.name} ${it.folder || ''} ${it.domain || ''}`.toLowerCase().includes(needle)) : items;
    return { items: filtered, total: filtered.length };
  }

  if (name === 'get_ai_template') {
    const kind = args?.kind || 'preset';
    const fileName = kind === 'preset' ? 'ai_presets.json' : 'ai_prompts.json';
    const loaded = await loadDriveJson(accessToken, resourceId, 'prompt', fileName, kind === 'preset' ? [] : {});
    if (kind === 'preset') {
      const row = loaded.data.find((r, i) => String(r.id || `preset-${i}`) === args?.id);
      if (!row) throw new Error('해당 AI 프리셋을 찾지 못했습니다.');
      return { kind: 'preset', id: args.id, name: row.name, folder: row.folder || '', prompt: row.editorialCommand || row.systemPrompt || '', sha256: loaded.sha256 };
    }
    const row = loaded.data?.[args?.domain]?.[args?.docType];
    if (!row) throw new Error('해당 문서 템플릿을 찾지 못했습니다.');
    return { kind: 'prompt', domain: args.domain, docType: args.docType, systemPrompt: row.systemPrompt, userInputTemplate: row.userInputTemplate, sha256: loaded.sha256 };
  }

  if (name === 'create_ai_template') {
    const kind = args?.kind || 'preset';
    const fileName = kind === 'preset' ? 'ai_presets.json' : 'ai_prompts.json';
    const loaded = await loadDriveJson(accessToken, resourceId, 'prompt', fileName, kind === 'preset' ? [] : {}, true);
    if (kind === 'preset') {
      const id = `preset-${crypto.randomUUID()}`;
      const next = [...loaded.data, { id, name: String(args.name).trim(), folder: String(args.folder || 'AI작성').trim(), editorialCommand: String(args.prompt).trim(), createdAt: new Date().toISOString() }];
      const newSha = await saveDriveJson(accessToken, loaded.folderId, loaded.fileId, fileName, next);
      return { success: true, kind: 'preset', id, name: args.name, sha256: newSha };
    }
    const domain = String(args.domain || '일반').trim();
    const docType = String(args.docType || args.name).trim();
    const next = structuredClone(loaded.data);
    if (!next[domain]) next[domain] = {};
    next[domain][docType] = { systemPrompt: String(args.systemPrompt || args.prompt).trim(), userInputTemplate: String(args.userInputTemplate || '입력 내용을 작성하세요.').trim() };
    const newSha = await saveDriveJson(accessToken, loaded.folderId, loaded.fileId, fileName, next);
    return { success: true, kind: 'prompt', domain, docType, sha256: newSha };
  }

  if (name === 'update_ai_template') {
    const kind = args?.kind || 'preset';
    const fileName = kind === 'preset' ? 'ai_presets.json' : 'ai_prompts.json';
    const loaded = await loadDriveJson(accessToken, resourceId, 'prompt', fileName, kind === 'preset' ? [] : {});
    if (loaded.sha256 !== String(args.expectedSha256).toLowerCase()) throw new Error('AI 템플릿이 조회 후 변경되었습니다.');
    if (kind === 'preset') {
      const idx = loaded.data.findIndex((r, i) => String(r.id || `preset-${i}`) === args?.id);
      if (idx < 0) throw new Error('수정할 프리셋을 찾지 못했습니다.');
      const next = [...loaded.data];
      next[idx] = { ...next[idx], ...(args.name !== undefined ? { name: args.name } : {}), ...(args.folder !== undefined ? { folder: args.folder } : {}), ...(args.prompt !== undefined ? { editorialCommand: args.prompt } : {}), updatedAt: new Date().toISOString() };
      const newSha = await saveDriveJson(accessToken, loaded.folderId, loaded.fileId, fileName, next);
      return { success: true, kind: 'preset', id: args.id, sha256: newSha };
    }
    if (!loaded.data?.[args.domain]?.[args.docType]) throw new Error('수정할 문서 템플릿을 찾지 못했습니다.');
    const next = structuredClone(loaded.data);
    if (args.systemPrompt !== undefined || args.prompt !== undefined) next[args.domain][args.docType].systemPrompt = String(args.systemPrompt ?? args.prompt);
    if (args.userInputTemplate !== undefined) next[args.domain][args.docType].userInputTemplate = String(args.userInputTemplate);
    const newSha = await saveDriveJson(accessToken, loaded.folderId, loaded.fileId, fileName, next);
    return { success: true, kind: 'prompt', domain: args.domain, docType: args.docType, sha256: newSha };
  }

  if (name === 'delete_ai_template') {
    const kind = args?.kind || 'preset';
    const fileName = kind === 'preset' ? 'ai_presets.json' : 'ai_prompts.json';
    const loaded = await loadDriveJson(accessToken, resourceId, 'prompt', fileName, kind === 'preset' ? [] : {});
    if (loaded.sha256 !== String(args.expectedSha256).toLowerCase()) throw new Error('AI 템플릿이 조회 후 변경되었습니다.');
    if (kind === 'preset') {
      const next = loaded.data.filter((r, i) => String(r.id || `preset-${i}`) !== args?.id);
      if (next.length === loaded.data.length) throw new Error('삭제할 프리셋을 찾지 못했습니다.');
      const newSha = await saveDriveJson(accessToken, loaded.folderId, loaded.fileId, fileName, next);
      return { success: true, kind: 'preset', id: args.id, sha256: newSha };
    }
    if (!loaded.data?.[args.domain]?.[args.docType]) throw new Error('삭제할 문서 템플릿을 찾지 못했습니다.');
    const next = structuredClone(loaded.data);
    delete next[args.domain][args.docType];
    const newSha = await saveDriveJson(accessToken, loaded.folderId, loaded.fileId, fileName, next);
    return { success: true, kind: 'prompt', domain: args.domain, docType: args.docType, sha256: newSha };
  }

  if (name === 'list_style_profiles') {
    const loaded = await loadDriveJson(accessToken, resourceId, 'profiles', 'userCssProfiles.json', []);
    return {
      sha256: loaded.sha256,
      userProfiles: (Array.isArray(loaded.data) ? loaded.data : []).map(({ id, name: pName, description }) => ({ id, name: pName, description })),
    };
  }

  if (name === 'delete_style_profile') {
    const loaded = await loadDriveJson(accessToken, resourceId, 'profiles', 'userCssProfiles.json', []);
    if (loaded.sha256 !== String(args.expectedSha256).toLowerCase()) throw new Error('서식 파일이 조회 후 변경되었습니다.');
    const list = Array.isArray(loaded.data) ? loaded.data : [];
    const next = list.filter((p) => p.id !== args.profileId);
    if (next.length === list.length) throw new Error('삭제할 사용자 서식을 찾지 못했습니다.');
    const newSha = await saveDriveJson(accessToken, loaded.folderId, loaded.fileId, 'userCssProfiles.json', next);
    return { success: true, deletedId: args.profileId, sha256: newSha };
  }

  throw new Error(`알 수 없는 도구입니다: ${name}`);
}

/**
 * ========================================================================================
 * [함수명] onRequestPost - Streamable HTTP MCP JSON-RPC 2.0 요청을 처리합니다.
 * ========================================================================================
 */
export async function onRequestPost({ request, env }) {
  let reqId = null;
  try {
    const message = await request.json().catch(() => null);
    if (!message || message.jsonrpc !== '2.0') {
      return rpcError(null, -32600, 'Invalid JSON-RPC request.', 400);
    }
    reqId = message.id ?? null;
    const { method, params = {} } = message;

    if (method === 'initialize') {
      return rpcReply(reqId, {
        protocolVersion: params.protocolVersion ?? '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'onrivi-author-web', version: '1.0.0' },
      });
    }
    if (method === 'ping') return rpcReply(reqId, {});
    if (method === 'tools/list') return rpcReply(reqId, { tools: TOOLS });

    if (method === 'tools/call') {
      const auth = request.headers.get('Authorization') || '';
      const rawToken = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
      if (!rawToken.startsWith('onrivi_mcp_')) {
        console.warn('[ClientWarn] HTTP 401 · MCP_AUTH_MISSING · 유효한 온리비 MCP Bearer 토큰이 필요합니다. [경로: /api/mcp]');
        return rpcReply(reqId, { isError: true, content: [{ type: 'text', text: '인증 오류: 유효한 온리비 MCP 토큰(Authorization: Bearer onrivi_mcp_...)이 필요합니다.' }] });
      }
      const tokenHash = await sha256Hex(rawToken);
      const record = await getMcpTokenByHash(env, tokenHash);
      if (!record?.userId) {
        return rpcReply(reqId, { isError: true, content: [{ type: 'text', text: '인증 오류: 폐기되었거나 유효하지 않은 MCP 토큰입니다.' }] });
      }
      const paidSub = await verifyActivePaidPlan(env, record.userId);
      if (!paidSub) {
        return rpcReply(reqId, { isError: true, content: [{ type: 'text', text: '권한 오류: 활성 유료 요금제 구독이 확인되지 않아 MCP 도구를 실행할 수 없습니다.' }] });
      }
      try {
        const result = await executeTool(params.name, params.arguments || {}, { env, record, paidSub });
        return rpcReply(reqId, {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
        });
      } catch (toolError) {
        console.warn('[Remote MCP ToolWarn]', {
          file: 'functions/api/mcp/index.js',
          func: 'executeTool',
          doing: `원격 MCP 도구(${params.name}) 실행 중`,
          target: record.userId,
          error: toolError?.message || '도구 실행 실패',
        });
        return rpcReply(reqId, {
          isError: true,
          content: [{ type: 'text', text: toolError?.message || '도구 실행에 실패했습니다.' }],
        });
      }
    }

    return rpcError(reqId, -32601, 'Method not found.');
  } catch (error) {
    console.error('[Remote MCP Error]', error);
    return rpcError(reqId, -32603, '원격 MCP 요청 처리 중 오류가 발생했습니다.', 500);
  }
}
