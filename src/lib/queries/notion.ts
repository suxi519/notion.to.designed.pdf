import { useQuery } from '@tanstack/react-query';
import { loadNotionPage } from '@/lib/api/notion';
import type { NotionPageData } from '@/lib/schemas/notion';

export const notionQueryKeys = {
  page: (pageId: string) => ['notion', 'page', pageId] as const,
} as const;

/**
 * Notion 페이지 데이터를 가져오는 TanStack Query 훅.
 * pageId가 null이면 쿼리를 실행하지 않는다.
 */
export function useNotionPage(pageId: string | null) {
  return useQuery<NotionPageData, Error>({
    queryKey: notionQueryKeys.page(pageId ?? ''),
    queryFn: () => loadNotionPage(pageId!),
    enabled: pageId !== null && pageId.length > 0,
    staleTime: 5 * 60 * 1000, // 5분
    retry: false,
  });
}
