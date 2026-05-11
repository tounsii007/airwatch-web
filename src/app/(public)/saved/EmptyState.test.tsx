// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';
import { loadLocale } from '@/lib/i18n/translations';

describe('<EmptyState />', () => {
  // The translations cache is module-scoped; warm DE + FR once for the file.
  beforeAll(async () => {
    await loadLocale('de');
    await loadLocale('fr');
  });

  it('renders the EN copy when language is "en"', () => {
    render(<EmptyState language="en" />);
    expect(screen.getByText(/No favorites saved/i)).toBeInTheDocument();
    expect(screen.getByText(/Mark flights/i)).toBeInTheDocument();
  });

  it('renders the DE copy when language is "de"', () => {
    render(<EmptyState language="de" />);
    expect(screen.getByText(/Keine Favoriten gespeichert/i)).toBeInTheDocument();
  });

  it('renders the FR copy when language is "fr"', () => {
    render(<EmptyState language="fr" />);
    expect(screen.getByText(/Aucun favori/i)).toBeInTheDocument();
  });
});
