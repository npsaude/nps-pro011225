import { useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
} from "react-simple-maps";

type Density = "none" | "low" | "medium" | "high";

type StateDoctorData = {
  uf: string;
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  doctors?: number; // undefined = sem dados
};

const geoUrl =
  "https://raw.githubusercontent.com/deldersveld/topojson/master/countries/brazil/brazil-states.json";

// Dados de exemplo – ajuste os números conforme tiver dados reais
const statesData: StateDoctorData[] = [
  { uf: "AC", name: "Acre", coordinates: [-70.5, -9.0], doctors: undefined },
  { uf: "AL", name: "Alagoas", coordinates: [-36.5, -9.6], doctors: 12 },
  { uf: "AP", name: "Amapá", coordinates: [-51.8, 1.4], doctors: undefined },
  { uf: "AM", name: "Amazonas", coordinates: [-64.7, -3.4], doctors: 18 },
  { uf: "BA", name: "Bahia", coordinates: [-41.5, -12.0], doctors: 37 },
  { uf: "CE", name: "Ceará", coordinates: [-39.5, -5.0], doctors: 22 },
  { uf: "DF", name: "Distrito Federal", coordinates: [-47.9, -15.8], doctors: 9 },
  { uf: "ES", name: "Espírito Santo", coordinates: [-40.4, -19.6], doctors: undefined },
  { uf: "GO", name: "Goiás", coordinates: [-49.3, -16.0], doctors: 15 },
  { uf: "MA", name: "Maranhão", coordinates: [-45.5, -5.3], doctors: undefined },
  { uf: "MT", name: "Mato Grosso", coordinates: [-56.1, -13.0], doctors: 10 },
  { uf: "MS", name: "Mato Grosso do Sul", coordinates: [-54.5, -20.4], doctors: 7 },
  { uf: "MG", name: "Minas Gerais", coordinates: [-44.0, -18.5], doctors: 42 },
  { uf: "PA", name: "Pará", coordinates: [-52.2, -3.8], doctors: 19 },
  { uf: "PB", name: "Paraíba", coordinates: [-36.5, -7.3], doctors: 11 },
  { uf: "PR", name: "Paraná", coordinates: [-51.5, -24.5], doctors: 28 },
  { uf: "PE", name: "Pernambuco", coordinates: [-37.7, -8.4], doctors: 14 },
  { uf: "PI", name: "Piauí", coordinates: [-42.8, -7.1], doctors: undefined },
  { uf: "RJ", name: "Rio de Janeiro", coordinates: [-43.2, -22.9], doctors: 35 },
  { uf: "RN", name: "Rio Grande do Norte", coordinates: [-36.8, -5.4], doctors: undefined },
  { uf: "RS", name: "Rio Grande do Sul", coordinates: [-53.0, -30.0], doctors: 24 },
  { uf: "RO", name: "Rondônia", coordinates: [-63.9, -11.0], doctors: undefined },
  { uf: "RR", name: "Roraima", coordinates: [-61.4, 2.2], doctors: undefined },
  { uf: "SC", name: "Santa Catarina", coordinates: [-50.9, -27.1], doctors: 17 },
  { uf: "SP", name: "São Paulo", coordinates: [-46.6, -23.5], doctors: 58 },
  { uf: "SE", name: "Sergipe", coordinates: [-37.2, -10.5], doctors: undefined },
  { uf: "TO", name: "Tocantins", coordinates: [-48.3, -10.2], doctors: 6 },
];

const getDensity = (doctors?: number): Density => {
  if (doctors === undefined) return "none";
  if (doctors === 0) return "none";
  if (doctors <= 15) return "low";
  if (doctors <= 35) return "medium";
  return "high";
};

const bubbleColor: Record<Density, string> = {
  none: "#1d4ed8", // azul – sem dados
  low: "#fbbf24", // amarelo
  medium: "#22c55e", // verde
  high: "#0f766e", // verde mais escuro
};

