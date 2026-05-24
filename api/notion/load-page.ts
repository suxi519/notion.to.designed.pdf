import type { NotionPageData, NotionBlock } from '@/lib/schemas/notion';

const NOTION_API_URL = 'https://www.notion.so/api/v3/loadPageChunk';

// pageId는 32자 소문자 hex만 허용 (화이트리스트)
function isValidPageId(pageId: unknown): pageId is string {
  return typeof pageId === 'string' && /^[0-9a-f]{32}$/i.test(pageId);
}

// Notion API는 dash 포함 UUID (8-4-4-4-12) 형식을 요구하며,
// recordMap 의 block key 도 같은 형식이다.
function toDashedPageId(pageId: string): string {
  return `${pageId.slice(0, 8)}-${pageId.slice(8, 12)}-${pageId.slice(12, 16)}-${pageId.slice(16, 20)}-${pageId.slice(20, 32)}`;
}

// recordMap.block[id] 구조는 CRDT 도입 이후 { value: { value: <block> } } 로
// 한 단계 더 wrapping 되어 있다. 구 포맷도 호환을 위해 fallback 처리한다.
function unwrapBlock(
  entry: { value?: Record<string, unknown> } | undefined,
): Record<string, unknown> | undefined {
  const v1 = entry?.value;
  if (!v1) return undefined;
  const inner = v1['value'];
  if (inner && typeof inner === 'object' && 'type' in inner) {
    return inner as Record<string, unknown>;
  }
  if ('type' in v1) return v1;
  return undefined;
}

function extractTitle(
  recordMap: Record<string, unknown>,
  pageId: string,
): string {
  try {
    const blockMap = recordMap['block'] as Record<
      string,
      { value: Record<string, unknown> }
    >;
    const block = unwrapBlock(blockMap[pageId]);
    const properties = block?.['properties'] as
      | Record<string, unknown>
      | undefined;
    if (!properties) return 'Untitled';
    const title = properties['title'];
    if (!Array.isArray(title)) return 'Untitled';
    return (
      title
        .map((chunk: unknown) => {
          if (Array.isArray(chunk) && typeof chunk[0] === 'string') {
            return chunk[0] as string;
          }
          return '';
        })
        .join('') || 'Untitled'
    );
  } catch {
    return 'Untitled';
  }
}

const SUPPORTED_TYPES = new Set([
  'page',
  'text',
  'header',
  'sub_header',
  'sub_sub_header',
  'bulleted_list',
  'numbered_list',
  'quote',
  'code',
  'callout',
  'image',
  'divider',
  'table_of_contents',
]);

// 컨테이너 블록은 자기 자신은 렌더링하지 않고 자식들을 평탄화한다.
const CONTAINER_TYPES = new Set(['column_list', 'column', 'toggle']);

function extractBlocks(
  recordMap: Record<string, unknown>,
  pageId: string,
): NotionBlock[] {
  const blockMap = recordMap['block'] as
    | Record<string, { value: Record<string, unknown> }>
    | undefined;
  if (!blockMap) return [];

  const result: NotionBlock[] = [];
  const visited = new Set<string>();

  const walk = (ids: string[]) => {
    for (const id of ids) {
      if (visited.has(id)) continue;
      visited.add(id);
      const block = unwrapBlock(blockMap[id]);
      if (!block) continue;
      const type = block['type'] as string;
      const childIds =
        (block['content'] as string[] | undefined) ?? undefined;

      if (CONTAINER_TYPES.has(type)) {
        if (childIds && childIds.length > 0) walk(childIds);
        continue;
      }

      if (!SUPPORTED_TYPES.has(type)) continue;

      result.push({
        id,
        type: type as NotionBlock['type'],
        properties:
          (block['properties'] as Record<string, unknown> | undefined) ??
          undefined,
        content: childIds,
      });
    }
  };

  try {
    const pageBlock = unwrapBlock(blockMap[pageId]);
    const topIds = (pageBlock?.['content'] as string[] | undefined) ?? [];
    walk(topIds);
    return result;
  } catch {
    return [];
  }
}

type RequestBody = {
  pageId?: unknown;
};

type ApiResponse =
  | { pageData: NotionPageData }
  | { error: string };

export async function handleLoadPage(pageId: unknown): Promise<{
  status: number;
  body: ApiResponse;
}> {
  if (!isValidPageId(pageId)) {
    return { status: 400, body: { error: '유효하지 않은 페이지 ID입니다.' } };
  }

  const dashedPageId = toDashedPageId(pageId);

  let notionRes: Response;
  try {
    notionRes = await fetch(NOTION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        pageId: dashedPageId,
        limit: 100,
        cursor: { stack: [] },
        chunkNumber: 0,
        verticalColumns: false,
      }),
    });
  } catch {
    return {
      status: 502,
      body: {
        error: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      },
    };
  }

  if (notionRes.status === 401 || notionRes.status === 404) {
    return {
      status: notionRes.status,
      body: {
        error:
          '페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.',
      },
    };
  }

  if (!notionRes.ok) {
    return {
      status: notionRes.status,
      body: {
        error:
          '페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.',
      },
    };
  }

  const data = (await notionRes.json()) as Record<string, unknown>;
  const recordMap = data['recordMap'] as Record<string, unknown> | undefined;

  if (!recordMap) {
    return {
      status: 404,
      body: {
        error:
          '페이지를 불러올 수 없습니다. 공개 페이지인지 확인해 주세요.',
      },
    };
  }

  const title = extractTitle(recordMap, dashedPageId);
  const blocks = extractBlocks(recordMap, dashedPageId);

  const pageData: NotionPageData = { pageId, title, blocks };

  return { status: 200, body: { pageData } };
}

const CORS_HEADERS: Record<string, string> = {
  // 동일 origin 전용 — 교차 origin 요청은 허용하지 않음
  'Access-Control-Allow-Origin': 'same-origin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Vercel Edge Function handler
export default async function handler(
  req: Request,
): Promise<Response> {
  // OPTIONS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const body = (await req.json()) as RequestBody;
  const { status, body: responseBody } = await handleLoadPage(body.pageId);

  return new Response(JSON.stringify(responseBody), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export const config = { runtime: 'edge' };
