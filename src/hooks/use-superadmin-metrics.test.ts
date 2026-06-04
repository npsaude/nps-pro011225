import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: m.from } }));

// Builder thenable que ignora os métodos de filtro e resolve no resultado dado.
function builder(result: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = {};
  for (const k of ["select", "in", "or", "gte", "not"]) b[k] = () => b;
  b.then = (resolve: (v: unknown) => void) => resolve(result);
  return b;
}

import { fetchSuperAdminMetrics } from "@/hooks/use-superadmin-metrics";

describe("fetchSuperAdminMetrics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna as contagens de médicos ativos e faturamentos", async () => {
    m.from.mockImplementation((table: string) => {
      if (table === "subscription_enrollments") return builder({ count: 10 });
      if (table === "faturamentos") return builder({ count: 42 });
      return builder({ count: null });
    });

    const metrics = await fetchSuperAdminMetrics();
    expect(metrics).toEqual({ totalMedicos: 10, totalFaturamentos: 42 });
  });

  it("usa null quando o count não vem", async () => {
    m.from.mockImplementation(() => builder({ count: null }));
    expect(await fetchSuperAdminMetrics()).toEqual({
      totalMedicos: null,
      totalFaturamentos: null,
    });
  });
});
