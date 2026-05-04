import { redirect } from 'next/navigation';

/**
 * Bare /admin → operators land on the dashboard.
 *
 * Without this, Next.js 308-redirects /admin/ back to /admin while nginx
 * 301-redirects /admin to /admin/, producing ERR_TOO_MANY_REDIRECTS.
 */
export default function AdminIndex() {
  redirect('/admin/dashboard');
}
