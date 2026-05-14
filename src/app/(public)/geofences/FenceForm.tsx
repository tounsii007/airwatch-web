'use client';

import { ReactNode } from 'react';
import { Filter, Plus } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import type { AppLanguage } from '@/lib/types';
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

function NameField({ value, onChange, language }: { value: string; onChange: (v: string) => void; language: AppLanguage }) {
  return (
    <Field label={t('fence_name_label', language)}>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS} placeholder={t('fence_name_placeholder', language)} maxLength={128} />
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

function Submit({ submitting, submitError, typeLabel, language }: { submitting: boolean; submitError: string | null; typeLabel: string; language: AppLanguage }) {
  return (
    <div className="md:col-span-2 flex items-center justify-between pt-1">
      <span className="text-[10px] text-[var(--error)]">{submitError}</span>
      <button
        type="submit"
        disabled={submitting}
        className="bg-[var(--primary)] text-[var(--bg)] px-4 py-1.5 text-xs font-[var(--font-heading)] font-bold tracking-wider disabled:opacity-40 hover:opacity-90"
      >
        {submitting
          ? t('fence_creating_button', language)
          : t('fence_create_button', language).replace('{0}', typeLabel)}
      </button>
    </div>
  );
}

/** Geo-fence creation form with name / center / radius / altitude / airline filter. */
export function FenceForm({ form, draft, submitting, submitError, onChange, onSubmit }: Props) {
  const language = useSettingsStore((s) => s.language);
  const typeLabel = draft?.type === 'RECTANGLE'
    ? t('fence_type_rectangle', language)
    : t('fence_type_circle', language);
  return (
    <GlassPanel className="mb-6 p-4">
      <h2 className="text-xs font-[var(--font-heading)] font-bold tracking-wider text-[var(--primary)] mb-3 flex items-center gap-2">
        <Plus size={14} /> {t('fence_new_heading', language).replace('{0}', typeLabel)}
      </h2>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <NameField value={form.name} onChange={(v) => onChange({ name: v })} language={language} />
        {/* step="any" rather than "0.1": GeoFenceDrawMap rounds the drafted
            radius to 2 decimals (round(c.getRadius()/1000, 2)), so a 0.1
            step rejected every other drag with the native HTML5 validator
            ("Gib einen gültigen Wert ein. Die zwei nächstliegenden Werte
            sind 131,3 und 131,4."). The radius doesn't have a meaningful
            discrete step — let users pick any precision. */}
        <NumberField label={t('fence_radius_label', language)} value={form.radiusKm} onChange={(v) => onChange({ radiusKm: v })} min="0.1" step="any" />
        <NumberField label={t('fence_center_lat_label', language)} value={form.centerLat} onChange={(v) => onChange({ centerLat: v })} step="0.0001" placeholder="50.0379" />
        <NumberField label={t('fence_center_lon_label', language)} value={form.centerLon} onChange={(v) => onChange({ centerLon: v })} step="0.0001" placeholder="8.5622" />
        <NumberField
          label={<FilterLabel icon={<Filter size={10} />} text={t('fence_min_alt_label', language)} />}
          value={form.minAltitudeFt} onChange={(v) => onChange({ minAltitudeFt: v })}
          placeholder={t('optional', language)}
        />
        <NumberField
          label={<FilterLabel icon={<Filter size={10} />} text={t('fence_max_alt_label', language)} />}
          value={form.maxAltitudeFt} onChange={(v) => onChange({ maxAltitudeFt: v })}
          placeholder={t('optional', language)}
        />
        <Field label={<FilterLabel icon={<Filter size={10} />} text={t('fence_airline_label', language)} />}>
          <input
            type="text"
            value={form.airlineFilter}
            onChange={(e) => onChange({ airlineFilter: e.target.value.toUpperCase() })}
            maxLength={3}
            className={INPUT_CLASS}
            placeholder="DLH"
          />
        </Field>
        <Submit submitting={submitting} submitError={submitError} typeLabel={typeLabel} language={language} />
      </form>
    </GlassPanel>
  );
}
