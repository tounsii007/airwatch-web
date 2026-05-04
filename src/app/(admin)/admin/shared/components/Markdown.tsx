/**
 * Tiny in-bundle markdown renderer.
 *
 * Same parser as the one inlined in HelpPanel — extracted so other
 * surfaces (incident postmortems, future runbook embeds) can share it
 * without re-implementing or pulling react-markdown.
 *
 * Supports:
 *   * `# Heading` / `## Subheading`
 *   * `**bold**`
 *   * `` `code` ``
 *   * `- bullet` (unordered list)
 *   * blank-line-separated paragraphs
 *
 * Anything more advanced (links, tables, nested lists, code fences)
 * is intentionally out of scope — write that in a real wiki, not in
 * an admin-page text field.
 */
import { JSX, ReactNode } from 'react';

export function Markdown({ source }: { source: string }) {
  return <>{renderMarkdown(source)}</>;
}

export function renderMarkdown(src: string): ReactNode {
  const lines = src.split('\n');
  const out: ReactNode[] = [];
  let listBuf: string[] = [];
  let paraBuf: string[] = [];

  function flushList() {
    if (listBuf.length === 0) return;
    out.push(
      <ul key={`ul-${out.length}`} style={{ margin: '0.4rem 0 0.6rem 1rem', paddingLeft: '0.5rem' }}>
        {listBuf.map((item, i) => (
          <li key={i} style={{ marginBottom: 2 }}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    listBuf = [];
  }
  function flushPara() {
    if (paraBuf.length === 0) return;
    out.push(
      <p key={`p-${out.length}`} style={{ margin: '0.4rem 0' }}>
        {renderInline(paraBuf.join(' '))}
      </p>
    );
    paraBuf = [];
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') { flushList(); flushPara(); continue; }

    const h1 = line.match(/^# (.+)$/);
    const h2 = line.match(/^## (.+)$/);
    const li = line.match(/^[-*] (.+)$/);

    if (h1) {
      flushList(); flushPara();
      out.push(<h3 key={`h1-${out.length}`} style={{ margin: '0.6rem 0 0.3rem', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{renderInline(h1[1])}</h3>);
    } else if (h2) {
      flushList(); flushPara();
      out.push(<h4 key={`h2-${out.length}`} style={{ margin: '0.5rem 0 0.2rem', color: 'var(--text-primary)', fontSize: '0.85rem' }}>{renderInline(h2[1])}</h4>);
    } else if (li) {
      flushPara();
      listBuf.push(li[1]);
    } else {
      flushList();
      paraBuf.push(line);
    }
  }
  flushList(); flushPara();
  return out;
}

function renderInline(s: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let last = 0; let m: RegExpExecArray | null; let key = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    if (m[2] != null) {
      parts.push(<strong key={key++} style={{ color: 'var(--text-primary)' }}>{m[2]}</strong>);
    } else if (m[3] != null) {
      parts.push(
        <code key={key++} style={{
          color: 'var(--primary-bright)',
          background: 'var(--sunken)',
          padding: '1px 5px',
          borderRadius: 3,
          fontSize: '0.8em',
        }}>{m[3]}</code>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts as JSX.Element[];
}
