// Declaração mínima de tipos para react-simple-maps (v3), que não traz tipos
// próprios. Cobre apenas os componentes/props usados em RegionBubbleMap,
// evitando `any` implícito sem precisar anotar caso a caso na página.
declare module "react-simple-maps" {
  import * as React from "react";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyProps = Record<string, any>;

  export interface GeoItem {
    rsmKey: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }

  export interface MapPosition {
    coordinates: [number, number];
    zoom: number;
  }

  export const ComposableMap: React.FC<AnyProps>;
  export const Marker: React.FC<AnyProps>;
  export const Geography: React.FC<AnyProps>;

  export const ZoomableGroup: React.FC<
    AnyProps & { onMoveEnd?: (position: MapPosition) => void }
  >;

  export const Geographies: React.FC<
    AnyProps & { children: (arg: { geographies: GeoItem[] }) => React.ReactNode }
  >;
}
