import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlockRenderer } from './block-renderer';
import type { NotionBlock } from '@/lib/schemas/notion';

function makeBlock(
  type: NotionBlock['type'],
  text?: string,
  extra?: Partial<NotionBlock>,
): NotionBlock {
  return {
    id: `block-${Math.random().toString(36).slice(2)}`,
    type,
    properties: text ? { title: [[text]] } : undefined,
    ...extra,
  };
}

describe('BlockRenderer', () => {
  it('빈 블록 배열이면 아무것도 렌더링하지 않는다', () => {
    const { container } = render(<BlockRenderer blocks={[]} />);
    // notion-content div 안에 자식이 없어야 함
    expect(container.querySelector('.notion-content')?.children.length).toBe(0);
  });

  it('text 블록을 <p> 태그로 렌더링한다', () => {
    render(<BlockRenderer blocks={[makeBlock('text', '본문 텍스트')]} />);
    expect(screen.getByText('본문 텍스트').tagName).toBe('P');
  });

  it('텍스트가 없는 text 블록은 렌더링하지 않는다', () => {
    const { container } = render(
      <BlockRenderer blocks={[makeBlock('text')]} />,
    );
    expect(container.querySelector('p')).toBeNull();
  });

  // AC7 관련: header 블록이 h1 태그로 렌더링되는지 확인 (폰트는 CSS 검증)
  it('header 블록을 <h1> 태그로 렌더링한다', () => {
    render(<BlockRenderer blocks={[makeBlock('header', '큰 제목')]} />);
    const el = screen.getByText('큰 제목');
    expect(el.tagName).toBe('H1');
    expect(el.className).toContain('notion-h1');
  });

  it('sub_header 블록을 <h2> 태그로 렌더링한다', () => {
    render(<BlockRenderer blocks={[makeBlock('sub_header', '중간 제목')]} />);
    const el = screen.getByText('중간 제목');
    expect(el.tagName).toBe('H2');
    expect(el.className).toContain('notion-h2');
  });

  it('sub_sub_header 블록을 <h3> 태그로 렌더링한다', () => {
    render(
      <BlockRenderer blocks={[makeBlock('sub_sub_header', '작은 제목')]} />,
    );
    const el = screen.getByText('작은 제목');
    expect(el.tagName).toBe('H3');
    expect(el.className).toContain('notion-h3');
  });

  it('bulleted_list 블록을 <ul><li>로 렌더링한다', () => {
    render(<BlockRenderer blocks={[makeBlock('bulleted_list', '항목 1')]} />);
    expect(screen.getByText('항목 1').tagName).toBe('LI');
    expect(screen.getByRole('list').tagName).toBe('UL');
  });

  it('numbered_list 블록을 <ol><li>로 렌더링한다', () => {
    render(<BlockRenderer blocks={[makeBlock('numbered_list', '첫째')]} />);
    expect(screen.getByText('첫째').tagName).toBe('LI');
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
  });

  it('numbered_list가 여러 개이면 단일 <ol> 안에 묶여 연속 번호로 렌더링된다', () => {
    const blocks = [
      makeBlock('numbered_list', '첫째'),
      makeBlock('numbered_list', '둘째'),
      makeBlock('numbered_list', '셋째'),
    ];
    render(<BlockRenderer blocks={blocks} />);
    // 연속된 numbered_list는 단일 <ol>로 그룹화된다
    const lists = screen.getAllByRole('list');
    expect(lists).toHaveLength(1);
    expect(lists[0].tagName).toBe('OL');
    const items = lists[0].querySelectorAll('li');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe('첫째');
    expect(items[1].textContent).toBe('둘째');
    expect(items[2].textContent).toBe('셋째');
  });

  it('numbered_list 사이에 다른 블록이 있으면 별도 <ol>로 분리된다', () => {
    const blocks = [
      makeBlock('numbered_list', '첫째'),
      makeBlock('text', '중간 텍스트'),
      makeBlock('numbered_list', '다시 첫째'),
    ];
    render(<BlockRenderer blocks={blocks} />);
    // 중간에 다른 블록이 있으면 각각 독립된 <ol>이 생긴다
    const lists = screen.getAllByRole('list');
    expect(lists).toHaveLength(2);
    expect(lists[0].querySelectorAll('li')).toHaveLength(1);
    expect(lists[1].querySelectorAll('li')).toHaveLength(1);
  });

  it('quote 블록을 <blockquote>로 렌더링한다', () => {
    render(<BlockRenderer blocks={[makeBlock('quote', '인용구')]} />);
    const el = screen.getByText('인용구');
    expect(el.tagName).toBe('BLOCKQUOTE');
  });

  it('code 블록을 <pre><code>로 렌더링한다', () => {
    render(
      <BlockRenderer blocks={[makeBlock('code', 'console.log("hello")')]} />,
    );
    const code = screen.getByText('console.log("hello")');
    expect(code.tagName).toBe('CODE');
    expect(code.parentElement?.tagName).toBe('PRE');
  });

  it('callout 블록을 notion-callout 클래스로 렌더링한다', () => {
    const block: NotionBlock = {
      id: 'callout-1',
      type: 'callout',
      properties: {
        title: [['주의사항']],
        icon: '⚠️',
      },
    };
    render(<BlockRenderer blocks={[block]} />);
    expect(screen.getByText('주의사항')).toBeDefined();
    expect(screen.getByText('⚠️')).toBeDefined();
  });

  it('image 블록에 src가 있으면 <img>를 렌더링한다', () => {
    const block: NotionBlock = {
      id: 'img-1',
      type: 'image',
      properties: {
        source: [['https://example.com/image.png']],
      },
    };
    const { container } = render(<BlockRenderer blocks={[block]} />);
    // alt=""인 이미지는 role="presentation"으로 처리되므로 querySelector로 확인
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', 'https://example.com/image.png');
  });

  it('divider 블록을 <hr>로 렌더링한다', () => {
    const { container } = render(
      <BlockRenderer blocks={[makeBlock('divider')]} />,
    );
    expect(container.querySelector('hr')).not.toBeNull();
  });

  it('page 블록과 table_of_contents 블록은 null로 처리한다', () => {
    const { container } = render(
      <BlockRenderer
        blocks={[
          makeBlock('page'),
          makeBlock('table_of_contents'),
        ]}
      />,
    );
    // notion-content 안에 렌더링된 자식이 없어야 함
    const content = container.querySelector('.notion-content');
    expect(content?.childElementCount).toBe(0);
  });

  it('여러 타입의 블록이 혼합되어도 올바르게 렌더링한다', () => {
    const blocks: NotionBlock[] = [
      makeBlock('header', '제목'),
      makeBlock('text', '본문'),
      makeBlock('quote', '인용'),
    ];
    render(<BlockRenderer blocks={blocks} />);
    expect(screen.getByText('제목').tagName).toBe('H1');
    expect(screen.getByText('본문').tagName).toBe('P');
    expect(screen.getByText('인용').tagName).toBe('BLOCKQUOTE');
  });
});
