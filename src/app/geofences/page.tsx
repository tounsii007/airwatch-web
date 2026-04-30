'use client';

import { useCallback, useState } from 'react';
import { useGeoFenceStore } from '@/lib/stores/geofenceStore';
import { PageContainer, FadeIn } from '@/components/ui';
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
    <PageContainer
      maxWidth="4xl"
      title="Geofences"
      subtitle={
        fences.length > 0 ? (
          <span className="badge badge-success">{fences.length} active</span>
        ) : (
          <span className="badge">No fences yet</span>
        )
      }
    >
      <div className="space-y-6">
        <FadeIn>
          <AlertsPanel alerts={alerts} onDismiss={dismissAlert} onClear={clearAlerts} />
        </FadeIn>
        <FadeIn delay={60}>
          <DrawPanel draft={draft} existing={fences} onDraft={handleDraft} />
        </FadeIn>
        <FadeIn delay={120}>
          <FenceForm
            form={form}
            draft={draft}
            submitting={submitting}
            submitError={submitError}
            onChange={patchForm}
            onSubmit={handleSubmit}
          />
        </FadeIn>
        <FadeIn delay={180}>
          <FencesList fences={fences} onDelete={remove} />
        </FadeIn>
      </div>
    </PageContainer>
  );
}
