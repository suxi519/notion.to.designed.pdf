import type { NotionBlock } from '@/lib/schemas/notion';

/**
 * Notion rich-text 속성에서 평문 텍스트를 추출한다.
 * properties.title 은 [[text, annotations], ...] 형식이다.
 */
function extractText(properties: Record<string, unknown> | undefined): string {
  if (!properties) return '';
  const title = properties['title'];
  if (!Array.isArray(title)) return '';
  return title
    .map((chunk: unknown) => {
      if (Array.isArray(chunk) && typeof chunk[0] === 'string') {
        return chunk[0] as string;
      }
      return '';
    })
    .join('');
}

/**
 * Notion image 블록의 src를 추출한다.
 * properties.source = [[url]] 형식
 */
function extractImageSrc(
  properties: Record<string, unknown> | undefined,
): string | null {
  if (!properties) return null;
  const source = properties['source'];
  if (!Array.isArray(source)) return null;
  const first = source[0];
  if (Array.isArray(first) && typeof first[0] === 'string') {
    return first[0] as string;
  }
  return null;
}

/**
 * Notion image 블록의 caption을 추출한다.
 * properties.caption = [[text, annotations], ...] 형식
 */
function extractCaption(
  properties: Record<string, unknown> | undefined,
): string {
  if (!properties) return '';
  const caption = properties['caption'];
  if (!Array.isArray(caption)) return '';
  return caption
    .map((chunk: unknown) => {
      if (Array.isArray(chunk) && typeof chunk[0] === 'string') {
        return chunk[0] as string;
      }
      return '';
    })
    .join('');
}

type BlockProps = {
  block: NotionBlock;
};

function TextBlock({ block }: BlockProps) {
  const text = extractText(block.properties);
  if (!text) return null;
  return <p className="notion-text">{text}</p>;
}

function HeaderBlock({ block }: BlockProps) {
  const text = extractText(block.properties);
  if (!text) return null;
  return <h1 className="notion-h1">{text}</h1>;
}

function SubHeaderBlock({ block }: BlockProps) {
  const text = extractText(block.properties);
  if (!text) return null;
  return <h2 className="notion-h2">{text}</h2>;
}

function SubSubHeaderBlock({ block }: BlockProps) {
  const text = extractText(block.properties);
  if (!text) return null;
  return <h3 className="notion-h3">{text}</h3>;
}

function BulletedListBlock({ block }: BlockProps) {
  const text = extractText(block.properties);
  if (!text) return null;
  return (
    <ul className="notion-bulleted-list">
      <li>{text}</li>
    </ul>
  );
}

function QuoteBlock({ block }: BlockProps) {
  const text = extractText(block.properties);
  if (!text) return null;
  return <blockquote className="notion-quote">{text}</blockquote>;
}

function CodeBlock({ block }: BlockProps) {
  const text = extractText(block.properties);
  if (!text) return null;
  return (
    <pre className="notion-code">
      <code>{text}</code>
    </pre>
  );
}

function CalloutBlock({ block }: BlockProps) {
  const text = extractText(block.properties);
  if (!text) return null;
  const icon =
    block.properties && typeof block.properties['icon'] === 'string'
      ? (block.properties['icon'] as string)
      : null;
  return (
    <div className="notion-callout">
      {icon && <span className="notion-callout-icon">{icon}</span>}
      <p>{text}</p>
    </div>
  );
}

function ImageBlock({ block }: BlockProps) {
  const src = extractImageSrc(block.properties);
  if (!src) return null;
  const caption = extractCaption(block.properties);
  return (
    <figure className="notion-image">
      <img src={src} alt={caption} loading="lazy" />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function DividerBlock() {
  return <hr className="notion-divider" />;
}

/** 연속된 numbered_list 블록을 단일 <ol>로 묶기 위한 그룹 타입 */
type NumberedGroup = {
  type: 'numbered_group';
  items: NotionBlock[];
  /** 그룹 내 첫 번째 블록의 id를 key로 사용 */
  key: string;
};

type OtherBlock = {
  type: 'other';
  block: NotionBlock;
  key: string;
};

type RenderGroup = NumberedGroup | OtherBlock;

/**
 * blocks 배열을 RenderGroup 배열로 변환한다.
 * 연속된 numbered_list 블록은 하나의 NumberedGroup으로 묶인다.
 */
function groupBlocks(blocks: NotionBlock[]): RenderGroup[] {
  return blocks.reduce<RenderGroup[]>((groups, block) => {
    if (block.type === 'numbered_list') {
      const last = groups[groups.length - 1];
      if (last?.type === 'numbered_group') {
        last.items.push(block);
        return groups;
      }
      return [
        ...groups,
        { type: 'numbered_group', items: [block], key: block.id },
      ];
    }
    return [...groups, { type: 'other', block, key: block.id }];
  }, []);
}

type BlockRendererProps = {
  blocks: NotionBlock[];
};

export function BlockRenderer({ blocks }: BlockRendererProps) {
  const groups = groupBlocks(blocks);

  return (
    <div className="notion-content">
      {groups.map((group) => {
        if (group.type === 'numbered_group') {
          return (
            <ol key={group.key} className="notion-numbered-list">
              {group.items.map((block) => {
                const text = extractText(block.properties);
                if (!text) return null;
                return <li key={block.id}>{text}</li>;
              })}
            </ol>
          );
        }

        const { block } = group;
        switch (block.type) {
          case 'text':
            return <TextBlock key={block.id} block={block} />;
          case 'header':
            return <HeaderBlock key={block.id} block={block} />;
          case 'sub_header':
            return <SubHeaderBlock key={block.id} block={block} />;
          case 'sub_sub_header':
            return <SubSubHeaderBlock key={block.id} block={block} />;
          case 'bulleted_list':
            return <BulletedListBlock key={block.id} block={block} />;
          case 'quote':
            return <QuoteBlock key={block.id} block={block} />;
          case 'code':
            return <CodeBlock key={block.id} block={block} />;
          case 'callout':
            return <CalloutBlock key={block.id} block={block} />;
          case 'image':
            return <ImageBlock key={block.id} block={block} />;
          case 'divider':
            return <DividerBlock key={block.id} />;
          // page, table_of_contents는 skip
          case 'page':
          case 'table_of_contents':
          default:
            return null;
        }
      })}
    </div>
  );
}
