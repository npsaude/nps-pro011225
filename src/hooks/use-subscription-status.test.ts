import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ getUser: vi.fn(), invoke: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: m.getUser }, functions: { invoke: m.invoke } },
}));

import { fetchSubscriptionStatus } from "@/hooks/use-subscription-status";

describe("fetchSubscriptionStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna vazio quando não há usuário", async () => {
    m.getUser.mockResolvedValue({ data: { user: null } });
    expect(await fetchSubscriptionStatus()).toEqual({ status: null, cancelado: null });
    expect(m.invoke).not.toHaveBeenCalled();
  });

  it("normaliza o status retornado pela edge function", async () => {
    m.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    m.invoke.mockResolvedValue({ data: { status: "active", cancelado: false }, error: null });
    expect(await fetchSubscriptionStatus()).toEqual({ status: "ACTIVE", cancelado: false });
    expect(m.invoke).toHaveBeenCalledWith("check-subscription", { body: {} });
  });

  it("retorna vazio quando a edge function falha", async () => {
    m.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    m.invoke.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await fetchSubscriptionStatus()).toEqual({ status: null, cancelado: null });
  });
});
