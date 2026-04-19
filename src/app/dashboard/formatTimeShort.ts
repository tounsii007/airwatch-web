/** Extract HH:MM from an ISO / time string. Falls back to '--:--'. */
export function formatTimeShort(time: string | undefined): string {
  if (!time) return '--:--';
  const match = time.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : time.slice(0, 5);
}
