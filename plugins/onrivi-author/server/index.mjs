// ====================================================================
// 📊 [OMD-MCP-SERVER-0001] plugins/onrivi-author/server/index.mjs
// 🎯 @KICK  : 온리비 어서 PC 하이브리드 MCP 서버 진입점 (로컬 OS 폴더 + Google Drive 명령어 동적 전환)
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Rule 2(코드값 대문자 통일), Rule 9(임의 폴백 원천 금지), 원자적 I/O
// 🚨 @PATCH : 2026-11-19 — [리소스 폴더 표준 스캐폴드 자동 생성 연동] set_mcp_resource_folder 실행 시 생성된 하위 폴더/기본 설정 파일 요약(scaffold) 응답 포함
// 🚨 @PATCH : 2026-11-19 — [PC 하이브리드 MCP 전환] 중계 서버 없이 PC MCP 단일 진입점에서 로컬 OS ↔ Google Drive 작업장·리소스 폴더 동적 전환(get_mcp_connection_status, get_mcp_folders, list_mcp_folder_candidates, set_mcp_workspace, set_mcp_resource_folder, clear_mcp_folder) 구현
// 🚨 @PATCH : 2026-11-16 — [AI/서식 템플릿 CRUD 완성] delete_style_profile, update_ai_template, delete_ai_template MCP 도구 등록
// 🚨 @PATCH : 2026-10-31 — [AI 프롬프트 템플릿 신규 등록 create_ai_template MCP 도구 등록 및 디스패치 연동]
// 🔗 @CALLS : ./documents.mjs, ./profiles.mjs, ./context.mjs, ./authorization.mjs, ./workspace.mjs, ./ai-templates.mjs, ./remote-client.mjs
// ====================================================================
import { readDocument, replaceDocument, editMarkdownSection } from './documents.mjs';
import { listProfiles, createProfile, updateProfile, deleteProfile } from './profiles.mjs';
import {
  STORAGE_TYPE,
  FOLDER_ROLE,
  getCurrentFolders,
  setLocalFolder,
  setGdriveFolder,
  clearMcpFolder,
  requireWorkspaceContext,
  requireResourceContext,
} from './context.mjs';
import { requireMcpAccess } from './authorization.mjs';
import { listWorkspaceFiles, searchWorkspace, createMarkdown } from './workspace.mjs';
import { listAITemplates, getAITemplate, executeAITemplate, createAITemplate, updateAITemplate, deleteAITemplate } from './ai-templates.mjs';
import { callRemoteMcpTool, getRemoteMcpConfig } from './remote-client.mjs';

