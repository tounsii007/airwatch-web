'use client';

import { ReactNode } from 'react';
import { Filter, Plus } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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

const LABEL_CLASS = 'text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider';

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className={`${LABEL_CLASS} block mb-1`}>{label}</span>
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
      <Input
        value={value}
        onChange={onChange}
        placeholder={t('fence_name_placeholder', language)}
        maxLength={128}
        size="sm"
      />
    </Field>
  );
}

function NumberField({ label, value, onChange, placeholder, min, step }: { label: ReactNode; value: string; onChange: (v: string) => void; placeholder?: string; min?: string; step?: string }) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={value}
        onChange={onChange}
        min={min}
        step={step}
        placeholder={placeholder}
        size="sm"
      />
    </Field>
  );
}

function Submit({ submitting, submitError, typeLabel, language }: { submitting: boolean; submitError: string | null; typeLabel: string; language: AppLanguage }) {
  return (
    <div className="md:col-span-2 flex items-center justify-between pt-1 gap-3">
      {submitError && <span className="text-[10px] text-[var(--error)]">{submitError}</span>}
      <Button
        type="submit"
        variant="primary"
        size="sm"
        loading={submitting}
        leadingIcon={!submitting ? <Plus size={12} /> : undefined}
        className="ml-auto"
      >
        {submitting
          ? t('fence_creating_button', language)
          : t('fence_create_button', language).replace('{0}', typeLabel)}
      </Button>
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
        <Plus size={14} aria-hidden /> {t('fence_new_heading', language).replace('{0}', typeLabel)}
      </h2>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <NameField value={form.name} onChange={(v) => onChange({ name: v })} language={language} />
        {/* step="any" rather than "0.1": GeoFenceDrawMap rounds the drafted
            radius to 2 decimals (round(c.getRadius()/1000, 2)), so a 0.1
            step rejected every other drag with the native HTML5 validator. */}
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
          <Input
            value={form.airlineFilter}
            onChange={(v) => onChange({ airlineFilter: v.toUpperCase() })}
            maxLength={3}
            placeholder="DLH"
            size="sm"
          />
        </Field>
        <Submit submitting={submitting} submitError={submitError} typeLabel={typeLabel} language={language} />
      </form>
    </GlassPanel>
  );
}
