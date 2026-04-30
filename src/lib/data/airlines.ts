import type { AirlineInfo } from '@/lib/types';

/**
 * Curated airline database extracted from the Flutter app.
 * Contains the ~160 most important airlines with valid IATA codes.
 */
export const AIRLINES: Record<string, AirlineInfo> = {
  AAH: { icao: 'AAH', iata: 'KH', name: 'Aloha Air Cargo', country: 'USA' },
  AAL: { icao: 'AAL', iata: 'AA', name: 'American Airlines', country: 'USA' },
  AAG: { icao: 'AAG', iata: 'JI', name: 'Armenian Airlines', country: 'Armenia' },
  AAR: { icao: 'AAR', iata: 'OZ', name: 'Asiana Airlines', country: 'South Korea' },
  AAW: { icao: 'AAW', iata: '8U', name: 'Afriqiyah Airways', country: 'Libya' },
  AAY: { icao: 'AAY', iata: 'G4', name: 'Allegiant Air', country: 'USA' },
  ABD: { icao: 'ABD', iata: 'A9', name: 'Air Incheon', country: 'South Korea' },
  ABN: { icao: 'ABN', iata: 'ZB', name: 'Air Albania', country: 'Albania' },
  ABV: { icao: 'ABV', iata: 'UK', name: 'ASL Airlines UK', country: 'UK' },
  ABX: { icao: 'ABX', iata: 'GB', name: 'ABX Air', country: 'USA' },
  ABY: { icao: 'ABY', iata: 'G9', name: 'Air Arabia', country: 'UAE' },
  ADB: { icao: 'ADB', iata: 'AA', name: 'Antonov Airlines', country: 'Ukraine' },
  ACA: { icao: 'ACA', iata: 'AC', name: 'Air Canada', country: 'Canada' },
  ACI: { icao: 'ACI', iata: 'SB', name: 'Aircalin', country: 'New Caledonia' },
  AEA: { icao: 'AEA', iata: 'UX', name: 'Air Europa', country: 'Spain' },
  AFW: { icao: 'AFW', iata: 'AW', name: 'Africa World Airlines', country: 'Ghana' },
  AFR: { icao: 'AFR', iata: 'AF', name: 'Air France', country: 'France' },
  AEE: { icao: 'AEE', iata: 'A3', name: 'Aegean Airlines', country: 'Greece' },
  AIC: { icao: 'AIC', iata: 'AI', name: 'Air India', country: 'India' },
  ALK: { icao: 'ALK', iata: 'UL', name: 'SriLankan Airlines', country: 'Sri Lanka' },
  AMX: { icao: 'AMX', iata: 'AM', name: 'Aeromexico', country: 'Mexico' },
  ANA: { icao: 'ANA', iata: 'NH', name: 'All Nippon Airways', country: 'Japan' },
  AHK: { icao: 'AHK', iata: 'LD', name: 'Air Hong Kong', country: 'Hong Kong' },
  AHY: { icao: 'AHY', iata: 'J2', name: 'Azerbaijan Airlines', country: 'Azerbaijan' },
  ARE: { icao: 'ARE', iata: 'AR', name: 'Aerolineas Argentinas', country: 'Argentina' },
  ASL: { icao: 'ASL', iata: 'JU', name: 'Air Serbia', country: 'Serbia' },
  ASA: { icao: 'ASA', iata: 'AS', name: 'Alaska Airlines', country: 'USA' },
  ATG: { icao: 'ATG', iata: 'F5', name: 'Aerotranscargo', country: 'Moldova' },
  AUA: { icao: 'AUA', iata: 'OS', name: 'Austrian Airlines', country: 'Austria' },
  AXM: { icao: 'AXM', iata: 'AK', name: 'AirAsia', country: 'Malaysia' },
  AZA: { icao: 'AZA', iata: 'AZ', name: 'ITA Airways', country: 'Italy' },
  BAW: { icao: 'BAW', iata: 'BA', name: 'British Airways', country: 'UK' },
  BBC: { icao: 'BBC', iata: 'BG', name: 'Biman Bangladesh Airlines', country: 'Bangladesh' },
  BEE: { icao: 'BEE', iata: 'BE', name: 'Flybe', country: 'UK' },
  BEL: { icao: 'BEL', iata: 'SN', name: 'Brussels Airlines', country: 'Belgium' },
  BER: { icao: 'BER', iata: 'DE', name: 'Condor', country: 'Germany' },
  BCS: { icao: 'BCS', iata: 'QY', name: 'European Air Transport', country: 'Belgium' },
  BOX: { icao: 'BOX', iata: '3S', name: 'AeroLogic', country: 'Germany' },
  BTI: { icao: 'BTI', iata: 'BT', name: 'airBaltic', country: 'Latvia' },
  CAL: { icao: 'CAL', iata: 'CI', name: 'China Airlines', country: 'Taiwan' },
  CCA: { icao: 'CCA', iata: 'CA', name: 'Air China', country: 'China' },
  CEB: { icao: 'CEB', iata: '5J', name: 'Cebu Pacific', country: 'Philippines' },
  CFG: { icao: 'CFG', iata: 'DE', name: 'Condor', country: 'Germany' },
  CES: { icao: 'CES', iata: 'MU', name: 'China Eastern Airlines', country: 'China' },
  CPA: { icao: 'CPA', iata: 'CX', name: 'Cathay Pacific', country: 'Hong Kong' },
  CSA: { icao: 'CSA', iata: 'OK', name: 'Czech Airlines', country: 'Czechia' },
  CSN: { icao: 'CSN', iata: 'CZ', name: 'China Southern Airlines', country: 'China' },
  DAL: { icao: 'DAL', iata: 'DL', name: 'Delta Air Lines', country: 'USA' },
  DAH: { icao: 'DAH', iata: 'AH', name: 'Air Algerie', country: 'Algeria' },
  DHL: { icao: 'DHL', iata: 'L3', name: 'DHL Air', country: 'UK' },
  DJT: { icao: 'DJT', iata: 'LS', name: 'Jet2.com', country: 'UK' },
  DLH: { icao: 'DLH', iata: 'LH', name: 'Lufthansa', country: 'Germany' },
  EIN: { icao: 'EIN', iata: 'EI', name: 'Aer Lingus', country: 'Ireland' },
  EOK: { icao: 'EOK', iata: 'RF', name: 'Aero K', country: 'South Korea' },
  ELY: { icao: 'ELY', iata: 'LY', name: 'El Al', country: 'Israel' },
  ETH: { icao: 'ETH', iata: 'ET', name: 'Ethiopian Airlines', country: 'Ethiopia' },
  ETD: { icao: 'ETD', iata: 'EY', name: 'Etihad Airways', country: 'UAE' },
  EVA: { icao: 'EVA', iata: 'BR', name: 'EVA Air', country: 'Taiwan' },
  EWG: { icao: 'EWG', iata: 'EW', name: 'Eurowings', country: 'Germany' },
  EXS: { icao: 'EXS', iata: 'LS', name: 'Jet2.com Holidays', country: 'UK' },
  EZY: { icao: 'EZY', iata: 'U2', name: 'easyJet', country: 'UK' },
  FDB: { icao: 'FDB', iata: 'FZ', name: 'flydubai', country: 'UAE' },
  FDX: { icao: 'FDX', iata: 'FX', name: 'FedEx Express', country: 'USA' },
  FIN: { icao: 'FIN', iata: 'AY', name: 'Finnair', country: 'Finland' },
  FWI: { icao: 'FWI', iata: 'TX', name: 'Air Caraibes', country: 'Guadeloupe' },
  GEC: { icao: 'GEC', iata: 'LH', name: 'Lufthansa Cargo', country: 'Germany' },
  GFA: { icao: 'GFA', iata: 'GF', name: 'Gulf Air', country: 'Bahrain' },
  GIA: { icao: 'GIA', iata: 'GA', name: 'Garuda Indonesia', country: 'Indonesia' },
  GLO: { icao: 'GLO', iata: 'G3', name: 'GOL Linhas Aereas', country: 'Brazil' },
  GTI: { icao: 'GTI', iata: '5Y', name: 'Atlas Air', country: 'USA' },
  HAL: { icao: 'HAL', iata: 'HA', name: 'Hawaiian Airlines', country: 'USA' },
  HVN: { icao: 'HVN', iata: 'VN', name: 'Vietnam Airlines', country: 'Vietnam' },
  IAW: { icao: 'IAW', iata: 'IY', name: 'IraqiAirways', country: 'Iraq' },
  IBE: { icao: 'IBE', iata: 'IB', name: 'Iberia', country: 'Spain' },
  ICE: { icao: 'ICE', iata: 'FI', name: 'Icelandair', country: 'Iceland' },
  IGO: { icao: 'IGO', iata: '6E', name: 'IndiGo', country: 'India' },
  JAL: { icao: 'JAL', iata: 'JL', name: 'Japan Airlines', country: 'Japan' },
  JAT: { icao: 'JAT', iata: 'JU', name: 'Air Serbia', country: 'Serbia' },
  JBU: { icao: 'JBU', iata: 'B6', name: 'JetBlue Airways', country: 'USA' },
  JST: { icao: 'JST', iata: 'JQ', name: 'Jetstar Airways', country: 'Australia' },
  KAC: { icao: 'KAC', iata: 'KU', name: 'Kuwait Airways', country: 'Kuwait' },
  KAL: { icao: 'KAL', iata: 'KE', name: 'Korean Air', country: 'South Korea' },
  KMM: { icao: 'KMM', iata: 'KM', name: 'KM Malta Airlines', country: 'Malta' },
  KLM: { icao: 'KLM', iata: 'KL', name: 'KLM Royal Dutch Airlines', country: 'Netherlands' },
  KMF: { icao: 'KMF', iata: 'RQ', name: 'Kam Air', country: 'Afghanistan' },
  KNE: { icao: 'KNE', iata: 'KM', name: 'Air Malta', country: 'Malta' },
  KQA: { icao: 'KQA', iata: 'KQ', name: 'Kenya Airways', country: 'Kenya' },
  KZR: { icao: 'KZR', iata: 'KC', name: 'Air Astana', country: 'Kazakhstan' },
  LAN: { icao: 'LAN', iata: 'LA', name: 'LATAM Airlines', country: 'Chile' },
  LBT: { icao: 'LBT', iata: 'BJ', name: 'Nouvelair', country: 'Tunisia' },
  LGL: { icao: 'LGL', iata: 'LG', name: 'Luxair', country: 'Luxembourg' },
  LOT: { icao: 'LOT', iata: 'LO', name: 'LOT Polish Airlines', country: 'Poland' },
  MAU: { icao: 'MAU', iata: 'MK', name: 'Air Mauritius', country: 'Mauritius' },
  MAS: { icao: 'MAS', iata: 'MH', name: 'Malaysia Airlines', country: 'Malaysia' },
  MEA: { icao: 'MEA', iata: 'ME', name: 'Middle East Airlines', country: 'Lebanon' },
  MSC: { icao: 'MSC', iata: 'SM', name: 'Air Cairo', country: 'Egypt' },
  MSR: { icao: 'MSR', iata: 'MS', name: 'EgyptAir', country: 'Egypt' },
  NAX: { icao: 'NAX', iata: 'DY', name: 'Norwegian', country: 'Norway' },
  NIS: { icao: 'NIS', iata: 'WT', name: 'Nigeria Air', country: 'Nigeria' },
  NPT: { icao: 'NPT', iata: 'WI', name: 'West Atlantic UK', country: 'UK' },
  NOS: { icao: 'NOS', iata: 'NO', name: 'Neos', country: 'Italy' },
  NSZ: { icao: 'NSZ', iata: 'D8', name: 'Norwegian Air Sweden', country: 'Sweden' },
  OMA: { icao: 'OMA', iata: 'WY', name: 'Oman Air', country: 'Oman' },
  OMS: { icao: 'OMS', iata: 'OV', name: 'SalamAir', country: 'Oman' },
  PAL: { icao: 'PAL', iata: 'PR', name: 'Philippine Airlines', country: 'Philippines' },
  PGT: { icao: 'PGT', iata: 'PC', name: 'Pegasus Airlines', country: 'Turkey' },
  QFA: { icao: 'QFA', iata: 'QF', name: 'Qantas', country: 'Australia' },
  QTR: { icao: 'QTR', iata: 'QR', name: 'Qatar Airways', country: 'Qatar' },
  RAM: { icao: 'RAM', iata: 'AT', name: 'Royal Air Maroc', country: 'Morocco' },
  RJA: { icao: 'RJA', iata: 'RJ', name: 'Royal Jordanian', country: 'Jordan' },
  ROT: { icao: 'ROT', iata: 'RO', name: 'TAROM', country: 'Romania' },
  ROU: { icao: 'ROU', iata: 'RV', name: 'Air Canada Rouge', country: 'Canada' },
  RUN: { icao: 'RUN', iata: '9T', name: 'ACT Airlines', country: 'Turkey' },
  RUK: { icao: 'RUK', iata: 'RK', name: 'Ryanair UK', country: 'UK' },
  RYR: { icao: 'RYR', iata: 'FR', name: 'Ryanair', country: 'Ireland' },
  RWD: { icao: 'RWD', iata: 'WB', name: 'RwandAir', country: 'Rwanda' },
  SAS: { icao: 'SAS', iata: 'SK', name: 'Scandinavian Airlines', country: 'Sweden' },
  SBI: { icao: 'SBI', iata: 'S7', name: 'S7 Airlines', country: 'Russia' },
  SIA: { icao: 'SIA', iata: 'SQ', name: 'Singapore Airlines', country: 'Singapore' },
  SKY: { icao: 'SKY', iata: 'H2', name: 'Sky Airline', country: 'Chile' },
  SLK: { icao: 'SLK', iata: 'SL', name: 'Thai Lion Air', country: 'Thailand' },
  SVA: { icao: 'SVA', iata: 'SV', name: 'Saudia', country: 'Saudi Arabia' },
  SWR: { icao: 'SWR', iata: 'LX', name: 'Swiss International Air Lines', country: 'Switzerland' },
  SWA: { icao: 'SWA', iata: 'WN', name: 'Southwest Airlines', country: 'USA' },
  SWN: { icao: 'SWN', iata: 'T2', name: 'West Atlantic Sweden', country: 'Sweden' },
  SXD: { icao: 'SXD', iata: 'SX', name: 'SkyExpress', country: 'Greece' },
  SXS: { icao: 'SXS', iata: 'XQ', name: 'SunExpress', country: 'Turkey' },
  SEY: { icao: 'SEY', iata: 'HM', name: 'Air Seychelles', country: 'Seychelles' },
  SMR: { icao: 'SMR', iata: 'SZ', name: 'Somon Air', country: 'Tajikistan' },
  SQC: { icao: 'SQC', iata: 'SQ', name: 'Singapore Airlines Cargo', country: 'Singapore' },
  SZN: { icao: 'SZN', iata: 'HC', name: 'Air Senegal', country: 'Senegal' },
  TAP: { icao: 'TAP', iata: 'TP', name: 'TAP Air Portugal', country: 'Portugal' },
  TAR: { icao: 'TAR', iata: 'TU', name: 'Tunisair', country: 'Tunisia' },
  THA: { icao: 'THA', iata: 'TG', name: 'Thai Airways', country: 'Thailand' },
  THY: { icao: 'THY', iata: 'TK', name: 'Turkish Airlines', country: 'Turkey' },
  TOM: { icao: 'TOM', iata: 'BY', name: 'TUI Airways', country: 'UK' },
  TRA: { icao: 'TRA', iata: 'HV', name: 'Transavia', country: 'Netherlands' },
  TWB: { icao: 'TWB', iata: 'TW', name: "T'way Air", country: 'South Korea' },
  TGS: { icao: 'TGS', iata: 'T2', name: 'Aerotranscargo', country: 'Moldova' },
  TVF: { icao: 'TVF', iata: 'TO', name: 'Transavia France', country: 'France' },
  TVS: { icao: 'TVS', iata: 'QS', name: 'Smartwings', country: 'Czech Republic' },
  UAE: { icao: 'UAE', iata: 'EK', name: 'Emirates', country: 'UAE' },
  UAL: { icao: 'UAL', iata: 'UA', name: 'United Airlines', country: 'USA' },
  UZB: { icao: 'UZB', iata: 'HY', name: 'Uzbekistan Airways', country: 'Uzbekistan' },
  UPS: { icao: 'UPS', iata: '5X', name: 'UPS Airlines', country: 'USA' },
  VIR: { icao: 'VIR', iata: 'VS', name: 'Virgin Atlantic', country: 'UK' },
  VJC: { icao: 'VJC', iata: 'VJ', name: 'VietJet Air', country: 'Vietnam' },
  VLG: { icao: 'VLG', iata: 'VY', name: 'Vueling Airlines', country: 'Spain' },
  VOE: { icao: 'VOE', iata: 'V7', name: 'Volotea', country: 'Spain' },
  VOI: { icao: 'VOI', iata: 'VOI', name: 'Volaris', country: 'Mexico' },
  WGN: { icao: 'WGN', iata: 'KD', name: 'Western Global Airlines', country: 'USA' },
  WIF: { icao: 'WIF', iata: 'WF', name: 'Wideroe', country: 'Norway' },
  WJA: { icao: 'WJA', iata: 'WS', name: 'WestJet', country: 'Canada' },
  WMT: { icao: 'WMT', iata: 'W4', name: 'Wizz Air Malta', country: 'Malta' },
  WSW: { icao: 'WSW', iata: 'WS', name: 'WestJet', country: 'Canada' },
  WUK: { icao: 'WUK', iata: 'W9', name: 'Wizz Air UK', country: 'UK' },
  WZZ: { icao: 'WZZ', iata: 'W6', name: 'Wizz Air', country: 'Hungary' },
};