const tools = [
  {
    name: 'get_mcp_connection_status',
    description: '현재 PC 하이브리드 MCP 연결 상태, 계정·구독, Google Drive 연결 여부 및 현재 설정된 작업장·리소스 폴더(LOCAL/GDRIVE)를 실시간 조회합니다.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_mcp_folders',
    description: '현재 설정된 작업장·리소스 폴더(LOCAL 경로 또는 GDRIVE 폴더 ID)와 설정 버전(configVersion), contextSha256을 조회합니다.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_mcp_folder_candidates',
    description: 'Google Drive에서 작업장 또는 리소스 폴더로 등록할 수 있는 폴더 후보 목록을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', maxLength: 100, description: '폴더 이름 검색어 (선택)' },
        parentFolderId: { type: 'string', description: '특정 상위 폴더 하위만 조회할 때 지정 (선택)' },
        pageSize: { type: 'integer', minimum: 1, maximum: 100, description: '조회 개수 (기본 50)' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'set_mcp_workspace',
    description: '작업장 폴더를 로컬 PC 절대경로(storageType="LOCAL", path) 또는 Google Drive 폴더(storageType="GDRIVE", folderId)로 즉시 변경합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        storageType: { type: 'string', enum: ['LOCAL', 'GDRIVE'], description: '저장소 유형 (LOCAL 또는 GDRIVE). 생략 시 path가 있으면 LOCAL, folderId가 있으면 GDRIVE로 자동 판별' },
        path: { type: 'string', description: 'LOCAL일 때 지정할 로컬 PC 절대경로 (예: D:\\Onrivi_mcp)' },
        folderId: { type: 'string', description: 'GDRIVE일 때 지정할 Google Drive 폴더 ID' },
        folderName: { type: 'string', description: 'GDRIVE일 때 표시할 폴더 이름 (선택)' },
        permissions: { type: 'array', items: { type: 'string', enum: ['READ', 'WRITE'] }, description: 'GDRIVE일 때 허용할 권한 (선택)' },
        expectedConfigVersion: { type: 'integer', minimum: 1, description: '선택 사항. 동시 변경 방지용 configVersion' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'set_mcp_resource_folder',
    description: '리소스 폴더(서식·AI 템플릿·에셋)를 로컬 PC 절대경로(storageType="LOCAL", path) 또는 Google Drive 폴더(storageType="GDRIVE", folderId)로 즉시 변경합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        storageType: { type: 'string', enum: ['LOCAL', 'GDRIVE'], description: '저장소 유형 (LOCAL 또는 GDRIVE). 생략 시 path가 있으면 LOCAL, folderId가 있으면 GDRIVE로 자동 판별' },
        path: { type: 'string', description: 'LOCAL일 때 지정할 로컬 PC 절대경로 (예: D:\\Onrivi_mcp\\asset)' },
        folderId: { type: 'string', description: 'GDRIVE일 때 지정할 Google Drive 폴더 ID' },
        folderName: { type: 'string', description: 'GDRIVE일 때 표시할 폴더 이름 (선택)' },
        permissions: { type: 'array', items: { type: 'string', enum: ['READ', 'WRITE'] }, description: 'GDRIVE일 때 허용할 권한 (선택)' },
        expectedConfigVersion: { type: 'integer', minimum: 1, description: '선택 사항. 동시 변경 방지용 configVersion' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'clear_mcp_folder',
    description: '현재 설정된 작업장(WORKSPACE) 또는 리소스 폴더(RESOURCE) 연결을 해제합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['WORKSPACE', 'RESOURCE'], description: '해제할 폴더 역할' },
        expectedConfigVersion: { type: 'integer', minimum: 1, description: '선택 사항. 동시 변경 방지용 configVersion' },
      },
      required: ['role'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_current_folders',
    description: '(호환용) 현재 작업장과 리소스 폴더 설정 및 컨텍스트 SHA-256을 조회합니다.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'read_markdown',
    description: '마크다운 파일을 읽고 내용과 SHA-256 값을 반환합니다. LOCAL 작업장은 path(절대경로), GDRIVE 작업장은 fileId를 사용합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'LOCAL일 때 마크다운 파일의 절대경로' },
        fileId: { type: 'string', description: 'GDRIVE일 때 Google Drive 파일 ID' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'replace_markdown',
    description: '이전에 읽은 SHA-256 값이 현재 파일과 같을 때만 마크다운 파일의 전체 내용을 교체합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'LOCAL일 때 마크다운 파일의 절대경로' },
        fileId: { type: 'string', description: 'GDRIVE일 때 Google Drive 파일 ID' },
        expectedSha256: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['expectedSha256', 'content'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_style_profiles',
    description: '현재 리소스 폴더(LOCAL 또는 GDRIVE)에서 서식 목록과 변경 확인용 SHA-256 값을 조회합니다.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'create_style_profile',
    description: '로컬 리소스 폴더의 기존 서식을 복제해 새 사용자 서식을 만듭니다.',
    inputSchema: {
      type: 'object',
      properties: {
        expectedContextSha256: { type: 'string', description: 'get_current_folders 또는 list_style_profiles에서 받은 컨텍스트 SHA-256' },
        expectedSha256: { type: 'string' },
        baseProfileId: { type: 'string', description: 'list_style_profiles에서 확인한 복제할 서식 ID' },
        name: { type: 'string' },
        description: { type: 'string' },
        pageStyle: { type: 'object', description: '선택 사항. 기본 서식에서 바꿀 페이지 속성', additionalProperties: { type: 'string' } },
        rules: { type: 'object', description: '선택 사항. 태그별 CSS 속성', additionalProperties: { type: 'object', additionalProperties: { type: 'string' } } },
      },
      required: ['expectedContextSha256', 'expectedSha256', 'baseProfileId', 'name'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_workspace_files',
    description: '현재 작업장(LOCAL 또는 GDRIVE)의 마크다운 파일을 페이지별로 조회합니다.',
    inputSchema: { type: 'object', properties: { cursor: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 100 } }, additionalProperties: false },
  },
  {
    name: 'search_workspace',
    description: '현재 작업장(LOCAL 또는 GDRIVE)의 마크다운 파일명과 본문을 검색합니다.',
    inputSchema: { type: 'object', properties: { query: { type: 'string', minLength: 2, maxLength: 100 }, cursor: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 30 } }, required: ['query'], additionalProperties: false },
  },
  {
    name: 'create_markdown',
    description: '현재 작업장(LOCAL 또는 GDRIVE)에 새 마크다운 문서를 만듭니다. 기존 파일은 덮어쓰지 않습니다.',
    inputSchema: {
      type: 'object',
      properties: {
        relativePath: { type: 'string', description: 'LOCAL일 때 작업장 기준 새 파일 상대경로' },
        fileName: { type: 'string', description: 'GDRIVE일 때 생성할 파일명 (예: 문서.md)' },
        content: { type: 'string' },
        expectedContextSha256: { type: 'string', description: 'LOCAL일 때 get_current_folders에서 받은 컨텍스트 SHA-256' },
      },
      required: ['content'],
      additionalProperties: false,
    },
  },
  {
    name: 'edit_markdown_section',
    description: '고유한 마크다운 제목 아래에서 지정한 기존 문구를 한 번만 교체합니다. read_markdown의 SHA-256이 필요합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'LOCAL일 때 마크다운 파일 절대경로' },
        fileId: { type: 'string', description: 'GDRIVE일 때 Google Drive 파일 ID' },
        expectedSha256: { type: 'string' },
        heading: { type: 'string' },
        oldText: { type: 'string' },
        newText: { type: 'string' },
      },
      required: ['expectedSha256', 'heading', 'oldText', 'newText'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_style_profile',
    description: '로컬 리소스 폴더의 기존 사용자 서식을 수정합니다. 시스템 서식은 수정할 수 없습니다.',
    inputSchema: {
      type: 'object',
      properties: {
        expectedContextSha256: { type: 'string' },
        expectedSha256: { type: 'string' },
        profileId: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        pageStyle: { type: 'object', additionalProperties: { type: 'string' } },
        rules: { type: 'object', additionalProperties: { type: 'object', additionalProperties: { type: 'string' } } },
      },
      required: ['expectedContextSha256', 'expectedSha256', 'profileId'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_ai_templates',
    description: '현재 리소스 폴더(LOCAL 또는 GDRIVE)의 AI 프리셋과 문서 프롬프트 목록을 조회합니다.',
    inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['preset', 'prompt'] }, query: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 100 }, offset: { type: 'integer', minimum: 0 } }, additionalProperties: false },
  },
  {
    name: 'get_ai_template',
    description: 'AI 템플릿 본문과 변경 확인용 SHA-256을 열람합니다.',
    inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['preset', 'prompt'] }, id: { type: 'string' }, domain: { type: 'string' }, docType: { type: 'string' } }, required: ['kind'], additionalProperties: false },
  },
  {
    name: 'execute_ai_template',
    description: '로컬 리소스 폴더의 AI 템플릿에 입력값을 적용해 즉시 실행할 프롬프트를 반환합니다.',
    inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['preset', 'prompt'] }, id: { type: 'string' }, domain: { type: 'string' }, docType: { type: 'string' }, expectedSha256: { type: 'string' }, values: { type: 'object', additionalProperties: { type: 'string' } }, input: { type: 'string' } }, required: ['kind', 'expectedSha256'], additionalProperties: false },
  },
  {
    name: 'create_ai_template',
    description: '작성한 AI 프롬프트를 현재 리소스 폴더(LOCAL 또는 GDRIVE)의 AI 프리셋 또는 문서 템플릿으로 신규 등록합니다.',
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
        expectedSha256: { type: 'string' },
      },
      required: ['name', 'prompt'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_ai_template',
    description: '기존 AI 프리셋 또는 분야별 문서 템플릿의 내용을 수정합니다.',
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
    description: '기존 AI 프리셋 또는 분야별 문서 템플릿을 삭제합니다.',
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
    name: 'delete_style_profile',
    description: '사용자 정의 서식 프로필을 삭제합니다. 시스템 기본 서식은 삭제할 수 없습니다.',
    inputSchema: {
      type: 'object',
      properties: {
        expectedContextSha256: { type: 'string' },
        expectedSha256: { type: 'string' },
        profileId: { type: 'string' },
      },
      required: ['profileId'],
      additionalProperties: false,
    },
  },
];

