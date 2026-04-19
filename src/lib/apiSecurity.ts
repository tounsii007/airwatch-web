/**
 * API Security — signs requests with HMAC-SHA256 for backend validation.
 * Only active when NEXT_PUBLIC_API_SECRET is set.
 */

const API_SECRET = process.env.NEXT_PUBLIC_API_SECRET || '';

/**
 * Generate authentication headers for a request.
 * Returns empty object if security is not configured.
 */
export async function getAuthHeaders(path: string): Promise<Record<string, string>> {
  if (!API_SECRET) return {};

  const timestamp = String(Date.now());
  const signature = await computeHmac(`${timestamp}:${path}`, API_SECRET);

  return {
    'X-AirWatch-Timestamp': timestamp,
    'X-AirWatch-Signature': signature,
  };
}

async function computeHmac(data: string, secret: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // Browser + Node 18+
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
    return btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
  // Fallback: no signing
  return '';
}
