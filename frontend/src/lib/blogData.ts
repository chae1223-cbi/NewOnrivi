// ====================================================================
// 📊 [OMD-DATA-blogData-0001] blogData ➔ 온리비 기술/가이드 블로그 데이터 모델 및 공개 스냅샷
// 🎯 @KICK  : 공개 블로그 게시글 데이터 모델과 빌드 시 생성한 DB 스냅샷 조회
// 🛡️ @GUARD : 공개 데이터는 빌드 스냅샷만 읽고 브라우저 저장소와 병합하지 않는다
// 🚨 @PATCH : **2026-09-26** — [사용자 지정 디폴트 썸네일 교체]: 사용자가 제공한 데스크 환경 사진으로 블로그 디폴트 커버(/blog/default-blog-cover.jpg?v=2) 업데이트
// 🚨 @PATCH : **2026-09-26** — [블로그 첫 번째 이미지 썸네일 자동 추출 및 디폴트 커버 적용]: 본문 내 첫 번째 이미지(Markdown/HTML) 썸네일 우선 지정, 미존재 시 고품질 디폴트 커버(/blog/default-blog-cover.jpg) 자동 폴백 함수 getPostThumbnail 신설
// 🚨 @PATCH : **2026-09-26** — [블로그 카테고리 개편]: 사용자 요청에 따라 '제품 소식' 카테고리 삭제 및 '사용자 팁' ➔ '사용자 활용'으로 명칭 변경
// 🚨 @PATCH : **2026-09-27** — [기본 글 제거]: 공개 목록은 DB 빌드 스냅샷만 사용한다.
// 🔗 @CALLS : blogSnapshot
// ====================================================================

import blogSnapshot from '@/generated/blogSnapshot.json';

export interface BlogAttachment {
  name: string;         // 표시 파일명 (예: "수원_1박2일_도보여행_원고.md")
  url: string;          // 다운로드 링크 (예: "/help/assets/suwon_travel_sample.md")
  size?: string;        // 파일 크기 (예: "15 KB")
  description?: string; // 파일 설명 (예: "실습용 마크다운 본문 원고")
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string; // BLOG_CATEGORY 공통코드의 code_value
  author: string;
  publishedAt: string; // YYYY.MM.DD
  readingTime: string; // 예: "3분"
  coverImage?: string;
  gradientBg?: string;
  tags: string[];
  isFeatured?: boolean;
  status?: "published" | "draft"; // 게시 상태
  deploymentStatus?: "draft" | "pending" | "live" | "failed";
  attachments?: BlogAttachment[]; // 첨부파일 다운로드 목록
}

export type BlogCategory = string;

/**
 * 공개 발행된 모든 블로그 포스트를 조회합니다. (초안 draft 제외)
 */
export function getAllBlogPosts(): BlogPost[] {
  return (blogSnapshot as BlogPost[]).filter(post => post.status !== 'draft');
}

/**
 * 슬러그(slug)로 공개 블로그 포스트를 조회합니다.
 */
export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return getAllBlogPosts().find(post => post.slug === slug);
}

export const DEFAULT_BLOG_COVER = "/blog/default-blog-cover.jpg?v=2";

/**
 * 글의 썸네일 이미지를 반환합니다.
 * 1. post.coverImage 가 유효하게 지정되어 있으면 해당 이미지 사용
 * 2. 없으면 post.content(마크다운 본문) 내 첫 번째 이미지(Markdown/HTML 태그) 자동 추출
 * 3. 본문에도 이미지가 없으면 디폴트 블로그 커버(/blog/default-blog-cover.jpg) 반환
 */
export function getPostThumbnail(post: BlogPost): string {
  if (post.coverImage && post.coverImage.trim()) {
    return post.coverImage.trim();
  }

  // 1. 마크다운 이미지 정규식: ![alt](url)
  const mdImgMatch = post.content.match(/!\[.*?\]\((https?:\/\/[^\s\)]+|\/[^\s\)]+)\)/);
  if (mdImgMatch && mdImgMatch[1]) {
    return mdImgMatch[1].trim();
  }

  // 2. HTML <img> 태그 정규식: <img ... src="url" ...>
  const htmlImgMatch = post.content.match(/<img[^>]+src=["'](https?:\/\/[^"']+|\/[^"']+)["']/i);
  if (htmlImgMatch && htmlImgMatch[1]) {
    return htmlImgMatch[1].trim();
  }

  return DEFAULT_BLOG_COVER;
}

/**
 * 에디터의 마크다운 텍스트와 파일명으로부터 포스트 메타데이터를 자동 추출합니다.
 */
export function extractPostFromMarkdown(markdown: string, fallbackTitle: string = "새로운 블로그 글") {
  const lines = markdown.split("\n");
  let title = "";
  let excerpt = "";

  // 1. 첫 번째 # 제목 찾기
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      title = trimmed.replace(/^#\s+/, "").trim();
      break;
    }
  }

  if (!title) {
    title = fallbackTitle.replace(/\.md$/i, "");
  }

  // 2. 첫 번째 일반 문단을 찾아 요약문으로 추출
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed &&
      !trimmed.startsWith("#") &&
      !trimmed.startsWith("```") &&
      !trimmed.startsWith("-") &&
      !trimmed.startsWith("*") &&
      !trimmed.startsWith(">") &&
      !trimmed.startsWith("|")
    ) {
      excerpt = trimmed.slice(0, 150);
      if (trimmed.length > 150) excerpt += "...";
      break;
    }
  }

  if (!excerpt) {
    excerpt = "온리비 어서(Onrivi Author)로 작성된 마크다운 포스트입니다.";
  }

  // 3. 본문 내 첫 번째 이미지 자동 추출 (없으면 디폴트 커버)
  const mdImgMatch = markdown.match(/!\[.*?\]\((https?:\/\/[^\s\)]+|\/[^\s\)]+)\)/);
  const htmlImgMatch = markdown.match(/<img[^>]+src=["'](https?:\/\/[^"']+|\/[^"']+)["']/i);
  const coverImage = mdImgMatch ? mdImgMatch[1].trim() : htmlImgMatch ? htmlImgMatch[1].trim() : DEFAULT_BLOG_COVER;

  return { title, excerpt, coverImage };
}
