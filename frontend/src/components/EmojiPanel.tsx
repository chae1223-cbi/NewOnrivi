// ====================================================================
// 📊 [OMD-EDIT-EmojiPanel-0001] EmojiPanel.tsx ➔ EmojiPanel
// 🎯 @KICK  : 에디터 우측 전용 이모지 보관함 패널 — 카테고리별 탐색, 한글/영문 검색, 원클릭 본문 삽입 및 최근 사용 자동 관리
// 🚨 @PATCH : **2026-11-17** — [이모지 보관함 대폭 확충]: 표정·감정, 손짓·사람, 업무·상태배지, 개발·IT, 음식·카페, 날씨·자연·동물·여행 등 실무 이모지 200+종 추가
// 🚨 @PATCH : **2026-10-11** — [전자책·블로그 출판 특화 특수문자 및 기호 6대 카테고리 대폭 확충]:
//             1) 장식/특수기호(✦ ✧ ★ ☆ ✤ ☞ ➔ ▶ ▷ ◈ ◆ ◇ ❖ ✿ ❀ ❦ ❧ ※ § № ℡ ㈜ ㈀)
//             2) 번호/원문자(①~⑩ ❶~❿ ⑴~⑸ Ⅰ~Ⅴ)
//             3) 괄호/문장부호(『』 「」 【】 《》 〈〉 “” ‘’)
//             4) 단위/수학/화폐(℃ ℉ ㎡ ㎥ ㎞ ㎎ ㎏ ㎾ ㎧ ± × ÷ ≠ ≤ ≥ ∞ ‰ ₩ ＄ € ￡)
//             5) 화살표/방향(← → ↑ ↓ ↔ ↕ ↖ ↗ ↘ ↙ ⇄ ⇅ ↺ ↻ ⇒ ⇔)
//             6) 출판/블로그 감성 아이템(📖 📚 📕 📗 📘 📙 🔖 🖋️ ✍️ 📜 📄 📑 💡 📌 🍯 📢 🚨 ☕ 🌿 🌸 🍂 🍃 🕯️ 💌 ✨)
// 🚨 @PATCH : **2026-10-02** — [이모지 패널 오버레이 플로팅(Absolute) 전환 및 에디터·미리보기 화면 불변 고정]: 패널을 flex 인라인 배치에서 absolute 우측 오버레이(툴바 좌측 밀착)로 전환하여 이모지 패널 토글 시 에디터와 미리보기 레이아웃(너비·스크롤)이 1px도 움직이지 않도록 완전 고정
// 🚨 @PATCH : **2026-10-02** — [이모지 패널 클릭 시 에디터 포커스 및 커서 위치 완벽 보존]: 모든 버튼 및 탭의 onMouseDown(e.preventDefault) 적용으로 브라우저 포커스 강탈 방어, 에디터 커서 깜빡임과 위치가 100% 온전히 유지되도록 개선
// 🚨 @PATCH : **2026-10-02** — [우측 이모지 보관함 패널 신규 구축] 마크다운 문서 작성 특화 6대 카테고리, 실시간 키워드 검색, 최근 사용 이모지 저장 및 원클릭 커서 삽입 기능 탑재
// 🔗 @CALLS : useEditorContext, Icon
// ====================================================================
"use client";

import { browserAccountStorage as localStorage } from '@/lib/browserAccountStorage';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Icon } from '@/components/icons/Icon';
import { useEditorContext } from '@/context/EditorContext';

interface EmojiItem {
  char: string;
  keywords: string[];
}

