import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AltitudeUnit, AppLanguage, AppTheme, MapStyle, SpeedUnit } from '@/lib/types';
import { loadLocale } from '@/lib/i18n/translations';

interface SettingsStoreState {
  theme: AppTheme;
  language: AppLanguage;
  altitudeUnit: AltitudeUnit;
  speedUnit: SpeedUnit;
  showTrails: boolean;
  showRadar: boolean;
  showLabels: boolean;
  updateInterval: number; // seconds
  mapStyle: MapStyle;
}

interface SettingsStoreActions {
  setTheme: (theme: AppTheme) => void;
  setLanguage: (language: AppLanguage) => void;
  setAltitudeUnit: (unit: AltitudeUnit) => void;
  setSpeedUnit: (unit: SpeedUnit) => void;
  setShowTrails: (show: boolean) => void;
  setShowRadar: (show: boolean) => void;
  setShowLabels: (show: boolean) => void;
  setUpdateInterval: (seconds: number) => void;
  setMapStyle: (style: MapStyle) => void;
}

type SettingsStore = SettingsStoreState & SettingsStoreActions;

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'en',
      altitudeUnit: 'feet',
      speedUnit: 'knots',
      showTrails: true,
      showRadar: true,
      showLabels: true,
      updateInterval: 300, // 5 minutes default
      mapStyle: 'dark' as MapStyle,

      setTheme: (theme: AppTheme) => set({ theme }),
      setLanguage: (language: AppLanguage) => {
        // Fire-and-forget: start loading the locale dictionary as soon as the
        // user flips the setting. `t()` falls back to EN until the chunk lands,
        // so the UI never shows raw keys.
        void loadLocale(language);
        set({ language });
      },
      setAltitudeUnit: (unit: AltitudeUnit) => set({ altitudeUnit: unit }),
      setSpeedUnit: (unit: SpeedUnit) => set({ speedUnit: unit }),
      setShowTrails: (show: boolean) => set({ showTrails: show }),
      setShowRadar: (show: boolean) => set({ showRadar: show }),
      setShowLabels: (show: boolean) => set({ showLabels: show }),
      setUpdateInterval: (seconds: number) => set({ updateInterval: seconds }),
      setMapStyle: (style: MapStyle) => set({ mapStyle: style }),
    }),
    {
      name: 'airwatch-settings',
      onRehydrateStorage: () => (state) => {
        // Preload the persisted language on app boot.
        if (state?.language && state.language !== 'en') {
          void loadLocale(state.language);
        }
      },
    },
  ),
);