function reply(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}

function error(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}

/**
 * ========================================================================================
 * [함수명] resolveAllowedLocalRoots - 현재 설정된 작업장·리소스 중 LOCAL 경로 목록을 추출합니다.
 *
 * @param {object} context - getCurrentFolders() 결과 객체
 * @returns {string[]} 허용된 로컬 절대경로 배열
 * ==========================================================================================
 */
function resolveAllowedLocalRoots(context) {
  const roots = [];
  if (context.workspace?.configured && context.workspace.storageType === STORAGE_TYPE.LOCAL && context.workspace.path) {
    roots.push(context.workspace.path);
  }
  if (context.resource?.configured && context.resource.storageType === STORAGE_TYPE.LOCAL && context.resource.path) {
    roots.push(context.resource.path);
  }
  return roots;
}

/**
 * ========================================================================================
 * [함수명] handleSetFolder - set_mcp_workspace / set_mcp_resource_folder 요청을 LOCAL 또는 GDRIVE로 처리합니다.
 *
 * @param {'WORKSPACE'|'RESOURCE'} role - 변경할 폴더 역할
 * @param {object} args - 도구 인자 객체
 * @returns {Promise<object>} 갱신된 폴더 설정 결과
 * ==========================================================================================
 */
async function handleSetFolder(role, args = {}) {
  const explicitType = args.storageType ? String(args.storageType).toUpperCase() : '';
  const storageType = explicitType || (args.path ? STORAGE_TYPE.LOCAL : args.folderId ? STORAGE_TYPE.GDRIVE : '');
  if (storageType !== STORAGE_TYPE.LOCAL && storageType !== STORAGE_TYPE.GDRIVE) {
    throw new Error('로컬 폴더는 path, Google Drive 폴더는 folderId를 지정해 주세요.');
  }

  if (storageType === STORAGE_TYPE.LOCAL) {
    const updated = await setLocalFolder(role, args.path, args.expectedConfigVersion);
    return {
      updatedRole: role,
      storageType: STORAGE_TYPE.LOCAL,
      configVersion: updated.configVersion,
      contextSha256: updated.contextSha256,
      workspace: updated.workspace,
      resource: updated.resource,
      ...(updated.scaffold ? { scaffold: updated.scaffold } : {}),
      updatedAt: updated.updatedAt,
    };
  }

  // GDRIVE: 원격 웹 MCP에 동기화한 뒤 로컬 영구 상태에도 반영
  const remoteTool = role === FOLDER_ROLE.WORKSPACE ? 'set_mcp_workspace' : 'set_mcp_resource_folder';
  const remoteFolders = await callRemoteMcpTool('get_mcp_folders', {});
  const remoteResult = await callRemoteMcpTool(remoteTool, {
    storageType: STORAGE_TYPE.GDRIVE,
    folderId: args.folderId,
    expectedConfigVersion: remoteFolders.configVersion ?? 1,
    ...(Array.isArray(args.permissions) ? { permissions: args.permissions } : {}),
  });
  const remoteSlot = role === FOLDER_ROLE.WORKSPACE ? remoteResult.workspace : remoteResult.resource;
  const updated = await setGdriveFolder(
    role,
    {
      folderId: args.folderId,
      folderName: remoteSlot?.folderName || args.folderName || args.folderId,
    },
    args.expectedConfigVersion,
  );
  return {
    updatedRole: role,
    storageType: STORAGE_TYPE.GDRIVE,
    configVersion: updated.configVersion,
    contextSha256: updated.contextSha256,
    workspace: updated.workspace,
    resource: updated.resource,
    updatedAt: updated.updatedAt,
  };
}

