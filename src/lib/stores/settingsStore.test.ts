import { describe, expect, it } from 'vitest';
import { useSettingsStore } from '@/lib/stores/settingsStore';

describe('useSettingsStore', () => {
  it('has sensible defaults', () => {
    const s = useSettingsStore.getState();
    expect(['dark', 'light', 'system']).toContain(s.theme);
    expect(['en', 'de', 'fr']).toContain(s.language);
    expect(s.updateInterval).toBeGreaterThanOrEqual(30);
  });

  it('setters update the respective field without touching others', () => {
    const before = useSettingsStore.getState();
    useSettingsStore.getState().setLanguage('de');
    const after = useSettingsStore.getState();
    expect(after.language).toBe('de');
    expect(after.theme).toBe(before.theme);
  });

  it('setUpdateInterval accepts arbitrary seconds', () => {
    useSettingsStore.getState().setUpdateInterval(120);
    expect(useSettingsStore.getState().updateInterval).toBe(120);
  });
});
