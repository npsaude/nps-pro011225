import { useState, useEffect } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
} from "react-simple-maps";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type Density = "none" | "low" | "medium" | "high";

type StateDoctorData = {
  uf: string;
  name: string;
  coordinates: [number, number];
  doctors?: number;
};

const geoUrl = "/maps/brazil-states.json";

// Coordenadas fixas por UF
const STATE_COORDS: Record<string, { name: string; coordinates: [number, number] }> = {
  AC: { name: "Acre",                  coordinates: [-70.5, -9.0]  },
  AL: { name: "Alagoas",               coordinates: [-36.5, -9.6]  },
  AP: { name: "Amapá",                 coordinates: [-51.8,  1.4]  },
  AM: { name: "Amazonas",              coordinates: [-64.7, -3.4]  },
  BA: { name: "Bahia",                 coordinates: [-41.5,-12.0]  },
  CE: { name: "Ceará",                 coordinates: [-39.5, -5.0]  },
  DF: { name: "Distrito Federal",      coordinates: [-47.9,-15.8]  },
  ES: { name: "Espírito Santo",        coordinates: [-40.4,-19.6]  },
  GO: { name: "Goiás",                 coordinates: [-49.3,-16.0]  },
  MA: { name: "Maranhão",              coordinates: [-45.5, -5.3]  },
  MT: { name: "Mato Grosso",           coordinates: [-56.1,-13.0]  },
  MS: { name: "Mato Grosso do Sul",    coordinates: [-54.5,-20.4]  },
  MG: { name: "Minas Gerais",          coordinates: [-44.0,-18.5]  },
  PA: { name: "Pará",                  coordinates: [-52.2, -3.8]  },
  PB: { name: "Paraíba",               coordinates: [-36.5, -7.3]  },
  PR: { name: "Paraná",                coordinates: [-51.5,-24.5]  },
  PE: { name: "Pernambuco",            coordinates: [-37.7, -8.4]  },
  PI: { name: "Piauí",                 coordinates: [-42.8, -7.1]  },
  RJ: { name: "Rio de Janeiro",        coordinates: [-43.2,-22.9]  },
  RN: { name: "Rio Grande do Norte",   coordinates: [-36.8, -5.4]  },
  RS: { name: "Rio Grande do Sul",     coordinates: [-53.0,-30.0]  },
  RO: { name: "Rondônia",              coordinates: [-63.9,-11.0]  },
  RR: { name: "Roraima",               coordinates: [-61.4,  2.2]  },
  SC: { name: "Santa Catarina",        coordinates: [-50.9,-27.1]  },
  SP: { name: "São Paulo",             coordinates: [-46.6,-23.5]  },
  SE: { name: "Sergipe",               coordinates: [-37.2,-10.5]  },
  TO: { name: "Tocantins",             coordinates: [-48.3,-10.2]  },
};

// Todos os estados com doctors = undefined por padrão
const ALL_STATES: StateDoctorData[] = Object.entries(STATE_COORDS).map(
  ([uf, { name, coordinates }]) => ({ uf, name, coordinates, doctors: undefined })
);

const getDensity = (doctors?: number): Density => {
  if (doctors === undefined || doctors === 0) return "none";
  if (doctors <= 5)  return "low";
  if (doctors <= 15) return "medium";
  return "high";
};

const bubbleColor: Record<Density, string> = {
  none:   "#1d4ed8",
  low:    "#fbbf24",
  medium: "#22c55e",
  high:   "#0f766e",
};

const getRadius = (doctors?: number): number => {
  if (!doctors || doctors <= 0) return 7;
  if (doctors <= 5)  return 8;
  if (doctors <= 15) return 10;
  if (doctors <= 30) return 12;
  return 14;
};