/**
 * ========================================================================================
 * [함수명] executeToolCall - 인증 통과 후 각 MCP 도구 요청을 LOCAL 또는 GDRIVE 백엔드로 라우팅 실행합니다.
 *
 * @param {string} name - 호출된 MCP 도구명
 * @param {object} args - 도구 인자 객체
 * @returns {Promise<object|null>} 도구 실행 결과 (알 수 없는 도구면 null)
 * ==========================================================================================
 */
async function executeToolCall(name, args = {}) {
  if (name === 'get_mcp_connection_status') {
    const ctx = await requireMcpAccess({ forceRefresh: true });
    const remote = getRemoteMcpConfig();
    return {
      mode: 'PC_HYBRID',
      connectionId: ctx.auth.connectionId,
      clientName: ctx.auth.clientName,
      authMode: ctx.auth.authMode,
      accountStatus: ctx.auth.accountStatus,
      planName: ctx.auth.planName,
      planStatus: ctx.auth.planStatus,
      driveStatus: ctx.auth.driveStatus,
      remoteConfigured: remote.configured,
      configVersion: ctx.configVersion,
      contextSha256: ctx.contextSha256,
      workspace: ctx.workspace,
      resource: ctx.resource,
      updatedAt: ctx.updatedAt,
    };
  }

  const authContext = await requireMcpAccess();

  if (name === 'get_mcp_folders') {
    return {
      configVersion: authContext.configVersion,
      contextSha256: authContext.contextSha256,
      workspace: authContext.workspace,
      resource: authContext.resource,
      updatedAt: authContext.updatedAt,
    };
  }

  if (name === 'get_current_folders') {
    return authContext;
  }

  if (name === 'list_mcp_folder_candidates') {
    return callRemoteMcpTool('list_mcp_folder_candidates', args);
  }

  if (name === 'set_mcp_workspace') {
    return handleSetFolder(FOLDER_ROLE.WORKSPACE, args);
  }

  if (name === 'set_mcp_resource_folder') {
    return handleSetFolder(FOLDER_ROLE.RESOURCE, args);
  }

  if (name === 'clear_mcp_folder') {
    const updated = await clearMcpFolder(args.role, args.expectedConfigVersion);
    return {
      clearedRole: String(args.role || '').toUpperCase(),
      configVersion: updated.configVersion,
      contextSha256: updated.contextSha256,
      workspace: updated.workspace,
      resource: updated.resource,
      updatedAt: updated.updatedAt,
    };
  }

  if (name === 'list_workspace_files') {
    const ctx = await requireWorkspaceContext();
    if (ctx.workspace.storageType === STORAGE_TYPE.GDRIVE) {
      return callRemoteMcpTool('list_workspace_files', args);
    }
    return listWorkspaceFiles(ctx.workspace.path, args);
  }

  if (name === 'search_workspace') {
    const ctx = await requireWorkspaceContext();
    if (ctx.workspace.storageType === STORAGE_TYPE.GDRIVE) {
      return callRemoteMcpTool('search_workspace', args);
    }
    return searchWorkspace(ctx.workspace.path, args);
  }

  if (name === 'create_markdown') {
    const ctx = await requireWorkspaceContext(args.expectedContextSha256);
    if (ctx.workspace.storageType === STORAGE_TYPE.GDRIVE) {
      return callRemoteMcpTool('create_markdown', {
        fileName: args.fileName || args.relativePath,
        content: args.content,
      });
    }
    const targetRelative = args.relativePath || args.fileName;
    return createMarkdown(ctx.workspace.path, { ...args, relativePath: targetRelative }, async () => {
      await requireMcpAccess();
      await requireWorkspaceContext(ctx.contextSha256);
    });
  }

  if (name === 'read_markdown') {
    const ctx = await requireWorkspaceContext();
    if (args.fileId || ctx.workspace.storageType === STORAGE_TYPE.GDRIVE) {
      return callRemoteMcpTool('read_markdown', { fileId: args.fileId || args.path });
    }
    return readDocument(args.path, resolveAllowedLocalRoots(ctx));
  }

  if (name === 'replace_markdown') {
    const ctx = await requireWorkspaceContext();
    if (args.fileId || ctx.workspace.storageType === STORAGE_TYPE.GDRIVE) {
      return callRemoteMcpTool('replace_markdown', {
        fileId: args.fileId || args.path,
        expectedSha256: args.expectedSha256,
        content: args.content,
      });
    }
    const roots = resolveAllowedLocalRoots(ctx);
    return replaceDocument(args.path, args.expectedSha256, args.content, roots, async () => {
      await requireMcpAccess();
      await requireWorkspaceContext(ctx.contextSha256);
    });
  }

  if (name === 'edit_markdown_section') {
    const ctx = await requireWorkspaceContext();
    if (args.fileId || ctx.workspace.storageType === STORAGE_TYPE.GDRIVE) {
      return callRemoteMcpTool('edit_markdown_section', {
        fileId: args.fileId || args.path,
        expectedSha256: args.expectedSha256,
        heading: args.heading,
        oldText: args.oldText,
        newText: args.newText,
      });
    }
    const roots = resolveAllowedLocalRoots(ctx);
    return editMarkdownSection(
      args.path,
      args.expectedSha256,
      args.heading,
      args.oldText,
      args.newText,
      roots,
      async () => {
        await requireMcpAccess();
        await requireWorkspaceContext(ctx.contextSha256);
      },
    );
  }

  if (name === 'list_style_profiles') {
    const ctx = await requireResourceContext();
    if (ctx.resource.storageType === STORAGE_TYPE.GDRIVE) {
      return callRemoteMcpTool('list_style_profiles', {});
    }
    return { ...ctx, ...(await listProfiles(ctx.resource.path)) };
  }

  if (name === 'create_style_profile') {
    const ctx = await requireResourceContext(args.expectedContextSha256);
    if (ctx.resource.storageType !== STORAGE_TYPE.LOCAL) {
      throw new Error('create_style_profile은 현재 LOCAL 리소스 폴더에서만 지원됩니다.');
    }
    if (!/^[a-f0-9]{64}$/i.test(args.expectedContextSha256 ?? '')) {
      throw new Error('현재 폴더 조회에서 받은 컨텍스트 SHA-256 값이 필요합니다.');
    }
    return createProfile({ ...args, resourceFolder: ctx.resource.path }, async () => {
      await requireMcpAccess();
      const latest = await requireResourceContext(args.expectedContextSha256);
      if (latest.resource.path !== ctx.resource.path) throw new Error('리소스 폴더가 변경되었습니다. 다시 조회해 주세요.');
    });
  }

  if (name === 'update_style_profile') {
    const ctx = await requireResourceContext(args.expectedContextSha256);
    if (ctx.resource.storageType !== STORAGE_TYPE.LOCAL) {
      throw new Error('update_style_profile은 현재 LOCAL 리소스 폴더에서만 지원됩니다.');
    }
    if (!/^[a-f0-9]{64}$/i.test(args.expectedContextSha256 ?? '')) {
      throw new Error('현재 폴더 조회에서 받은 컨텍스트 SHA-256 값이 필요합니다.');
    }
    return updateProfile({ ...args, resourceFolder: ctx.resource.path }, async () => {
      await requireMcpAccess();
      const latest = await requireResourceContext(ctx.contextSha256);
      if (latest.resource.path !== ctx.resource.path) throw new Error('리소스 폴더가 변경되었습니다. 다시 조회해 주세요.');
    });
  }

  if (name === 'delete_style_profile') {
    const ctx = await requireResourceContext(args.expectedContextSha256);
    if (ctx.resource.storageType === STORAGE_TYPE.GDRIVE) {
      return callRemoteMcpTool('delete_style_profile', { profileId: args.profileId });
    }
    if (!/^[a-f0-9]{64}$/i.test(args.expectedContextSha256 ?? '')) {
      throw new Error('현재 폴더 조회에서 받은 컨텍스트 SHA-256 값이 필요합니다.');
    }
    return deleteProfile({ ...args, resourceFolder: ctx.resource.path }, async () => {
      await requireMcpAccess();
      const latest = await requireResourceContext(args.expectedContextSha256);
      if (latest.resource.path !== ctx.resource.path) throw new Error('리소스 폴더가 변경되었습니다. 다시 조회해 주세요.');
    });
  }

  if (name === 'list_ai_templates') {
    const ctx = await requireResourceContext();
    if (ctx.resource.storageType === STORAGE_TYPE.GDRIVE) {
      return callRemoteMcpTool('list_ai_templates', args);
    }
    return listAITemplates(ctx.resource.path, args);
  }

  if (name === 'get_ai_template') {
    const ctx = await requireResourceContext();
    if (ctx.resource.storageType === STORAGE_TYPE.GDRIVE) {
      return callRemoteMcpTool('get_ai_template', args);
    }
    return getAITemplate(ctx.resource.path, args);
  }

  if (name === 'execute_ai_template') {
    const ctx = await requireResourceContext();
    if (ctx.resource.storageType !== STORAGE_TYPE.LOCAL) {
      throw new Error('execute_ai_template은 현재 LOCAL 리소스 폴더에서만 지원됩니다.');
    }
    const result = await executeAITemplate(ctx.resource.path, args);
    await requireMcpAccess();
    await requireResourceContext(ctx.contextSha256);
    return result;
  }

  if (name === 'create_ai_template') {
    const ctx = await requireResourceContext();
    if (ctx.resource.storageType === STORAGE_TYPE.GDRIVE) {
      return callRemoteMcpTool('create_ai_template', args);
    }
    return createAITemplate(ctx.resource.path, args, async () => {
      await requireMcpAccess();
      await requireResourceContext(ctx.contextSha256);
    });
  }

  if (name === 'update_ai_template') {
    const ctx = await requireResourceContext();
    if (ctx.resource.storageType === STORAGE_TYPE.GDRIVE) {
      return callRemoteMcpTool('update_ai_template', args);
    }
    return updateAITemplate(ctx.resource.path, args, async () => {
      await requireMcpAccess();
      await requireResourceContext(ctx.contextSha256);
    });
  }

  if (name === 'delete_ai_template') {
    const ctx = await requireResourceContext();
    if (ctx.resource.storageType === STORAGE_TYPE.GDRIVE) {
      return callRemoteMcpTool('delete_ai_template', args);
    }
    return deleteAITemplate(ctx.resource.path, args, async () => {
      await requireMcpAccess();
      await requireResourceContext(ctx.contextSha256);
    });
  }

  return null;
}

