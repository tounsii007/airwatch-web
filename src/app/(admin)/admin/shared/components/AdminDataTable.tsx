/**
 * Generic interactive table for admin pages, backed by TanStack Table v8.
 *
 * <h3>Why this exists</h3>
 * Pre-V13 each admin table was a hand-rolled `<table>` with bespoke
 * sort / filter / pagination logic — five copies of "filter rows by
 * substring", four copies of "page slice math", three different
 * "Showing X–Y of Z" footers. Operations the user wanted (column
 * sort by header click, multi-row select for bulk actions, inline
 * edit, per-user column visibility) had to be reimplemented on each
 * page or just weren't there at all.
 *
 * <h3>What you get</h3>
 *   * <b>Sorting</b> — click any header. Default sort can be set per column;
 *     `sortable: false` opts a column out.
 *   * <b>Filtering</b> — global free-text filter via {@link AdminDataTableProps.globalFilter}.
 *   * <b>Pagination</b> — built-in (page size + page index in component state).
 *   * <b>Row selection</b> — checkbox column when {@link AdminDataTableProps.enableRowSelection}
 *     is true; the parent receives the selected ids via {@link AdminDataTableProps.onRowSelectionChange}.
 *   * <b>Column visibility</b> — operator can toggle columns via the gear menu.
 *     Persisted in localStorage per `pageId` if provided.
 *   * <b>Density</b> — compact / regular row height toggle.
 *
 * <h3>Phase 4 additions</h3>
 *   * Column pinning + inline edit — see {@link AdminDataTableProps#columnPinning}
 *     and {@link AdminDataTableProps#inlineEdit}.
 *   * <b>Drag-to-reorder columns</b> — set {@link AdminDataTableProps#enableColumnReorder}.
 *     Headers become drag handles; the order is persisted to localStorage
 *     under the same key as density / visibility when {@code pageId} is set.
 *   * <b>Server-side pagination</b> — pass {@link AdminDataTableProps#serverSide}
 *     with the row total + a setter; the table flips into manual mode and
 *     emits page-change events instead of slicing locally.
 *
 * <h3>What's still intentionally not here</h3>
 *   * Server-side filtering — keep filters client-side; the admin tables that
 *     exceed 2k rows already paginate server-side, so the filtered slice is
 *     small enough to handle in the browser.
 *
 * <h3>Storage</h3>
 * If `pageId` is given, the table persists density + column-visibility
 * choices in localStorage under `airwatch.admin.table.<pageId>`. State that
 * matters for sharing (sort, filter) lives in component state, NOT
 * localStorage — sharing those with a teammate happens via URL params
 * (handled by the consuming page if needed).
 */
'use client';

