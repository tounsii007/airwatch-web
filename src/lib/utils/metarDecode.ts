/**
 * Self-contained METAR/TAF decoder.
 *
 * <h3>Why hand-rolled instead of a library</h3>
 * The aviation METAR vocabulary is bounded (~50 weather codes, two cloud
 * formats, two wind formats, two visibility formats) and well-specified.
 * A library would either be too generic (taf-decoder pulls 70 KB) or
 * partial (decoder-metar misses TAF temporal groups). Decoding inline
 * gives us:
 *   * total control over what fields we surface (we don't show all 40+),
 *   * a pure function trivial to unit-test against fixed inputs,
 *   * tree-shakeable wrt locale labels (only the codes the user is
 *     reading get formatted).
 *
 * <h3>Coverage</h3>
 *   * Wind: dir + speed + gust + variable + 0KT calm.
 *   * Visibility: stat-mile (`6SM`, `1/2SM`) + metric (`9999`, `0500`).
 *   * Clouds: SKC/CLR/CAVOK + FEW/SCT/BKN/OVC at three-digit FL.
 *   * Temperature/dewpoint: standard `21/16`, negative `M03/M05`.
 *   * Altimeter: `A2992` inHg, `Q1013` hPa.
 *   * Phenomena: 30-ish recognised codes (RA, SN, FG, TS, …) including
 *     the leading intensity prefix (`-`, `+`, `VC`).
 *   * TAF: walks the FM/TEMPO/BECMG groups and decodes each window
 *     independently using the same primitives.
 *
 * <h3>What we don't decode</h3>
 *   * Runway visual range (RVR) — operationally niche; raw value shown.
 *   * Recent weather (RE-prefixed) and trend groups beyond TAF FM/TEMPO.
 *   * Remarks (RMK …) — vendor-specific, kept as-is in the raw view.
 *
 * Anything unknown stays in the {@link DecodedMetar.unknown} bucket so
 * the operator still sees the source token; we never drop information.
 */

export interface DecodedMetar {
  station: string | null;
  /** Day-of-month + zulu time (e.g. "10 14:55Z"). */
  observed: string | null;
  /** "AUTO" / "COR" / null. */
  modifier: string | null;
  wind: {
    /** Heading in degrees, 0–359, or null when calm/variable. */
    direction: number | null;
    speed: number;
    gust: number | null;
    /** Speed unit, "KT" / "MPS" — METAR almost always KT. */
    unit: string;
    /** True when the wind is reported as variable (VRB) or "00000KT". */
    variable: boolean;
  } | null;
  /** Decoded visibility — { value, unit }. */
  visibility: { value: number | string; unit: 'SM' | 'm' | 'CAVOK' } | null;
  cloudLayers: Array<{ cover: 'FEW' | 'SCT' | 'BKN' | 'OVC' | 'SKC' | 'CLR' | 'CAVOK'; baseFt: number | null; type: string | null }>;
  temperature: { tempC: number | null; dewC: number | null };
  altimeter: { inHg: number | null; hPa: number | null };
  /** Decoded weather phenomena (e.g. "-RA" → { intensity: '-', code: 'RA' }). */
  phenomena: Array<{ intensity: '-' | '+' | 'VC' | null; code: string }>;
  /** Source tokens we couldn't confidently decode — kept verbatim. */
  unknown: string[];
  /** Original raw string. */
  raw: string;
}

const PHENOMENA: Record<string, string> = {
  // Descriptors
  MI: 'shallow', BC: 'patches', PR: 'partial', DR: 'low drifting',
  BL: 'blowing', SH: 'shower(s)', TS: 'thunderstorm', FZ: 'freezing',
  // Precipitation
  DZ: 'drizzle', RA: 'rain', SN: 'snow', SG: 'snow grains',
  IC: 'ice crystals', PL: 'ice pellets', GR: 'hail', GS: 'small hail',
  UP: 'unknown precip',
  // Obscuration
  BR: 'mist', FG: 'fog', FU: 'smoke', VA: 'volcanic ash',
  DU: 'widespread dust', SA: 'sand', HZ: 'haze',
  // Other
  PO: 'dust whirls', SQ: 'squalls', FC: 'funnel cloud', SS: 'sandstorm',
  DS: 'duststorm',
};

const STATION_RE   = /^[A-Z]{4}$/;
const OBSERVED_RE  = /^(\d{2})(\d{2})(\d{2})Z$/;
const MODIFIER_RE  = /^(AUTO|COR)$/;
const WIND_RE      = /^(VRB|\d{3})(\d{2,3})(?:G(\d{2,3}))?(KT|MPS|KMH)$/;
const VIS_SM_RE    = /^(?:(\d+)\s+)?(\d{1,2}|\d\/\d|\d+\/\d+)SM$/;
const VIS_M_RE     = /^(\d{4})$/; // 4-digit metric visibility
const CLOUD_RE     = /^(FEW|SCT|BKN|OVC)(\d{3})(CB|TCU)?$/;
const TEMP_RE      = /^(M?\d{2})\/(M?\d{2})$/;
const ALT_HG_RE    = /^A(\d{4})$/;
const ALT_HPA_RE   = /^Q(\d{4})$/;
const PHENOM_RE    = /^([-+]|VC)?([A-Z]{2,4})$/;