// 🏷️ 실전 마크다운 문서 작성에 최적화된 카테고리별 이모지 데이터베이스
const EMOJI_CATEGORIES: { id: string; label: string; icon: string; items: EmojiItem[] }[] = [
  {
    id: 'blog',
    label: '출판/블로그',
    icon: '📚',
    items: [
      { char: '📖', keywords: ['책', '펼친책', '원고', '독서', 'book', 'read'] },
      { char: '📚', keywords: ['책들', '도서', '서재', '출판', 'books', 'library'] },
      { char: '📕', keywords: ['빨간책', '책', 'redbook'] },
      { char: '📗', keywords: ['초록책', 'greenbook'] },
      { char: '📘', keywords: ['파란책', 'bluebook'] },
      { char: '📙', keywords: ['주황책', 'orangebook'] },
      { char: '🔖', keywords: ['책갈피', '북마크', 'bookmark'] },
      { char: '🖋️', keywords: ['만년필', '집필', '서명', 'fountainpen'] },
      { char: '✍️', keywords: ['글쓰기', '작성', '펜', 'writing'] },
      { char: '📜', keywords: ['두루마리', '역사', '고문서', 'scroll'] },
      { char: '📄', keywords: ['문서', '페이지', '종이', 'page', 'document'] },
      { char: '📑', keywords: ['탭문서', '목차', '책갈피', 'bookmarktabs'] },
      { char: '💡', keywords: ['팁', '꿀팁', '아이디어', '생각', 'tip', 'idea'] },
      { char: '📌', keywords: ['핀', '고정', '필독', '중요', 'pin', 'notice'] },
      { char: '🍯', keywords: ['꿀', '꿀팁', '정보', 'honey'] },
      { char: '📢', keywords: ['확성기', '공지', '알림', 'notice', 'announcement'] },
      { char: '🚨', keywords: ['사이렌', '경고', '긴급', '주의', 'siren', 'alert'] },
      { char: '☕', keywords: ['커피', '카페', '여유', '에세이', 'coffee'] },
      { char: '🌿', keywords: ['허브', '풀잎', '감성', 'plant', 'nature'] },
      { char: '🌸', keywords: ['벚꽃', '꽃', '감성', 'flower'] },
      { char: '🍂', keywords: ['낙엽', '가을', '감성', 'leaf'] },
      { char: '🍃', keywords: ['바람잎', '자연', 'wind'] },
      { char: '🕯️', keywords: ['촛불', '밤', '사색', 'candle'] },
      { char: '💌', keywords: ['편지', '러브레터', '메시지', 'letter'] },
      { char: '✨', keywords: ['반짝', '하이라이트', '핵심', 'sparkle'] },
    ]
  },
  {
    id: 'symbols',
    label: '장식/기호',
    icon: '✦',
    items: [
      { char: '✦', keywords: ['별장식', '소제목', '다이아', 'star', 'symbol'] },
      { char: '✧', keywords: ['빈별장식', '소제목', 'star'] },
      { char: '★', keywords: ['검은별', '별', '소제목', 'star'] },
      { char: '☆', keywords: ['흰별', '별', 'star'] },
      { char: '✤', keywords: ['꽃기호', '문양', '장식', 'flower'] },
      { char: '✥', keywords: ['십자기호', '문양', 'cross'] },
      { char: '☞', keywords: ['손가락', '참조', '지목', 'pointing', 'hand'] },
      { char: '➜', keywords: ['화살표', '오른쪽화살표', 'arrow'] },
      { char: '➔', keywords: ['굵은화살표', 'arrow'] },
      { char: '▶', keywords: ['검은삼각', '재생', '플레이', 'play'] },
      { char: '▷', keywords: ['흰삼각', 'triangle'] },
      { char: '◈', keywords: ['이중다이아', '소제목', 'diamond'] },
      { char: '◆', keywords: ['검은다이아', '소제목', 'diamond'] },
      { char: '◇', keywords: ['흰다이아', '소제목', 'diamond'] },
      { char: '❖', keywords: ['다이아꽃', '문양', 'symbol'] },
      { char: '✿', keywords: ['꽃문양', '벚꽃기호', 'flower'] },
      { char: '❀', keywords: ['꽃', '문양', 'flower'] },
      { char: '❦', keywords: ['하트잎', '장식', 'heart'] },
      { char: '❧', keywords: ['나뭇잎장식', 'leaf'] },
      { char: '※', keywords: ['참고기호', '당구장표시', '참조', 'reference', 'note'] },
      { char: '§', keywords: ['섹션', '절기호', '조항', 'section'] },
      { char: '№', keywords: ['넘버', '번호기호', 'number'] },
      { char: '℡', keywords: ['전화', '전화번호', 'tel'] },
      { char: '㈜', keywords: ['주식회사', '법인', 'corp'] },
      { char: '㈀', keywords: ['괄호ㄱ', '한글기호'] },
    ]
  },
  {
    id: 'numbers',
    label: '번호/원문자',
    icon: '①',
    items: [
      { char: '①', keywords: ['1', '원문자1', '일', 'one'] },
      { char: '②', keywords: ['2', '원문자2', '이', 'two'] },
      { char: '③', keywords: ['3', '원문자3', '삼', 'three'] },
      { char: '④', keywords: ['4', '원문자4', '사', 'four'] },
      { char: '⑤', keywords: ['5', '원문자5', '오', 'five'] },
      { char: '⑥', keywords: ['6', '원문자6', '육', 'six'] },
      { char: '⑦', keywords: ['7', '원문자7', '칠', 'seven'] },
      { char: '⑧', keywords: ['8', '원문자8', '팔', 'eight'] },
      { char: '⑨', keywords: ['9', '원문자9', '구', 'nine'] },
      { char: '⑩', keywords: ['10', '원문자10', '십', 'ten'] },
      { char: '❶', keywords: ['검은원문자1', '1', 'blackone'] },
      { char: '❷', keywords: ['검은원문자2', '2', 'blacktwo'] },
      { char: '❸', keywords: ['검은원문자3', '3', 'blackthree'] },
      { char: '❹', keywords: ['검은원문자4', '4', 'blackfour'] },
      { char: '❺', keywords: ['검은원문자5', '5', 'blackfive'] },
      { char: '❻', keywords: ['검은원문자6', '6', 'blacksix'] },
      { char: '❼', keywords: ['검은원문자7', '7', 'blackseven'] },
      { char: '❽', keywords: ['검은원문자8', '8', 'blackeight'] },
      { char: '❾', keywords: ['검은원문자9', '9', 'blacknine'] },
      { char: '❿', keywords: ['검은원문자10', '10', 'blackten'] },
      { char: '⑴', keywords: ['괄호숫자1', '1'] },
      { char: '⑵', keywords: ['괄호숫자2', '2'] },
      { char: '⑶', keywords: ['괄호숫자3', '3'] },
      { char: '⑷', keywords: ['괄호숫자4', '4'] },
      { char: '⑸', keywords: ['괄호숫자5', '5'] },
      { char: 'Ⅰ', keywords: ['로마숫자1', '1', 'roman1'] },
      { char: 'Ⅱ', keywords: ['로마숫자2', '2', 'roman2'] },
      { char: 'Ⅲ', keywords: ['로마숫자3', '3', 'roman3'] },
      { char: 'Ⅳ', keywords: ['로마숫자4', '4', 'roman4'] },
      { char: 'Ⅴ', keywords: ['로마숫자5', '5', 'roman5'] },
    ]
  },
  {
    id: 'brackets',
    label: '문장부호/괄호',
    icon: '『』',
    items: [
      { char: '『', keywords: ['겹낫표열기', '책제목', 'bracket'] },
      { char: '』', keywords: ['겹낫표닫기', '책제목', 'bracket'] },
      { char: '「', keywords: ['낫표열기', '강조', 'bracket'] },
      { char: '」', keywords: ['낫표닫기', '강조', 'bracket'] },
      { char: '【', keywords: ['두꺼운괄호열기', '블로그제목', 'bracket'] },
      { char: '】', keywords: ['두꺼운괄호닫기', '블로그제목', 'bracket'] },
      { char: '《', keywords: ['이중화살괄호열기', 'bracket'] },
      { char: '》', keywords: ['이중화살괄호닫기', 'bracket'] },
      { char: '〈', keywords: ['화살괄호열기', 'bracket'] },
      { char: '〉', keywords: ['화살괄호닫기', 'bracket'] },
      { char: '“', keywords: ['큰따옴표열기', '인용', 'quote'] },
      { char: '”', keywords: ['큰따옴표닫기', '인용', 'quote'] },
      { char: '‘', keywords: ['작은따옴표열기', '인용', 'quote'] },
      { char: '’', keywords: ['작은따옴표닫기', '인용', 'quote'] },
      { char: '〔', keywords: ['거북등괄호열기', 'bracket'] },
      { char: '〕', keywords: ['거북등괄호닫기', 'bracket'] },
      { char: '〘', keywords: ['이중거북등열기', 'bracket'] },
      { char: '〙', keywords: ['이중거북등닫기', 'bracket'] },
    ]
  },
  {
    id: 'units',
    label: '단위/수학/화폐',
    icon: '℃',
    items: [
      { char: '℃', keywords: ['섭씨', '온도', 'degree', 'celsius'] },
      { char: '℉', keywords: ['화씨', '온도', 'fahrenheit'] },
      { char: '㎡', keywords: ['제곱미터', '면적', '평수', 'square'] },
      { char: '㎥', keywords: ['세제곱미터', '부피', 'volume'] },
      { char: '㎞', keywords: ['킬로미터', '거리', 'km'] },
      { char: '㎎', keywords: ['밀리그램', 'mg'] },
      { char: '㎏', keywords: ['킬로그램', 'kg'] },
      { char: '㎾', keywords: ['킬로와트', '전력', 'kw'] },
      { char: '㎧', keywords: ['초속', '풍속', '속도'] },
      { char: '±', keywords: ['플러스마이너스', '오차', 'plusminus'] },
      { char: '×', keywords: ['곱하기', '곱셈', 'multiply'] },
      { char: '÷', keywords: ['나누기', '나눗셈', 'divide'] },
      { char: '≠', keywords: ['같지않다', '부등호', 'notequal'] },
      { char: '≤', keywords: ['작거나같다', '부등호'] },
      { char: '≥', keywords: ['크거나같다', '부등호'] },
      { char: '∞', keywords: ['무한대', '인피니티', 'infinity'] },
      { char: '‰', keywords: ['퍼밀', '천분율'] },
      { char: 'Å', keywords: ['옹스트롬', '길이'] },
      { char: '₩', keywords: ['원화', '원', '원화기호', 'won', 'krw'] },
      { char: '＄', keywords: ['달러', '달러기호', 'dollar', 'usd'] },
      { char: '€', keywords: ['유로', '유로화', 'euro'] },
      { char: '￡', keywords: ['파운드', 'pound'] },
      { char: '￥', keywords: ['엔화', '엔', '위안', 'yen'] },
    ]
  },
  {
    id: 'arrows',
    label: '화살표/방향',
    icon: '➔',
    items: [
      { char: '←', keywords: ['왼쪽화살표', '이전', 'left'] },
      { char: '→', keywords: ['오른쪽화살표', '다음', 'right'] },
      { char: '↑', keywords: ['위쪽화살표', '상승', 'up'] },
      { char: '↓', keywords: ['아래쪽화살표', '하강', 'down'] },
      { char: '↔', keywords: ['양방향화살표', 'leftright'] },
      { char: '↕', keywords: ['상하화살표', 'updown'] },
      { char: '↖', keywords: ['대각선왼쪽위'] },
      { char: '↗', keywords: ['대각선오른쪽위', '상승'] },
      { char: '↘', keywords: ['대각선오른쪽아래'] },
      { char: '↙', keywords: ['대각선왼쪽아래'] },
      { char: '⇄', keywords: ['교차화살표', '스왑'] },
      { char: '⇅', keywords: ['상하교차'] },
      { char: '↺', keywords: ['반시계회전', '되돌림'] },
      { char: '↻', keywords: ['시계회전', '새로고침'] },
      { char: '⇒', keywords: ['이중오른쪽화살표', '결과'] },
      { char: '⇔', keywords: ['이중양방향화살표', '동치'] },
    ]
  },
  {
    id: 'work',
    label: '기호/업무',
    icon: '📌',
    items: [
      { char: '✅', keywords: ['체크', '완료', '성공', 'check', 'done', 'yes', 'ok'] },
      { char: '❌', keywords: ['실패', '오류', '취소', 'cross', 'fail', 'no', 'cancel'] },
      { char: '⚠️', keywords: ['경고', '주의', '위험', 'warning', 'alert', 'caution'] },
      { char: '📌', keywords: ['핀', '고정', '중요', 'pin', 'stick'] },
      { char: '💡', keywords: ['전구', '아이디어', '팁', '생각', 'bulb', 'idea', 'tip'] },
      { char: '📝', keywords: ['메모', '작성', '기록', '문서', 'memo', 'write', 'note'] },
      { char: '🎯', keywords: ['목표', '과녁', '타겟', 'target', 'goal'] },
      { char: '🔍', keywords: ['돋보기', '검색', '조사', 'search', 'find'] },
      { char: '📊', keywords: ['차트', '통계', '그래프', 'chart', 'bar', 'graph'] },
      { char: '📈', keywords: ['상승', '성장', 'up', 'trend', 'growth'] },
      { char: '📉', keywords: ['하락', '감소', 'down', 'decline'] },
      { char: '🏷️', keywords: ['태그', '라벨', 'tag', 'label'] },
      { char: '🔒', keywords: ['자물쇠', '보안', '잠금', 'lock', 'secure'] },
      { char: '🔑', keywords: ['열쇠', '키', 'key', 'auth'] },
      { char: '📅', keywords: ['달력', '날짜', '일정', 'calendar', 'date'] },
      { char: '⏰', keywords: ['시계', '알람', '시간', 'clock', 'time', 'alarm'] },
      { char: '🔔', keywords: ['종', '알림', '공지', 'bell', 'alert', 'notice'] },
      { char: '📎', keywords: ['클립', '첨부', 'clip', 'attach'] },
      { char: '💬', keywords: ['말풍선', '댓글', '대화', 'chat', 'comment'] },
      { char: '💭', keywords: ['생각', '고민', 'thought', 'think'] },
      { char: '🛡️', keywords: ['방패', '보호', '가드', 'shield', 'guard'] },
      { char: '⚡', keywords: ['번개', '빠른', '즉시', 'lightning', 'fast', 'zap'] },
      { char: '🏆', keywords: ['트로피', '우승', '성공', 'trophy', 'win'] },
      { char: '💎', keywords: ['보석', '다이아', '프리미엄', 'diamond', 'gem'] },
    ]
  },
  {
    id: 'dev',
    label: '개발/기술',
    icon: '🚀',
    items: [
      { char: '💻', keywords: ['컴퓨터', '노트북', 'PC', 'computer', 'laptop'] },
      { char: '⚙️', keywords: ['기어', '설정', '옵션', 'gear', 'setting'] },
      { char: '🚀', keywords: ['로켓', '배포', '출시', '시작', 'rocket', 'launch', 'deploy'] },
      { char: '📦', keywords: ['패키지', '박스', '모듈', 'package', 'box', 'module'] },
      { char: '🐛', keywords: ['버그', '에러', '결함', 'bug', 'error', 'fix'] },
      { char: '🌐', keywords: ['지구', '웹', '네트워크', '인터넷', 'web', 'internet', 'global'] },
      { char: '🛠️', keywords: ['공구', '도구', '수리', 'tools', 'repair', 'build'] },
      { char: '🔌', keywords: ['플러그', '연결', '플러그인', 'plug', 'plugin', 'connect'] },
      { char: '🖥️', keywords: ['모니터', '화면', '데스크톱', 'desktop', 'monitor'] },
      { char: '📱', keywords: ['스마트폰', '모바일', '폰', 'mobile', 'phone'] },
      { char: '💾', keywords: ['디스켓', '저장', 'save', 'disk'] },
      { char: '📂', keywords: ['폴더열림', '디렉터리', 'folder', 'directory'] },
      { char: '📁', keywords: ['폴더', '디렉터리', 'folder'] },
      { char: '📄', keywords: ['문서', '페이지', '파일', 'file', 'page', 'doc'] },
      { char: '🧩', keywords: ['퍼즐', '컴포넌트', '조각', 'puzzle', 'component'] },
      { char: '🧪', keywords: ['시험관', '테스트', '실험', 'test', 'experiment'] },
      { char: '📡', keywords: ['안테나', '통신', '신호', 'signal', 'satellite'] },
      { char: '🕹️', keywords: ['조이스틱', '게임', '컨트롤', 'game', 'control'] },
      { char: '⌨️', keywords: ['키보드', '입력', 'keyboard', 'type'] },
      { char: '🖱️', keywords: ['마우스', '클릭', 'mouse', 'click'] },
      { char: '🔋', keywords: ['배터리', '에너지', '전원', 'battery', 'power'] },
      { char: '🔬', keywords: ['현미경', '연구', '분석', 'microscope', 'research'] },
      { char: '🔭', keywords: ['망원경', '전망', '관찰', 'telescope', 'view'] },
      { char: '🪄', keywords: ['마법봉', '자동', 'AI', 'magic', 'wand'] },
    ]
  },
  {
    id: 'emotion',
    label: '감정/반응',
    icon: '😀',
    items: [
      { char: '👍', keywords: ['좋아요', '따봉', '추천', 'like', 'good', 'thumbsup'] },
      { char: '👎', keywords: ['싫어요', '비추', 'bad', 'dislike'] },
      { char: '🙌', keywords: ['만세', '환호', 'celebrate', 'hooray'] },
      { char: '🎉', keywords: ['축하', '파티', '폭죽', 'party', 'congrats'] },
      { char: '✨', keywords: ['반짝', '하이라이트', '새로운', 'sparkle', 'new', 'shine'] },
      { char: '🔥', keywords: ['불', '인기', '핫', '열정', 'fire', 'hot'] },
      { char: '👏', keywords: ['박수', '칭찬', 'clap', 'applause'] },
      { char: '🤝', keywords: ['악수', '협력', '파트너', 'handshake', 'deal'] },
      { char: '❤️', keywords: ['하트', '사랑', '좋음', 'heart', 'love'] },
      { char: '💯', keywords: ['100점', '만점', '완벽', 'hundred', 'perfect'] },
      { char: '⭐', keywords: ['별', '즐겨찾기', '중요', 'star', 'fav'] },
      { char: '🌟', keywords: ['빛나는별', '특별', 'glow', 'super'] },
      { char: '❓', keywords: ['물음표', '질문', '궁금', 'question', 'what'] },
      { char: '❗', keywords: ['느낌표', '강조', '주의', 'exclamation', 'important'] },
      { char: '😀', keywords: ['웃음', '기쁨', 'smile', 'happy'] },
      { char: '😃', keywords: ['미소', '행복', 'grin', 'joy'] },
      { char: '😄', keywords: ['웃는얼굴', '즐거움', 'laugh'] },
      { char: '😊', keywords: ['수줍은웃음', '따뜻', 'blush', 'warm'] },
      { char: '😍', keywords: ['반함', '하트눈', 'love', 'crush'] },
      { char: '🤔', keywords: ['고민', '생각중', 'thinking', 'ponder'] },
      { char: '😎', keywords: ['선글라스', '멋짐', 'cool', 'chill'] },
      { char: '🥳', keywords: ['생일', '축제', 'celebrate', 'party'] },
      { char: '😭', keywords: ['눈물', '슬픔', 'cry', 'sad'] },
      { char: '🤯', keywords: ['충격', '놀람', 'shock', 'mindblown'] },
      { char: '😁', keywords: ['활짝웃음', '기쁨', 'grin', 'happy'] },
      { char: '😂', keywords: ['웃겨서눈물', '폭소', 'lol', 'joy'] },
      { char: '🤣', keywords: ['뒤집어짐', '폭소', 'rofl', 'funny'] },
      { char: '😉', keywords: ['윙크', 'wink'] },
      { char: '😌', keywords: ['안도', '편안', 'relieved'] },
      { char: '🥰', keywords: ['행복', '사랑스러움', 'love', 'hearts'] },
      { char: '🤩', keywords: ['별눈', '감탄', '최고', 'starstruck', 'wow'] },
      { char: '🤗', keywords: ['포옹', '환영', 'hug', 'welcome'] },
      { char: '🤭', keywords: ['부끄', '놀람', 'oops'] },
      { char: '🤫', keywords: ['조용', '비밀', 'shh', 'secret'] },
      { char: '🤨', keywords: ['의심', '갸우뚱', 'suspect'] },
      { char: '😐', keywords: ['무표정', '보통', 'neutral'] },
      { char: '🙄', keywords: ['어이없음', '눈굴림', 'eyeroll'] },
      { char: '😴', keywords: ['졸림', '수면', '잠', 'sleep', 'tired'] },
      { char: '😷', keywords: ['마스크', '감기', '건강', 'mask', 'health'] },
      { char: '🤒', keywords: ['열', '아픔', 'sick'] },
      { char: '😵', keywords: ['어지러움', '혼란', 'dizzy'] },
      { char: '🥺', keywords: ['부탁', '애원', 'pleading'] },
      { char: '😤', keywords: ['화남', '의지', '열정', 'triumph'] },
      { char: '😠', keywords: ['화남', '분노', 'angry'] },
      { char: '😡', keywords: ['매우화남', '분노', 'rage'] },
      { char: '😱', keywords: ['경악', '공포', 'scream'] },
      { char: '😨', keywords: ['두려움', '걱정', 'fear'] },
      { char: '😰', keywords: ['식은땀', '긴장', 'anxious'] },
      { char: '🫡', keywords: ['충성', '경례', '확인', 'salute', 'roger'] },
      { char: '🫠', keywords: ['녹음', '멘붕', 'melt'] },
      { char: '🫶', keywords: ['손하트', '사랑', '감사', 'heart', 'thanks'] },
      { char: '🙏', keywords: ['부탁', '감사', '기도', 'please', 'thanks', 'pray'] },
      { char: '✌️', keywords: ['브이', '평화', '승리', 'peace', 'victory'] },
      { char: '👌', keywords: ['오케이', '좋아', '확인', 'ok', 'good'] },
      { char: '🤞', keywords: ['행운', '기원', 'fingerscrossed', 'luck'] },
      { char: '🤙', keywords: ['전화해', '멋짐', 'call', 'shaka'] },
      { char: '💪', keywords: ['힘', '파이팅', '강함', 'muscle', 'strong', 'fighting'] },
      { char: '👋', keywords: ['안녕', '인사', '손인사', 'wave', 'hello', 'bye'] },
      { char: '🙋', keywords: ['손들기', '질문', '저요', 'raisehand', 'question'] },
      { char: '🙇', keywords: ['인사', '사과', '감사', 'bow', 'sorry'] },
      { char: '🤷', keywords: ['글쎄', '모름', 'shrug'] },
      { char: '🤦', keywords: ['이마짚', '실수', 'facepalm'] },
      { char: '💖', keywords: ['반짝하트', '사랑', 'sparklingheart'] },
      { char: '💙', keywords: ['파란하트', '신뢰', 'blueheart'] },
      { char: '💚', keywords: ['초록하트', '자연', 'greenheart'] },
      { char: '💛', keywords: ['노란하트', '우정', 'yellowheart'] },
      { char: '💜', keywords: ['보라하트', 'purpleheart'] },
      { char: '🧡', keywords: ['주황하트', 'orangeheart'] },
      { char: '🤍', keywords: ['흰하트', 'whiteheart'] },
      { char: '💔', keywords: ['깨진하트', '실망', 'brokenheart'] },
    ]
  },
  {
    id: 'bullets',
    label: '목록/구분',
    icon: '📋',
    items: [
      { char: '▶️', keywords: ['재생', '화살표', '진행', 'play', 'arrow'] },
      { char: '◀️', keywords: ['뒤로', '이전', 'back', 'prev'] },
      { char: '🔼', keywords: ['위', '증가', 'up'] },
      { char: '🔽', keywords: ['아래', '감소', 'down'] },
      { char: '🔹', keywords: ['파란다이아', '불릿', 'bullet', 'blue'] },
      { char: '🔸', keywords: ['주황다이아', '불릿', 'bullet', 'orange'] },
      { char: '▫️', keywords: ['작은네모', '불릿', 'square', 'small'] },
      { char: '▪️', keywords: ['작은검은네모', '불릿', 'black', 'square'] },
      { char: '🔘', keywords: ['라디오버튼', '선택', 'radio', 'circle'] },
      { char: '⚪', keywords: ['흰원', '원', 'white', 'circle'] },
      { char: '⚫', keywords: ['검은원', '원', 'black', 'circle'] },
      { char: '🔴', keywords: ['빨간원', '중요', 'red', 'circle'] },
      { char: '🟢', keywords: ['초록원', '정상', 'green', 'circle'] },
      { char: '🟡', keywords: ['노란원', '대기', 'yellow', 'circle'] },
      { char: '🟣', keywords: ['보라원', 'purple', 'circle'] },
      { char: '➡️', keywords: ['오른쪽화살표', '다음', 'right', 'next'] },
      { char: '⬅️', keywords: ['왼쪽화살표', '이전', 'left', 'prev'] },
      { char: '⬆️', keywords: ['위쪽화살표', 'up'] },
      { char: '⬇️', keywords: ['아래쪽화살표', 'down'] },
      { char: '↩️', keywords: ['리턴', '되돌림', 'return', 'undo'] },
      { char: '↪️', keywords: ['앞으로', 'redo'] },
      { char: '🔄', keywords: ['새로고침', '순환', '동기화', 'refresh', 'sync'] },
      { char: '✔️', keywords: ['체크마크', '확인', 'check'] },
      { char: '➕', keywords: ['더하기', '추가', 'plus', 'add'] },
    ]
  },
  {
    id: 'media',
    label: '미디어/서식',
    icon: '🎨',
    items: [
      { char: '🎨', keywords: ['팔레트', '미술', '디자인', 'art', 'palette', 'color'] },
      { char: '📷', keywords: ['카메라', '사진', 'camera', 'photo'] },
      { char: '🎥', keywords: ['동영상', '영화', '비디오', 'video', 'movie'] },
      { char: '🎵', keywords: ['음표', '음악', 'music', 'note'] },
      { char: '🎬', keywords: ['슬레이트', '연출', 'clapper', 'film'] },
      { char: '🖌️', keywords: ['붓', '페인트', 'brush', 'paint'] },
      { char: '📐', keywords: ['삼각자', '설계', 'ruler', 'angle'] },
      { char: '📏', keywords: ['자', '측정', 'ruler', 'length'] },
      { char: '🖼️', keywords: ['액자', '갤러리', 'frame', 'picture'] },
      { char: '🖋️', keywords: ['만년필', '서명', 'pen', 'fountain'] },
      { char: '✒️', keywords: ['깃펜', '글', 'nib', 'write'] },
      { char: '✂️', keywords: ['가위', '자르기', 'scissors', 'cut'] },
      { char: '🎭', keywords: ['가면', '연극', 'theater', 'mask'] },
      { char: '🎪', keywords: ['서커스', '이벤트', 'circus', 'event'] },
      { char: '🎫', keywords: ['티켓', '입장권', 'ticket'] },
      { char: '🎤', keywords: ['마이크', '음성', 'mic', 'voice'] },
      { char: '🎧', keywords: ['헤드폰', '오디오', 'headphone', 'audio'] },
      { char: '🎸', keywords: ['기타', '악기', 'guitar'] },
      { char: '🎹', keywords: ['피아노', '키보드', 'piano'] },
      { char: '🥁', keywords: ['드럼', 'drum'] },
      { char: '🎷', keywords: ['색소폰', 'saxophone'] },
      { char: '🎺', keywords: ['트럼펫', 'trumpet'] },
      { char: '🎻', keywords: ['바이올린', 'violin'] },
      { char: '🎼', keywords: ['악보', 'score'] },
    ]
  },
  {
    id: 'nature',
    label: '일상/자연',
    icon: '🌍',
    items: [
      { char: '☕', keywords: ['커피', '카페', '휴식', 'coffee', 'break'] },
      { char: '🍎', keywords: ['사과', '과일', 'apple', 'fruit'] },
      { char: '🍕', keywords: ['피자', '음식', 'pizza', 'food'] },
      { char: '🍔', keywords: ['햄버거', '식사', 'burger'] },
      { char: '🍺', keywords: ['맥주', '축하', 'beer'] },
      { char: '🏠', keywords: ['집', '홈', 'home', 'house'] },
      { char: '🏢', keywords: ['회사', '빌딩', '사무실', 'office', 'building'] },
      { char: '🚗', keywords: ['자동차', '이동', 'car', 'travel'] },
      { char: '✈️', keywords: ['비행기', '여행', '출장', 'plane', 'trip'] },
      { char: '🚲', keywords: ['자전거', 'bike', 'cycle'] },
      { char: '🌲', keywords: ['나무', '숲', '자연', 'tree', 'nature'] },
      { char: '🌸', keywords: ['벚꽃', '봄', 'flower', 'blossom'] },
      { char: '🍀', keywords: ['네잎클로버', '행운', 'clover', 'luck'] },
      { char: '🌿', keywords: ['풀잎', '새싹', 'herb', 'plant'] },
      { char: '☀️', keywords: ['태양', '맑음', 'sun', 'bright'] },
      { char: '🌙', keywords: ['달', '밤', '야간', 'moon', 'night'] },
      { char: '🌈', keywords: ['무지개', '희망', 'rainbow'] },
      { char: '💧', keywords: ['물방울', 'drop', 'water'] },
      { char: '🎁', keywords: ['선물', '기프트', 'gift', 'present'] },
      { char: '🎈', keywords: ['풍선', '축하', 'balloon'] },
      { char: '🛍️', keywords: ['쇼핑', '구매', 'shopping', 'bag'] },
      { char: '💌', keywords: ['편지', '메시지', 'love', 'letter'] },
      { char: '📮', keywords: ['우체통', 'mailbox'] },
      { char: '📚', keywords: ['책', '공부', '독서', 'books', 'study'] },
      { char: '🌊', keywords: ['파도', '바다', '여름', 'wave', 'ocean', 'sea'] },
      { char: '⛰️', keywords: ['산', '등산', 'mountain'] },
      { char: '🏕️', keywords: ['캠핑', '야외', 'camping'] },
      { char: '🏖️', keywords: ['해변', '휴가', 'beach', 'vacation'] },
      { char: '🌅', keywords: ['일출', '아침', 'sunrise'] },
      { char: '🌆', keywords: ['노을', '저녁', '도시', 'sunset', 'city'] },
      { char: '⭐', keywords: ['별', '밤', 'star'] },
      { char: '❄️', keywords: ['눈', '겨울', '차가움', 'snow', 'winter'] },
      { char: '⛄', keywords: ['눈사람', '겨울', 'snowman'] },
      { char: '☔', keywords: ['비', '우산', '장마', 'rain', 'umbrella'] },
      { char: '⚡', keywords: ['번개', '천둥', 'lightning'] },
      { char: '🌪️', keywords: ['태풍', '바람', 'tornado'] },
      { char: '🌻', keywords: ['해바라기', '꽃', 'sunflower'] },
      { char: '🌹', keywords: ['장미', '꽃', 'rose'] },
      { char: '🌷', keywords: ['튤립', '봄', 'tulip'] },
      { char: '🍁', keywords: ['단풍', '가을', 'maple', 'autumn'] },
      { char: '🌱', keywords: ['새싹', '시작', '성장', 'sprout', 'seedling'] },
      { char: '🐶', keywords: ['강아지', '개', 'dog', 'puppy'] },
      { char: '🐱', keywords: ['고양이', '냥이', 'cat'] },
      { char: '🐰', keywords: ['토끼', 'rabbit', 'bunny'] },
      { char: '🦊', keywords: ['여우', 'fox'] },
      { char: '🐻', keywords: ['곰', 'bear'] },
      { char: '🐼', keywords: ['판다', 'panda'] },
      { char: '🦁', keywords: ['사자', 'lion'] },
      { char: '🐧', keywords: ['펭귄', 'penguin'] },
      { char: '🦉', keywords: ['부엉이', '지혜', 'owl'] },
      { char: '🦋', keywords: ['나비', '변화', 'butterfly'] },
      { char: '🐝', keywords: ['꿀벌', '성실', 'bee'] },
      { char: '🚀', keywords: ['로켓', '우주', 'rocket'] },
      { char: '🚆', keywords: ['기차', '지하철', '출근', 'train', 'metro'] },
      { char: '🚌', keywords: ['버스', '대중교통', 'bus'] },
      { char: '🚢', keywords: ['배', '선박', 'ship'] },
    ]
  },
  {
    id: 'food',
    label: '음식/카페',
    icon: '🍽️',
    items: [
      { char: '☕', keywords: ['커피', '아메리카노', '카페', 'coffee', 'cafe'] },
      { char: '🍵', keywords: ['녹차', '차', '티타임', 'tea', 'greentea'] },
      { char: '🧋', keywords: ['버블티', '밀크티', '음료', 'boba', 'bubbletea'] },
      { char: '🧃', keywords: ['주스', '음료', 'juice'] },
      { char: '🥛', keywords: ['우유', 'milk'] },
      { char: '🥐', keywords: ['크루아상', '빵', '베이커리', 'croissant', 'bread'] },
      { char: '🍞', keywords: ['식빵', '빵', 'bread'] },
      { char: '🍰', keywords: ['케이크', '디저트', '생일', 'cake', 'dessert'] },
      { char: '🧁', keywords: ['컵케이크', '디저트', 'cupcake'] },
      { char: '🍪', keywords: ['쿠키', '과자', 'cookie'] },
      { char: '🍩', keywords: ['도넛', '간식', 'donut'] },
      { char: '🍫', keywords: ['초콜릿', '달콤', 'chocolate'] },
      { char: '🍦', keywords: ['아이스크림', '여름', 'icecream'] },
      { char: '🍓', keywords: ['딸기', '과일', 'strawberry'] },
      { char: '🍇', keywords: ['포도', '과일', 'grape'] },
      { char: '🍉', keywords: ['수박', '여름', 'watermelon'] },
      { char: '🍊', keywords: ['오렌지', '귤', 'orange'] },
      { char: '🍌', keywords: ['바나나', '과일', 'banana'] },
      { char: '🥑', keywords: ['아보카도', '건강', 'avocado'] },
      { char: '🥗', keywords: ['샐러드', '다이어트', '건강', 'salad'] },
      { char: '🍜', keywords: ['라면', '국수', '면', 'noodle', 'ramen'] },
      { char: '🍝', keywords: ['파스타', '스파게티', 'pasta'] },
      { char: '🍛', keywords: ['카레', '덮밥', 'curry'] },
      { char: '🍱', keywords: ['도시락', '점심', 'bento', 'lunch'] },
      { char: '🍙', keywords: ['삼각김밥', '주먹밥', 'onigiri'] },
      { char: '🍣', keywords: ['초밥', '스시', '일식', 'sushi'] },
      { char: '🍗', keywords: ['치킨', '닭다리', 'chicken'] },
      { char: '🥩', keywords: ['스테이크', '고기', 'steak', 'meat'] },
      { char: '🍷', keywords: ['와인', '저녁', 'wine'] },
      { char: '🥂', keywords: ['샴페인', '건배', '축하', 'cheers', 'champagne'] },
    ]
  },
  {
    id: 'office',
    label: '일정/비즈니스',
    icon: '💼',
    items: [
      { char: '💼', keywords: ['서류가방', '비즈니스', '업무', '직장', 'business', 'work'] },
      { char: '🏢', keywords: ['회사', '오피스', '본사', 'office', 'company'] },
      { char: '🏛️', keywords: ['기관', '공공기관', '관공서', 'government', 'institution'] },
      { char: '🏦', keywords: ['은행', '금융', '예산', 'bank', 'finance'] },
      { char: '💰', keywords: ['돈', '예산', '비용', '수익', 'money', 'budget'] },
      { char: '💳', keywords: ['카드', '결제', '비용', 'card', 'payment'] },
      { char: '🧾', keywords: ['영수증', '정산', '명세서', 'receipt', 'invoice'] },
      { char: '📋', keywords: ['클립보드', '체크리스트', '계획', 'clipboard', 'plan'] },
      { char: '🗓️', keywords: ['달력', '일정표', '스케줄', 'schedule', 'calendar'] },
      { char: '⏳', keywords: ['모래시계', '대기', '진행중', 'hourglass', 'pending'] },
      { char: '⌛', keywords: ['마감', '시간종료', 'deadline'] },
      { char: '⏱️', keywords: ['스톱워치', '측정', '타이머', 'timer', 'stopwatch'] },
      { char: '📬', keywords: ['메일함', '수신', '안내', 'inbox', 'mail'] },
      { char: '📧', keywords: ['이메일', '메일', '연락', 'email', 'contact'] },
      { char: '📞', keywords: ['전화', '연락처', '문의', 'phone', 'call'] },
      { char: '📍', keywords: ['위치', '장소', '주소', '지도', 'location', 'map'] },
      { char: '🗺️', keywords: ['지도', '경로', '약도', 'map', 'route'] },
      { char: '🧭', keywords: ['나침반', '방향', '가이드', 'compass', 'guide'] },
      { char: '⚖️', keywords: ['저울', '규정', '법률', '균형', 'law', 'balance'] },
      { char: '📜', keywords: ['계약', '규정', '조항', 'contract', 'policy'] },
      { char: '🎓', keywords: ['학사모', '교육', '강의', '수료', 'education', 'course'] },
      { char: '🏅', keywords: ['메달', '우수', '인증', 'medal', 'award'] },
      { char: '🥇', keywords: ['금메달', '1위', '최우수', 'gold', 'first'] },
      { char: '🥈', keywords: ['은메달', '2위', '우수', 'silver', 'second'] },
      { char: '🥉', keywords: ['동메달', '3위', '장려', 'bronze', 'third'] },
      { char: '👥', keywords: ['팀', '협업', '사용자', '그룹', 'team', 'users'] },
      { char: '👤', keywords: ['사용자', '담당자', '개인', 'user', 'person'] },
      { char: '🧑‍💻', keywords: ['개발자', '담당자', '작업자', 'developer', 'worker'] },
      { char: '🧑‍🏫', keywords: ['강사', '발표자', '멘토', 'teacher', 'mentor'] },
      { char: '📣', keywords: ['공지', '발표', '홍보', 'announce', 'megaphone'] },
    ]
  }
];