import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnOrderState,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  type Updater,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface AdminDataTableProps<T> {
  /** Stable id for localStorage persistence — typically the page name. Optional. */
  pageId?: string;
  data: readonly T[];
  /** Column definitions in TanStack format. The component injects the select column when needed. */
  columns: ColumnDef<T, unknown>[];
  /** Initial sort state — first column ascending if omitted. */
  initialSorting?: SortingState;
  /** Default page size, default 25. */
  defaultPageSize?: number;
  /** Allowed page-size choices, default [10, 25, 50, 100]. */
  pageSizeOptions?: number[];
  /** Free-text filter applied across every visible cell. */
  globalFilter?: string;
  /** Set to true to render a checkbox column + selection bar. */
  enableRowSelection?: boolean;
  /** Notified on every change to the selected-row map. Sparingly used. */
  onRowSelectionChange?: (rows: T[]) => void;
  /** Optional bulk-action toolbar — rendered when ≥1 row is selected. */
  bulkActions?: (selected: T[]) => React.ReactNode;
  /** Empty-state slot. */
  emptyState?: React.ReactNode;
  /** Compact / regular default; persisted to localStorage if pageId is given. */
  defaultDensity?: 'compact' | 'regular';
  /** Caption row above the table. */
  toolbar?: React.ReactNode;

  /**
   * Phase 3 — Filter-aware CSV export. When set, an "Export CSV" button
   * appears in the toolbar and downloads ONLY the currently-filtered
   * rows (not the full dataset). Solves the "user filters to 50 rows
   * then exports — gets 5000 rows" surprise.
   *
   * `mapper` lets you transform each row to a flat key→string record
   * for the CSV columns; defaults to a JSON.stringify of every property.
   */
  csvExport?: {
    filename: string;
    mapper?: (row: T) => Record<string, string | number | boolean | null | undefined>;
  };

  /**
   * Phase 3 — Column pinning. Listed column ids stick to the left or
   * right edge during horizontal scroll. Useful on wide endpoint /
   * audit tables where the operator wants to keep the path or action
   * column visible while scanning latency / status columns.
   *
   * Apply as inline column-meta + state — TanStack's columnPinning
   * state controls the stick.
   */
  columnPinning?: {
    left?: string[];
    right?: string[];
  };

  /**
   * Phase 3 — Inline edit. Double-click an editable cell to swap it
   * for an input; Enter saves (calls `onSave`), Escape cancels. The
   * caller decides per-row + per-column eligibility via `isEditable`
   * (defaults to false for safety).
   */
  inlineEdit?: {
    onSave: (row: T, columnId: string, newValue: string) => Promise<void> | void;
    /** Defaults to `() => false` (nothing editable). */
    isEditable?: (row: T, columnId: string) => boolean;
  };

  /**
   * Phase 4 — Drag-to-reorder columns. Headers become drag handles
   * (HTML5 native DnD); dropping over a sibling reorders. Order is
   * persisted to localStorage when {@code pageId} is set.
   *
   * The selection column ({@code __select}) is anchored on the left and
   * never participates in reorder.
   */
  enableColumnReorder?: boolean;

  /**
   * Phase 4 — Server-side pagination. When set, the table flips
   * TanStack into {@code manualPagination} mode: it stops slicing
   * rows locally, surfaces every page-state change to the parent via
   * {@link ServerSidePaginationOptions#onPaginationChange}, and reads
   * the total row count from {@link ServerSidePaginationOptions#total}.
   *
   * The {@code data} prop is treated as the current page only. Sorting
   * + filtering remain client-side over that page; pass them to your
   * fetcher if you want server-side sorting too.
   */
  serverSide?: ServerSidePaginationOptions;
}

export interface ServerSidePaginationOptions {
  /** Total number of rows on the server (NOT the length of `data`). */
  total: number;
  /** Current page index — 0-based, mirrors TanStack's convention. */
  pageIndex: number;
  /** Current page size. */
  pageSize: number;
  /** Notified on page-change AND page-size-change. */
  onPaginationChange: (next: { pageIndex: number; pageSize: number }) => void;
}

/** State persisted per pageId in localStorage. Sort + filter NOT persisted (those are share-via-URL). */
interface PersistedState {
  density: 'compact' | 'regular';
  visibility: VisibilityState;
  columnOrder?: ColumnOrderState;
}