// ─── Hook de dados ────────────────────────────────────────────────────────────
function useLeadsPerState(enabled: boolean) {
  const [statesData, setStatesData] = useState<StateDoctorData[]>(ALL_STATES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);

    const fetch = async () => {
      const { data, error } = await supabase
        .from("site_leads")
        .select("state")
        .not("state", "is", null)
        .neq("state", "");

      if (cancelled) return;
      if (error || !data) { setLoading(false); return; }

      // Conta por UF (normaliza para maiúsculas e trim)
      const countMap = new Map<string, number>();
      for (const row of data) {
        const uf = String(row.state ?? "").trim().toUpperCase();
        if (uf) countMap.set(uf, (countMap.get(uf) ?? 0) + 1);
      }

      // Mescla com coordenadas fixas
      const merged: StateDoctorData[] = ALL_STATES.map((s) => ({
        ...s,
        doctors: countMap.get(s.uf), // undefined se não houver leads
      }));

      setStatesData(merged);
      setLoading(false);
    };

    void fetch();
    return () => { cancelled = true; };
  }, [enabled]);

  return { statesData, loading };
}

// ─── Componente ───────────────────────────────────────────────────────────────
interface RegionBubbleMapProps {
  /** Quando true, busca dados reais de site_leads; quando false, usa dados mock */
  liveData?: boolean;
}

const RegionBubbleMap = ({ liveData = false }: RegionBubbleMapProps) => {
  const [zoom, setZoom] = useState(1.3);
  const [center, setCenter] = useState<[number, number]>([-54, -15]);

  const { statesData, loading } = useLeadsPerState(liveData);

  // Quando não é live, usa os dados mock originais
  const displayData: StateDoctorData[] = liveData ? statesData : ALL_STATES.map((s) => {
    const mock: Record<string, number> = {
      AL:12, AM:18, BA:37, CE:22, DF:9, GO:15, MT:10, MS:7,
      MG:42, PA:19, PB:11, PR:28, PE:14, RJ:35, RS:24, SC:17, SP:58, TO:6,
    };
    return { ...s, doctors: mock[s.uf] };
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-3xl bg-[#F5F7F9] p-4 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2 pb-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Use o mouse para arrastar o mapa e a roda ou botões para dar zoom.
        </p>
        <div className="inline-flex items-center gap-1 rounded-full bg-white px-1 py-1 text-xs shadow-sm dark:bg-slate-950">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 0.4, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            -
          </button>
          <button
            type="button"
            onClick={() => { setZoom(1.3); setCenter([-54, -15]); }}
            className="flex h-7 px-2 items-center justify-center rounded-full bg-slate-900 text-[11px] font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 0.4, 4))}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            +
          </button>
        </div>
      </div>

      <div className="relative h-80 w-full overflow-hidden rounded-2xl bg-slate-200/70 dark:bg-slate-900">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/70 backdrop-blur-sm">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        )}
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: [-54, -15], scale: 650 }}
          width={800}
          height={600}
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <filter id="bubbleShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#020617" floodOpacity="0.35" />
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
                      hover:   { outline: "none", fill: "#cbd5f5" },
                      pressed: { outline: "none", fill: "#cbd5f5" },
                    }}
                  />
                ))
              }
            </Geographies>

            {displayData.map((state) => {
              const density = getDensity(state.doctors);
              const color = bubbleColor[density];
              const displayDoctors = state.doctors === undefined ? "-" : String(state.doctors);
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
                    <text x={0} y={-2} textAnchor="middle" fontSize={8} fontWeight={700} fill="#f9fafb">
                      {state.uf}
                    </text>
                    <text x={0} y={8} textAnchor="middle" fontSize={8} fontWeight={600} fill="#e5e7eb">
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
        <span className="mt-1 w-full text-[11px] text-slate-400">
          {liveData
            ? "Número abaixo da UF = quantidade de leads cadastrados no estado."
            : "Número abaixo da UF = quantidade de médicos no estado."}
        </span>
      </div>
    </div>
  );
};

export default RegionBubbleMap;
