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
  showTurbulence: boolean;
  /** Show airline + aircraft photographs in the details panel. Default on.
   *  Off = saves bandwidth (planespotters images are 30–80 KB each) and
   *  hides upstream-CDN requests to pics.avs.io / planespotters.net. */
  showAircraftPhotos: boolean;
  /** Show a tiny weather icon next to airport labels on the map. Default on. */
  showAirportWeather: boolean;
  /**
   * "Cargo only" filter — when on, the map hides passenger flights and
   * only renders aircraft whose operator's {@code isCargo} flag is true
   * (resolved through the hydrated airlines catalogue). Default off.
   */
  cargoOnly: boolean;
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
  setShowTurbulence: (show: boolean) => void;
  setShowAircraftPhotos: (show: boolean) => void;
  setShowAirportWeather: (show: boolean) => void;
  setCargoOnly: (cargoOnly: boolean) => void;
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
      showTurbulence: false,
      showAircraftPhotos: true,
      showAirportWeather: true,
      cargoOnly: false,
      updateInterval: 300, // 5 minutes default
      mapStyle: 'satellite' as MapStyle,

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
      setShowTurbulence: (show: boolean) => set({ showTurbulence: show }),
      setShowAircraftPhotos: (show: boolean) => set({ showAircraftPhotos: show }),
      setShowAirportWeather: (show: boolean) => set({ showAirportWeather: show }),
      setCargoOnly: (cargoOnly: boolean) => set({ cargoOnly }),
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
