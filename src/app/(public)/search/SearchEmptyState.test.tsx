// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NoResultsState, TypeToSearchState } from './SearchEmptyState';
import { loadLocale } from '@/lib/i18n/translations';

describe('<TypeToSearchState />', () => {
  beforeAll(async () => {
    await loadLocale('de');
    await loadLocale('fr');
  });

  it('renders the localized "type to search" copy in EN/DE/FR', () => {
    const { rerender } = render(<TypeToSearchState language="en" />);
    expect(screen.getByText(/Type at least 2/i)).toBeInTheDocument();

    rerender(<TypeToSearchState language="de" />);
    expect(screen.getByText(/Mindestens 2 Zeichen/i)).toBeInTheDocument();

    rerender(<TypeToSearchState language="fr" />);
    expect(screen.getByText(/Saisissez au moins 2/i)).toBeInTheDocument();
  });
});

describe('<NoResultsState />', () => {
  it('inlines the user query in the message', () => {
    const { container } = render(<NoResultsState query="DLH" language="en" />);
    expect(container.textContent).toContain('DLH');
    expect(container.textContent).toMatch(/No results/i);
  });

  it('renders the "try" hint as a separate paragraph', () => {
    const { container } = render(<NoResultsState query="x" language="en" />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(2);
  });
});
