/**
 * Right-to-left layout helpers.
 *
 * <h3>Why a tiny helper</h3>
 * Two callers need to ask "is this language RTL?": the document-direction
 * effect that toggles {@code <html dir="rtl">}, and any component that
 * needs to flip an icon (chevrons, arrows). Pulling the membership
 * test into one place keeps the union in one spot — adding 'fa' or
 * 'ur' later is a one-line change.
 *
 * <h3>What we deliberately do NOT do</h3>
 * We do not invert the entire CSS via {@code [dir="rtl"] *} — Tailwind
 * 4 already maps logical properties (ms/me/text-start/etc.) so the
 * majority of layout flips for free. Components that still use
 * {@code ml-*} / {@code mr-*} from before the logical-property
 * migration may visually drift; tracked as a follow-up.
 */
import type { AppLanguage } from '@/lib/types';

/** Languages whose script flows right to left. */
export const RTL_LANGUAGES: ReadonlySet<AppLanguage> = new Set<AppLanguage>(['ar']);

export function isRtl(lang: AppLanguage): boolean {
  return RTL_LANGUAGES.has(lang);
}

/** Convenience for the {@code dir} attribute on {@code <html>}. */
export function dirAttr(lang: AppLanguage): 'rtl' | 'ltr' {
  return isRtl(lang) ? 'rtl' : 'ltr';
}
