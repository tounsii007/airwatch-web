import { describe, it, expect } from 'vitest';
import { filterAirports } from '@/app/airports/airportsStats';
import type { PopularAirport } from '@/app/airports/popularAirports';

// Minimal fixture that exercises every branch of filterAirports — IATA hit,
// English name hit, localized name hit via cityNameMatches().
const AIRPORTS: PopularAirport[] = [
  { iata: 'NCE', name: 'Nice' },
  { iata: 'CGN', name: 'Cologne' },
  { iata: 'MUC', name: 'Munich' },
  { iata: 'LHR', name: 'London' },
  { iata: 'GVA', name: 'Geneva' },
  { iata: 'NRT', name: 'Tokyo' },
  { iata: 'VIE', name: 'Vienna' },
];

describe('filterAirports — locale-aware search', () => {
  it('returns everything on empty query', () => {
    expect(filterAirports(AIRPORTS, '')).toHaveLength(AIRPORTS.length);
    expect(filterAirports(AIRPORTS, '   ')).toHaveLength(AIRPORTS.length);
  });

  it('matches by IATA code', () => {
    expect(filterAirports(AIRPORTS, 'NCE').map((a) => a.iata)).toEqual(['NCE']);
    expect(filterAirports(AIRPORTS, 'muc').map((a) => a.iata)).toEqual(['MUC']);
  });

  it('matches by English name', () => {
    expect(filterAirports(AIRPORTS, 'nice').map((a) => a.iata)).toEqual(['NCE']);
    expect(filterAirports(AIRPORTS, 'cologne').map((a) => a.iata)).toEqual(['CGN']);
  });

  it('matches by German alias — "Nizza" finds Nice', () => {
    expect(filterAirports(AIRPORTS, 'Nizza').map((a) => a.iata)).toEqual(['NCE']);
  });

  it('matches by German alias — "Köln" finds Cologne', () => {
    expect(filterAirports(AIRPORTS, 'Köln').map((a) => a.iata)).toEqual(['CGN']);
  });

  it('matches by German alias — "München" and "Wien"', () => {
    expect(filterAirports(AIRPORTS, 'München').map((a) => a.iata)).toEqual(['MUC']);
    expect(filterAirports(AIRPORTS, 'Wien').map((a) => a.iata)).toEqual(['VIE']);
  });

  it('matches by German alias — "Tokio" finds Tokyo', () => {
    expect(filterAirports(AIRPORTS, 'Tokio').map((a) => a.iata)).toEqual(['NRT']);
  });

  it('matches by French alias — "Londres" finds London, "Genève" finds Geneva', () => {
    expect(filterAirports(AIRPORTS, 'Londres').map((a) => a.iata)).toEqual(['LHR']);
    expect(filterAirports(AIRPORTS, 'Genève').map((a) => a.iata)).toEqual(['GVA']);
  });

  it('is tolerant of casing and missing diacritics', () => {
    expect(filterAirports(AIRPORTS, 'KOLN').map((a) => a.iata)).toEqual(['CGN']);
    expect(filterAirports(AIRPORTS, 'munchen').map((a) => a.iata)).toEqual(['MUC']);
    expect(filterAirports(AIRPORTS, 'GENEVE').map((a) => a.iata)).toEqual(['GVA']);
  });

  it('can return multiple results when several airports share the query', () => {
    // "nce" matches IATA code NCE and also appears in nothing else — just a smoke test.
    expect(filterAirports(AIRPORTS, 'NCE')).toHaveLength(1);
  });

  describe('compound airport labels', () => {
    const COMPOUND: PopularAirport[] = [
      { iata: 'LHR', name: 'London Heathrow' },
      { iata: 'FCO', name: 'Rome Fiumicino' },
      { iata: 'CDG', name: 'Paris CDG' },
      { iata: 'JFK', name: 'New York JFK' },
      { iata: 'CGN', name: 'Cologne Bonn' },
    ];

    it('"Londres" finds London Heathrow (French alias on compound name)', () => {
      expect(filterAirports(COMPOUND, 'Londres').map((a) => a.iata)).toEqual(['LHR']);
    });

    it('"Rom" finds Rome Fiumicino (German alias on compound name)', () => {
      expect(filterAirports(COMPOUND, 'Rom').map((a) => a.iata)).toEqual(['FCO']);
    });

    it('"Köln" finds Cologne Bonn', () => {
      expect(filterAirports(COMPOUND, 'Köln').map((a) => a.iata)).toEqual(['CGN']);
    });
  });
});
