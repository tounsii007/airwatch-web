// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { type ColumnDef } from '@tanstack/react-table';
import { AdminDataTable } from './AdminDataTable';

interface Row { id: number; name: string; calls: number; }
const rows: Row[] = [
  { id: 1, name: 'alpha',   calls: 50 },
  { id: 2, name: 'bravo',   calls: 200 },
];
const cols: ColumnDef<Row>[] = [
  { id: 'name',  header: 'Name',  accessorKey: 'name' },
  { id: 'calls', header: 'Calls', accessorKey: 'calls' },
];

describe('<AdminDataTable /> — a11y', () => {
  it('has no violations in the default render', async () => {
    const { container } = render(<AdminDataTable<Row> data={rows} columns={cols} />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('has no violations with row selection enabled (checkbox column)', async () => {
    const { container } = render(
      <AdminDataTable<Row>
        data={rows}
        columns={cols}
        enableRowSelection
        bulkActions={(selected) => <button>Delete {selected.length}</button>}
      />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('has no violations in the empty state', async () => {
    const { container } = render(
      <AdminDataTable<Row>
        data={[]}
        columns={cols}
        emptyState={<div role="status">No data yet</div>}
      />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('has no violations with drag-reorder enabled', async () => {
    const { container } = render(
      <AdminDataTable<Row> data={rows} columns={cols} enableColumnReorder />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
