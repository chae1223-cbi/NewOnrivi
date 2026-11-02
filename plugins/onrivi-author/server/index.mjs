// ====================================================================
// 📊 [OMD-MCP-SERVER-0001] server/index.mjs
// 🎯 @KICK  : 온리비 어서 로컬 MCP 서버 진입점 및 도구 디스패처
// 🛡️ @GUARD : Rule 1(단일 주석 관리), 로컬 라이선스/세션 검증, 원자적 I/O
// 🚨 @PATCH : 2026-10-31 — [AI 프롬프트 템플릿 신규 등록 create_ai_template MCP 도구 등록 및 디스패치 연동]
// ====================================================================
import { readDocument, replaceDocument, editMarkdownSection } from './documents.mjs';
import { listProfiles, createProfile, updateProfile } from './profiles.mjs';
import { getCurrentFolders, requireLocalFolders } from './context.mjs';
import { requireMcpAccess } from './authorization.mjs';
import { listWorkspaceFiles, searchWorkspace, createMarkdown } from './workspace.mjs';
import { listAITemplates, getAITemplate, executeAITemplate, createAITemplate } from './ai-templates.mjs';

const tools = [
  {
    name: 'read_markdown',
    description: '절대경로로 로컬 .md 또는 .markdown 파일을 읽고, 안전한 수정을 위한 내용과 SHA-256 값을 반환합니다.',
    inputSchema: { type: 'object', properties: { path: { type: 'string', description: '로컬 마크다운 파일의 절대경로' } }, required: ['path'], additionalProperties: false }
  },
  {
    name: 'replace_markdown',
    description: '이전에 읽은 SHA-256 값이 현재 파일과 같을 때만 로컬 마크다운 파일의 전체 내용을 교체합니다.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, expectedSha256: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'expectedSha256', 'content'], additionalProperties: false }
  },
  {
    name: 'get_current_folders',
    description: '실행 중인 온리비 어서 데스크톱 앱이 선택한 현재 작업장과 리소스 폴더를 조회합니다. 로컬 서식 작업 전에 호출하세요.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'list_style_profiles',
    description: '현재 앱의 로컬 리소스 폴더에서 서식 목록과 변경 확인용 SHA-256 값을 조회합니다.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'create_style_profile',
    description: '서식 목록을 조회한 뒤 선택한 서식을 복제해 새 사용자 서식을 만듭니다. 기존 서식은 덮어쓰지 않으며, 파일이 중간에 바뀌면 저장을 거부합니다.',
    inputSchema: { type: 'object', properties: { expectedContextSha256: { type: 'string', description: 'get_current_folders 또는 list_style_profiles에서 받은 컨텍스트 SHA-256' }, expectedSha256: { type: 'string' }, baseProfileId: { type: 'string', description: 'list_style_profiles에서 확인한 복제할 서식 ID' }, name: { type: 'string' }, description: { type: 'string' }, pageStyle: { type: 'object', description: '선택 사항. 용지, 글꼴, 여백 등 기본 서식에서 바꿀 페이지 속성', additionalProperties: { type: 'string' } }, rules: { type: 'object', description: '선택 사항. 기본 서식의 태그별 CSS 속성 일부를 바꿉니다.', additionalProperties: { type: 'object', additionalProperties: { type: 'string' } } } }, required: ['expectedContextSha256', 'expectedSha256', 'baseProfileId', 'name'], additionalProperties: false }
  },
  {
    name: 'list_workspace_files',
    description: '현재 로컬 작업장의 마크다운 파일을 페이지별로 조회합니다. 숨김 폴더와 심볼릭 링크는 제외합니다.',
    inputSchema: { type: 'object', properties: { cursor: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 100 } }, additionalProperties: false }
  },
  {
    name: 'search_workspace',
    description: '현재 로컬 작업장의 마크다운 파일명과 본문을 검색하고 일치 부분만 페이지별로 반환합니다.',
    inputSchema: { type: 'object', properties: { query: { type: 'string', minLength: 2, maxLength: 100 }, cursor: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 30 } }, required: ['query'], additionalProperties: false }
  },
  {
    name: 'create_markdown',
    description: '현재 로컬 작업장 안의 기존 폴더에 새 마크다운 문서를 만듭니다. 기존 파일은 덮어쓰지 않습니다.',
    inputSchema: { type: 'object', properties: { relativePath: { type: 'string', description: '작업장 기준 새 파일 상대경로' }, content: { type: 'string' }, expectedContextSha256: { type: 'string', description: 'get_current_folders에서 받은 컨텍스트 SHA-256' } }, required: ['relativePath', 'content', 'expectedContextSha256'], additionalProperties: false }
  },
  {
    name: 'edit_markdown_section',
    description: '고유한 마크다운 제목 아래에서 지정한 기존 문구를 한 번만 교체합니다. read_markdown의 SHA-256이 필요합니다.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, expectedSha256: { type: 'string' }, heading: { type: 'string' }, oldText: { type: 'string' }, newText: { type: 'string' } }, required: ['path', 'expectedSha256', 'heading', 'oldText', 'newText'], additionalProperties: false }
  },
  {
    name: 'update_style_profile',
    description: '기존 사용자 서식의 이름, 설명, 페이지 속성 또는 태그별 규칙을 일부 수정합니다. 시스템 서식은 수정할 수 없습니다.',
    inputSchema: { type: 'object', properties: { expectedContextSha256: { type: 'string' }, expectedSha256: { type: 'string' }, profileId: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, pageStyle: { type: 'object', additionalProperties: { type: 'string' } }, rules: { type: 'object', additionalProperties: { type: 'object', additionalProperties: { type: 'string' } } } }, required: ['expectedContextSha256', 'expectedSha256', 'profileId'], additionalProperties: false }
  },
  {
    name: 'list_ai_templates',
    description: '현재 로컬 리소스 폴더의 AI 프리셋과 문서 프롬프트 목록을 조회합니다. 본문은 반환하지 않습니다.',
    inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['preset', 'prompt'] }, query: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 100 }, offset: { type: 'integer', minimum: 0 } }, additionalProperties: false }
  },
  {
    name: 'get_ai_template',
    description: 'AI 템플릿 본문과 변경 확인용 SHA-256을 열람합니다. preset은 id, prompt는 domain과 docType을 지정하세요.',
    inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['preset', 'prompt'] }, id: { type: 'string' }, domain: { type: 'string' }, docType: { type: 'string' } }, required: ['kind'], additionalProperties: false }
  },
  {
    name: 'execute_ai_template',
    description: '열람한 AI 템플릿에 입력값을 적용해 이 채팅 AI가 즉시 실행할 프롬프트를 반환합니다. MCP 서버 자체는 외부 AI API를 호출하지 않으며 문서를 수정하지 않습니다.',
    inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['preset', 'prompt'] }, id: { type: 'string' }, domain: { type: 'string' }, docType: { type: 'string' }, expectedSha256: { type: 'string' }, values: { type: 'object', additionalProperties: { type: 'string' } }, input: { type: 'string' } }, required: ['kind', 'expectedSha256'], additionalProperties: false }
  },
  {
    name: 'create_ai_template',
    description: '작성한 AI 프롬프트를 로컬 리소스 폴더의 AI 프리셋(preset) 또는 분야별 문서 템플릿(prompt)으로 신규 등록합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['preset', 'prompt'], description: '등록 유형: preset(편집 프리셋, 기본값) 또는 prompt(분야별 문서 템플릿)' },
        name: { type: 'string', description: '템플릿/프리셋 이름 (예: "블로그 요약 및 카드뉴스 변환", "학술 논문 초록 교정")' },
        prompt: { type: 'string', description: '실행할 프롬프트 본문. {{변수명}} 형식의 치환 변수를 자유롭게 포함할 수 있습니다.' },
        folder: { type: 'string', description: '선택 사항. 프리셋 분류 폴더명 (기본값: "AI작성")' },
        domain: { type: 'string', description: 'prompt 유형일 때 필수. 분류 분야 (예: "출판조판", "비즈니스", "마케팅")' },
        docType: { type: 'string', description: 'prompt 유형일 때 문서 종류명 (생략 시 name 사용)' },
        systemPrompt: { type: 'string', description: 'prompt 유형일 때 시스템 프롬프트 (생략 시 prompt 사용)' },
        userInputTemplate: { type: 'string', description: 'prompt 유형일 때 사용자 입력 가이드 템플릿' },
        expectedSha256: { type: 'string', description: '선택 사항. list_ai_templates에서 확인한 기존 파일의 SHA-256 해시' }
      },
      required: ['name', 'prompt'],
      additionalProperties: false
    }
  }
];

