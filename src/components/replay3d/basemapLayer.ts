import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';

interface TileBoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** deck.gl-native OSM basemap — no MapLibre dependency. */
export function buildBasemapLayer() {
  return new TileLayer({
    id: 'basemap-osm',
    data: [
      'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
      'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
      'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ],
    minZoom: 0,
    maxZoom: 19,
    tileSize: 256,
    renderSubLayers: (props) => {
      const bbox = (props.tile as unknown as { boundingBox: number[][] }).boundingBox;
      const box: TileBoundingBox = {
        west: bbox[0][0],
        south: bbox[0][1],
        east: bbox[1][0],
        north: bbox[1][1],
      };
      return new BitmapLayer(props, {
        data: undefined,
        image: props.data,
        bounds: [box.west, box.south, box.east, box.north],
        opacity: 0.75,
      });
    },
  });
}
