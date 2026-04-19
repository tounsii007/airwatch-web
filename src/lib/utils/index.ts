/**
 * Barrel export of `lib/utils` — each function lives in its own focused module.
 * Importing from `@/lib/utils` keeps existing call-sites working.
 */

export { formatAltitude, formatSpeed } from '@/lib/utils/format';
export { getStatusColor, getStatusLabel } from '@/lib/utils/status';
export { getAltitudeColor } from '@/lib/utils/altitudeColor';
export { haversineDistance } from '@/lib/utils/haversine';
export { getWeatherEmoji, getWeatherLabel } from '@/lib/utils/weather';
