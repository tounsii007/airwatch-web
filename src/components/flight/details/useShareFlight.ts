'use client';

import { useCallback, useState } from 'react';

interface ShareContext {
  callsign?: string;
  icao24: string;
  depIata?: string;
  arrIata?: string;
}

const COPIED_MS = 2000;

function buildTitle(ctx: ShareContext): string {
  return `${ctx.callsign ?? ctx.icao24} - AirWatch`;
}

function buildText(ctx: ShareContext): string {
  const display = ctx.callsign ?? ctx.icao24;
  const route = ctx.depIata && ctx.arrIata ? ` (${ctx.depIata} -> ${ctx.arrIata})` : '';
  return `Tracking ${display}${route} live on AirWatch`;
}

function currentUrl(): string {
  return typeof window !== 'undefined' ? window.location.href : '';
}

async function tryNativeShare(payload: { title: string; text: string; url: string }): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) return false;
  try {
    await navigator.share(payload);
  } catch {
    /* user cancelled */
  }
  return true;
}

async function tryClipboard(text: string, url: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return true;
  } catch {
    return false;
  }
}

/** navigator.share with a clipboard fallback; flashes `copied` for 2 s. */
export function useShareFlight() {
  const [copied, setCopied] = useState(false);

  const share = useCallback(async (ctx: ShareContext) => {
    const title = buildTitle(ctx);
    const text = buildText(ctx);
    const url = currentUrl();

    if (await tryNativeShare({ title, text, url })) return;
    if (await tryClipboard(text, url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_MS);
    }
  }, []);

  return { copied, share };
}