// Raio da bolha proporcional à quantidade de médicos
const getRadius = (doctors?: number): number => {
  if (!doctors || doctors <= 0) return 7; // sem dados / 0 – bolha pequena azul
  if (doctors <= 10) return 8;
  if (doctors <= 20) return 10;
  if (doctors <= 40) return 12;
  return 14; // muitos médicos – bolha maior
};

const RegionBubbleMap = () => {
  const [zoom, setZoom] = useState(1.3);
  const [center, setCenter] = useState<[number, number]>([-54, -15]);

  const handleZoomIn = () => {
    setZoom((z) => Math.min(z + 0.4, 4));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z - 0.4, 1));
  };

  const handleReset = () => {
    setZoom(1.3);
    setCenter([-54, -15]);
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-3xl bg-[#F5F7F9] p-4 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2 pb-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Use o mouse para arrastar o mapa e a roda ou botões para dar zoom.
        </p>
        <div className="inline-flex items-center gap-1 rounded-full bg-white px-1 py-1 text-xs shadow-sm dark:bg-slate-950">
          <button
            type="button"
            onClick={handleZoomOut}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            -
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex h-7 px-2 items-center justify-center rounded-full bg-slate-900 text-[11px] font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            +
          </button>
        </div>
      </div>

      <div className="relative h-80 w-full overflow-hidden rounded-2xl bg-slate-200/70 dark:bg-slate-900">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            center: [-54, -15],
            scale: 650,
          }}
          width={800}
          height={600}
          style={{ width: "100%", height: "100%" }}
        >
          {/* Sombra das bolhas */}
          <defs>
            <filter id="bubbleShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow
                dx="0"
                dy="1"
                stdDeviation="1.5"
                floodColor="#020617"
                floodOpacity="0.35"
              />
            </filter>
          </defs>

          <ZoomableGroup
            center={center}
            zoom={zoom}
            minZoom={1}
            maxZoom={4}
            onMoveEnd={(position) => {
              setCenter(position.coordinates as [number, number]);
              setZoom(position.zoom);
            }}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#e2e8f0"
                    stroke="#94a3b8"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "#cbd5f5" },
                      pressed: { outline: "none", fill: "#cbd5f5" },
                    }}
                  />
                ))
              }
            </Geographies>

            {statesData.map((state) => {
              const density = getDensity(state.doctors);
              const color = bubbleColor[density];
              const displayDoctors =
                state.doctors === undefined ? "-" : state.doctors.toString();
              const radius = getRadius(state.doctors);

              return (
                <Marker key={state.uf} coordinates={state.coordinates}>
                  <g transform="translate(-10, -12)">
                    <circle
                      r={radius}
                      fill={color}
                      stroke="none"
                      filter="url(#bubbleShadow)"
                      fillOpacity={0.96}
                    />
                    <text
                      x={0}
                      y={-2}
                      textAnchor="middle"
                      fontSize={8}
                      fontWeight={700}
                      fill="#f9fafb"
                    >
                      {state.uf}
                    </text>
                    <text
                      x={0}
                      y={8}
                      textAnchor="middle"
                      fontSize={8}
                      fontWeight={600}
                      fill="#e5e7eb"
                    >
                      {displayDoctors}
                    </text>
                  </g>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>
      </div>

      <div className="inline-flex flex-wrap gap-4 rounded-2xl bg-white/90 px-4 py-3 text-xs text-slate-600 shadow-sm dark:bg-slate-950/80 dark:text-slate-200">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: bubbleColor.high }} />
          <span>Alta densidade de médicos</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: bubbleColor.medium }} />
          <span>Média densidade de médicos</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: bubbleColor.low }} />
          <span>Baixa densidade de médicos</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: bubbleColor.none }} />
          <span>Sem dados (bolinhas azuis)</span>
        </div>
        <span className="mt-1 text-[11px] text-slate-400">
          Número abaixo da UF = quantidade de médicos no estado.
        </span>
      </div>
    </div>
  );
};

export default RegionBubbleMap;