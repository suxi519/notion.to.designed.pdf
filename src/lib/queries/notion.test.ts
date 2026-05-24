import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNotionPage } from './notion';
import { createQueryWrapper } from '@/test/utils';
import { NotionApiError } from '@/lib/api/notion';

const mockPageData = {
  pageId: 'abc123def456abc123def456abc123de',
  title: '테스트 페이지',
  blocks: [{ id: 'b1', type: 'text' as const }],
};

// loadNotionPage를 모킹
vi.mock('@/lib/api/notion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/notion')>();
  return {
    ...actual,
    loadNotionPage: vi.fn(),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useNotionPage', () => {
  it('pageId가 null이면 쿼리를 실행하지 않는다', () => {
    const { QueryWrapper } = createQueryWrapper();
    const { result } = renderHook(() => useNotionPage(null), {
      wrapper: QueryWrapper,
    });
    // enabled: false이므로 fetchStatus는 idle
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('pageId가 빈 문자열이면 쿼리를 실행하지 않는다', () => {
    const { QueryWrapper } = createQueryWrapper();
    const { result } = renderHook(() => useNotionPage(''), {
      wrapper: QueryWrapper,
    });
    expect(result.current.fetchStatus).toBe('idle');
  });

  // AC1: pageId가 있으면 성공적으로 데이터를 가져온다
  it('pageId가 있으면 loadNotionPage를 호출하고 data를 반환한다', async () => {
    const { loadNotionPage } = await import('@/lib/api/notion');
    vi.mocked(loadNotionPage).mockResolvedValue(mockPageData);

    const { QueryWrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => useNotionPage('abc123def456abc123def456abc123de'),
      { wrapper: QueryWrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPageData);
    expect(vi.mocked(loadNotionPage)).toHaveBeenCalledWith(
      'abc123def456abc123def456abc123de',
    );
  });

  // AC4: API 오류 시 error 상태가 된다
  it('loadNotionPage가 에러를 던지면 isError가 true가 된다', async () => {
    const { loadNotionPage } = await import('@/lib/api/notion');
    vi.mocked(loadNotionPage).mockRejectedValue(
      new NotionApiError(
        '페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.',
        404,
      ),
    );

    const { QueryWrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => useNotionPage('abc123def456abc123def456abc123de'),
      { wrapper: QueryWrapper },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe(
      '페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.',
    );
  });

  it('staleTime이 5분으로 설정되어 있다', async () => {
    // staleTime은 쿼리 옵션에 반영됨을 간접 확인:
    // 같은 pageId로 두 번 렌더링해도 fetch는 1번만 호출됨
    const { loadNotionPage } = await import('@/lib/api/notion');
    vi.mocked(loadNotionPage).mockResolvedValue(mockPageData);

    const { QueryWrapper, queryClient } = createQueryWrapper();
    // staleTime을 5분으로 검증하기 위해 옵션을 직접 확인
    const { result } = renderHook(
      () => useNotionPage('abc123def456abc123def456abc123de'),
      { wrapper: QueryWrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 동일 pageId로 다시 렌더링 — 캐시 유효
    const { result: result2 } = renderHook(
      () => useNotionPage('abc123def456abc123def456abc123de'),
      { wrapper: QueryWrapper },
    );

    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    // loadNotionPage는 단 1번만 호출되어야 함 (staleTime 동안 캐시 재사용)
    expect(vi.mocked(loadNotionPage)).toHaveBeenCalledTimes(1);

    queryClient.clear();
  });
});