/** Parse a single METAR line into structured fields. */
export function decodeMetar(raw: string): DecodedMetar {
  const tokens = raw.trim().split(/\s+/);
  const out: DecodedMetar = {
    station: null,
    observed: null,
    modifier: null,
    wind: null,
    visibility: null,
    cloudLayers: [],
    temperature: { tempC: null, dewC: null },
    altimeter: { inHg: null, hPa: null },
    phenomena: [],
    unknown: [],
    raw,
  };

  // Strip a leading "METAR" / "SPECI" header if present.
  if (tokens[0] === 'METAR' || tokens[0] === 'SPECI') tokens.shift();

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok) continue;

    // Stop processing at REMARKS — RMK is vendor-specific.
    if (tok === 'RMK') {
      // Push the rest as a single unknown blob so the raw is preserved.
      const tail = tokens.slice(i + 1).join(' ');
      if (tail) out.unknown.push('RMK ' + tail);
      break;
    }

    if (out.station === null && STATION_RE.test(tok)) { out.station = tok; continue; }

    const obs = OBSERVED_RE.exec(tok);
    if (out.observed === null && obs) {
      out.observed = `${obs[1]} ${obs[2]}:${obs[3]}Z`;
      continue;
    }

    if (out.modifier === null && MODIFIER_RE.test(tok)) { out.modifier = tok; continue; }

    if (tok === 'CAVOK') {
      out.visibility = { value: 'CAVOK', unit: 'CAVOK' };
      out.cloudLayers.push({ cover: 'CAVOK', baseFt: null, type: null });
      continue;
    }

    if (tok === 'CLR' || tok === 'SKC') {
      out.cloudLayers.push({ cover: tok as 'CLR' | 'SKC', baseFt: null, type: null });
      continue;
    }

    const wind = WIND_RE.exec(tok);
    if (wind && out.wind === null) {
      const dirRaw = wind[1];
      const speed  = parseInt(wind[2], 10);
      const gust   = wind[3] ? parseInt(wind[3], 10) : null;
      const unit   = wind[4];
      const variable = dirRaw === 'VRB' || (dirRaw === '000' && speed === 0);
      out.wind = {
        direction: variable ? null : parseInt(dirRaw, 10),
        speed,
        gust,
        unit,
        variable,
      };
      continue;
    }

    // Visibility — try statute miles first (US METAR), then metric.
    const visSm = VIS_SM_RE.exec(tok);
    if (visSm && out.visibility === null) {
      let value: number | string;
      if (visSm[1] && visSm[2].includes('/')) {
        // Mixed form like "1 1/2SM" — keep as the original string.
        value = `${visSm[1]} ${visSm[2]}`;
      } else if (visSm[2].includes('/')) {
        const [n, d] = visSm[2].split('/').map(Number);
        value = n / d;
      } else {
        value = parseInt(visSm[2], 10);
      }
      out.visibility = { value, unit: 'SM' };
      continue;
    }
    const visM = VIS_M_RE.exec(tok);
    if (visM && out.visibility === null) {
      const v = parseInt(visM[1], 10);
      // 9999 means "10 km or more" by ICAO convention.
      out.visibility = { value: v >= 9999 ? '≥10' : v, unit: 'm' };
      continue;
    }

    const cloud = CLOUD_RE.exec(tok);
    if (cloud) {
      out.cloudLayers.push({
        cover: cloud[1] as 'FEW' | 'SCT' | 'BKN' | 'OVC',
        baseFt: parseInt(cloud[2], 10) * 100,
        type: cloud[3] ?? null,
      });
      continue;
    }

    const temp = TEMP_RE.exec(tok);
    if (temp && out.temperature.tempC === null) {
      out.temperature = {
        tempC: parseTempPart(temp[1]),
        dewC:  parseTempPart(temp[2]),
      };
      continue;
    }

    const altHg = ALT_HG_RE.exec(tok);
    if (altHg) {
      out.altimeter.inHg = parseInt(altHg[1], 10) / 100;
      continue;
    }
    const altHpa = ALT_HPA_RE.exec(tok);
    if (altHpa) {
      out.altimeter.hPa = parseInt(altHpa[1], 10);
      continue;
    }

    // Phenomena tokens can stack multiple 2-letter codes after a single
    // intensity prefix: "TSRA" → ["TS","RA"], "+SHRA" → heavy shower of
    // rain. Walk 2-letter chunks; bail to the unknown bucket if any
    // chunk doesn't resolve so we don't half-decode and lose info.
    const phenMatch = PHENOM_RE.exec(tok);
    if (phenMatch) {
      const intensity = (phenMatch[1] as '-' | '+' | 'VC' | undefined) ?? null;
      const body = phenMatch[2];
      if (body.length % 2 === 0) {
        const codes: string[] = [];
        let ok = true;
        for (let p = 0; p < body.length; p += 2) {
          const code = body.substring(p, p + 2);
          if (!(code in PHENOMENA)) { ok = false; break; }
          codes.push(code);
        }
        if (ok && codes.length > 0) {
          for (const code of codes) {
            out.phenomena.push({ intensity, code });
          }
          continue;
        }
      }
    }

    out.unknown.push(tok);
  }

  return out;
}

