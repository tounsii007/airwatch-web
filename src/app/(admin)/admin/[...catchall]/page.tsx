import { notFound } from 'next/navigation';

/**
 * Catch-all under /admin/* so Next.js knows every unmatched admin URL
 * belongs to the (admin) route group. Without this the router falls
 * back to the built-in 404 (white background, no admin shell) because
 * with multiple root layouts it can't pick which group's not-found
 * to render.
 *
 * Calling notFound() here triggers (admin)/not-found.tsx and preserves
 * the 404 status code.
 */
export default function AdminCatchAll() {
  notFound();
}
