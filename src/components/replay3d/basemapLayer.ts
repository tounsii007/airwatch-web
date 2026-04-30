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
    // Same-origin: nginx proxies /tiles/osm/* to OSM's CDN with disk
    // cache. See airwatch/nginx/nginx.conf > location /tiles/osm/.
    data: ['/tiles/osm/{z}/{x}/{y}.png'],
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
