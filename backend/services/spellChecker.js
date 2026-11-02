function checkSpelling(text) {
  const errors = [];

  const patterns = [
    // 되 vs 돼
    { wrong: /(?<![ㄱ-ㅎ])되(?![는을아])/g, correct: (m) => m.replace('되', '돼'), type: '맞춤법', desc: '"되"와 "돼" 구분: "되어"의 줄임말은 "돼"' },
    // ~에 vs ~의 (typical confusion)
    { wrong: /\b(그|이|저|내|너|우리|그들|당신)의[는을]?[가-힣]/g, correct: null, type: '주의', desc: '"~의" 대신 "~에"가 더 자연스러울 수 있습니다' },
    // ~로서 vs ~로써
    { wrong: /\b(학생|교사|대표|의원|사람)로서\b/g, correct: (m) => m.replace('로서', '로서 (자격) / 로써 (수단) 확인 필요'), type: '혼동', desc: '"~로서"는 자격, "~로써"는 수단입니다' },
    // ~하다 in wrong position
    { wrong: /\b[가-힣]{2,}핟다\b/g, correct: null, type: '맞춤법', desc: '"핟다" -> "하다" 오타로 의심됩니다' },
    // ~로서 (wrong usage indicator - catch common patterns)
    { wrong: /\b[가-힣]+거예요\b/g, correct: null, type: '맞춤법', desc: '"거예요"가 맞습니다 ("거에요"는 비표준)' },
    // spacing issues common patterns
    { wrong: /예를들어/g, correct: '예를 들어', type: '띄어쓰기', desc: '"예를 들어"가 맞습니다 (띄어쓰기)' },
    { wrong: /[가-힣]하고또/g, correct: null, type: '띄어쓰기', desc: '"하고 또"로 띄어 쓰는 것이 좋습니다' },
    // 이에요 vs 예요
    { wrong: /[가-힣](이에요|예요)/g, correct: null, type: '맞춤법', desc: '받침 있으면 "이에요", 없으면 "예요"' },
  ];

  for (const p of patterns) {
    let match;
    while ((match = p.wrong.exec(text)) !== null) {
      const wrongMatch = match[0];
      const correctMatch = p.correct ? (typeof p.correct === 'function' ? p.correct(wrongMatch) : p.correct) : '확인 필요';
      errors.push({
        wrong: wrongMatch,
        correct: correctMatch,
        type: p.type,
        desc: p.desc,
        start: match.index,
        end: match.index + wrongMatch.length,
      });
    }
  }

  return errors;
}

module.exports = { checkSpelling };
