// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Markdown } from './Markdown';

describe('<Markdown /> (admin shared/components)', () => {
  it('renders "# heading" as a level-3 heading', () => {
    const { container } = render(<Markdown source="# Overview" />);
    const h = screen.getByRole('heading', { level: 3, name: 'Overview' });
    expect(h.tagName).toBe('H3');
    expect(container.querySelectorAll('h4')).toHaveLength(0);
  });

  it('renders "## subheading" as a level-4 heading', () => {
    render(<Markdown source="## Details" />);
    expect(
      screen.getByRole('heading', { level: 4, name: 'Details' }),
    ).toBeInTheDocument();
  });

  it('renders **bold** as <strong> and `code` as <code>', () => {
    const { container } = render(
      <Markdown source="A **strong** and a `snippet` inline." />,
    );
    const strong = container.querySelector('strong');
    const code = container.querySelector('code');
    expect(strong).toHaveTextContent('strong');
    expect(code).toHaveTextContent('snippet');
    // The surrounding plain text survives around the marked-up spans.
    expect(container.querySelector('p')).toHaveTextContent(
      'A strong and a snippet inline.',
    );
  });

  it('groups consecutive "-" / "*" bullets into a single list', () => {
    const { container } = render(
      <Markdown source={'- first\n- second\n* third'} />,
    );
    const lists = container.querySelectorAll('ul');
    expect(lists).toHaveLength(1);
    const items = within(lists[0] as HTMLElement).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('splits blank-line-separated text into distinct paragraphs', () => {
    const { container } = render(
      <Markdown source={'Para one line a\nline b\n\nPara two'} />,
    );
    const paras = container.querySelectorAll('p');
    expect(paras).toHaveLength(2);
    // Soft-wrapped lines inside one paragraph are joined with a space.
    expect(paras[0]).toHaveTextContent('Para one line a line b');
    expect(paras[1]).toHaveTextContent('Para two');
  });

  it('flushes an open list/paragraph when a heading interrupts it', () => {
    const { container } = render(
      <Markdown source={'intro text\n- a\n# Section\nmore'} />,
    );
    // Order: <p>intro</p> <ul><li>a</li></ul> <h3>Section</h3> <p>more</p>
    expect(container.querySelector('p')).toHaveTextContent('intro text');
    expect(container.querySelectorAll('li')).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Section' }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('renders bold inside a bullet item', () => {
    const { container } = render(<Markdown source="- has **emphasis** here" />);
    const li = container.querySelector('li');
    expect(li?.querySelector('strong')).toHaveTextContent('emphasis');
  });

  it('renders nothing for empty source', () => {
    const { container } = render(<Markdown source="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('has no axe violations for a composed document', async () => {
    const { container } = render(
      <Markdown
        source={'# Title\n\nLead paragraph with `code`.\n\n## Steps\n- one\n- two'}
      />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
