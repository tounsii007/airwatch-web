/**
 * Range option data + helpers — split out from {@link InstancesRangePicker}
 * so server components can import the helper without pulling in the
 * client component (and tripping the "client function called from
 * server" RSC boundary error).
 */

export interface RangeOption {
  /** URL value. */
  id: '1h' | '24h' | '7d' | '30d';
  label: string;
  minutes: number;
}

export const RANGES: readonly RangeOption[] = [
  { id: '1h',  label: '1H',  minutes: 60 },
  { id: '24h', label: '24H', minutes: 60 * 24 },
  { id: '7d',  label: '7D',  minutes: 60 * 24 * 7 },
  { id: '30d', label: '30D', minutes: 60 * 24 * 30 },
];

export const DEFAULT_RANGE: RangeOption['id'] = '1h';

/** Pure helper — safe to call from server or client. */
export function rangeFromQuery(value: string | undefined): RangeOption {
  return RANGES.find((r) => r.id === value) ?? RANGES[0];
}
