import { z } from 'zod';

export const UrlInputSchema = z.object({
  url: z
    .string()
    .url('유효한 URL을 입력해 주세요.')
    .refine(
      (v) => /^https:\/\/([a-z0-9-]+\.)?notion\.(so|site)\//i.test(v),
      'Notion 공개 페이지 URL만 지원합니다.',
    ),
});

export type UrlInput = z.infer<typeof UrlInputSchema>;

export const NotionBlockSchema = z.object({
  id: z.string(),
  type: z.enum([
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
  ]),
  properties: z.record(z.unknown()).optional(),
  content: z.array(z.string()).optional(),
});

export type NotionBlock = z.infer<typeof NotionBlockSchema>;

export const NotionPageDataSchema = z.object({
  pageId: z.string(),
  title: z.string(),
  blocks: z.array(NotionBlockSchema),
});

export type NotionPageData = z.infer<typeof NotionPageDataSchema>;

/**
 * URL에서 pageId를 추출한다.
 * notion.so/Title-<32hex> 또는 notion.so/<32hex> 형식 모두 지원.
 */
export function extractPageId(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;
    const last = segments[segments.length - 1];
    // dash 제거 후 32자 hex 여부 확인
    const raw = last.replace(/-/g, '');
    // pageId는 마지막 32자 hex (slug-<id> 형태 포함)
    const match = raw.match(/([0-9a-f]{32})$/i);
    if (match) return match[1];
    return null;
  } catch {
    return null;
  }
}
