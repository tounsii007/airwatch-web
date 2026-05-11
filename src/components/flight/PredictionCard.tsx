'use client';

import { useEffect, useState } from 'react';
import { Brain } from 'lucide-react';
import type { AircraftState } from '@/lib/types';
interface FlightPrediction {
  delayProbability: number;
  estimatedDelayMinutes: number;
  confidence: 'low' | 'medium' | 'high';
  explanation: string;
  factors: string[];
}
import { resolveAirline } from '@/lib/data/airlines';

export function PredictionCard({ aircraft }: { aircraft: AircraftState }) {
  const [prediction, setPrediction] = useState<FlightPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!aircraft.callsign || !aircraft.depIata || !aircraft.arrIata) return;
     
    setLoading(true);
     
    setError(false);

    const airline = resolveAirline(aircraft.callsign);

    fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callsign: aircraft.callsign,
        depIata: aircraft.depIata,
        arrIata: aircraft.arrIata,
        airline: airline?.name,
        currentAltitude: aircraft.baroAltitude,
        currentSpeed: aircraft.velocity,
      }),
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => { setPrediction(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [aircraft.callsign, aircraft.depIata, aircraft.arrIata, aircraft.baroAltitude, aircraft.velocity]);

  if (!aircraft.callsign || !aircraft.depIata) return null;

  if (loading) {
    return (
      <div className="px-4 py-3 border-b border-[var(--glass-border)] flex items-center gap-2">
        <Brain size={14} className="text-[var(--info)] animate-pulse" />
        <span className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">AI ANALYZING...</span>
      </div>
    );
  }

  if (error || !prediction) return null;

  const delayColor = prediction.delayProbability > 60 ? 'var(--error)' : prediction.delayProbability > 30 ? 'var(--warning)' : 'var(--success)';
  const confColor = prediction.confidence === 'high' ? 'var(--success)' : prediction.confidence === 'medium' ? 'var(--warning)' : 'var(--text-muted)';

  return (
    <div className="px-4 py-3 border-b border-[var(--glass-border)]">
      <div className="flex items-center gap-2 mb-2">
        <Brain size={14} className="text-[var(--info)]" />
        <span className="text-[9px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest">AI PREDICTION</span>
        <span className="text-[8px] font-[var(--font-heading)] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${confColor}20`, color: confColor }}>
          {prediction.confidence.toUpperCase()}
        </span>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div className="relative w-10 h-10">
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="var(--glass-border)" strokeWidth="3" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke={delayColor} strokeWidth="3"
              strokeDasharray={`${prediction.delayProbability}, 100`} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-[var(--font-heading)] font-bold" style={{ color: delayColor }}>
            {prediction.delayProbability}%
          </span>
        </div>
        <div className="flex-1">
          <p className="text-xs font-[var(--font-body)] text-[var(--text-primary)]">{prediction.explanation}</p>
          {prediction.estimatedDelayMinutes > 0 && (
            <p className="text-[10px] font-[var(--font-heading)] mt-0.5" style={{ color: delayColor }}>
              ~{prediction.estimatedDelayMinutes} min delay
            </p>
          )}
        </div>
      </div>
      {prediction.factors.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {prediction.factors.map((f, i) => (
            <span key={i} className="text-[8px] font-[var(--font-heading)] px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)]">
              {f}
            </span>
          ))}
        </div>
      )}
      <p className="text-[7px] text-[var(--text-muted)] mt-2 font-[var(--font-body)]">Powered by Claude AI</p>
    </div>
  );
}
