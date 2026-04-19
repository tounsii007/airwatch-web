'use client';

import { AircraftArLabel } from '@/app/ar/AircraftArLabel';
import { ArStatusFooter } from '@/app/ar/ArStatusFooter';
import { CompassHud } from '@/app/ar/CompassHud';
import { HorizonLine } from '@/app/ar/HorizonLine';
import type { DeviceOrientation, Viewport } from '@/app/ar/arProjection';
import type { UserPosition } from '@/app/ar/useUserPosition';
import type { ArAircraft } from '@/app/ar/visibleAircraft';
import type { AircraftState, AltitudeUnit, SpeedUnit } from '@/lib/types';

interface Props {
  viewport: Viewport;
  orientation: DeviceOrientation;
  roll: number | null;
  position: UserPosition | null;
  visible: ArAircraft[];
  altitudeUnit: AltitudeUnit;
  speedUnit: SpeedUnit;
  onSelect: (ac: AircraftState) => void;
}

/**
 * All non-video layers: compass strip, horizon line, projected aircraft
 * labels, and the bottom status readout. Absolutely positioned over the
 * camera feed, with pointer-events disabled except on the tappable labels.
 */
export function ArOverlay({ viewport, orientation, roll, position, visible, altitudeUnit, speedUnit, onSelect }: Props) {
  return (
    <div className="fixed inset-0 pointer-events-none">
      <CompassHud heading={orientation.heading} fovHorizontalDeg={viewport.fovHorizontalDeg} />
      <HorizonLine
        pitch={orientation.pitch}
        roll={roll}
        fovVerticalDeg={viewport.fovVerticalDeg}
        viewportHeight={viewport.height}
      />
      {visible.map((entry) => (
        <AircraftArLabel
          key={entry.aircraft.icao24}
          entry={entry}
          altitudeUnit={altitudeUnit}
          speedUnit={speedUnit}
          onSelect={() => onSelect(entry.aircraft)}
        />
      ))}
      <ArStatusFooter position={position} pitch={orientation.pitch} visibleCount={visible.length} />
    </div>
  );
}
