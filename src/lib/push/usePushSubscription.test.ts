// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { _urlBase64ToUint8Array } from './usePushSubscription';

describe('_urlBase64ToUint8Array', () => {
  it('decodes a standard base64-url string with no padding', () => {
    // Encoded "hello" → "aGVsbG8" (no padding) in base64-url.
    const got = _urlBase64ToUint8Array('aGVsbG8');
    expect(Array.from(got)).toEqual([104, 101, 108, 108, 111]); // h, e, l, l, o
  });

  it('rehydrates the URL-safe `-` and `_` aliases', () => {
    // The JS atob equivalent of "+/" is the URL-safe "-_".
    // Encoded bytes [0xfb, 0xff] → "+/8" in standard, "-_8" url-safe.
    const got = _urlBase64ToUint8Array('-_8');
    expect(Array.from(got)).toEqual([0xfb, 0xff]);
  });

  it('handles padding-aware lengths (2-char tail)', () => {
    // "M" → [0x33] (single byte), 2 chars "Mw" with implied "==" padding.
    const got = _urlBase64ToUint8Array('Mw');
    expect(Array.from(got)).toEqual([0x33]);
  });

  it('handles a real-shape VAPID public key (65 raw bytes → 87 b64-url chars)', () => {
    // Synthetic 65-byte buffer (VAPID public keys are uncompressed P-256
    // which is 1 + 32 + 32 = 65 bytes). 65 bytes → 88 b64 → 87 chars
    // url-safe (one trailing '=' stripped).
    const raw = new Uint8Array(65).fill(0xab);
    const b64 = Buffer.from(raw).toString('base64')
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const got = _urlBase64ToUint8Array(b64);
    expect(got.length).toBe(65);
    expect(Array.from(got)).toEqual(Array.from(raw));
  });
});