const DEFAULT_RECENTS = ['✅', '💡', '📌', '🚀', '🔥', '✨', '📝', '⚠️', '👍', '🎯', '💻', '⭐', '❤️', '🎉', '🔍', '📊'];
const STORAGE_KEY = 'onrivi_recent_emojis';

interface EmojiPanelProps {
  onClose: () => void;
  onInsert?: (emoji: string) => void;
  isToolbarOpen?: boolean;
}

export default function EmojiPanel({ onClose, onInsert, isToolbarOpen: propIsToolbarOpen }: EmojiPanelProps) {
  const { isToolbarOpen: contextIsToolbarOpen } = useEditorContext();
  const isToolbarOpen = propIsToolbarOpen ?? contextIsToolbarOpen ?? true;
  const [activeCategory, setActiveCategory] = useState<string>('work');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(DEFAULT_RECENTS);
  const [copiedEmoji, setCopiedEmoji] = useState<string | null>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopImmediatePropagation(); onClose();
    };
    window.addEventListener('keydown', closeOnEscape, true);
    return () => window.removeEventListener('keydown', closeOnEscape, true);
  }, [onClose]);

  // 1. 최근 사용 이모지 localStorage 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentEmojis(parsed.slice(0, 24));
        }
      }
    } catch (e) {
      console.warn('[EmojiPanel] Failed to load recent emojis:', e);
    }
  }, []);

  // 2. 이모지 클릭 시 본문 커서 삽입 및 최근 목록 갱신
  const handleSelectEmoji = useCallback((char: string) => {
    // A. 에디터 커서 위치 삽입
    if (onInsert) {
      onInsert(char);
    } else {
      window.dispatchEvent(new CustomEvent('app:insert-at-cursor', { detail: char }));
    }

    // C. 최근 사용 목록 맨 앞 추가
    setRecentEmojis(prev => {
      const next = [char, ...prev.filter(e => e !== char)].slice(0, 24);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });

    // D. 시각적 클릭 피드백
    setCopiedEmoji(char);
    setTimeout(() => setCopiedEmoji(null), 1000);
  }, [onInsert]);

  // 3. 실시간 검색 필터링
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const matched: EmojiItem[] = [];
    EMOJI_CATEGORIES.forEach(cat => {
      cat.items.forEach(item => {
        if (item.char === q || item.keywords.some(k => k.toLowerCase().includes(q))) {
          if (!matched.some(m => m.char === item.char)) {
            matched.push(item);
          }
        }
      });
    });
    return matched;
  }, [searchQuery]);

  const currentCategoryData = useMemo(() => {
    return EMOJI_CATEGORIES.find(c => c.id === activeCategory) || EMOJI_CATEGORIES[0];
  }, [activeCategory]);

  return (
    <aside
      onMouseDown={(e) => {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
        }
      }}
      className={`no-print absolute top-0 bottom-0 ${
        isToolbarOpen ? 'right-12' : 'right-0'
      } w-80 flex flex-col bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-l border-zinc-200 dark:border-zinc-800 shadow-[-8px_0_30px_rgba(0,0,0,0.12)] dark:shadow-[-8px_0_30px_rgba(0,0,0,0.45)] z-[60] select-none animate-in slide-in-from-right-4 duration-200`}
      aria-label="이모지 보관함"
    >
      {/* ── 1. 패널 상단 헤더 ── */}
      <div className="h-12 px-3.5 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">😊</span>
          <div>
            <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-none">
              이모지 보관함
            </h3>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              클릭 시 커서 위치에 바로 삽입
            </span>
          </div>
        </div>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          title="이모지 패널 닫기 (Ctrl+Shift+E)"
        >
          <Icon name="Close" size={16} />
        </button>
      </div>

      {/* ── 2. 검색 입력창 ── */}
      <div className="p-2.5 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0 bg-white dark:bg-zinc-900">
        <div className="relative flex items-center">
          <span className="absolute left-2.5 text-zinc-400 dark:text-zinc-500 pointer-events-none">
            <Icon name="Search" size={13} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이모지·특수문자 검색 (예: 별, 체크, 화살표, 꿀팁, ①)..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-zinc-100/80 dark:bg-zinc-800/80 border border-transparent focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-lg outline-none transition-all placeholder:text-zinc-400"
          />
          {searchQuery && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              title="검색어 지우기"
            >
              <Icon name="Close" size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── 3. 카테고리 네비게이션 탭 (검색 중이 아닐 때만 노출) ── */}
      {!searchQuery && (
        <div className="px-2 pt-2 pb-1.5 flex items-center gap-1 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0 overflow-x-auto [scrollbar-width:none]">
          {EMOJI_CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg shrink-0 transition-all font-medium ${
                  isActive
                    ? 'bg-[#1d4ed8]/10 dark:bg-[#1d4ed8]/20 text-blue-700 dark:text-blue-400 font-bold shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                }`}
                title={cat.label}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── 4. 이모지 글리프 스크롤 본문 ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 [scrollbar-gutter:stable]">
        {/* A. 검색 결과 모드 */}
        {searchResults !== null ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                검색 결과 ({searchResults.length}개)
              </span>
            </div>
            {searchResults.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                일치하는 이모지가 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-1.5">
                {searchResults.map(item => (
                  <button
                    key={item.char}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectEmoji(item.char)}
                    className="w-10 h-10 flex items-center justify-center text-xl rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:scale-120 active:scale-95 transition-all cursor-pointer relative"
                    title={item.keywords.join(', ')}
                  >
                    {item.char}
                    {copiedEmoji === item.char && (
                      <span className="absolute inset-0 bg-blue-500/20 rounded-lg animate-ping pointer-events-none" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* B. 최근 / 자주 쓰는 이모지 섹션 */}
            {recentEmojis.length > 0 && (
              <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                    <span>⭐</span> 최근 및 자주 쓰는 이모지
                  </span>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setRecentEmojis(DEFAULT_RECENTS);
                      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RECENTS)); } catch (_) {}
                    }}
                    className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline"
                    title="기본값으로 재설정"
                  >
                    초기화
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {recentEmojis.map(emoji => (
                    <button
                      key={emoji}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectEmoji(emoji)}
                      className="w-10 h-10 flex items-center justify-center text-xl rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:scale-120 active:scale-95 transition-all cursor-pointer relative"
                      title={`${emoji} (클릭하여 삽입)`}
                    >
                      {emoji}
                      {copiedEmoji === emoji && (
                        <span className="absolute inset-0 bg-blue-500/20 rounded-lg animate-ping pointer-events-none" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* C. 현재 활성 카테고리 이모지 그리드 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <span>{currentCategoryData.icon}</span> {currentCategoryData.label} ({currentCategoryData.items.length}개)
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {currentCategoryData.items.map(item => (
                  <button
                    key={item.char}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectEmoji(item.char)}
                    className="w-10 h-10 flex items-center justify-center text-xl rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:scale-120 active:scale-95 transition-all cursor-pointer relative"
                    title={item.keywords.join(', ')}
                  >
                    {item.char}
                    {copiedEmoji === item.char && (
                      <span className="absolute inset-0 bg-blue-500/20 rounded-lg animate-ping pointer-events-none" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── 5. 하단 유용한 단축키 팁 ── */}
      <div className="p-2.5 px-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 shrink-0 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
        <span>💡 단축키: <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-[10px] text-zinc-700 dark:text-zinc-300">Ctrl+Shift+E</kbd></span>
        <span className="text-[10px] text-zinc-400">클릭 시 클립보드도 복사</span>
      </div>
    </aside>
  );
}
