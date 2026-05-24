import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useConversionStore } from '@/stores/conversion-store';
import { useNotionPage } from '@/lib/queries/notion';
import { extractPageId } from '@/lib/schemas/notion';
import type { NotionPageData } from '@/lib/schemas/notion';

/**
 * Notion 변환 흐름 전체를 캡슐화하는 훅.
 *
 * - URL 검증 + extractPageId 호출
 * - TanStack Query(useNotionPage) + Zustand store bridge
 * - 에러 메시지 표준화 (API 레이어 타입은 여기서만 처리)
 * - Routes는 이 훅 하나만 import한다.
 *
 * race condition 방지:
 *   status / pageData를 useEffect + setState 패턴 없이
 *   query 상태에서 useMemo로 직접 파생한다.
 *   에러 토스트는 useEffect로 처리하되 lastShownErrorRef로
 *   동일 error 객체가 반복 표시되는 것을 방지한다.
 */
export function useNotionConversion() {
  const { pageId, setPageId, reset } = useConversionStore();

  const query = useNotionPage(pageId);

  // query 상태를 직접 파생 — useEffect + store.setSuccess/setError 없음
  const status = useMemo<'idle' | 'loading' | 'success' | 'error'>(() => {
    if (pageId === null) return 'idle';
    if (query.isFetching) return 'loading';
    if (query.isSuccess) return 'success';
    if (query.isError) return 'error';
    return 'idle';
  }, [pageId, query.isFetching, query.isSuccess, query.isError]);

  const pageData: NotionPageData | null = query.data ?? null;

  const errorMessage: string | null = useMemo(() => {
    if (!query.isError || !query.error) return null;
    return query.error.message.length > 0
      ? query.error.message
      : '페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.';
  }, [query.isError, query.error]);

  // 에러 토스트: 동일 error 객체에 대해 한 번만 표시
  const lastShownErrorRef = useRef<Error | null>(null);
  useEffect(() => {
    if (!query.isError || !query.error) return;
    if (lastShownErrorRef.current === query.error) return;
    lastShownErrorRef.current = query.error;
    const message =
      query.error.message.length > 0
        ? query.error.message
        : '페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.';
    toast.error(message, { duration: 4000 });
  }, [query.isError, query.error]);

  /**
   * URL을 받아 pageId를 추출하고 쿼리를 시작한다.
   * URL 검증은 UrlInputForm의 Zod schema에서 이미 완료된 상태여야 한다.
   */
  function startConversion(url: string): void {
    const id = extractPageId(url);
    if (!id) {
      toast.error('URL에서 페이지 ID를 추출할 수 없습니다.');
      return;
    }
    setPageId(id);
  }

  return {
    status,
    pageData,
    errorMessage,
    isConverting: status === 'loading',
    startConversion,
    reset,
  };
}
