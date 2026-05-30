// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { SavedViewsBar, useSavedViews, type SavedView } from './SavedViews';

const STORAGE_KEY = 'airwatch.admin.savedviews';

type Filters = { q: string; limit?: number };

const view = (id: string, name: string, filters: Filters): SavedView<Filters> => ({
  id,
  name,
  filters,
  createdAt: 1_700_000_000_000,
});

function readStorage(): Record<string, unknown[]> {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useSavedViews (localStorage hook)', () => {
  it('starts with no views', () => {
    const { result } = renderHook(() => useSavedViews<Filters>('audit'));
    expect(result.current.views).toEqual([]);
  });

  it('save() appends a view, persists it, and returns it', () => {
    const { result } = renderHook(() => useSavedViews<Filters>('audit'));

    let created: SavedView<Filters> | undefined;
    act(() => {
      created = result.current.save('Failed Logins', { q: 'LOGIN_FAILED' });
    });

    expect(created?.name).toBe('Failed Logins');
    expect(result.current.views).toHaveLength(1);
    expect(result.current.views[0].filters).toEqual({ q: 'LOGIN_FAILED' });
    // Persisted under the page key.
    expect(readStorage().audit).toHaveLength(1);
  });

  it('trims + caps the name at 60 chars and falls back to "Untitled"', () => {
    const { result } = renderHook(() => useSavedViews<Filters>('audit'));

    act(() => {
      result.current.save('   spaced   ', { q: 'a' });
    });
    act(() => {
      result.current.save('x'.repeat(80), { q: 'b' });
    });
    act(() => {
      result.current.save('   ', { q: 'c' });
    });

    const names = result.current.views.map((v) => v.name);
    expect(names[0]).toBe('spaced');
    expect(names[1]).toHaveLength(60);
    expect(names[2]).toBe('Untitled');
  });

  it('remove() deletes by id and persists the smaller list', () => {
    const { result } = renderHook(() => useSavedViews<Filters>('audit'));

    let id = '';
    act(() => {
      id = result.current.save('A', { q: 'a' }).id;
    });
    act(() => {
      result.current.save('B', { q: 'b' });
    });
    expect(result.current.views).toHaveLength(2);

    act(() => {
      result.current.remove(id);
    });

    expect(result.current.views.map((v) => v.name)).toEqual(['B']);
    expect(readStorage().audit).toHaveLength(1);
  });

  it('keeps views isolated per pageId', () => {
    const audit = renderHook(() => useSavedViews<Filters>('audit'));
    act(() => {
      audit.result.current.save('Only Audit', { q: 'a' });
    });

    // A different page sees none of the audit views.
    const errors = renderHook(() => useSavedViews<Filters>('errors'));
    expect(errors.result.current.views).toHaveLength(0);
    expect(audit.result.current.views).toHaveLength(1);
  });

  it('hydrates from existing localStorage on mount', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        audit: [{ id: 'seed', name: 'Seeded', filters: { q: 'x' }, createdAt: 1 }],
      }),
    );

    const { result } = renderHook(() => useSavedViews<Filters>('audit'));
    expect(result.current.views).toHaveLength(1);
    expect(result.current.views[0].name).toBe('Seeded');
  });

  it('tolerates corrupt JSON in storage (degrades to empty)', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    const { result } = renderHook(() => useSavedViews<Filters>('audit'));
    expect(result.current.views).toEqual([]);
  });
});

describe('<SavedViewsBar />', () => {
  it('shows the empty hint when there are no saved views', () => {
    render(
      <SavedViewsBar
        views={[]}
        currentFilters={{ q: '' }}
        onApply={vi.fn()}
        onSave={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(
      screen.getByText('None yet. Save the current filters as a view.'),
    ).toBeInTheDocument();
  });

  it('renders a button per view and applies its filters on click', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(
      <SavedViewsBar
        views={[view('v1', 'Failed Logins', { q: 'LOGIN_FAILED' })]}
        currentFilters={{ q: '' }}
        onApply={onApply}
        onSave={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Failed Logins' }));
    expect(onApply).toHaveBeenCalledWith({ q: 'LOGIN_FAILED' });
  });

  it('confirms before removing and passes the view id through', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    window.confirm = vi.fn(() => true);
    render(
      <SavedViewsBar
        views={[view('v1', 'Failed Logins', { q: 'x' })]}
        currentFilters={{ q: '' }}
        onApply={vi.fn()}
        onSave={vi.fn()}
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete Failed Logins' }));
    expect(onRemove).toHaveBeenCalledWith('v1');
  });

  it('does not remove when the confirm dialog is dismissed', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    window.confirm = vi.fn(() => false);
    render(
      <SavedViewsBar
        views={[view('v1', 'Failed Logins', { q: 'x' })]}
        currentFilters={{ q: '' }}
        onApply={vi.fn()}
        onSave={vi.fn()}
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete Failed Logins' }));
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('highlights the view whose filters match the current ones', () => {
    render(
      <SavedViewsBar
        views={[view('v1', 'Match', { q: 'x' }), view('v2', 'NoMatch', { q: 'y' })]}
        currentFilters={{ q: 'x' }}
        onApply={vi.fn()}
        onSave={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const active = screen.getByRole('button', { name: 'Match' });
    const inactive = screen.getByRole('button', { name: 'NoMatch' });
    expect(active.style.color).toBe('var(--primary-bright)');
    expect(inactive.style.color).not.toBe('var(--primary-bright)');
  });

  it('honours a custom isMatch comparator', () => {
    const isMatch = vi.fn(() => true);
    render(
      <SavedViewsBar
        views={[view('v1', 'V1', { q: 'x' })]}
        currentFilters={{ q: 'totally-different' }}
        onApply={vi.fn()}
        onSave={vi.fn()}
        onRemove={vi.fn()}
        isMatch={isMatch}
      />,
    );
    expect(isMatch).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'V1' }).style.color).toBe(
      'var(--primary-bright)',
    );
  });

  it('reveals the name input and saves on Enter, then hides the input', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <SavedViewsBar
        views={[]}
        currentFilters={{ q: '' }}
        onApply={vi.fn()}
        onSave={onSave}
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '+ Save current' }));
    await user.type(screen.getByPlaceholderText('View name…'), 'My Filter{Enter}');

    expect(onSave).toHaveBeenCalledWith('My Filter');
    expect(screen.queryByPlaceholderText('View name…')).not.toBeInTheDocument();
  });

  it('cancels the save input on Escape without calling onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <SavedViewsBar
        views={[]}
        currentFilters={{ q: '' }}
        onApply={vi.fn()}
        onSave={onSave}
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '+ Save current' }));
    await user.type(screen.getByPlaceholderText('View name…'), 'Discard{Escape}');

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('View name…')).not.toBeInTheDocument();
  });

  it('ignores a blank name and keeps the input open', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <SavedViewsBar
        views={[]}
        currentFilters={{ q: '' }}
        onApply={vi.fn()}
        onSave={onSave}
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '+ Save current' }));
    const input = screen.getByPlaceholderText('View name…');
    await user.type(input, '   {Enter}');

    expect(onSave).not.toHaveBeenCalled();
    expect(input).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <SavedViewsBar
        views={[view('v1', 'V1', { q: 'x' })]}
        currentFilters={{ q: 'x' }}
        onApply={vi.fn()}
        onSave={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
