import type { Metadata } from 'next';
import { getAllBlogPosts, getBlogPostBySlug, getPostThumbnail } from '@/lib/blogData';

// 정적 내보내기는 빌드 시 공개 글의 모든 슬러그를 알아야 한다.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllBlogPosts().map(post => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getBlogPostBySlug(params.slug);
  if (!post) return { title: '게시글을 찾을 수 없습니다' };
  const canonical = `/blog/${post.slug}`;
  const image = getPostThumbnail(post);
  return {
    title: `${post.title} | Onrivi Blog`,
    description: post.excerpt,
    alternates: { canonical },
    openGraph: {
      title: post.title, description: post.excerpt, url: canonical,
      type: 'article', images: [image],
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.excerpt, images: [image] },
  };
}

export default function BlogDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
