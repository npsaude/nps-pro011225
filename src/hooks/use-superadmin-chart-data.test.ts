import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: m.from } }));

function builder(result: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = {};
  for (const k of ["select", "in", "or", "gte", "not"]) b[k] = () => b;
  b.then = (resolve: (v: unknown) => void) => resolve(result);
  return b;
}

import { fetchSuperAdminChartData } from "@/hooks/use-superadmin-chart-data";

describe("fetchSuperAdminChartData", () => {
  beforeEach(() => vi.clearAllMocks());

  it("agrega o gráfico de 12 meses e o top de médicos", async () => {
    const nowIso = new Date().toISOString();
    m.from.mockImplementation((table: string) => {
      if (table === "guia_solicitacao")
        return builder({
          data: [
            { id: "g1", medico_id: "d1", profissional_nome: "Dr A", valor_total_honorarios: 100, created_at: nowIso },
            { id: "g2", medico_id: "d1", profissional_nome: "Dr A", valor_total_honorarios: 50, created_at: nowIso },
            { id: "g3", medico_id: "d2", profissional_nome: "Dr B", valor_total_honorarios: 30, created_at: nowIso },
          ],
          error: null,
        });
      if (table === "medicos")
        return builder({ data: [{ id: "d1", nome: "Doutor A" }] });
      return builder({ data: [], error: null });
    });

    const res = await fetchSuperAdminChartData();
    expect(res.chartData).toHaveLength(12);
    // d1 lidera com 150; nome vem da tabela medicos.
    expect(res.topDoctors[0]).toMatchObject({ id: "d1", name: "Doutor A", revenueRaw: 150 });
    // d2 usa o profissional_nome (sem linha em medicos).
    expect(res.topDoctors[1]).toMatchObject({ id: "d2", name: "Dr B", revenueRaw: 30 });
  });

  it("retorna vazio quando a query falha", async () => {
    m.from.mockImplementation(() => builder({ data: null, error: { message: "boom" } }));
    expect(await fetchSuperAdminChartData()).toEqual({ chartData: [], topDoctors: [] });
  });
});
