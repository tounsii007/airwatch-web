// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FenceIOToolbar } from '@/app/(public)/geofences/FenceIOToolbar';
import { buildExportEnvelope } from '@/app/(public)/geofences/fenceIO';
import type { GeoFence } from '@/lib/schemas';

const CIRCLE: GeoFence = {
  id: 1,
  name: 'X',
  clientId: 'me',
  type: 'CIRCLE',
  centerLat: 50,
  centerLon: 8,
  radiusKm: 10,
  minAltitudeFt: null,
  maxAltitudeFt: null,
  airlineFilter: null,
  active: true,
};

beforeEach(() => {
  window.localStorage.clear();
  // Stub the global URL.createObjectURL — happy-dom doesn't ship a
  // working implementation, and the test doesn't need a real blob URL.
  URL.createObjectURL = vi.fn(() => 'blob:mock');
  URL.revokeObjectURL = vi.fn();
});

describe('<FenceIOToolbar />', () => {
  it('shows an info message when export is clicked with no fences', async () => {
    const user = userEvent.setup();
    render(<FenceIOToolbar fences={[]} onImport={async () => true} />);
    await user.click(screen.getByText(/EXPORT/));
    expect(screen.getByText(/no fences to export/i)).toBeTruthy();
  });

  it('exports JSON via a download link (createObjectURL is called)', async () => {
    const user = userEvent.setup();
    render(<FenceIOToolbar fences={[CIRCLE]} onImport={async () => true} />);
    await user.click(screen.getByText(/EXPORT/));
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(screen.getByText(/exported 1 fence/i)).toBeTruthy();
  });

  it('imports a valid envelope through onImport and reports success', async () => {
    const user = userEvent.setup();
    // Explicit parameter signature so `mock.calls[N][0]` survives `tsc`
    // in strict mode — the default `vi.fn(async () => true)` infers a
    // zero-arg call shape and the tuple access below would be `[]'[0]'`.
    const onImport = vi.fn<(fence: GeoFence) => Promise<boolean>>(async () => true);
    const envelope = buildExportEnvelope([CIRCLE]);
    const file = new File([JSON.stringify(envelope)], 'fences.json', { type: 'application/json' });

    render(<FenceIOToolbar fences={[]} onImport={onImport} />);
    const fileInput = screen.getByLabelText(/import fences json file/i) as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    // onImport receives a GeoFence with the local clientId grafted on.
    const arg = onImport.mock.calls[0]![0];
    expect(arg.name).toBe('X');
    expect(arg.clientId).toBeTruthy();
    expect(arg.id).toBeUndefined();
    await waitFor(() => expect(screen.getByText(/imported 1 fence/i)).toBeTruthy());
  });

  it('surfaces a schema-mismatch error from a corrupted file', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    const file = new File(['{"version": 1, "exportedAt": "x", "fences": [{"name":"x","type":"CIRCLE","centerLat":95}]}'],
      'bad.json', { type: 'application/json' });

    render(<FenceIOToolbar fences={[]} onImport={onImport} />);
    const fileInput = screen.getByLabelText(/import fences json file/i) as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => expect(screen.getByText(/schema mismatch/i)).toBeTruthy());
    expect(onImport).not.toHaveBeenCalled();
  });

  it('reports partial failure when onImport rejects one fence', async () => {
    const user = userEvent.setup();
    let call = 0;
    const onImport = vi.fn(async () => { call++; return call > 1; }); // first fails, second OK
    const envelope = buildExportEnvelope([CIRCLE, { ...CIRCLE, name: 'Y' }]);
    const file = new File([JSON.stringify(envelope)], 'fences.json', { type: 'application/json' });

    render(<FenceIOToolbar fences={[]} onImport={onImport} />);
    const fileInput = screen.getByLabelText(/import fences json file/i) as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByText(/imported 1.*1 failed/i)).toBeTruthy(),
    );
  });
});
