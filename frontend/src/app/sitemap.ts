// ====================================================================
// 📊 [OMD-SEO-Sitemap-0001] sitemap.ts ➔ Sitemap Generator
// 🎯 @KICK  : 구글/네이버/빙 등 주요 검색엔진 및 AI 크롤러를 위한 동적 사이트맵(sitemap.xml) 생성
// 🛡️ @GUARD : 정적 라우트 중 공개 접근이 허용된 페이지만 등록, 관리자 및 편집기 경로는 제외
// 🚨 @PATCH : **2026-09-23** — [공개 서비스 페이지 사이트맵 일괄 등록]: 메인 랜딩 외 가이드 문서(/docs), 문의하기(/contact), 이용약관(/terms), 개인정보처리방침(/privacy)을 사이트맵에 추가하여 검색 색인 범위 및 SEO 노출 확대
// ====================================================================
import { MetadataRoute } from 'next';
import { getAllBlogPosts } from '@/lib/blogData';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://onrivi.com';
  const currentDate = new Date();

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...getAllBlogPosts().map(post => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.publishedAt.replace(/\./g, '-')),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
