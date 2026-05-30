// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { PageContainer } from './PageContainer';

/** The outermost wrapper div carries the max-width + padding classes. */
function root(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}

describe('<PageContainer />', () => {
  it('renders its children', () => {
    render(
      <PageContainer>
        <p>body content</p>
      </PageContainer>,
    );
    expect(screen.getByText('body content')).toBeInTheDocument();
  });

  it('renders the title as a level-one heading', () => {
    render(<PageContainer title="Search">content</PageContainer>);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Search' }),
    ).toBeInTheDocument();
  });

  it('renders the subtitle and actions slots', () => {
    render(
      <PageContainer
        title="Search"
        subtitle="Find any flight"
        actions={<button>Refresh</button>}
      >
        content
      </PageContainer>,
    );
    expect(screen.getByText('Find any flight')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('omits the header when there is no title, subtitle, or actions', () => {
    const { container } = render(<PageContainer>content</PageContainer>);
    expect(container.querySelector('header')).toBeNull();
  });

  it('defaults to the 7xl max-width', () => {
    const { container } = render(<PageContainer>content</PageContainer>);
    expect(root(container)).toHaveClass('max-w-7xl');
  });

  it('maps a custom maxWidth to its literal Tailwind class', () => {
    const { container } = render(
      <PageContainer maxWidth="md">content</PageContainer>,
    );
    expect(root(container)).toHaveClass('max-w-md');
    expect(root(container)).not.toHaveClass('max-w-7xl');
  });

  it('emits no max-width class for the full-bleed variant', () => {
    const { container } = render(
      <PageContainer maxWidth="full">content</PageContainer>,
    );
    expect(root(container).className).not.toMatch(/max-w-/);
  });

  it('appends a caller className to the root', () => {
    const { container } = render(
      <PageContainer className="custom-page">content</PageContainer>,
    );
    expect(root(container)).toHaveClass('custom-page');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <PageContainer title="Search" subtitle="Find any flight">
        <p>results</p>
      </PageContainer>,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
