import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadNotionPage, NotionApiError } from './notion';

const mockPageData = {
  pageId: 'abc123def456abc123def456abc123de',
  title: '테스트 페이지',
  blocks: [{ id: 'block-001', type: 'text' as const }],
};

describe('loadNotionPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('성공 응답 시 NotionPageData를 반환한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ pageData: mockPageData }),
      }),
    );

    const result = await loadNotionPage('abc123def456abc123def456abc123de');
    expect(result).toEqual(mockPageData);
  });

  it('POST /api/notion/load-page 엔드포인트로 올바른 요청을 보낸다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ pageData: mockPageData }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await loadNotionPage('abc123def456abc123def456abc123de');

    expect(fetchMock).toHaveBeenCalledWith('/api/notion/load-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId: 'abc123def456abc123def456abc123de' }),
    });
  });

  // AC4: 401 응답 시 올바른 에러 메시지를 던진다
  it('401 응답 시 NotionApiError를 던지고 메시지가 비공개 페이지 안내다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      }),
    );

    await expect(
      loadNotionPage('abc123def456abc123def456abc123de'),
    ).rejects.toThrow(
      '페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.',
    );
  });

  // AC4: 404 응답 시 올바른 에러 메시지를 던진다
  it('404 응답 시 NotionApiError를 던지고 status가 404다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({}),
      }),
    );

    try {
      await loadNotionPage('abc123def456abc123def456abc123de');
      expect.fail('에러가 발생해야 합니다');
    } catch (e) {
      expect(e).toBeInstanceOf(NotionApiError);
      expect((e as NotionApiError).status).toBe(404);
    }
  });

  it('500 응답 시 서버 error 필드가 있으면 해당 메시지를 사용한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: '서버 내부 오류' }),
      }),
    );

    await expect(
      loadNotionPage('abc123def456abc123def456abc123de'),
    ).rejects.toThrow('서버 내부 오류');
  });

  it('500 응답에 error 필드가 없으면 기본 메시지를 사용한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    );

    await expect(
      loadNotionPage('abc123def456abc123def456abc123de'),
    ).rejects.toThrow(
      '페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.',
    );
  });

  // AC4: 네트워크 오류
  it('fetch 자체가 throw하면 네트워크 오류 메시지로 NotionApiError를 던진다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    await expect(
      loadNotionPage('abc123def456abc123def456abc123de'),
    ).rejects.toThrow(
      '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    );
  });

  it('응답 pageData가 스키마를 만족하지 않으면 파싱 에러를 던진다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        // blocks 필드 누락 — 스키마 검증 실패
        json: async () => ({
          pageData: { pageId: 'abc', title: '제목' },
        }),
      }),
    );

    await expect(
      loadNotionPage('abc123def456abc123def456abc123de'),
    ).rejects.toThrow('페이지 데이터 형식이 올바르지 않습니다.');
  });
});

describe('NotionApiError', () => {
  it('message와 status를 올바르게 가진다', () => {
    const err = new NotionApiError('에러 메시지', 403);
    expect(err.message).toBe('에러 메시지');
    expect(err.status).toBe(403);
    expect(err.name).toBe('NotionApiError');
    expect(err).toBeInstanceOf(Error);
  });

  it('status 없이도 생성할 수 있다', () => {
    const err = new NotionApiError('메시지만');
    expect(err.status).toBeUndefined();
  });
});
