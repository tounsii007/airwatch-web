/**
 * Reads `?success=…` / `?error=…` query params on mount and dispatches
 * a toast for each. Used by every admin page whose state-changing form
 * gets a sendRedirect from the api with a result code.
 *
 * <h3>Why this exists</h3>
 * The admin actions are server-rendered form-POSTs that hit Spring Boot
 * and get a 302 back — there's no JS context to fire a toast at the
 * moment the action completes. The redirect destination carries a
 * machine-readable code (`?success=cleared`, `?error=badcurrent`); this
 * component lifts that into a UI signal and immediately strips it from
 * the URL via `router.replace()` so a manual refresh doesn't re-fire
 * the same toast.
 *
 * <h3>Usage</h3>
 * Drop into a server-rendered page once, with the page's specific
 * message map:
 *
 * <pre>{@code
 *   <ActionResultToast
 *     successMessages={{ cleared: 'Cache flushed.' }}
 *     errorMessages={{ csrf: 'Session expired — re-login.' }}
 *   />
 * }</pre>
 *
 * Unknown codes fall through silently — better than an obscure "ok"
 * toast that doesn't tell the operator what happened.
 */
'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useToast } from '@/app/(admin)/Toast';

interface Props {
  successMessages?: Record<string, string>;
  errorMessages?: Record<string, string>;
}

export function ActionResultToast({ successMessages = {}, errorMessages = {} }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  // Guard against React 18 strict-mode double-invoke firing the toast twice.
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    const success = params.get('success');
    const error   = params.get('error');
    if (!success && !error) return;
    fired.current = true;

    if (success) {
      const msg = successMessages[success] ?? `Action completed (${success})`;
      toast.success(msg);
    }
    if (error) {
      const msg = errorMessages[error] ?? `Action failed (${error})`;
      toast.error(msg);
    }

    // Strip the param so a refresh doesn't re-toast. Build a replacement
    // URL keeping any other params an operator might have set.
    const next = new URLSearchParams(params.toString());
    next.delete('success');
    next.delete('error');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router, toast, successMessages, errorMessages]);

  return null;
}
