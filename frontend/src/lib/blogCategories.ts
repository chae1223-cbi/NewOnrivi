import { useEffect, useState } from 'react';

export type BlogCategoryOption = { value: string; name: string; active: boolean };

let inFlight: Promise<BlogCategoryOption[]> | null = null;

// 공개 메뉴와 관리자 등록 폼이 같은 DB 공통코드 API를 읽는다.
export function loadBlogCategories(): Promise<BlogCategoryOption[]> {
  if (!inFlight) {
    inFlight = fetch('/api/blog/categories', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('블로그 분류를 불러오지 못했습니다.');
        const data = await response.json() as { categories?: BlogCategoryOption[] };
        if (!Array.isArray(data.categories)) throw new Error('블로그 분류 응답이 올바르지 않습니다.');
        return data.categories;
      })
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}

export function useBlogCategories(): BlogCategoryOption[] {
  const [categories, setCategories] = useState<BlogCategoryOption[]>([]);
  useEffect(() => {
    let active = true;
    void loadBlogCategories().then(items => { if (active) setCategories(items); })
      .catch(error => console.error('[blog categories]', error));
    return () => { active = false; };
  }, []);
  return categories;
}

export function categoryName(value: string, categories: BlogCategoryOption[]): string {
  return categories.find(category => category.value === value)?.name || value;
}