/** Human-readable label for a phenomenon code. */
export function phenomenonLabel(code: string): string {
  return PHENOMENA[code] ?? code;
}

/** Pretty-print a phenomenon (intensity + label). */
export function phenomenonText(p: { intensity: string | null; code: string }): string {
  const label = phenomenonLabel(p.code);
  if (!p.intensity) return label;
  if (p.intensity === '-') return 'light ' + label;
  if (p.intensity === '+') return 'heavy ' + label;
  if (p.intensity === 'VC') return 'in vicinity: ' + label;
  return label;
}

function parseTempPart(t: string): number {
  const sign = t.startsWith('M') ? -1 : 1;
  const num = parseInt(t.replace('M', ''), 10);
  return sign * num;
}

/**
 * Decode a TAF into its constituent forecast windows. Each window
 * carries the same DecodedMetar shape (minus station/observed which
 * are TAF-level, not window-level).
 */
export interface DecodedTaf {
  station: string | null;
  /** "DDhhmm" issuance time + DDhhmm valid from / DDhhmm valid to. */
  issued: string | null;
  validFrom: string | null;
  validTo: string | null;
  windows: Array<{
    /** "INITIAL" for the first group, then FM / TEMPO / BECMG / PROB30… */
    label: string;
    /** Window start (DDhhmm or DDhh→DDhh). */
    when: string | null;
    /** Decoded conditions for that window — reuses DecodedMetar shape. */
    conditions: DecodedMetar;
  }>;
  raw: string;
}

const TAF_HEADER_RE = /^TAF\s+(?:AMD\s+|COR\s+)?([A-Z]{4})\s+(\d{6}Z)\s+(\d{4})\/(\d{4})\b/;
const FM_RE     = /^FM(\d{6})$/;
const TEMPO_RE  = /^TEMPO$/;
const BECMG_RE  = /^BECMG$/;
const PROB_RE   = /^PROB(\d{2})$/;
const PERIOD_RE = /^(\d{4})\/(\d{4})$/;

export function decodeTaf(raw: string): DecodedTaf {
  const out: DecodedTaf = {
    station: null,
    issued: null,
    validFrom: null,
    validTo: null,
    windows: [],
    raw,
  };

  // Header.
  const head = TAF_HEADER_RE.exec(raw);
  let body = raw;
  if (head) {
    out.station = head[1];
    out.issued = head[2];
    out.validFrom = head[3];
    out.validTo = head[4];
    body = raw.substring(head[0].length).trim();
  }

  // Split groups. We walk tokens and treat FM/TEMPO/BECMG/PROB as
  // boundaries.
  const tokens = body.split(/\s+/);
  let cur: string[] = [];
  let label = 'INITIAL';
  let when: string | null = head ? `${head[3]}/${head[4]}` : null;

  const flush = () => {
    if (cur.length === 0) return;
    out.windows.push({
      label,
      when,
      conditions: decodeMetar(cur.join(' ')),
    });
    cur = [];
  };

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const fm = FM_RE.exec(tok);
    if (fm) {
      flush();
      label = 'FM';
      when = fm[1];
      continue;
    }
    if (TEMPO_RE.test(tok) || BECMG_RE.test(tok)) {
      flush();
      label = tok;
      when = null;
      // Optional period DDhh/DDhh.
      const next = tokens[i + 1];
      const period = next ? PERIOD_RE.exec(next) : null;
      if (period) {
        when = `${period[1]}/${period[2]}`;
        i++;
      }
      continue;
    }
    const prob = PROB_RE.exec(tok);
    if (prob) {
      flush();
      label = `PROB${prob[1]}`;
      when = null;
      // Optional period.
      const next = tokens[i + 1];
      const period = next ? PERIOD_RE.exec(next) : null;
      if (period) {
        when = `${period[1]}/${period[2]}`;
        i++;
      }
      continue;
    }
    cur.push(tok);
  }
  flush();

  return out;
}
