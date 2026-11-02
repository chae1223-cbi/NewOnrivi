function analyzeSEO(markdown, language = 'ko') {
  if (!markdown) {
    return { score: 0, issues: [], suggestions: [] };
  }

  const issues = [];
  let score = 100;

  const titleMatch = markdown.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1].trim() : '';

  if (!title) {
    issues.push({ type: 'error', field: 'title', message: language === 'ko' ? '제목(H1)이 없습니다.' : 'No title (H1) found.' });
    score -= 20;
  } else if (title.length < 10) {
    issues.push({ type: 'warning', field: 'title', message: language === 'ko' ? '제목이 너무 짧습니다. (10자 이상 권장)' : 'Title too short (10+ chars recommended).' });
    score -= 5;
  } else if (title.length > 60) {
    issues.push({ type: 'warning', field: 'title', message: language === 'ko' ? '제목이 너무 깁니다. (60자 이내 권장, 현재 ' + title.length + '자)' : 'Title too long (60 chars max, currently ' + title.length + ').' });
    score -= 5;
  }

  const h2s = (markdown.match(/^##\s+.+/gm) || []);
  const h3s = (markdown.match(/^###\s+.+/gm) || []);

  if (h2s.length === 0) {
    issues.push({ type: 'warning', field: 'headings', message: language === 'ko' ? 'H2(소제목)이 없습니다. 글을 구조화하세요.' : 'No H2 headings. Structure your content.' });
    score -= 10;
  }

  const totalHeadings = h2s.length + h3s.length;
  if (totalHeadings > 0 && totalHeadings < 3) {
    issues.push({ type: 'info', field: 'headings', message: language === 'ko' ? '소제목이 1~2개뿐입니다. 더 세분화하면 좋습니다.' : 'Only 1-2 subheadings. Consider more sections.' });
    score -= 3;
  }

  const wordCount = markdown.replace(/[#*`~>|\[\]()\-!]/g, '').split(/\s+/).filter(Boolean).length;
  const charCount = markdown.replace(/\s/g, '').length;

  if (charCount < 500) {
    issues.push({ type: 'warning', field: 'length', message: language === 'ko' ? '글이 너무 짧습니다. (최소 500자 권장, 현재 ' + charCount + '자)' : 'Content too short (500+ chars recommended, currently ' + charCount + ').' });
    score -= 15;
  }

  if (charCount > 10000) {
    issues.push({ type: 'info', field: 'length', message: language === 'ko' ? '긴 글입니다. (10000자 초과) 목차를 활용하세요.' : 'Long content (10K+ chars). Use a table of contents.' });
  }

  const imageCount = (markdown.match(/!\[.*?\]\(.*?\)/g) || []).length;
  if (charCount > 500 && imageCount === 0) {
    issues.push({ type: 'warning', field: 'images', message: language === 'ko' ? '이미지가 없습니다. 최소 1개 이상 추가하세요.' : 'No images found. Add at least one.' });
    score -= 10;
  }

  const imagesWithAlt = (markdown.match(/!\[[^\]]+\]\(.*?\)/g) || []).length;
  const imagesTotal = (markdown.match(/!\[.*?\]\(.*?\)/g) || []).length;
  const imagesMissingAlt = imagesTotal - imagesWithAlt;
  if (imagesMissingAlt > 0) {
    issues.push({ type: 'warning', field: 'images', message: language === 'ko' ? imagesMissingAlt + '개 이미지에 alt 텍스트가 없습니다.' : imagesMissingAlt + ' image(s) missing alt text.' });
    score -= imagesMissingAlt * 3;
  }

  const linkCount = (markdown.match(/\[.*?\]\(.*?\)/g) || []).length;
  if (charCount > 1000 && linkCount === 0) {
    issues.push({ type: 'info', field: 'links', message: language === 'ko' ? '외부 링크가 없습니다. 신뢰도를 높이려면 출처를 링크하세요.' : 'No external links. Add sources for credibility.' });
    score -= 3;
  }

  const boldCount = (markdown.match(/\*\*(.+?)\*\*/g) || []).length;
  if (boldCount > charCount * 0.05) {
    issues.push({ type: 'info', field: 'formatting', message: language === 'ko' ? '볼드체 사용이 과합니다. 중요한 부분만 강조하세요.' : 'Too much bold text. Emphasize only key points.' });
    score -= 3;
  }

  const codeBlockCount = (markdown.match(/```[\s\S]*?```/g) || []).length;
  const listCount = (markdown.match(/^[*-]\s/gm) || []).length;
  const tableCount = (markdown.match(/^\|.+\|$/gm) || []).length;

  const contentTypeVariety = [codeBlockCount > 0, listCount > 0, tableCount > 0, imageCount > 0].filter(Boolean).length;
  if (charCount > 1000 && contentTypeVariety < 2) {
    issues.push({ type: 'info', field: 'variety', message: language === 'ko' ? '콘텐츠 형식이 단조롭습니다. 목록, 표, 코드블록 등을 활용하세요.' : 'Content format is monotonous. Use lists, tables, code blocks.' });
    score -= 3;
  }

  score = Math.max(0, Math.min(100, score));

  const getGrade = (s) => s >= 90 ? 'A' : s >= 75 ? 'B' : s >= 60 ? 'C' : 'D';
  const getLabel = (s) => {
    if (s >= 90) return language === 'ko' ? '최적' : 'Optimal';
    if (s >= 75) return language === 'ko' ? '양호' : 'Good';
    if (s >= 60) return language === 'ko' ? '보통' : 'Fair';
    return language === 'ko' ? '개선 필요' : 'Needs Improvement';
  };

  return {
    score,
    grade: getGrade(score),
    label: getLabel(score),
    stats: {
      charCount,
      wordCount,
      titleLength: title.length,
      h2Count: h2s.length,
      h3Count: h3s.length,
      imageCount,
      linkCount,
      boldCount,
      codeBlockCount,
      listItems: listCount,
      tableCount,
    },
    issues,
  };
}

module.exports = { analyzeSEO };
