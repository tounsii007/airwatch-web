// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { SkipToContent } from './SkipToContent';

vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: 'en' }),
}));
vi.mock('@/lib/i18n/translations', () => ({ t: (key: string) => key }));

describe('<SkipToContent />', () => {
  it('renders a link that targets the main landmark', () => {
    render(<SkipToContent />);
    const link = screen.getByRole('link', { name: 'skip_to_content' });
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('has no axe violations', async () => {
    const { container } = render(<SkipToContent />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