/**
 * ========================================================================================
 * [함수명] dispatch - JSON-RPC 2.0 메시지를 해석하여 MCP 프로토콜 메서드를 처리합니다.
 *
 * @param {object} message - 수신된 JSON-RPC 메시지 객체
 * @returns {Promise<void>}
 * ==========================================================================================
 */
async function dispatch(message) {
  if (!message || message.jsonrpc !== '2.0') return;
  const { id, method, params = {} } = message;
  if (id === undefined) return;
  try {
    if (method === 'initialize') {
      return reply(id, {
        protocolVersion: params.protocolVersion ?? '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'onrivi-author-hybrid', version: '0.2.0' },
      });
    }
    if (method === 'ping') return reply(id, {});
    if (method === 'tools/list') return reply(id, { tools });
    if (method === 'tools/call') {
      try {
        const result = await executeToolCall(params.name, params.arguments ?? {});
        if (!result) return error(id, -32602, '알 수 없는 도구입니다.');
        return reply(id, { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result });
      } catch (cause) {
        console.error(JSON.stringify({
          event: 'MCP_TOOL_CALL_ERROR',
          file: 'plugins/onrivi-author/server/index.mjs',
          func: 'dispatch',
          doing: 'PC 하이브리드 MCP 도구 실행 중',
          target: String(params.name || ''),
          error: cause?.message || String(cause),
        }));
        return reply(id, { isError: true, content: [{ type: 'text', text: cause.message }] });
      }
    }
    return error(id, -32601, 'Method not found.');
  } catch (cause) {
    return error(id, -32603, cause.message);
  }
}

let pending = '';
let queue = Promise.resolve();
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  pending += chunk;
  let newline;
  while ((newline = pending.indexOf('\n')) !== -1) {
    const line = pending.slice(0, newline).trim();
    pending = pending.slice(newline + 1);
    if (line) {
      try {
        const message = JSON.parse(line);
        queue = queue.then(() => dispatch(message)).catch((cause) => process.stderr.write(`${cause.message}\n`));
      } catch {
        process.stderr.write('Invalid JSON-RPC message\n');
      }
    }
  }
});
