'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';

interface State {
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
  /** Optional render-prop for a custom fallback UI. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

/**
 * Catches rendering / lifecycle errors in any subtree and shows a minimal
 * retry UI instead of unmounting to a blank screen. Use at the layout or
 * per-page level.
 *
 * React 19 has `useErrorBoundary` hooks via the react-error-boundary package,
 * but a handwritten class is still the cleanest way to keep this dependency
 * free and framework-agnostic.
 *
 * Localisation: the fallback UI text is driven by the active language in
 * the settings store. We read it imperatively via `useSettingsStore.getState()`
 * inside `render()` rather than via the React hook (which a class can't
 * call), and accept the trade-off that a language change after an error
 * doesn't auto-rerender the boundary — the user would have to retry first.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    // Class component → no hooks; read once per render.
    const language = useSettingsStore.getState().language;

    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 gap-4 text-center">
        <AlertTriangle size={32} className="text-[var(--error)]" />
        <h2 className="font-[var(--font-heading)] text-lg font-bold text-[var(--text-primary)] tracking-wider">
          {t('something_went_wrong', language)}
        </h2>
        <p className="text-xs text-[var(--text-muted)] font-[var(--font-body)] max-w-md break-words">
          {error.message || t('error_boundary_body', language)}
        </p>
        <button
          onClick={this.reset}
          className="px-4 py-1.5 text-xs font-[var(--font-heading)] font-bold tracking-wider bg-[var(--primary)]/15 text-[var(--primary)] hover:bg-[var(--primary)]/25 rounded-lg transition-colors"
        >
          {t('try_again', language)}
        </button>
      </div>
    );
  }
}
