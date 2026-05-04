export interface PopularAirport {
  iata: string;
  name: string;
}

/** Curated list of airports surfaced on the /airports overview page. */
export const POPULAR_AIRPORTS: readonly PopularAirport[] = [
  { iata: 'FRA', name: 'Frankfurt' },
  { iata: 'MUC', name: 'Munich' },
  { iata: 'LHR', name: 'London Heathrow' },
  { iata: 'CDG', name: 'Paris CDG' },
  { iata: 'AMS', name: 'Amsterdam' },
  { iata: 'ZRH', name: 'Zurich' },
  { iata: 'VIE', name: 'Vienna' },
  { iata: 'IST', name: 'Istanbul' },
  { iata: 'BCN', name: 'Barcelona' },
  { iata: 'FCO', name: 'Rome Fiumicino' },
  { iata: 'JFK', name: 'New York JFK' },
  { iata: 'DXB', name: 'Dubai' },
];
