import { describe, it, expect, vi, beforeEach } from "vitest";

const invokeMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

import {
  processGuiaSolicitacao,
  processGuiaAutorizacao,
  processDescricaoCirurgica,
} from "./edge-functions";

beforeEach(() => {
  invokeMock.mockReset();
});

describe("edge-functions client", () => {
  it("envia o body correto via invoke e retorna data em caso de sucesso", async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });

    const res = await processGuiaSolicitacao({
      userId: "u1",
      faturamentoId: "f1",
      files: [{ path: "a/b.png" }],
    });

    expect(res).toEqual({ ok: true });
    expect(invokeMock).toHaveBeenCalledWith("process-guia-solicitacao", {
      body: { userId: "u1", faturamentoId: "f1", files: [{ path: "a/b.png" }] },
    });
  });

  it("inclui tipoCirurgia no body da guia de autorização", async () => {
    invokeMock.mockResolvedValue({ data: {}, error: null });

    await processGuiaAutorizacao({
      userId: "u1",
      faturamentoId: "f1",
      files: [],
      tipoCirurgia: "ELETIVA",
    });

    expect(invokeMock).toHaveBeenCalledWith("process-guia-autorizacao", {
      body: { userId: "u1", faturamentoId: "f1", files: [], tipoCirurgia: "ELETIVA" },
    });
  });

  it("propaga a mensagem específica do servidor em erro HTTP (context JSON)", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
        context: new Response(JSON.stringify({ error: "Arquivo inválido" }), {
          status: 400,
        }),
      },
    });

    await expect(
      processGuiaAutorizacao({
        userId: "u",
        faturamentoId: "f",
        files: [],
        tipoCirurgia: "EMERGENCIAL",
      }),
    ).rejects.toThrow("Arquivo inválido");
  });

  it("lança quando data contém { error } mesmo em status 2xx", async () => {
    invokeMock.mockResolvedValue({ data: { error: "Erro lógico" }, error: null });

    await expect(
      processDescricaoCirurgica({ userId: "u", faturamentoId: "f", files: [] }),
    ).rejects.toThrow("Erro lógico");
  });

  it("usa a mensagem de fallback quando o erro não traz corpo JSON", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: {
        message: "boom",
        context: new Response("not json", { status: 500 }),
      },
    });

    await expect(
      processGuiaSolicitacao({ userId: "u", faturamentoId: "f", files: [] }),
    ).rejects.toThrow("Houve erro ao processar a guia de solicitação.");
  });
});