export function AdminDataTable<T>({
  pageId,
  data,
  columns,
  initialSorting,
  defaultPageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  globalFilter,
  enableRowSelection,
  onRowSelectionChange,
  bulkActions,
  emptyState,
  defaultDensity = 'regular',
  toolbar,
  csvExport,
  columnPinning: initialColumnPinning,
  inlineEdit,
  enableColumnReorder,
  serverSide,
}: AdminDataTableProps<T>) {
  const persistKey = pageId ? `airwatch.admin.table.${pageId}` : null;

  const [sorting, setSorting]                 = useState<SortingState>(initialSorting ?? []);
  const [columnFilters, setColumnFilters]     = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection]       = useState<RowSelectionState>({});
  const [density, setDensity]                 = useState<'compact' | 'regular'>(defaultDensity);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [pagination, setPagination]           = useState({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });
  const [columnPinning, setColumnPinning] = useState<{ left?: string[]; right?: string[] }>(
    initialColumnPinning ?? {},
  );
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  /** Track which cell (row.id + column.id) is currently being edited inline. */
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [editingBusy, setEditingBusy] = useState(false);
  /** Source column for an in-flight HTML5 drag — null when no drag is active. */
  const dragSourceRef = useRef<string | null>(null);

  // Restore density + column visibility + order from localStorage.
  useEffect(() => {
    if (!persistKey || typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(persistKey);
      if (!raw) return;
      const persisted = JSON.parse(raw) as Partial<PersistedState>;
      if (persisted.density) setDensity(persisted.density);
      if (persisted.visibility) setColumnVisibility(persisted.visibility);
      if (Array.isArray(persisted.columnOrder)) setColumnOrder(persisted.columnOrder);
    } catch {
      /* malformed — drop and start fresh */
    }
  }, [persistKey]);

  // Persist on change.
  useEffect(() => {
    if (!persistKey || typeof localStorage === 'undefined') return;
    try {
      const payload: PersistedState = {
        density,
        visibility: columnVisibility,
        ...(columnOrder.length > 0 ? { columnOrder } : {}),
      };
      localStorage.setItem(persistKey, JSON.stringify(payload));
    } catch {
      /* quota / private — fine */
    }
  }, [persistKey, density, columnVisibility, columnOrder]);

  // Inject the select column when row selection is enabled.
  const tableColumns = useMemo<ColumnDef<T, unknown>[]>(() => {
    if (!enableRowSelection) return columns;
    return [
      {
        id: '__select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            ref={el => {
              if (el) el.indeterminate = table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected();
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            aria-label="Select all rows on this page"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableColumnFilter: false,
        size: 32,
      },
      ...columns,
    ];
  }, [columns, enableRowSelection]);

  // Effective pagination state — server-side mode bypasses local state and
  // mirrors the parent's controlled values. The setter still routes back
  // through the parent so it stays the source of truth.
  const effectivePagination: PaginationState = serverSide
    ? { pageIndex: serverSide.pageIndex, pageSize: serverSide.pageSize }
    : pagination;

  // TanStack Table's useReactTable returns an instance bag where many
  // members are recreated each render; React Compiler can't safely
  // memoise it. This is the documented escape-hatch — see TanStack
  // docs §"React Compiler compatibility".
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data as T[],
    columns: tableColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: effectivePagination,
      globalFilter,
      columnPinning,
      columnOrder,
    },
    enableRowSelection: enableRowSelection ?? false,
    enableColumnPinning: true,
    manualPagination: Boolean(serverSide),
    pageCount: serverSide
      ? Math.max(1, Math.ceil(serverSide.total / Math.max(1, serverSide.pageSize)))
      : undefined,
    rowCount: serverSide?.total,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater: Updater<RowSelectionState>) => setRowSelection(updater),
    onPaginationChange: (updater: Updater<PaginationState>) => {
      const next = typeof updater === 'function' ? updater(effectivePagination) : updater;
      if (serverSide) {
        // Bounce back to the parent — the table itself stays a thin view.
        serverSide.onPaginationChange({ pageIndex: next.pageIndex, pageSize: next.pageSize });
      } else {
        setPagination(next);
      }
    },
    onColumnPinningChange: setColumnPinning,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel:       getCoreRowModel(),
    getSortedRowModel:     getSortedRowModel(),
    getFilteredRowModel:   getFilteredRowModel(),
    // In manualPagination mode TanStack expects us to skip the local pager.
    getPaginationRowModel: serverSide ? undefined : getPaginationRowModel(),
  });

  // Notify the parent of selected rows.
  useEffect(() => {
    if (!onRowSelectionChange) return;
    const selectedRows = table.getSelectedRowModel().rows.map(r => r.original);
    onRowSelectionChange(selectedRows);
    // Re-run when rowSelection changes; depend on the keys for stable
    // identity (the rowSelection object itself is replaced on every set).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection]);

  const totalRows    = serverSide?.total ?? table.getFilteredRowModel().rows.length;
  const visibleRows  = table.getRowModel().rows;
  const selectedRows = table.getSelectedRowModel().rows.map(r => r.original);
  const padding      = density === 'compact' ? '0.25rem 0.5rem' : '0.5rem 0.75rem';
  const fontSize     = density === 'compact' ? '0.75rem'        : '0.8125rem';

  /**
   * Reorder helper — moves the source column id immediately before the
   * target column id, in the current column order. The leftmost
   * "__select" column is anchored and cannot be moved or replaced.
   */
  function moveColumn(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    if (sourceId === '__select' || targetId === '__select') return;
    const current = columnOrder.length > 0
      ? [...columnOrder]
      : table.getAllLeafColumns().map((c) => c.id);
    const from = current.indexOf(sourceId);
    if (from === -1) return;
    current.splice(from, 1);
    const to = current.indexOf(targetId);
    if (to === -1) return;
    current.splice(to, 0, sourceId);
    setColumnOrder(current);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Toolbar: caller-provided actions on the left, density + columns
          menu + CSV export on the right. The bulk-action band slides in
          below when rows are selected. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>{toolbar}</div>
        <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
          {csvExport && (
            <button
              type="button"
              onClick={() => exportFilteredAsCsv(table, csvExport)}
              style={menuButtonStyle}
              title="Export the currently-filtered rows as CSV"
            >
              ↓ CSV
            </button>
          )}
          <DensityToggle density={density} onChange={setDensity} />
          <ColumnVisibilityMenu
            open={showColumnsMenu}
            onToggle={() => setShowColumnsMenu(o => !o)}
            columns={table.getAllLeafColumns().filter(c => c.getCanHide())}
          />
        </div>
      </div>

      {enableRowSelection && selectedRows.length > 0 && (
        <div style={bulkBarStyle}>
          <span>
            <strong>{selectedRows.length}</strong> selected
          </span>
          <button type="button" onClick={() => setRowSelection({})} style={bulkClearButtonStyle}>
            Clear selection
          </button>
          {bulkActions?.(selectedRows)}
        </div>
      )}

      {data.length === 0 && emptyState ? (
        emptyState
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <thead>
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id} style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                    {hg.headers.map(header => {
                      const canSort = header.column.getCanSort();
                      const sortDir = header.column.getIsSorted();
                      const pinSide = header.column.getIsPinned() as 'left' | 'right' | false;
                      const draggable = Boolean(enableColumnReorder) && header.column.id !== '__select';
                      return (
                        <th
                          key={header.id}
                          colSpan={header.colSpan}
                          data-column-id={header.column.id}
                          draggable={draggable || undefined}
                          onDragStart={draggable ? (e) => {
                            dragSourceRef.current = header.column.id;
                            e.dataTransfer.effectAllowed = 'move';
                            // Required by Firefox to actually start the drag.
                            try { e.dataTransfer.setData('text/plain', header.column.id); } catch { /* ignore */ }
                          } : undefined}
                          onDragOver={draggable ? (e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          } : undefined}
                          onDrop={draggable ? (e) => {
                            e.preventDefault();
                            const source = dragSourceRef.current;
                            dragSourceRef.current = null;
                            if (source) moveColumn(source, header.column.id);
                          } : undefined}
                          onDragEnd={draggable ? () => { dragSourceRef.current = null; } : undefined}
                          style={{
                            ...thBaseStyle,
                            ...pinnedCellStyle(pinSide, true),
                            cursor: draggable ? 'grab' : canSort ? 'pointer' : 'default',
                            userSelect: 'none',
                            width: header.column.columnDef.size,
                          }}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          aria-sort={sortDir === 'asc' ? 'ascending' : sortDir === 'desc' ? 'descending' : undefined}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span style={{ marginLeft: 4, color: 'var(--text-muted)', fontSize: '0.6em' }} aria-hidden>
                              {sortDir === 'asc' ? '▲' : sortDir === 'desc' ? '▼' : '↕'}
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {visibleRows.map(row => (
                  <tr
                    key={row.id}
                    style={{
                      borderTop: '1px solid var(--border)',
                      background: row.getIsSelected() ? 'color-mix(in srgb, var(--primary-bright) 6%, transparent)' : undefined,
                    }}
                  >
                    {row.getVisibleCells().map(cell => {
                      const pinSide = cell.column.getIsPinned() as 'left' | 'right' | false;
                      const editable = inlineEdit?.isEditable?.(row.original, cell.column.id) ?? false;
                      const isEditing = editingCell?.rowId === row.id && editingCell.columnId === cell.column.id;
                      return (
                        <td
                          key={cell.id}
                          style={{
                            padding,
                            cursor: editable ? 'cell' : undefined,
                            ...pinnedCellStyle(pinSide, false, row.getIsSelected()),
                          }}
                          onDoubleClick={editable ? () => {
                            // Snapshot the current rendered value as the
                            // initial input. We pull from the cell's value
                            // (raw accessor) — no need to round-trip through
                            // the rendered DOM.
                            const v = cell.getValue();
                            setEditingValue(v == null ? '' : String(v));
                            setEditingCell({ rowId: row.id, columnId: cell.column.id });
                          } : undefined}
                        >
                          {isEditing ? (
                            <InlineEditInput
                              value={editingValue}
                              busy={editingBusy}
                              onChange={setEditingValue}
                              onCancel={() => setEditingCell(null)}
                              onSave={async () => {
                                if (!inlineEdit) return;
                                setEditingBusy(true);
                                try {
                                  await inlineEdit.onSave(row.original, cell.column.id, editingValue);
                                  setEditingCell(null);
                                } finally {
                                  setEditingBusy(false);
                                }
                              }}
                            />
                          ) : (
                            flexRender(cell.column.columnDef.cell, cell.getContext())
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={tableColumns.length} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No rows match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={effectivePagination.pageIndex + 1}
            pageCount={Math.max(1, table.getPageCount())}
            pageSize={effectivePagination.pageSize}
            total={totalRows}
            onPageChange={p => table.setPageIndex(p - 1)}
            onPageSizeChange={s => table.setPageSize(s)}
            pageSizeOptions={pageSizeOptions}
          />
        </>
      )}
    </div>
  );
}

function DensityToggle({ density, onChange }: { density: 'compact' | 'regular'; onChange: (d: 'compact' | 'regular') => void }) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <ToggleButton active={density === 'regular'} onClick={() => onChange('regular')}>Regular</ToggleButton>
      <ToggleButton active={density === 'compact'} onClick={() => onChange('compact')}>Compact</ToggleButton>
    </div>
  );
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '0.625rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        color: active ? 'var(--primary-bright)' : 'var(--text-secondary)',
        background: active ? 'color-mix(in srgb, var(--primary-bright) 12%, transparent)' : 'transparent',
        border: 'none',
        padding: '0.3rem 0.6rem',
        cursor: 'pointer',
      }}
    >{children}</button>
  );
}

function ColumnVisibilityMenu({
  open, onToggle, columns,
}: {
  open: boolean;
  onToggle: () => void;
  columns: Array<{ id: string; getIsVisible: () => boolean; toggleVisibility: () => void; columnDef: { header?: unknown } }>;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={onToggle} style={menuButtonStyle} aria-expanded={open}>
        ⋮ Columns
      </button>
      {open && (
        <div role="menu" style={menuPanelStyle}>
          {columns.map(c => (
            <label key={c.id} style={menuItemStyle}>
              <input
                type="checkbox"
                checked={c.getIsVisible()}
                onChange={c.toggleVisibility}
              />
              {String((c.columnDef.header as string | undefined) ?? c.id)}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function Pagination({
  page, pageCount, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions,
}: {
  page: number; pageCount: number; pageSize: number; total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  pageSizeOptions: number[];
}) {
  if (total === 0) return null;
  const startIdx = (page - 1) * pageSize;
  const endIdx   = Math.min(startIdx + pageSize, total);

  // Numeric window — page 1, current ±1, last. Compact even with hundreds of pages.
  const windowSet = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const pages = [...windowSet].filter(n => n >= 1 && n <= pageCount).sort((a, b) => a - b);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
        Showing {startIdx + 1}–{endIdx} of {total}
      </span>
      <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
        <select
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          style={pageSizeSelectStyle}
          aria-label="Rows per page"
        >
          {pageSizeOptions.map(s => <option key={s} value={s}>{s} / page</option>)}
        </select>
        <nav style={{ display: 'inline-flex', gap: '0.25rem', flexWrap: 'wrap' }} aria-label="Pagination">
          <PageButton disabled={page <= 1} onClick={() => onPageChange(page - 1)}>‹</PageButton>
          {pages.map((n, i) => {
            const prev = pages[i - 1];
            const gap = prev != null && n - prev > 1;
            return (
              <span key={n} style={{ display: 'inline-flex', alignItems: 'center' }}>
                {gap && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', padding: '0 0.25rem' }}>…</span>}
                <PageButton active={n === page} onClick={() => onPageChange(n)}>{n}</PageButton>
              </span>
            );
          })}
          <PageButton disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>›</PageButton>
        </nav>
      </div>
    </div>
  );
}

// ─── Phase 3 helpers: inline edit, pinning, CSV export ──────────────────────

function InlineEditInput({
  value, busy, onChange, onSave, onCancel,
}: {
  value: string;
  busy: boolean;
  onChange: (v: string) => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
}) {
  return (
    <input
      autoFocus
      value={value}
      disabled={busy}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          void onSave();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={onCancel}
      style={{
        width: '100%',
        padding: '0.2rem 0.4rem',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        color: 'var(--text-primary)',
        background: 'var(--bg-card, #0f1d32)',
        border: '1px solid var(--primary-bright)',
        borderRadius: 3,
        outline: 'none',
      }}
    />
  );
}

/**
 * Sticky-position style for a pinned cell. Used by both <th> and <td>;
 * pass `isHeader=true` for a slightly stronger background so headers
 * don't blend with the row underneath while scrolling.
 *
 * <p>For now we don't compute precise `left:` offsets per column —
 * pinned columns have to be the leftmost (or rightmost) and their
 * sticky stack collapses naturally when there's only ONE pinned per
 * side. If we add multi-column pin we'll need to track widths and
 * compute an accumulating offset.
 */
function pinnedCellStyle(
  side: 'left' | 'right' | false,
  isHeader: boolean,
  rowSelected = false,
): React.CSSProperties {
  if (!side) return {};
  // The selected-row tint already covers the cell background; only
  // override when the row ISN'T selected to keep visual continuity.
  const bg = rowSelected
    ? 'color-mix(in srgb, var(--primary-bright) 6%, var(--bg-card, #0f1d32))'
    : isHeader ? 'var(--bg-card, #0f1d32)' : 'var(--bg-card, #0f1d32)';
  return {
    position: 'sticky',
    [side]: 0,
    zIndex: isHeader ? 3 : 2,
    background: bg,
    boxShadow: side === 'left'
      ? 'inset -1px 0 0 var(--border)'
      : 'inset 1px 0 0 var(--border)',
  };
}

/**
 * Build a CSV string from the table's currently-filtered rows + trigger
 * a browser download. Uses RFC 4180 quoting: every field is wrapped in
 * `""` and embedded `"` is doubled. Carriage returns + line feeds inside
 * fields survive intact (Excel + LibreOffice + Numbers all handle this).
 */
function exportFilteredAsCsv<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: { getFilteredRowModel: () => { rows: Array<{ original: T }> } } & any,
  csvExport: NonNullable<AdminDataTableProps<T>['csvExport']>,
): void {
  const rows = table.getFilteredRowModel().rows.map((r: { original: T }) => r.original);
  const mapper = csvExport.mapper ?? defaultCsvMapper;
  if (rows.length === 0) return;

  // Union column set across rows (one row might omit a key the others have).
  const colSet = new Set<string>();
  const mapped: Array<Record<string, string | number | boolean | null | undefined>> = [];
  for (const row of rows) {
    const m = mapper(row);
    for (const k of Object.keys(m)) colSet.add(k);
    mapped.push(m);
  }
  const cols = Array.from(colSet);

  const escape = (v: unknown): string => {
    if (v == null) return '';
    const s = typeof v === 'string' ? v : String(v);
    return '"' + s.replace(/"/g, '""') + '"';
  };

  const lines: string[] = [];
  lines.push(cols.map(escape).join(','));
  for (const row of mapped) {
    lines.push(cols.map(c => escape(row[c])).join(','));
  }

  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = csvExport.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke a tick so Safari completes the download trigger.
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function defaultCsvMapper<T>(row: T): Record<string, string | number | boolean | null | undefined> {
  if (row == null || typeof row !== 'object') return { value: String(row) };
  const out: Record<string, string | number | boolean | null | undefined> = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    if (v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v as string | number | boolean | null | undefined;
    } else {
      out[k] = JSON.stringify(v);
    }
  }
  return out;
}

function PageButton({
  active, disabled, onClick, children,
}: {
  active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 28,
        height: 28,
        padding: '0 0.5rem',
        fontFamily: 'var(--font-heading)',
        fontSize: '0.75rem',
        color: disabled ? 'var(--text-muted)' : active ? 'var(--primary-bright)' : 'var(--text-secondary)',
        background: active ? 'color-mix(in srgb, var(--primary-bright) 12%, transparent)' : 'transparent',
        border: `1px solid ${active ? 'color-mix(in srgb, var(--primary-bright) 28%, transparent)' : 'var(--border)'}`,
        borderRadius: 4,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

const thBaseStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.625rem',
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  fontWeight: 700,
  padding: '0.5rem 0.75rem',
  whiteSpace: 'nowrap' as const,
};
const menuButtonStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.625rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--text-secondary)',
  background: 'var(--sunken)',
  border: '1px solid var(--border)',
  padding: '0.35rem 0.7rem',
  borderRadius: 4,
  cursor: 'pointer' as const,
};
const menuPanelStyle = {
  position: 'absolute' as const,
  top: '100%',
  right: 0,
  marginTop: 4,
  background: 'var(--bg-card, #0f1d32)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '0.4rem 0.6rem',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 4,
  zIndex: 50,
  minWidth: 160,
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
};
const menuItemStyle = {
  display: 'flex',
  gap: 6,
  alignItems: 'center',
  cursor: 'pointer' as const,
  padding: '2px 0',
};
const pageSizeSelectStyle = {
  background: 'var(--sunken)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '0.3rem 0.5rem',
  color: 'var(--text-secondary)',
  fontSize: '0.75rem',
  cursor: 'pointer' as const,
};
const bulkBarStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.6rem 1rem',
  background: 'color-mix(in srgb, var(--primary-bright) 8%, transparent)',
  border: '1px solid color-mix(in srgb, var(--primary-bright) 22%, transparent)',
  borderRadius: 4,
  fontSize: '0.8125rem',
  color: 'var(--text-secondary)',
};
const bulkClearButtonStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.625rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--text-secondary)',
  background: 'transparent',
  border: '1px solid var(--border)',
  padding: '0.3rem 0.6rem',
  borderRadius: 3,
  cursor: 'pointer' as const,
};
