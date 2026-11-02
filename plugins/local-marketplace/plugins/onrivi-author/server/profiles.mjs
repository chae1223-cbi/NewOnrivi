import { createHash, randomUUID } from 'node:crypto';
import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicReplace } from './atomic-write.mjs';

const MAX_BYTES = 4 * 1024 * 1024;
const FILE_NAME = 'userCssProfiles.json';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

let cachedSystemProfiles = null;
function getSystemProfiles() {
  if (cachedSystemProfiles) return cachedSystemProfiles;
  try {
    const sysPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'systemProfiles.json');
    const raw = JSON.parse(readFileSync(sysPath, 'utf8').replace(/^\uFEFF/, ''));
    cachedSystemProfiles = Array.isArray(raw) ? raw : [];
  } catch {
    cachedSystemProfiles = [];
  }
  return cachedSystemProfiles;
}
const PAGE_FIELDS = new Set(['paperSize', 'fontFamily', 'fontSize', 'lineHeight', 'backgroundColor', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight']);
const RULE_FIELDS = new Set(['color', 'background-color', 'font-size', 'font-weight', 'font-style', 'line-height', 'text-align', 'margin-top', 'margin-bottom', 'padding', 'padding-left', 'padding-bottom', 'border-left', 'border-bottom', 'letter-spacing']);

function cleanOverrides(pageStyle, rules) {
  const cleanValue = value => {
    if (typeof value !== 'string' || !value.trim() || value.length > 100 || /[;{}<>]|url\s*\(|expression\s*\(/i.test(value)) {
      throw new Error('서식 값은 100자 이하의 안전한 CSS 문자열이어야 합니다.');
    }
    return value.trim();
  };
  if (pageStyle !== undefined && (!pageStyle || typeof pageStyle !== 'object' || Array.isArray(pageStyle))) throw new Error('pageStyle은 객체여야 합니다.');
  if (rules !== undefined && (!rules || typeof rules !== 'object' || Array.isArray(rules))) throw new Error('rules는 객체여야 합니다.');
  const cleanPageStyle = {};
  for (const [key, value] of Object.entries(pageStyle ?? {})) {
    if (!PAGE_FIELDS.has(key)) throw new Error(`지원하지 않는 pageStyle 항목: ${key}`);
    cleanPageStyle[key] = cleanValue(value);
  }
  if (cleanPageStyle.paperSize && !['a4', 'a5', 'b5', 'letter', 'sns_square', 'sns_portrait'].includes(cleanPageStyle.paperSize)) {
    throw new Error('지원하지 않는 용지 크기입니다.');
  }
  const cleanRules = {};
  for (const [tag, properties] of Object.entries(rules ?? {})) {
    if (!/^[a-z][a-z0-9]*$/i.test(tag) || !properties || typeof properties !== 'object' || Array.isArray(properties)) throw new Error(`잘못된 rules 태그: ${tag}`);
    cleanRules[tag] = {};
    for (const [key, value] of Object.entries(properties)) {
      if (!RULE_FIELDS.has(key)) throw new Error(`지원하지 않는 rules 속성: ${tag}.${key}`);
      cleanRules[tag][key] = cleanValue(value);
    }
  }
  return { cleanPageStyle, cleanRules };
}

async function profileFile(resourceFolder) {
  if (typeof resourceFolder !== 'string' || !path.isAbsolute(resourceFolder)) {
    throw new Error('로컬 리소스 폴더의 절대경로를 지정하세요.');
  }
  const root = path.resolve(resourceFolder);
  const rootStat = await fs.lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('일반 로컬 리소스 폴더만 지원합니다.');
  const profilesDir = path.join(root, 'profiles');
  const dirStat = await fs.lstat(profilesDir);
  if (!dirStat.isDirectory() || dirStat.isSymbolicLink()) throw new Error('profiles 폴더를 확인해 주세요.');
  const file = path.join(profilesDir, FILE_NAME);
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_BYTES) throw new Error('지원하지 않는 서식 파일입니다.');
  return file;
}

function parseProfiles(bytes) {
  if (bytes.length > MAX_BYTES || bytes.includes(0)) throw new Error('서식 파일이 너무 크거나 텍스트 파일이 아닙니다.');
  let profiles;
  try { profiles = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')); }
  catch { throw new Error('userCssProfiles.json의 JSON 형식이 올바르지 않습니다.'); }
  if (!Array.isArray(profiles) || profiles.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error('userCssProfiles.json은 서식 객체 배열이어야 합니다.');
  }
  return profiles;
}

export async function listProfiles(resourceFolder) {
  const file = await profileFile(resourceFolder);
  const bytes = await fs.readFile(file);
  const rawUserProfiles = parseProfiles(bytes);
  const systemList = getSystemProfiles();
  const systemIds = new Set(systemList.map(item => item.id));
  const systemProfiles = systemList.map(({ id, name, description }) => ({ id, name, description, isSystem: true }));
  const userProfiles = rawUserProfiles
    .filter(item => !systemIds.has(item.id))
    .map(({ id, name, description }) => ({ id, name, description, isSystem: false }));
  return {
    resourceFolder: path.resolve(resourceFolder),
    file,
    sha256: sha256(bytes),
    systemProfiles,
    userProfiles,
    profiles: [...systemProfiles, ...userProfiles]
  };
}

export async function createProfile({ resourceFolder, expectedSha256, baseProfileId, name, description = '', pageStyle, rules }, beforeWrite) {
  if (!/^[a-f0-9]{64}$/i.test(expectedSha256 ?? '')) throw new Error('list_style_profiles에서 받은 SHA-256 값이 필요합니다.');
  if (typeof baseProfileId !== 'string' || !baseProfileId.trim()) throw new Error('기본으로 복제할 서식 ID를 지정하세요.');
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) throw new Error('서식 이름은 1~100자로 지정하세요.');
  if (typeof description !== 'string' || description.length > 500) throw new Error('서식 설명은 500자 이하여야 합니다.');
  const { cleanPageStyle, cleanRules } = cleanOverrides(pageStyle, rules);
  const file = await profileFile(resourceFolder);
  {
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.size > MAX_BYTES) throw new Error('서식 파일이 변경되었습니다. 다시 조회해 주세요.');
    const bytes = await fs.readFile(file);
    if (sha256(bytes) !== expectedSha256.toLowerCase()) throw new Error('서식 파일이 조회 후 변경되었습니다. 목록을 다시 읽어 주세요.');
    const profiles = parseProfiles(bytes);
    const systemList = getSystemProfiles();
    const allAvailable = [...profiles, ...systemList];
    const base = allAvailable.find(item => item.id === baseProfileId);
    if (!base || !base.pageStyle || !base.rules) throw new Error('복제할 기본 서식이 없거나 형식이 올바르지 않습니다.');
    if (allAvailable.some(item => String(item.name || '').trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase())) {
      throw new Error('같은 이름의 서식이 이미 있습니다.');
    }
    const profile = { ...structuredClone(base), id: `profile-${randomUUID()}`, name: name.trim(), description: description.trim() };
    profile.pageStyle = { ...profile.pageStyle, ...cleanPageStyle };
    for (const [tag, properties] of Object.entries(cleanRules)) {
      if (!profile.rules[tag]) throw new Error(`기본 서식에 없는 rules 태그: ${tag}`);
      profile.rules[tag] = { ...profile.rules[tag], ...properties };
    }
    const next = Buffer.from(JSON.stringify([...profiles, profile], null, 2), 'utf8');
    if (next.length > MAX_BYTES) throw new Error('추가 후 서식 파일이 4 MiB 제한을 초과합니다.');
    await atomicReplace(file, next, async () => {
      if (beforeWrite) await beforeWrite();
      await profileFile(resourceFolder);
      if (sha256(await fs.readFile(file)) !== expectedSha256.toLowerCase()) throw new Error('서식 파일이 조회 후 변경되었습니다. 목록을 다시 읽어 주세요.');
    });
    return { file, profile, sha256: sha256(next), count: profiles.length + 1 };
  }
}

export async function updateProfile({ resourceFolder, expectedSha256, profileId, name, description, pageStyle, rules }, beforeWrite) {
  if (!/^[a-f0-9]{64}$/i.test(expectedSha256 ?? '')) throw new Error('list_style_profiles에서 받은 SHA-256 값이 필요합니다.');
  if (typeof profileId !== 'string' || !profileId.trim()) throw new Error('수정할 사용자 서식 ID를 지정하세요.');
  if (name === undefined && description === undefined && pageStyle === undefined && rules === undefined) throw new Error('수정할 서식 항목을 하나 이상 지정하세요.');
  if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.trim().length > 100)) throw new Error('서식 이름은 1~100자로 지정하세요.');
  if (description !== undefined && (typeof description !== 'string' || description.length > 500)) throw new Error('서식 설명은 500자 이하여야 합니다.');
  const { cleanPageStyle, cleanRules } = cleanOverrides(pageStyle, rules);
  const file = await profileFile(resourceFolder);
  const bytes = await fs.readFile(file);
  if (sha256(bytes) !== expectedSha256.toLowerCase()) throw new Error('서식 파일이 조회 후 변경되었습니다. 목록을 다시 읽어 주세요.');
  const profiles = parseProfiles(bytes);
  const systemList = getSystemProfiles();
  if (systemList.some(item => item.id === profileId)) throw new Error('시스템 서식은 수정할 수 없습니다. 사용자 서식을 복제해 수정하세요.');
  const index = profiles.findIndex(item => item.id === profileId);
  if (index < 0) throw new Error('수정할 사용자 서식을 찾지 못했습니다.');
  if (name !== undefined && [...profiles, ...systemList].some((item, i) => i !== index && String(item.name || '').trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase())) {
    throw new Error('같은 이름의 서식이 이미 있습니다.');
  }
  const profile = structuredClone(profiles[index]);
  if (!profile.pageStyle || typeof profile.pageStyle !== 'object' || !profile.rules || typeof profile.rules !== 'object') throw new Error('수정할 서식의 형식이 올바르지 않습니다.');
  if (name !== undefined) profile.name = name.trim();
  if (description !== undefined) profile.description = description.trim();
  profile.pageStyle = { ...profile.pageStyle, ...cleanPageStyle };
  for (const [tag, properties] of Object.entries(cleanRules)) {
    if (!profile.rules[tag]) throw new Error(`서식에 없는 rules 태그: ${tag}`);
    profile.rules[tag] = { ...profile.rules[tag], ...properties };
  }
  const nextProfiles = [...profiles];
  nextProfiles[index] = profile;
  const next = Buffer.from(JSON.stringify(nextProfiles, null, 2), 'utf8');
  if (next.length > MAX_BYTES) throw new Error('수정 후 서식 파일이 4 MiB 제한을 초과합니다.');
  await atomicReplace(file, next, async () => {
    if (beforeWrite) await beforeWrite();
    await profileFile(resourceFolder);
    if (sha256(await fs.readFile(file)) !== expectedSha256.toLowerCase()) throw new Error('서식 파일이 조회 후 변경되었습니다. 목록을 다시 읽어 주세요.');
  });
  return { file, profile, sha256: sha256(next), count: nextProfiles.length };
}
