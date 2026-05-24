import { NotionPageDataSchema, type NotionPageData } from '@/lib/schemas/notion';

export class NotionApiError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'NotionApiError';
    this.status = status;
  }
}

/**
 * /api/notion/load-page 프록시 엔드포인트를 통해 Notion 페이지 데이터를 가져온다.
 * 로컬: vercel dev 또는 Vite devProxy
 * 프로덕션: Vercel Edge Function (api/notion/load-page.ts)
 */
export async function loadNotionPage(pageId: string): Promise<NotionPageData> {
  let response: Response;
  try {
    response = await fetch('/api/notion/load-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId }),
    });
  } catch {
    throw new NotionApiError(
      '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    );
  }

  if (response.status === 401 || response.status === 404) {
    throw new NotionApiError(
      '페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.',
      response.status,
    );
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const message =
      typeof body['error'] === 'string'
        ? body['error']
        : '페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.';
    throw new NotionApiError(message, response.status);
  }

  const raw: unknown = await response.json();
  const parsed = NotionPageDataSchema.safeParse(
    (raw as Record<string, unknown>)['pageData'],
  );

  if (!parsed.success) {
    throw new NotionApiError('페이지 데이터 형식이 올바르지 않습니다.');
  }

  return parsed.data;
}
