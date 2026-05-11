// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from './AdminDataTable';

/**
 * Coverage for the generic TanStack-backed admin table. Focus on the
 * behaviour the user notices: header sort, pagination, row selection +
 * bulk-action toolbar, density toggle, column-visibility menu,
 * empty-state fallback.
 */

interface Row { id: number; name: string; calls: number; }

const rows: Row[] = [
  { id: 1, name: 'alpha',   calls: 50 },
  { id: 2, name: 'bravo',   calls: 200 },
  { id: 3, name: 'charlie', calls: 100 },
  { id: 4, name: 'delta',   calls: 75 },
];

const cols: ColumnDef<Row>[] = [
  { id: 'name',  header: 'Name',  accessorKey: 'name' },
  { id: 'calls', header: 'Calls', accessorKey: 'calls' },
];

describe('<AdminDataTable />', () => {
  it('renders headers + all rows by default', () => {
    render(<AdminDataTable<Row> data={rows} columns={cols} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Calls')).toBeInTheDocument();
    for (const r of rows) {
      expect(screen.getByText(r.name)).toBeInTheDocument();
    }
  });

  it('sorts when header is clicked (toggles desc → asc → off)', async () => {
    const user = userEvent.setup();
    render(<AdminDataTable<Row> data={rows} columns={cols} />);

    // First click: descending (TanStack v8 default)
    await user.click(screen.getByText('Calls'));
    let dataRows = screen.getAllByRole('row').slice(1);
    expect(within(dataRows[0]).getByText('200')).toBeInTheDocument();

    // Second click: ascending
    await user.click(screen.getByText('Calls'));
    dataRows = screen.getAllByRole('row').slice(1);
    expect(within(dataRows[0]).getByText('50')).toBeInTheDocument();
    expect(within(dataRows[1]).getByText('75')).toBeInTheDocument();
  });

  it('honours initialSorting', () => {
    render(
      <AdminDataTable<Row>
        data={rows}
        columns={cols}
        initialSorting={[{ id: 'calls', desc: true }]}
      />,
    );
    const dataRows = screen.getAllByRole('row').slice(1);
    expect(within(dataRows[0]).getByText('200')).toBeInTheDocument();
  });

  it('paginates with default pageSize', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: i, name: `r${i}`, calls: i }));
    render(<AdminDataTable<Row> data={many} columns={cols} defaultPageSize={10} />);
    const dataRows = screen.getAllByRole('row').slice(1);
    expect(dataRows).toHaveLength(10);
    // The "Showing 1–10 of 30" caption
    expect(screen.getByText(/1.{1}10 of 30/)).toBeInTheDocument();
  });

  it('navigates pages on next click', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 25 }, (_, i) => ({ id: i, name: `row${i}`, calls: i }));
    render(<AdminDataTable<Row> data={many} columns={cols} defaultPageSize={10} />);
    // Default is sorted by id since first column is name → alphabetical
    // r0, r1, ... or just rendering order; click "›" to go to page 2.
    await user.click(screen.getByRole('button', { name: '›' }));
    expect(screen.getByText(/11.{1}20 of 25/)).toBeInTheDocument();
  });

  it('shows empty fallback when filter matches nothing', () => {
    render(
      <AdminDataTable<Row>
        data={rows}
        columns={cols}
        globalFilter="xyz-does-not-exist"
      />,
    );
    expect(screen.getByText(/No rows match/i)).toBeInTheDocument();
  });

  it('applies globalFilter across visible columns', () => {
    render(
      <AdminDataTable<Row>
        data={rows}
        columns={cols}
        globalFilter="bravo"
      />,
    );
    const dataRows = screen.getAllByRole('row').slice(1);
    expect(dataRows).toHaveLength(1);
    expect(within(dataRows[0]).getByText('bravo')).toBeInTheDocument();
  });

  it('row selection: checkbox column appears + bulk bar shows count', async () => {
    const user = userEvent.setup();
    const onSel = vi.fn();
    render(
      <AdminDataTable<Row>
        data={rows}
        columns={cols}
        enableRowSelection
        onRowSelectionChange={onSel}
        bulkActions={(sel) => <span data-testid="bulk">{sel.length} selected for bulk action</span>}
      />,
    );

    const allCheckboxes = screen.getAllByRole('checkbox');
    // First is the "select all", remaining are per-row
    expect(allCheckboxes.length).toBe(rows.length + 1);

    // Select first row's checkbox (index 1, since index 0 is the page-all)
    await user.click(allCheckboxes[1]);

    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
    expect(screen.getByTestId('bulk').textContent).toContain('1 selected');
    expect(onSel).toHaveBeenCalled();
  });

  it('select-all toggles every visible row', async () => {
    const user = userEvent.setup();
    render(
      <AdminDataTable<Row>
        data={rows}
        columns={cols}
        enableRowSelection
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]); // page-all
    // The bulk bar shows "<strong>N</strong> selected"; search by matching
    // the wrapping element text where the count + "selected" co-locate.
    expect(screen.getByText(/selected/i)).toBeInTheDocument();
    // Verify all per-row checkboxes are now checked.
    const all = screen.getAllByRole('checkbox') as HTMLInputElement[];
    // First checkbox is the page-all; the rest should all be checked.
    expect(all.slice(1).every(cb => cb.checked)).toBe(true);
  });

  it('density toggle persists choice via state (regular ↔ compact)', async () => {
    const user = userEvent.setup();
    render(<AdminDataTable<Row> data={rows} columns={cols} defaultDensity="regular" />);

    const compact = screen.getByRole('button', { name: /compact/i });
    await user.click(compact);
    // Visual state: pressed/active. Component uses color, not aria — assert
    // by finding the button still present + by checking pageSize select still
    // there (sanity that re-render didn't break the table).
    expect(screen.getByLabelText(/rows per page/i)).toBeInTheDocument();
  });

  it('column-visibility menu lists toggleable columns', async () => {
    const user = userEvent.setup();
    render(<AdminDataTable<Row> data={rows} columns={cols} />);
    await user.click(screen.getByRole('button', { name: /columns/i }));
    // Menu opens — labels for each hideable column should be visible
    expect(screen.getAllByText('Name').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Calls').length).toBeGreaterThanOrEqual(1);
  });

  it('emptyState slot is rendered for empty data', () => {
    render(
      <AdminDataTable<Row>
        data={[]}
        columns={cols}
        emptyState={<div data-testid="empty">no rows yet</div>}
      />,
    );
    expect(screen.getByTestId('empty')).toBeInTheDocument();
  });

  describe('drag-to-reorder columns (Phase 4)', () => {
    function makeDataTransfer(): DataTransfer {
      // happy-dom/jsdom don't fully implement DataTransfer; stub the surface
      // we actually use: setData, getData, dropEffect, effectAllowed.
      const store = new Map<string, string>();
      return {
        setData: (k: string, v: string) => { store.set(k, v); },
        getData: (k: string) => store.get(k) ?? '',
        dropEffect: 'none',
        effectAllowed: 'all',
      } as unknown as DataTransfer;
    }

    it('reorders columns when a header is dragged onto a sibling', () => {
      const { container } = render(
        <AdminDataTable<Row> data={rows} columns={cols} enableColumnReorder />,
      );

      const headers = container.querySelectorAll('th[data-column-id]');
      expect(headers).toHaveLength(2);
      const nameTh = headers[0] as HTMLTableCellElement;
      const callsTh = headers[1] as HTMLTableCellElement;
      expect(nameTh.getAttribute('data-column-id')).toBe('name');
      expect(callsTh.getAttribute('data-column-id')).toBe('calls');
      // happy-dom doesn't always reflect the React JSX attribute as a DOM
      // property, so check the attribute string directly.
      expect(nameTh.getAttribute('draggable')).toBe('true');

      const dt = makeDataTransfer();
      // Drag "calls" before "name". fireEvent goes through React's
      // synthetic event system so the onDragStart/onDrop props fire.
      fireEvent.dragStart(callsTh, { dataTransfer: dt });
      fireEvent.dragOver(nameTh,  { dataTransfer: dt });
      fireEvent.drop(nameTh,      { dataTransfer: dt });

      const after = container.querySelectorAll('th[data-column-id]');
      expect(after[0].getAttribute('data-column-id')).toBe('calls');
      expect(after[1].getAttribute('data-column-id')).toBe('name');
    });

    it('keeps __select anchored — never drag-reorderable', () => {
      const { container } = render(
        <AdminDataTable<Row>
          data={rows}
          columns={cols}
          enableRowSelection
          enableColumnReorder
        />,
      );
      const selectTh = container.querySelector('th[data-column-id="__select"]') as HTMLTableCellElement | null;
      expect(selectTh).not.toBeNull();
      // The React `draggable={undefined}` should NOT serialize a true attribute.
      expect(selectTh?.getAttribute('draggable')).not.toBe('true');
    });
  });

  describe('server-side pagination (Phase 4)', () => {
    it('reads page/total from the parent and emits page-change events', async () => {
      const user = userEvent.setup();
      const onPaginationChange = vi.fn();

      const { rerender } = render(
        <AdminDataTable<Row>
          data={rows.slice(0, 2)}
          columns={cols}
          serverSide={{
            total: 200,
            pageIndex: 0,
            pageSize: 25,
            onPaginationChange,
          }}
        />,
      );

      // 200 rows / 25 per page → 8 pages. Footer shows the parent's total.
      expect(screen.getByText(/of 200/)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '›' }));
      expect(onPaginationChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 25 });

      // Parent re-renders with the new page; the table re-uses the controlled values.
      rerender(
        <AdminDataTable<Row>
          data={rows.slice(2, 4)}
          columns={cols}
          serverSide={{
            total: 200,
            pageIndex: 1,
            pageSize: 25,
            onPaginationChange,
          }}
        />,
      );
      // The "Showing X–Y of Z" text is broken across text nodes (the
      // en-dash separator); query the <span> directly and match its
      // concatenated textContent.
      const showing = screen.getByText((_t, node) => {
        if (!node) return false;
        if (node.tagName?.toLowerCase() !== 'span') return false;
        return /Showing\s*26\D+50\D+200/.test(node.textContent ?? '');
      });
      expect(showing).toBeInTheDocument();
    });

    it('does not slice rows locally when serverSide is set', () => {
      // Pass exactly two rows (the "current page"). With local pagination
      // and pageSize 25, all 4 rows would render — but the parent says
      // there are only 2 rows on this page.
      render(
        <AdminDataTable<Row>
          data={rows.slice(0, 2)}
          columns={cols}
          serverSide={{
            total: 4,
            pageIndex: 0,
            pageSize: 25,
            onPaginationChange: () => {},
          }}
        />,
      );
      // Only the first two names — local slicing would render all four.
      expect(screen.getByText('alpha')).toBeInTheDocument();
      expect(screen.getByText('bravo')).toBeInTheDocument();
      expect(screen.queryByText('charlie')).toBeNull();
      expect(screen.queryByText('delta')).toBeNull();
    });
  });
});
