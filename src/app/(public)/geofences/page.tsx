'use client';

import { useCallback, useState } from 'react';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { useGeoFenceStore } from '@/lib/stores/geofenceStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { toast } from '@/components/ui/toast';
import { PageContainer, FadeIn, Button } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import { AlertsPanel } from '@/app/(public)/geofences/AlertsPanel';
import { DrawPanel } from '@/app/(public)/geofences/DrawPanel';
import { FenceForm } from '@/app/(public)/geofences/FenceForm';
import { FencesList } from '@/app/(public)/geofences/FencesList';
import { FenceIOToolbar } from '@/app/(public)/geofences/FenceIOToolbar';
import { BLANK_FORM, buildFencePayload, type FenceFormState } from '@/app/(public)/geofences/fencePayload';
import { useFences } from '@/app/(public)/geofences/useFences';
import type { GeoFenceDraft } from '@/components/geofence/GeoFenceDrawMap';
import type { GeoFence } from '@/lib/schemas';

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
  const language = useSettingsStore((s) => s.language);
  const alerts = useGeoFenceStore((s) => s.alerts);
  const dismissAlert = useGeoFenceStore((s) => s.dismissAlert);
  const clearAlerts = useGeoFenceStore((s) => s.clearAlerts);
  const { fences, create, remove } = useFences();

  const [form, setForm] = useState<FenceFormState>(BLANK_FORM);
  const [draft, setDraft] = useState<GeoFenceDraft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Confirmation dialog state — holds the fence pending deletion.
  const [pendingDelete, setPendingDelete] = useState<GeoFence | null>(null);

  const handleDraft = useCallback((d: GeoFenceDraft) => {
    setDraft(d);
    setForm((f) => applyCircleDraft(f, d));
  }, []);

  const patchForm = useCallback((patch: Partial<FenceFormState>) => {
    setForm((f) => ({ ...f, ...patch }));
  }, []);

  // Intercept delete requests — show confirmation dialog instead of
  // deleting immediately so accidental taps don't lose fence config.
  const handleDeleteRequest = useCallback((id?: number) => {
    const fence = fences.find((f) => f.id === id);
    if (!fence) return;
    setPendingDelete(fence);
  }, [fences]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!pendingDelete) return;
    const name = pendingDelete.name;
    await remove(pendingDelete.id);
    setPendingDelete(null);
    toast.success({
      title: 'Fence deleted',
      body: `"${name}" has been removed.`,
    });
  }, [pendingDelete, remove]);

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
      const msg = 'Backend rejected the fence. Check the API is reachable.';
      setSubmitError(msg);
      toast.error({ title: 'Could not create fence', body: msg });
      return;
    }
    setForm(BLANK_FORM);
    setDraft(null);
    toast.success({
      title: `Fence created`,
      body: `"${form.name}" is now active — you'll be notified when aircraft enter.`,
      duration: 6000,
    });
  };

  return (
    <PageContainer
      maxWidth="4xl"
      title={t('geofences_title', language)}
      subtitle={
        fences.length > 0 ? (
          <span className="badge badge-success">{fences.length} active</span>
        ) : (
          <span className="badge">{t('no_fences_yet', language)}</span>
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
          <FencesList
            fences={fences}
            onDelete={handleDeleteRequest}
            toolbar={<FenceIOToolbar fences={fences} onImport={create} />}
          />
        </FadeIn>
      </div>

      {/* ── Delete-confirmation Dialog ───────────────────────────────────── */}
      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete fence?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" will be removed permanently. Any scheduled alerts for this zone will stop.`
            : undefined
        }
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              leadingIcon={<Trash2 size={14} />}
              onClick={() => { void handleDeleteConfirm(); }}
            >
              Delete
            </Button>
          </div>
        }
      >
        {pendingDelete && (
          <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
            <ShieldCheck size={20} className="text-[var(--error)] shrink-0" aria-hidden />
            <span>
              Aircraft that enter the zone after deletion will no longer trigger notifications.
            </span>
          </div>
        )}
      </Dialog>
    </PageContainer>
  );
}
