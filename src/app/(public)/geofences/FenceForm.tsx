'use client';

import { ReactNode } from 'react';
import { Filter, Plus } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import type { GeoFenceDraft } from '@/components/geofence/GeoFenceDrawMap';
import type { FenceFormState } from '@/app/(public)/geofences/fencePayload';

interface Props {
  form: FenceFormState;
  draft: GeoFenceDraft | null;
  submitting: boolean;
  submitError: string | null;
  onChange: (patch: Partial<FenceFormState>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const INPUT_CLASS = 'w-full mt-1 bg-transparent border border-[var(--glass-border)] px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]';
const LABEL_CLASS = 'text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider';

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className={LABEL_CLASS}>{label}</span>
      {children}
    </label>
  );
}

function FilterLabel({ icon, text }: { icon: ReactNode; text: string }) {
  return <span className="flex items-center gap-1">{icon} {text}</span>;
}

function NameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="NAME">
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS} placeholder="My house" maxLength={128} />
    </Field>
  );
}

function NumberField({ label, value, onChange, placeholder, min, step }: { label: ReactNode; value: string; onChange: (v: string) => void; placeholder?: string; min?: string; step?: string }) {
  return (
    <Field label={label}>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} min={min} step={step} className={INPUT_CLASS} placeholder={placeholder} />
    </Field>
  );
}

function Submit({ submitting, submitError, typeLabel }: { submitting: boolean; submitError: string | null; typeLabel: string }) {
  return (
    <div className="md:col-span-2 flex items-center justify-between pt-1">
      <span className="text-[10px] text-[var(--error)]">{submitError}</span>
      <button
        type="submit"
        disabled={submitting}
        className="bg-[var(--primary)] text-[var(--bg)] px-4 py-1.5 text-xs font-[var(--font-heading)] font-bold tracking-wider disabled:opacity-40 hover:opacity-90"
      >
        {submitting ? 'CREATING…' : `CREATE ${typeLabel}`}
      </button>
    </div>
  );
}

/** Geo-fence creation form with name / center / radius / altitude / airline filter. */
export function FenceForm({ form, draft, submitting, submitError, onChange, onSubmit }: Props) {
  const typeLabel = draft?.type === 'RECTANGLE' ? 'RECTANGLE' : 'CIRCLE';
  return (
    <GlassPanel className="mb-6 p-4">
      <h2 className="text-xs font-[var(--font-heading)] font-bold tracking-wider text-[var(--primary)] mb-3 flex items-center gap-2">
        <Plus size={14} /> NEW FENCE ({typeLabel})
      </h2>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <NameField value={form.name} onChange={(v) => onChange({ name: v })} />
        <NumberField label="RADIUS (KM)" value={form.radiusKm} onChange={(v) => onChange({ radiusKm: v })} min="0.1" step="0.1" />
        <NumberField label="CENTER LAT" value={form.centerLat} onChange={(v) => onChange({ centerLat: v })} step="0.0001" placeholder="50.0379" />
        <NumberField label="CENTER LON" value={form.centerLon} onChange={(v) => onChange({ centerLon: v })} step="0.0001" placeholder="8.5622" />
        <NumberField
          label={<FilterLabel icon={<Filter size={10} />} text="MIN ALT (FT)" />}
          value={form.minAltitudeFt} onChange={(v) => onChange({ minAltitudeFt: v })}
          placeholder="optional"
        />
        <Field label={<FilterLabel icon={<Filter size={10} />} text="AIRLINE ICAO" />}>
          <input
            type="text"
            value={form.airlineFilter}
            onChange={(e) => onChange({ airlineFilter: e.target.value.toUpperCase() })}
            maxLength={3}
            className={INPUT_CLASS}
            placeholder="DLH"
          />
        </Field>
        <Submit submitting={submitting} submitError={submitError} typeLabel="FENCE" />
      </form>
    </GlassPanel>
  );
}
