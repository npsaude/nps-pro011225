import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: m.from, auth: { getUser: m.getUser } },
}));

function builder(result: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = {};
  for (const k of ["select", "eq", "gte", "lt", "in", "order", "limit"]) b[k] = () => b;
  b.maybeSingle = () => Promise.resolve(result);
  b.then = (resolve: (v: unknown) => void) => resolve(result);
  return b;
}

import { fetchBillingQuota } from "@/hooks/use-billing-quota";

describe("fetchBillingQuota", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna cota zerada quando não há usuário", async () => {
    m.getUser.mockResolvedValue({ data: { user: null } });
    expect(await fetchBillingQuota()).toEqual({
      used: 0,
      limit: null,
      isOverLimit: false,
      isNearLimit: false,
    });
  });

  it("calcula used e limit a partir do plano", async () => {
    m.getUser.mockResolvedValue({ data: { user: { id: "u1", email: "A@x.com" } } });
    m.from.mockImplementation((t: string) => {
      if (t === "faturamentos") return builder({ count: 3, error: null });
      if (t === "subscription_enrollments")
        return builder({ data: { subscription_plans: { description: "Até 10 cirurgias" } } });
      return builder({});
    });

    expect(await fetchBillingQuota()).toEqual({
      used: 3,
      limit: 10,
      isOverLimit: false,
      isNearLimit: false,
    });
  });

  it("marca over/near limit corretamente", async () => {
    m.getUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@x.com" } } });
    m.from.mockImplementation((t: string) => {
      if (t === "faturamentos") return builder({ count: 10, error: null });
      if (t === "subscription_enrollments")
        return builder({ data: { subscription_plans: { description: "Até 10 cirurgias" } } });
      return builder({});
    });

    const q = await fetchBillingQuota();
    expect(q.isOverLimit).toBe(true);
    expect(q.isNearLimit).toBe(true);
  });
});
