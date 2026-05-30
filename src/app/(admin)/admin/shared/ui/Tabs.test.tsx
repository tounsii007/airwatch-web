// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';

type ThreeTabsProps = {
  defaultValue: string;
  value?: string;
  onValueChange?: (v: string) => void;
};

function ThreeTabs(props: ThreeTabsProps) {
  return (
    <Tabs {...props}>
      <TabsList>
        <TabsTrigger value="a">A</TabsTrigger>
        <TabsTrigger value="b">B</TabsTrigger>
        <TabsTrigger value="c">C</TabsTrigger>
      </TabsList>
      <TabsContent value="a">Panel A</TabsContent>
      <TabsContent value="b">Panel B</TabsContent>
      <TabsContent value="c">Panel C</TabsContent>
    </Tabs>
  );
}

describe('<Tabs /> (admin shared/ui)', () => {
  it('exposes tablist/tab/tabpanel roles and shows the default panel', () => {
    render(<ThreeTabs defaultValue="a" />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'A' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel A');
    expect(screen.queryByText('Panel B')).not.toBeInTheDocument();
  });

  it('switches the active panel on click (uncontrolled)', async () => {
    render(<ThreeTabs defaultValue="a" />);
    await userEvent.click(screen.getByRole('tab', { name: 'B' }));

    expect(screen.getByRole('tab', { name: 'B' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'A' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('Panel B')).toBeInTheDocument();
    expect(screen.queryByText('Panel A')).not.toBeInTheDocument();
  });

  it('is controllable: click reports the change but the parent owns the value', async () => {
    const onValueChange = vi.fn();
    render(<ThreeTabs defaultValue="a" value="a" onValueChange={onValueChange} />);

    await userEvent.click(screen.getByRole('tab', { name: 'B' }));
    expect(onValueChange).toHaveBeenCalledWith('b');
    // Parent never pushed a new value, so panel A is still the one shown.
    expect(screen.getByText('Panel A')).toBeInTheDocument();
    expect(screen.queryByText('Panel B')).not.toBeInTheDocument();
  });

  it('moves selection with ArrowRight and focuses the next trigger', async () => {
    render(<ThreeTabs defaultValue="a" />);
    screen.getByRole('tab', { name: 'A' }).focus();
    await userEvent.keyboard('{ArrowRight}');

    const tabB = screen.getByRole('tab', { name: 'B' });
    expect(tabB).toHaveFocus();
    expect(tabB).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Panel B')).toBeInTheDocument();
  });

  it('wraps to the last trigger with ArrowLeft from the first', async () => {
    render(<ThreeTabs defaultValue="a" />);
    screen.getByRole('tab', { name: 'A' }).focus();
    await userEvent.keyboard('{ArrowLeft}');

    const tabC = screen.getByRole('tab', { name: 'C' });
    expect(tabC).toHaveFocus();
    expect(tabC).toHaveAttribute('aria-selected', 'true');
  });

  it('jumps to first/last with Home/End', async () => {
    render(<ThreeTabs defaultValue="b" />);
    screen.getByRole('tab', { name: 'B' }).focus();

    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'C' })).toHaveFocus();

    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'A' })).toHaveFocus();
  });

  it('renders nothing for a trigger outside a Tabs provider', () => {
    const { container } = render(<TabsTrigger value="x">Z</TabsTrigger>);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for content outside a Tabs provider', () => {
    const { container } = render(<TabsContent value="x">Z</TabsContent>);
    expect(container).toBeEmptyDOMElement();
  });

  it('has no axe violations', async () => {
    const { container } = render(<ThreeTabs defaultValue="a" />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