function reply(id, result) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n'); }
function error(id, code, message) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n'); }

async function dispatch(message) {
  if (!message || message.jsonrpc !== '2.0') return;
  const { id, method, params = {} } = message;
  if (id === undefined) return;
  try {
    if (method === 'initialize') return reply(id, { protocolVersion: params.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'onrivi-author-local', version: '0.1.9' } });
    if (method === 'ping') return reply(id, {});
    if (method === 'tools/list') return reply(id, { tools });
    if (method === 'tools/call') {
      try {
        const authContext = await requireMcpAccess();
        const result = params.name === 'read_markdown'
          ? await (async () => { const context = await requireLocalFolders(); return readDocument(params.arguments?.path, [context.workspacePath, context.resourcePath]); })()
          : params.name === 'replace_markdown'
            ? await (async () => {
              const context = await requireLocalFolders();
              const roots = [context.workspacePath, context.resourcePath];
              return replaceDocument(params.arguments?.path, params.arguments?.expectedSha256, params.arguments?.content, roots, async () => {
                await requireMcpAccess();
                await requireLocalFolders(context.contextSha256);
              });
            })()
            : params.name === 'get_current_folders'
              ? authContext
            : params.name === 'list_style_profiles'
              ? await (async () => { const context = await requireLocalFolders(); return { ...context, ...(await listProfiles(context.resourcePath)) }; })()
              : params.name === 'create_style_profile'
                ? await (async () => {
                  const context = await requireLocalFolders(params.arguments?.expectedContextSha256);
                  if (!/^[a-f0-9]{64}$/i.test(params.arguments?.expectedContextSha256 ?? '')) throw new Error('현재 폴더 조회에서 받은 컨텍스트 SHA-256 값이 필요합니다.');
                  return createProfile({ ...params.arguments, resourceFolder: context.resourcePath }, async () => {
                    await requireMcpAccess();
                    const latest = await requireLocalFolders(params.arguments.expectedContextSha256);
                    if (latest.resourcePath !== context.resourcePath) throw new Error('리소스 폴더가 변경되었습니다. 다시 조회해 주세요.');
                  });
                })()
              : params.name === 'list_workspace_files'
                ? await (async () => { const context = await requireLocalFolders(); return listWorkspaceFiles(context.workspacePath, params.arguments); })()
              : params.name === 'search_workspace'
                ? await (async () => { const context = await requireLocalFolders(); return searchWorkspace(context.workspacePath, params.arguments); })()
              : params.name === 'create_markdown'
                ? await (async () => {
                  const context = await requireLocalFolders(params.arguments?.expectedContextSha256);
                  return createMarkdown(context.workspacePath, params.arguments ?? {}, async () => {
                    await requireMcpAccess();
                    await requireLocalFolders(context.contextSha256);
                  });
                })()
              : params.name === 'edit_markdown_section'
                ? await (async () => {
                  const context = await requireLocalFolders();
                  return editMarkdownSection(params.arguments?.path, params.arguments?.expectedSha256,
                    params.arguments?.heading, params.arguments?.oldText, params.arguments?.newText,
                    [context.workspacePath, context.resourcePath], async () => {
                      await requireMcpAccess();
                      await requireLocalFolders(context.contextSha256);
                    });
                })()
              : params.name === 'update_style_profile'
                ? await (async () => {
                  const context = await requireLocalFolders(params.arguments?.expectedContextSha256);
                  if (!/^[a-f0-9]{64}$/i.test(params.arguments?.expectedContextSha256 ?? '')) throw new Error('현재 폴더 조회에서 받은 컨텍스트 SHA-256 값이 필요합니다.');
                  return updateProfile({ ...params.arguments, resourceFolder: context.resourcePath }, async () => {
                    await requireMcpAccess();
                    const latest = await requireLocalFolders(context.contextSha256);
                    if (latest.resourcePath !== context.resourcePath) throw new Error('리소스 폴더가 변경되었습니다. 다시 조회해 주세요.');
                  });
                })()
              : params.name === 'list_ai_templates'
                ? await (async () => { const context = await requireLocalFolders(); return listAITemplates(context.resourcePath, params.arguments); })()
              : params.name === 'get_ai_template'
                ? await (async () => { const context = await requireLocalFolders(); return getAITemplate(context.resourcePath, params.arguments); })()
              : params.name === 'execute_ai_template'
                ? await (async () => {
                  const context = await requireLocalFolders();
                  const result = await executeAITemplate(context.resourcePath, params.arguments);
                  await requireMcpAccess();
                  await requireLocalFolders(context.contextSha256);
                  return result;
                })()
              : params.name === 'create_ai_template'
                ? await (async () => {
                  const context = await requireLocalFolders();
                  return createAITemplate(context.resourcePath, params.arguments ?? {}, async () => {
                    await requireMcpAccess();
                    await requireLocalFolders(context.contextSha256);
                  });
                })()
            : null;
        if (!result) return error(id, -32602, '알 수 없는 도구입니다.');
        return reply(id, { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result });
      } catch (cause) {
        return reply(id, { isError: true, content: [{ type: 'text', text: cause.message }] });
      }
    }
    return error(id, -32601, 'Method not found.');
  } catch (cause) { return error(id, -32603, cause.message); }
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
      }
      catch { process.stderr.write('Invalid JSON-RPC message\n'); }
    }
  }
});
