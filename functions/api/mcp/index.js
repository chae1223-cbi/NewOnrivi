// ====================================================================
// 📊 [OMD-MCP-REMOTE-HTTP-0001] functions/api/mcp/index.js
// 🎯 @KICK  : 온리비 어서 웹 사용자용 원격 Streamable HTTP MCP 서버 (/api/mcp)
// 🛡️ @GUARD : Rule 1(단일 주석 관리), Bearer MCP 토큰 SHA-256 검증, 활성 유료 구독 검증, Google Drive 작업장/리소스 격리
// 🚨 @PATCH : 2026-11-16 — [웹 원격 MCP 서버 신설] Google Drive 문서·AI 템플릿·서식 프로필 CRUD 전체 도구 지원
// 🔗 @CALLS : functions/api/mcp/_shared.js, Google Drive API v3
// ====================================================================
import {
  createDriveTextFile,
  findDriveFileByName,
  findOrCreateDriveSubfolder,
  getMcpTokenByHash,
  getValidDriveAccessToken,
  listDriveChildren,
  readDriveFileText,
  sha256Hex,
  updateDriveTextFile,
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
    name: 'get_current_folders',
    description: '현재 원격 MCP 토큰에 연결된 Google Drive 작업장(workspaceFolderId)과 리소스 폴더(resourceFolderId)를 조회합니다.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_workspace_files',
    description: 'Google Drive 작업장(또는 지정한 하위 폴더)의 마크다운 파일과 폴더 목록을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: { folderId: { type: 'string', description: '생략 시 연결된 작업장 루트 폴더 조회' } },
      additionalProperties: false,
    },
  },
  {
    name: 'search_workspace',
    description: 'Google Drive 작업장 내 마크다운(.md, .markdown) 파일을 파일명으로 검색합니다.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', minLength: 1, maxLength: 100 } },
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
      },
      required: ['name', 'content'],
      additionalProperties: false,
    },
  },
  {
    name: 'replace_markdown',
    description: 'Google Drive의 기존 마크다운 파일 내용을 교체합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        fileId: { type: 'string' },
        content: { type: 'string' },
        expectedSha256: { type: 'string', description: '선택 사항. read_markdown에서 받은 SHA-256' },
      },
      required: ['fileId', 'content'],
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

async function resolveDriveFileByPath(accessToken, rootFolderId, relativePath) {
  const parts = String(relativePath || '').split('/').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error('파일 경로 또는 fileId를 지정하세요.');
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

async function executeTool(name, args, { env, record }) {
  const accessToken = await getValidDriveAccessToken(env, record);
  const workspaceId = record.workspaceFolderId;
  const resourceId = record.resourceFolderId || workspaceId;

  if (name === 'get_current_folders') {
    return { workspaceType: 'GDRIVE', workspaceFolderId: workspaceId, resourceFolderId: resourceId };
  }

  if (name === 'list_workspace_files') {
    const targetFolder = args?.folderId || workspaceId;
    if (!targetFolder) throw new Error('연결된 Google Drive 작업장 폴더가 없습니다.');
    const files = await listDriveChildren(accessToken, targetFolder);
    return {
      folderId: targetFolder,
      items: files.filter((f) => f.mimeType === 'application/vnd.google-apps.folder' || /\.(md|markdown)$/i.test(f.name)),
    };
  }

  if (name === 'search_workspace') {
    if (!workspaceId) throw new Error('연결된 Google Drive 작업장 폴더가 없습니다.');
    const query = String(args?.query || '').trim();
    const files = await listDriveChildren(accessToken, workspaceId, `name contains '${query.replace(/'/g, "\\'")}'`);
    return {
      query,
      items: files.filter((f) => /\.(md|markdown)$/i.test(f.name)),
    };
  }

  if (name === 'read_markdown') {
    const fileId = args?.fileId || (await resolveDriveFileByPath(accessToken, workspaceId, args?.relativePath));
    const { meta, text, sha256 } = await readDriveFileText(accessToken, fileId);
    return { fileId: meta.id, name: meta.name, modifiedTime: meta.modifiedTime, sha256, content: text };
  }

  if (name === 'create_markdown') {
    const parentId = args?.parentFolderId || workspaceId;
    if (!parentId) throw new Error('연결된 Google Drive 작업장 폴더가 없습니다.');
    const fileName = String(args?.name || '').trim();
    if (!fileName || !/\.(md|markdown)$/i.test(fileName)) throw new Error('파일명은 .md 또는 .markdown으로 끝나야 합니다.');
    const existing = await findDriveFileByName(accessToken, parentId, fileName);
    if (existing) throw new Error(`동일한 이름의 파일이 이미 존재합니다: ${fileName}`);
    const created = await createDriveTextFile(accessToken, parentId, fileName, String(args?.content ?? ''), 'text/markdown');
    return { success: true, fileId: created.id, name: created.name, modifiedTime: created.modifiedTime };
  }

  if (name === 'replace_markdown') {
    const fileId = String(args?.fileId || '').trim();
    if (!fileId) throw new Error('fileId를 지정하세요.');
    if (args?.expectedSha256) {
      const current = await readDriveFileText(accessToken, fileId);
      if (current.sha256 !== String(args.expectedSha256).toLowerCase()) {
        throw new Error('문서가 조회 후 변경되었습니다. 다시 읽은 뒤 수정해 주세요.');
      }
    }
    const updated = await updateDriveTextFile(accessToken, fileId, String(args?.content ?? ''), 'text/markdown');
    return { success: true, fileId: updated.id, name: updated.name, modifiedTime: updated.modifiedTime, sha256: await sha256Hex(String(args?.content ?? '')) };
  }

  if (!resourceId) throw new Error('연결된 Google Drive 리소스 폴더가 없습니다.');

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
        const result = await executeTool(params.name, params.arguments || {}, { env, record });
        return rpcReply(reqId, {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
        });
      } catch (toolError) {
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
