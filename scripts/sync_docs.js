const fs = require('fs');
const path = require('path');

// 설정
const ROOT_DIR = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const STRUCTURE_DOC = path.join(DOCS_DIR, '05_Project_Structure.md');

/**
 * 디렉토리 구조를 재귀적으로 스캔하여 트리 텍스트 생성
 */
function scanDir(dir, indent = '') {
    let result = '';
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    items.forEach(item => {
        if (item.name === 'node_modules' || item.name === '.next' || item.name === '.git' || item.name === '.gemini') return;
        
        result += `${indent}├── ${item.name}${item.isDirectory() ? '/' : ''}\n`;
        if (item.isDirectory()) {
            result += scanDir(path.join(dir, item.name), indent + '│   ');
        }
    });
    return result;
}

/**
 * 05_Project_Structure.md 업데이트
 */
function updateStructureDoc() {
    console.log('📄 Updating Project Structure documentation...');
    
    const tree = scanDir(ROOT_DIR);
    const content = `# [Structure] MiniMD: 프로젝트 구조 및 프로그램 목록 (v1.0)

## 1. 프로젝트 전체 디렉토리 구조
\`\`\`text
${tree}\`\`\`

## 2. 세부 프로그램 및 컴포넌트 목록
(이 섹션은 AI가 코드를 분석하여 상세 정의를 추가해야 합니다. 스크립트는 구조도만 최신화합니다.)

> 마지막 갱신: ${new Date().toLocaleString()}
`;

    fs.writeFileSync(STRUCTURE_DOC, content, 'utf8');
    console.log('✅ 05_Project_Structure.md has been updated.');
}

// 실행
try {
    updateStructureDoc();
} catch (err) {
    console.error('❌ Error during doc sync:', err);
}
