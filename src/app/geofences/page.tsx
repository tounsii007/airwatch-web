'use client';

import { useCallback, useState } from 'react';
import { MapPin } from 'lucide-react';
import { NeonText } from '@/components/ui/NeonText';
import { useGeoFenceStore } from '@/lib/stores/geofenceStore';
import { AlertsPanel } from '@/app/geofences/AlertsPanel';
import { DrawPanel } from '@/app/geofences/DrawPanel';
import { FenceForm } from '@/app/geofences/FenceForm';
import { FencesList } from '@/app/geofences/FencesList';
import { BLANK_FORM, buildFencePayload, type FenceFormState } from '@/app/geofences/fencePayload';
import { useFences } from '@/app/geofences/useFences';
import type { GeoFenceDraft } from '@/components/geofence/GeoFenceDrawMap';

function applyCircleDraft(form: FenceFormState, draft: GeoFenceDraft): FenceFormState {
  if (draft.type !== 'CIRCLE') return form;
  return {
    ...form,
    centerLat: draft.centerLat?.toString() ?? '',
    centerLon: draft.centerLon?.toString() ?? '',
    radiusKm: draft.radiusKm?.toString() ?? form.radiusKm,
  };
}

function PageHeader({ count }: { count: number }) {
  return (
    <header className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <MapPin size={20} className="text-[var(--primary)]" />
        <NeonText text="GEOFENCES" size="text-xl" />
      </div>
      <span className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest">
        {count} ACTIVE
      </span>
    </header>
  );
}

export default function GeoFencesPage() {
  const alerts = useGeoFenceStore((s) => s.alerts);
  const dismissAlert = useGeoFenceStore((s) => s.dismissAlert);
  const clearAlerts = useGeoFenceStore((s) => s.clearAlerts);
  const { fences, create, remove } = useFences();

  const [form, setForm] = useState<FenceFormState>(BLANK_FORM);
  const [draft, setDraft] = useState<GeoFenceDraft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleDraft = useCallback((d: GeoFenceDraft) => {
    setDraft(d);
    setForm((f) => applyCircleDraft(f, d));
  }, []);

  const patchForm = useCallback((patch: Partial<FenceFormState>) => {
    setForm((f) => ({ ...f, ...patch }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const result = buildFencePayload(form, draft);
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    setSubmitting(true);
    const ok = await create(result.payload);
    setSubmitting(false);
    if (!ok) {
      setSubmitError('Backend rejected the fence. Check the API is reachable.');
      return;
    }
    setForm(BLANK_FORM);
    setDraft(null);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20 pt-6 px-4 md:px-8 lg:pt-16">
      <PageHeader count={fences.length} />
      <AlertsPanel alerts={alerts} onDismiss={dismissAlert} onClear={clearAlerts} />
      <DrawPanel draft={draft} existing={fences} onDraft={handleDraft} />
      <FenceForm form={form} draft={draft} submitting={submitting} submitError={submitError} onChange={patchForm} onSubmit={handleSubmit} />
      <FencesList fences={fences} onDelete={remove} />
    </div>
  );
}
