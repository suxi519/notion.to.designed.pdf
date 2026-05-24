import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNotionConversion } from './use-notion-conversion';
import { useConversionStore } from '@/stores/conversion-store';
import { createQueryWrapper } from '@/test/utils';
import { NotionApiError } from '@/lib/api/notion';

// loadNotionPage를 경계(boundary) mock
vi.mock('@/lib/api/notion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/notion')>();
  return {
    ...actual,
    loadNotionPage: vi.fn(),
  };
});

// toast를 spy
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const mockPageData = {
  pageId: 'abc123def456abc123def456abc123de',
  title: '테스트 페이지',
  blocks: [{ id: 'b1', type: 'text' as const }],
};

const VALID_URL =
  'https://notion.so/My-Page-abc123def456abc123def456abc123de';
const EXPECTED_PAGE_ID = 'abc123def456abc123def456abc123de';

function setup() {
  const { QueryWrapper } = createQueryWrapper();
  return renderHook(() => useNotionConversion(), { wrapper: QueryWrapper });
}

describe('useNotionConversion', () => {
  beforeEach(() => {
    useConversionStore.getState().reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    useConversionStore.getState().reset();
  });

  // AC6: 초기 status가 idle이어야 한다
  it('초기 status가 idle이다', async () => {
    const { result } = setup();
    await waitFor(() => {
      expect(result.current.status).toBe('idle');
    });
    expect(result.current.isConverting).toBe(false);
    expect(result.current.pageData).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });

  // AC3: extractPageId가 호출되어 유효한 pageId를 store에 설정한다
  it('startConversion에 유효한 notion.so URL을 전달하면 extractPageId로 pageId를 추출해 store에 설정한다', async () => {
    const { loadNotionPage } = await import('@/lib/api/notion');
    vi.mocked(loadNotionPage).mockReturnValue(new Promise(() => {}));

    const { result } = setup();

    await act(async () => {
      result.current.startConversion(VALID_URL);
    });

    await waitFor(() => {
      expect(useConversionStore.getState().pageId).toBe(EXPECTED_PAGE_ID);
    });
  });

  // AC3: pageId를 추출할 수 없는 URL은 toast.error를 호출하고 store를 변경하지 않는다
  it('pageId를 추출할 수 없는 URL이면 toast.error를 호출하고 pageId는 null을 유지한다', async () => {
    const { toast } = await import('sonner');
    const { result } = setup();

    await act(async () => {
      result.current.startConversion('https://notion.so/no-valid-id-here');
    });

    expect(toast.error).toHaveBeenCalledWith(
      'URL에서 페이지 ID를 추출할 수 없습니다.',
    );
    expect(useConversionStore.getState().pageId).toBeNull();
  });

  // AC6: fetching 중 status가 loading으로 파생된다 (useMemo 직접 파생 검증)
  it('pageId 설정 후 쿼리가 fetching 중이면 status가 loading으로 파생된다', async () => {
    const { loadNotionPage } = await import('@/lib/api/notion');
    // 영원히 pending 상태를 유지하는 Promise로 loading 상태 재현
    vi.mocked(loadNotionPage).mockReturnValue(new Promise(() => {}));

    const { result } = setup();

    await act(async () => {
      result.current.startConversion(VALID_URL);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('loading');
    });
    expect(result.current.isConverting).toBe(true);
  });

  // AC1: 쿼리 성공 시 status가 success로 파생되고 pageData가 올바르게 반환된다
  it('쿼리 성공 시 status가 success이고 pageData가 반환된다', async () => {
    const { loadNotionPage } = await import('@/lib/api/notion');
    vi.mocked(loadNotionPage).mockResolvedValue(mockPageData);

    const { result } = setup();

    await act(async () => {
      result.current.startConversion(VALID_URL);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.pageData).toEqual(mockPageData);
    expect(result.current.isConverting).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  // AC4: 쿼리 실패 시 status가 error로 파생되고 errorMessage가 설정된다
  it('쿼리 실패 시 status가 error이고 errorMessage가 파생된다', async () => {
    const { loadNotionPage } = await import('@/lib/api/notion');
    vi.mocked(loadNotionPage).mockRejectedValue(
      new NotionApiError(
        '페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.',
        404,
      ),
    );

    const { result } = setup();

    await act(async () => {
      result.current.startConversion(VALID_URL);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.errorMessage).toBe(
      '페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.',
    );
    expect(result.current.pageData).toBeNull();
    expect(result.current.isConverting).toBe(false);
  });

  // AC4: 에러 메시지가 비어 있으면 기본 fallback 메시지를 반환한다
  it('에러 메시지가 빈 문자열이면 기본 메시지를 errorMessage로 파생한다', async () => {
    const { loadNotionPage } = await import('@/lib/api/notion');
    vi.mocked(loadNotionPage).mockRejectedValue(new NotionApiError('', 500));

    const { result } = setup();

    await act(async () => {
      result.current.startConversion(VALID_URL);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.errorMessage).toBe(
      '페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.',
    );
  });

  // AC4: 에러 발생 시 toast.error가 duration:4000과 함께 호출된다
  it('쿼리 실패 시 toast.error가 에러 메시지와 duration:4000으로 호출된다', async () => {
    const { loadNotionPage } = await import('@/lib/api/notion');
    const { toast } = await import('sonner');
    vi.mocked(loadNotionPage).mockRejectedValue(
      new NotionApiError(
        '페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.',
        404,
      ),
    );

    const { result } = setup();

    await act(async () => {
      result.current.startConversion(VALID_URL);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(toast.error).toHaveBeenCalledWith(
      '페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.',
      { duration: 4000 },
    );
  });

  // AC4: 동일한 error 객체에 대해 toast.error가 한 번만 호출된다 (useRef 가드 검증)
  it('동일한 error 객체에 대해 toast.error는 한 번만 호출된다', async () => {
    const { loadNotionPage } = await import('@/lib/api/notion');
    const { toast } = await import('sonner');
    const errorInstance = new NotionApiError(
      '페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.',
      404,
    );
    vi.mocked(loadNotionPage).mockRejectedValue(errorInstance);

    const { result, rerender } = setup();

    await act(async () => {
      result.current.startConversion(VALID_URL);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    // rerender해도 동일 error 객체이므로 toast는 추가 호출되지 않아야 한다
    rerender();
    rerender();

    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  // AC5: reset 호출 시 store pageId가 null이 되어 status idle로 전환된다
  it('reset 호출 시 store의 pageId가 null로 초기화된다', async () => {
    const { loadNotionPage } = await import('@/lib/api/notion');
    vi.mocked(loadNotionPage).mockResolvedValue(mockPageData);

    const { result } = setup();

    await act(async () => {
      result.current.startConversion(VALID_URL);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    await act(async () => {
      result.current.reset();
    });

    await waitFor(() => {
      expect(useConversionStore.getState().pageId).toBeNull();
    });
    expect(useConversionStore.getState().status).toBe('idle');
  });

  // pageId가 null인 경우 쿼리가 실행되지 않아 status는 idle이다 (useMemo 파생)
  it('pageId가 null인 상태에서는 status가 idle이다', async () => {
    const { result } = setup();
    await waitFor(() => {
      expect(result.current.status).toBe('idle');
    });
    expect(useConversionStore.getState().pageId).toBeNull();
  });
});
