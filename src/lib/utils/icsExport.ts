/**
 * RFC 5545 .ics generator + downloader.
 *
 * <h3>Why hand-rolled</h3>
 * The set of fields we emit is tiny (UID, DTSTAMP, DTSTART, DTEND,
 * SUMMARY, LOCATION, DESCRIPTION). Every npm option (ical-generator,
 * icalendar) is at least 50 KB minified and pulls a date library.
 * RFC 5545's line-folding + escaping rules fit in 50 lines.
 *
 * <h3>What we emit</h3>
 * One VCALENDAR per call, one VEVENT per input. The output validates
 * cleanly against the iCalendar Validator (validator.icalevents.com)
 * and imports correctly into Google Calendar, Apple Calendar, and
 * Outlook.
 *
 * <h3>Use cases in AirWatch</h3>
 *   * /saved page — let the user export their starred-flights as a
 *     calendar so the next departure shows up in their schedule.
 *   * /spotting page — calendar entry for the next overhead pass at
 *     their reported location.
 */

export interface IcsEvent {
  /** Stable per-item id; we suffix it with @airwatch.app for RFC 5545. */
  id: string;
  /** Event start (Date or ISO instant string). */
  start: Date | string;
  /** Event end (Date or ISO instant string). When omitted we use start + 1h. */
  end?: Date | string;
  /** One-line title (becomes SUMMARY). */
  title: string;
  /** Optional venue / airport / coordinates (becomes LOCATION). */
  location?: string;
  /** Multi-line free text (becomes DESCRIPTION). */
  description?: string;
  /** Optional URL the calendar app can render as a link. */
  url?: string;
}

/** RFC 5545 §3.3.5 BASIC date-time form, in UTC: 19980119T070000Z. */
function formatUtc(at: Date | string): string {
  const d = typeof at === 'string' ? new Date(at) : at;
  if (isNaN(d.getTime())) throw new Error('icsExport: invalid date input');
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
         `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/**
 * RFC 5545 §3.3.11: backslashes escape `\`, `,`, `;`, and newlines
 * become `\n`. Carriage returns are dropped. Single-line fields don't
 * need newline escapes; multi-line DESCRIPTION does.
 */
export function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n');
}

/**
 * RFC 5545 §3.1: lines longer than 75 octets MUST be split with a
 * CRLF + space continuation. We assume the caller's input is ASCII
 * (UTF-8 content from t() etc. is fine — bytes ≠ chars matters only
 * once you push beyond ~75 chars and unicode lands).
 */
export function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let pos = 0;
  parts.push(line.substring(pos, 75));
  pos += 75;
  while (pos < line.length) {
    parts.push(' ' + line.substring(pos, pos + 74));
    pos += 74;
  }
  return parts.join('\r\n');
}

/**
 * Render a list of events as a complete VCALENDAR document. Returns
 * the raw .ics bytes-as-string ready to be downloaded or POSTed.
 */
export function buildIcs(events: IcsEvent[], opts: { calName?: string } = {}): string {
  const dtstamp = formatUtc(new Date());
  const calName = opts.calName ?? 'AirWatch';
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AirWatch//Web//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText(calName)}`,
  ];

  for (const ev of events) {
    const startStr = formatUtc(ev.start);
    const endStr = formatUtc(ev.end ?? new Date(
      (typeof ev.start === 'string' ? new Date(ev.start) : ev.start).getTime() + 60 * 60 * 1000));

    lines.push('BEGIN:VEVENT');
    lines.push(foldLine(`UID:${escapeText(ev.id)}@airwatch.app`));
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART:${startStr}`);
    lines.push(`DTEND:${endStr}`);
    lines.push(foldLine(`SUMMARY:${escapeText(ev.title)}`));
    if (ev.location)    lines.push(foldLine(`LOCATION:${escapeText(ev.location)}`));
    if (ev.description) lines.push(foldLine(`DESCRIPTION:${escapeText(ev.description)}`));
    if (ev.url)         lines.push(foldLine(`URL:${escapeText(ev.url)}`));
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  // RFC 5545 mandates CRLF line endings.
  return lines.join('\r\n') + '\r\n';
}

/**
 * Trigger a browser download of the ics document as
 * {@code airwatch-<filename>.ics}. Safe to call from a click handler.
 */
export function downloadIcs(events: IcsEvent[], filename: string, opts?: { calName?: string }) {
  if (typeof window === 'undefined') return;
  const ics = buildIcs(events, opts);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke a tick so Safari completes the download.
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
