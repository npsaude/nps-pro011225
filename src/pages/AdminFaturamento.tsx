import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CalendarDays, Search, User2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AdminBillingCard, {
  type AdminBillingCardRecord,
} from "@/components/faturamento/AdminBillingCard";
import { deleteFaturamento, listAdminFaturamentos } from "@/services/admin-faturamento-service";
import type { BillingDocStep } from "@/components/faturamento/BillingDocsProgress";
import { showSuccess, showError } from "@/utils/toast";
import { emitQuotaChanged } from "@/utils/quota-events";

function hasAny(arr: string[] | null | undefined): boolean {
  return Array.isArray(arr) && arr.length > 0;
}

function buildSteps(item: {
  guia_solicitacao_id: string | null;
  url_guia_autorizacao: string[];
  url_descricao_cirurgica: string[];
  guia_honorarios_id: string | null;
  email_status: string;
}): BillingDocStep[] {
  return [
    {
      id: "guia_solicitacao",
      label: "Guia de Solicitação",
      sent: Boolean(item.guia_solicitacao_id),
    },
    {
      id: "guia_autorizacao",
      label: "Guia de Autorização",
      sent: hasAny(item.url_guia_autorizacao),
    },
    {
      id: "descricao_cirurgica",
      label: "Descrição Cirurgica",
      sent: hasAny(item.url_descricao_cirurgica),
    },
    {
      id: "guia_honorarios",
      label: "Guia de Honorários",
      sent: Boolean(item.guia_honorarios_id),
    },
    {
      id: "email_faturamento",
      label: "Email para Faturamento",
      sent: item.email_status === "ENVIADO",
    },
  ];
}

const AdminFaturamento = () => {
  const [items, setItems] = useState<AdminBillingCardRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros simples (client-side)
  const [doctorQuery, setDoctorQuery] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const [dateQuery, setDateQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await listAdminFaturamentos();
        if (cancelled) return;

        setItems(
          data.map((d) => ({
            id: d.id,
            pacienteNome: d.paciente_nome,
            dataCirurgia: d.data_cirurgia,
            horaCirurgia: d.hora_inicio,
            hospitalNome: d.hospital_nome,
            steps: buildSteps(d),
            procedimentos: d.procedimentos,
            profissionais: d.profissionais,
            qtdSolicitada: d.qtdSolicitada,
            qtdAutorizada: d.qtdAutorizada,
            valorFaturamento: d.valorFaturamento,
          })),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const dq = dateQuery.trim();
    const pq = patientQuery.trim().toLowerCase();

    return items.filter((i) => {
      if (pq && !(i.pacienteNome ?? "").toLowerCase().includes(pq)) return false;

      // dateQuery aceita tanto dd/mm/aaaa quanto yyyy-mm-dd (comparação por contains)
      if (dq) {
        const dateIso = i.dataCirurgia ?? "";
        const datePt = dateIso
          ? new Date(`${dateIso}T00:00:00`).toLocaleDateString("pt-BR")
          : "";

        if (!dateIso.includes(dq) && !datePt.includes(dq)) return false;
      }

      // Mantive o campo de "Médico" na UI por compatibilidade, mas ainda não há coluna médico_nome no faturamentos.
      if (doctorQuery.trim()) return true;

      return true;
    });
  }, [items, doctorQuery, patientQuery, dateQuery]);

  const handleDelete = async (id: string) => {
    try {
      await deleteFaturamento(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      showSuccess("Faturamento excluído com sucesso.");
      emitQuotaChanged();
    } catch (error) {
      console.error(error);
      showError("Não foi possível excluir o faturamento.");
    }
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="faturamento" />

        <div className="flex flex-1 flex-col gap-5 rounded-3xl bg-transparent lg:py-1">
          {/* Page header (fora do retângulo) */}
          <header className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col">
              <h1 className="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Faturamento
              </h1>
              <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                Acompanhe o envio de documentos e o disparo de e-mails do faturamento.
              </p>
            </div>

            {/* Top search and notifications */}
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs text-slate-500 shadow-sm ring-1 ring-slate-200 backdrop-blur md:flex dark:bg-slate-900/70 dark:text-slate-200 dark:ring-slate-700">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar"
                  className="w-40 bg-transparent text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
                />
              </div>

              <AdminHeaderActions notificationsCount={1} />
            </div>
          </header>

          {/* Conteúdo (dentro do retângulo) */}
          <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:bg-slate-900/90">
            <main className="flex-1 space-y-4">
              {/* Filters card */}
              <Card className="rounded-[22px] border-[#E0E7F5] bg-white shadow-[0_10px_35px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/95">
                <CardHeader className="pb-4">
                  <CardTitle className="text-[14px] font-semibold text-slate-900 dark:text-slate-50">
                    Filtros
                  </CardTitle>
                  <CardDescription className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                    Busque por paciente ou data da cirurgia.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-1">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_auto]">
                    {/* Médico (mantido, mas ainda sem filtro real) */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Médico
                      </Label>
                      <div className="relative">
                        <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={doctorQuery}
                          onChange={(e) => setDoctorQuery(e.target.value)}
                          placeholder="(em breve)"
                          className="h-11 rounded-[14px] border border-[#E0E7F5] bg-[#F7F9FC] pl-9 text-[13px] text-slate-700 placeholder:text-slate-400 focus:border-[#2657B5] focus:ring-2 focus:ring-[#2657B5]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Paciente */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Paciente
                      </Label>
                      <div className="relative">
                        <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={patientQuery}
                          onChange={(e) => setPatientQuery(e.target.value)}
                          placeholder="Buscar por paciente"
                          className="h-11 rounded-[14px] border border-[#E0E7F5] bg-[#F7F9FC] pl-9 text-[13px] text-slate-700 placeholder:text-slate-400 focus:border-[#2657B5] focus:ring-2 focus:ring-[#2657B5]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Data */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Data cirurgia
                      </Label>
                      <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={dateQuery}
                          onChange={(e) => setDateQuery(e.target.value)}
                          placeholder="dd/mm/aaaa ou yyyy-mm-dd"
                          className="h-11 rounded-[14px] border border-[#E0E7F5] bg-[#F7F9FC] pl-9 pr-9 text-[13px] text-slate-700 placeholder:text-slate-400 focus:border-[#2657B5] focus:ring-2 focus:ring-[#2657B5]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                        <CalendarDays className="pointer-events-none absolute right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-slate-400 sm:block" />
                      </div>
                    </div>

                    {/* Button (client-side) */}
                    <div className="flex items-end">
                      <Button
                        type="button"
                        className="h-11 w-full rounded-[14px] bg-[#163E99] px-6 text-[13px] font-semibold text-white shadow-[0_6px_18px_rgba(22,62,153,0.5)] transition hover:bg-[#102F77]"
                      >
                        Filtrar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <section className="space-y-3">
                {loading ? (
                  <Card className="rounded-[22px] border-[#E0E7F5] bg-white dark:border-slate-800 dark:bg-slate-900/95">
                    <CardContent className="p-6 text-[13px] text-slate-600 dark:text-slate-300">
                      Carregando...
                    </CardContent>
                  </Card>
                ) : filteredItems.length === 0 ? (
                  <Card className="rounded-[22px] border-[#E0E7F5] bg-white dark:border-slate-800 dark:bg-slate-900/95">
                    <CardContent className="p-6 text-[13px] text-slate-600 dark:text-slate-300">
                      Nenhum faturamento encontrado.
                    </CardContent>
                  </Card>
                ) : (
                  filteredItems.map((record) => (
                    <AdminBillingCard
                      key={record.id}
                      record={record}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </section>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFaturamento;