// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildIcs, escapeText, foldLine } from './icsExport';

describe('escapeText', () => {
  it('escapes backslash, semicolon, comma, and newline per RFC 5545 §3.3.11', () => {
    expect(escapeText('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne');
  });
  it('drops carriage returns', () => {
    expect(escapeText('a\r\nb')).toBe('a\\nb');
  });
  it('passes plain text through unchanged', () => {
    expect(escapeText('Hello World')).toBe('Hello World');
  });
});

describe('foldLine', () => {
  it('returns the line unchanged when ≤ 75 chars', () => {
    const s = 'a'.repeat(75);
    expect(foldLine(s)).toBe(s);
  });
  it('splits long lines into ≤75-char chunks with CRLF + space continuation', () => {
    const s = 'a'.repeat(150);
    const got = foldLine(s);
    const parts = got.split('\r\n');
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(parts[0]).toHaveLength(75);
    // Every continuation line starts with a single space and is ≤ 75 chars.
    for (let i = 1; i < parts.length; i++) {
      expect(parts[i].startsWith(' ')).toBe(true);
      expect(parts[i].length).toBeLessThanOrEqual(75);
    }
    // Joining the first chunk + each continuation (minus the leading space)
    // round-trips the original string.
    const joined = parts[0] + parts.slice(1).map((p) => p.substring(1)).join('');
    expect(joined).toBe(s);
  });
});

describe('buildIcs', () => {
  it('emits a valid VCALENDAR with one VEVENT per input', () => {
    const ics = buildIcs([
      {
        id: 'flight-LH400',
        start: '2026-05-10T18:30:00Z',
        end:   '2026-05-10T22:45:00Z',
        title: 'LH400 FRA → JFK',
        location: 'Frankfurt (FRA)',
        description: 'Boeing 747-8, gate B26',
        url: 'https://airwatch.example/flight/abc123',
      },
    ]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//AirWatch//Web//EN');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:flight-LH400@airwatch.app');
    expect(ics).toContain('DTSTART:20260510T183000Z');
    expect(ics).toContain('DTEND:20260510T224500Z');
    expect(ics).toContain('SUMMARY:LH400 FRA → JFK');
    expect(ics).toContain('LOCATION:Frankfurt (FRA)');
    expect(ics).toContain('DESCRIPTION:Boeing 747-8\\, gate B26'); // comma escaped
    expect(ics).toContain('URL:https://airwatch.example/flight/abc123');
    expect(ics).toContain('END:VEVENT');
    // RFC 5545: CRLF line endings.
    expect(ics).toContain('\r\n');
  });

  it('defaults the end time to start + 1h when end is omitted', () => {
    const ics = buildIcs([
      { id: 'x', start: new Date('2026-05-10T12:00:00Z'), title: 'Pass' },
    ]);
    expect(ics).toContain('DTSTART:20260510T120000Z');
    expect(ics).toContain('DTEND:20260510T130000Z');
  });

  it('sets X-WR-CALNAME to the calName option', () => {
    const ics = buildIcs([], { calName: 'My Spotting Sessions' });
    expect(ics).toContain('X-WR-CALNAME:My Spotting Sessions');
  });

  it('falls back to "AirWatch" when no calName is given', () => {
    const ics = buildIcs([]);
    expect(ics).toContain('X-WR-CALNAME:AirWatch');
  });

  it('escapes special chars in summary + description', () => {
    const ics = buildIcs([
      {
        id: 'evil',
        start: '2026-05-10T12:00:00Z',
        title: 'Title with ; and , and \\ chars',
        description: 'Line 1\nLine 2',
      },
    ]);
    expect(ics).toContain('SUMMARY:Title with \\; and \\, and \\\\ chars');
    expect(ics).toContain('DESCRIPTION:Line 1\\nLine 2');
  });

  it('throws on an unparseable date input', () => {
    expect(() => buildIcs([{ id: 'x', start: 'not-a-date', title: 't' }]))
      .toThrow(/invalid date/);
  });

  it('emits an empty VCALENDAR when no events', () => {
    const ics = buildIcs([]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('folds long SUMMARY lines per §3.1', () => {
    const longTitle = 'A'.repeat(100);
    const ics = buildIcs([
      { id: 'x', start: '2026-05-10T12:00:00Z', title: longTitle },
    ]);
    // The SUMMARY line should be split into a 75-char chunk + space-prefixed
    // continuation. Find the SUMMARY block.
    const lines = ics.split('\r\n');
    const summaryIdx = lines.findIndex((l) => l.startsWith('SUMMARY:'));
    expect(lines[summaryIdx].length).toBeLessThanOrEqual(75);
    expect(lines[summaryIdx + 1].startsWith(' ')).toBe(true);
  });
});
