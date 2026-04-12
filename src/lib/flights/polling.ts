export function resolvePollingIntervalMs(seconds: number): number {
  return Math.max(seconds * 1000, 30_000);
}