/**
 * Resolve an airline from a callsign by extracting the first 3 characters (ICAO prefix).
 */
export function resolveAirline(callsign: string): AirlineInfo | undefined {
  if (!callsign || callsign.length < 3) return undefined;
  return AIRLINES[callsign.slice(0, 3).toUpperCase()];
}

/**
 * Get the airline logo URL.
 *
 * Same-origin: nginx proxies /logos/<size>/<iata>.png to pics.avs.io
 * with a 30-day disk cache. The browser's Network tab never reveals
 * the upstream provider. See airwatch/nginx/nginx.conf > /logos/.
 */
export function getAirlineLogoUrl(iata: string, size: 'sm' | 'md' | 'lg' = 'md'): string {
  const sizes = { sm: '200/80', md: '400/160', lg: '600/200' };
  return `/logos/${sizes[size]}/${iata.toUpperCase()}.png`;
}

/**
 * Search airlines by name, ICAO, or IATA code.
 */
export function searchAirlines(query: string): AirlineInfo[] {
  if (!query || query.length < 1) return [];
  const q = query.toUpperCase();
  return Object.values(AIRLINES).filter(
    (a) =>
      a.icao.includes(q) ||
      a.iata.includes(q) ||
      a.name.toUpperCase().includes(q)
  );
}
