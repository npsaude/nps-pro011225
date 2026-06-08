import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Scale,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Link2,
  Unlink,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  carregarConciliacao,
  STATUS_META,
  type ConciliacaoRow,
  type ConciliacaoResumo,
  type ConciliacaoStatus,
} from "@/services/conciliacao-service";
import { formatBRL, formatDateBR } from "@/services/relatorios-retorno-service";
import { showError } from "@/utils/toast";

const PAGE_SIZE = 8;

type FiltroStatus = ConciliacaoStatus | "todos" | "sem_guia";

const AdminConciliacao: React.FC = () => {
  const [rows, setRows] = useState<ConciliacaoRow[]>([]);
  const [resumo, setResumo] = useState<ConciliacaoResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<FiltroStatus>("todos");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<ConciliacaoRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { rows: r, resumo: res } = await carregarConciliacao();
      setRows(r);
      setResumo(res);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro ao carregar a conciliação.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      // "Sem guia" mostra só os repasses não vinculados; os demais filtros
      // trabalham apenas com as guias (exclui os repasses sem guia).
      if (filtro === "sem_guia") {
        if (!r.semGuia) return false;
      } else if (r.semGuia) {
        return false;
      } else if (filtro !== "todos" && r.status !== filtro) {
        return false;
      }
      if (!q) return true;
      return [r.paciente, r.numeroGuia, r.convenio, r.origemRepasse, r.motivoGlosa]
        .some((v) => v?.toLowerCase().includes(q));
    });
  }, [rows, search, filtro]);

  const guiasRows = useMemo(() => rows.filter((r) => !r.semGuia), [rows]);
  const totalPagas =
    (resumo?.totalPagoIntegral ?? 0) + (resumo?.totalPagoParcial ?? 0);
  const taxaPagas =
    resumo && resumo.totalGuias > 0 ? totalPagas / resumo.totalGuias : 0;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, filtro]);

  const donutData = useMemo(() => {
    if (!resumo) return [];
    return [
      { name: "Pago integral", value: resumo.totalPagoIntegral, status: "pago_integral" as ConciliacaoStatus },
      { name: "Pago parcial", value: resumo.totalPagoParcial, status: "pago_parcial" as ConciliacaoStatus },
      { name: "Em aberto", value: resumo.totalAbertas, status: "aberto" as ConciliacaoStatus },
      { name: "Glosado total", value: resumo.totalGlosadoTotal, status: "glosado_total" as ConciliacaoStatus },
    ].filter((d) => d.value > 0);
  }, [resumo]);

  const barData = useMemo(() => {
    if (!resumo) return [];
    return [
      { name: "Apresentado", valor: resumo.valorApresentado, fill: "#6366f1" },
      { name: "Recebido", valor: resumo.valorRecebido, fill: "#10b981" },
      { name: "Glosa", valor: resumo.valorGlosa, fill: "#f43f5e" },
      { name: "Em aberto", valor: resumo.valorEmAberto, fill: "#f59e0b" },
    ];
  }, [resumo]);

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="conciliacao" />

        <div className="flex min-w-0 flex-1 flex-col gap-5 rounded-3xl bg-transparent lg:py-1">
          {/* ── Header ─────────────────────────────────────────── */}
          <header className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30">
                <Scale className="h-5 w-5" />
              </span>
              <div className="flex flex-col">
                <h1 className="flex items-center gap-2 text-[26px] font-semibold tracking-tight text-slate-900">
                  Conciliação
                  <span className="hidden items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 ring-1 ring-indigo-200 sm:inline-flex">
                    <Sparkles className="h-3 w-3" /> encontro de contas
                  </span>
                </h1>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  Cruzamento entre as guias de acompanhamento e os relatórios de repasse.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs text-slate-500 shadow-sm ring-1 ring-slate-200 backdrop-blur md:flex">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar guia, paciente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-44 bg-transparent text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <button
                onClick={() => void load()}
                className="flex h-9 items-center gap-2 rounded-full bg-white/70 px-4 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 backdrop-blur transition hover:bg-white"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </button>
              <AdminHeaderActions notificationsCount={0} />
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            {/* ── KPIs ───────────────────────────────────────── */}
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Guias pagas"
                value={`${totalPagas} de ${resumo?.totalGuias ?? 0}`}
                sub={`${Math.round(taxaPagas * 100)}% das guias receberam repasse`}
                gradient="from-emerald-500 to-teal-500"
                progress={taxaPagas}
                loading={loading}
              />
              <KpiCard
                icon={<Wallet className="h-4 w-4" />}
                label="Recebido"
                value={formatBRL(resumo?.valorRecebido ?? 0)}
                sub={`de ${formatBRL(resumo?.valorApresentado ?? 0)} apresentado`}
                gradient="from-indigo-500 to-violet-500"
                loading={loading}
              />
              <KpiCard
                icon={<Clock className="h-4 w-4" />}
                label="Em aberto"
                value={`${resumo?.totalAbertas ?? 0} guia(s)`}
                sub={`${formatBRL(resumo?.valorEmAberto ?? 0)} a receber`}
                gradient="from-amber-500 to-orange-500"
                loading={loading}
              />
              <KpiCard
                icon={<ArrowDownRight className="h-4 w-4" />}
                label="Glosa"
                value={formatBRL(resumo?.valorGlosa ?? 0)}
                sub={
                  (resumo?.totalComGlosa ?? 0) > 0
                    ? `${resumo?.totalComGlosa} lançamento(s) · taxa ${(((resumo?.taxaGlosa ?? 0) * 100) || 0).toFixed(1)}%`
                    : "nenhuma glosa registrada"
                }
                gradient="from-rose-500 to-pink-500"
                loading={loading}
              />
            </section>

            {/* ── Charts ─────────────────────────────────────── */}
            <section className="grid grid-cols-1 gap-3 lg:grid-cols-5">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:col-span-2">
                <h3 className="mb-1 text-[13px] font-semibold text-slate-800">Distribuição das guias</h3>
                <p className="mb-2 text-[11px] text-slate-400">Por situação de pagamento</p>
                <div className="flex items-center gap-2">
                  <div className="relative h-[170px] w-[170px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={78}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {donutData.map((d) => (
                            <Cell key={d.status} fill={STATUS_META[d.status].chart} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number, n: string) => [`${v} guia(s)`, n]}
                          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-slate-900">{resumo?.totalGuias ?? 0}</span>
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">guias</span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    {donutData.length === 0 && (
                      <span className="text-xs text-slate-400">Sem dados.</span>
                    )}
                    {donutData.map((d) => (
                      <button
                        key={d.status}
                        onClick={() => setFiltro((f) => (f === d.status ? "todos" : d.status))}
                        className={`flex items-center justify-between rounded-lg px-2 py-1 text-left text-xs transition hover:bg-slate-50 ${
                          filtro === d.status ? "bg-slate-50 ring-1 ring-slate-200" : ""
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: STATUS_META[d.status].chart }}
                          />
                          <span className="text-slate-600">{d.name}</span>
                        </span>
                        <span className="font-semibold text-slate-800">{d.value}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:col-span-3">
                <h3 className="mb-1 text-[13px] font-semibold text-slate-800">Resumo financeiro</h3>
                <p className="mb-2 text-[11px] text-slate-400">Apresentado → recebido, com glosa e o que falta receber</p>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#cbd5e1" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                      />
                      <Tooltip
                        formatter={(v: number) => formatBRL(v)}
                        cursor={{ fill: "#f8fafc" }}
                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                      />
                      <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                        {barData.map((d) => (
                          <Cell key={d.name} fill={d.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* ── Filter chips ───────────────────────────────── */}
            <section className="flex flex-wrap items-center gap-2">
              <FilterChip active={filtro === "todos"} onClick={() => setFiltro("todos")}>
                Todas as guias <span className="ml-1 opacity-60">{guiasRows.length}</span>
              </FilterChip>
              {(Object.keys(STATUS_META) as ConciliacaoStatus[]).map((s) => (
                <FilterChip
                  key={s}
                  active={filtro === s}
                  onClick={() => setFiltro(s)}
                  dot={STATUS_META[s].chart}
                >
                  {STATUS_META[s].label}
                  <span className="ml-1 opacity-60">
                    {guiasRows.filter((r) => r.status === s).length}
                  </span>
                </FilterChip>
              ))}
              {resumo && resumo.totalSemGuia > 0 && (
                <FilterChip
                  active={filtro === "sem_guia"}
                  onClick={() => setFiltro("sem_guia")}
                  className="ml-auto"
                >
                  <Unlink className="h-3 w-3" />
                  Repasses sem guia
                  <span className="ml-1 opacity-60">{resumo.totalSemGuia}</span>
                </FilterChip>
              )}
            </section>

            {/* ── Table ──────────────────────────────────────── */}
            <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-3">
                <h3 className="text-[13px] font-semibold text-slate-800">
                  {filtro === "sem_guia"
                    ? "Repasses recebidos sem guia vinculada"
                    : "Guias e seus repasses"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {filtro === "sem_guia"
                    ? "Pagamentos do repasse que não casaram com nenhuma guia de acompanhamento."
                    : "Valor = apresentado no repasse (ou esperado da guia, quando ainda em aberto). Recebimento = recebido ÷ valor. Clique numa linha para ver o detalhe."}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3 text-left font-medium">Situação</th>
                      <th className="px-3 py-3 text-left font-medium">Guia / Paciente</th>
                      <th className="px-3 py-3 text-left font-medium">Convênio</th>
                      <th className="px-3 py-3 text-right font-medium">Valor</th>
                      <th className="px-3 py-3 text-right font-medium">Recebido</th>
                      <th className="px-3 py-3 text-right font-medium">Glosa</th>
                      <th className="px-3 py-3 text-left font-medium">Recebimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(6)].map((_, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="h-6 w-full animate-pulse rounded bg-slate-100" />
                          </td>
                        </tr>
                      ))
                    ) : paginated.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                          Nenhuma guia encontrada para o filtro atual.
                        </td>
                      </tr>
                    ) : (
                      paginated.map((r) => (
                        <tr
                          key={r.key}
                          onClick={() => setDetail(r)}
                          className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50/70"
                        >
                          <td className="px-4 py-3">
                            <StatusBadge status={r.status} />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col">
                              <span className="flex items-center gap-1.5 font-medium text-slate-800">
                                {r.semGuia ? (
                                  <Unlink className="h-3 w-3 text-slate-400" />
                                ) : r.matchType ? (
                                  <Link2 className="h-3 w-3 text-emerald-500" />
                                ) : null}
                                {r.paciente || "—"}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {r.numeroGuia ? `Guia ${r.numeroGuia}` : "Sem nº de guia"}
                                {r.semGuia && " · repasse sem guia"}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{r.convenio || "—"}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                            {r.valorApresentado != null
                              ? formatBRL(r.valorApresentado)
                              : r.valorEsperado != null
                                ? formatBRL(r.valorEsperado)
                                : "—"}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold tabular-nums text-emerald-600">
                            {formatBRL(r.valorLiquido)}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {r.valorGlosa > 0 ? (
                              <span className="text-rose-500">{formatBRL(r.valorGlosa)}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <ProgressBar value={r.percentualRecebido} status={r.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                  <span>
                    {filtered.length} registro(s) · página {page} de {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 transition hover:bg-slate-100 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 transition hover:bg-slate-100 disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* ── Detail drawer ─────────────────────────────────── */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StatusBadge status={detail?.status ?? "aberto"} />
            </DialogTitle>
            <DialogDescription>
              {detail?.matchType
                ? `Conciliada por ${detail.matchType === "guia" ? "número de guia" : "nome do paciente"}.`
                : detail?.semGuia
                  ? "Repasse sem guia de acompanhamento correspondente."
                  : "Guia ainda sem repasse correspondente."}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="grid gap-2.5 text-sm">
              <DetailRow label="Paciente" value={detail.paciente} />
              <DetailRow label="Nº da guia" value={detail.numeroGuia} />
              <DetailRow label="Convênio" value={detail.convenio} />
              <DetailRow label="Origem do repasse" value={detail.origemRepasse} />
              <DetailRow label="Competência" value={detail.competencia} />
              <DetailRow label="Data de pagamento" value={detail.dataPagamento ? formatDateBR(detail.dataPagamento) : null} />
              <div className="my-1 h-px bg-slate-100" />
              <DetailRow label="Valor esperado" value={detail.valorEsperado != null ? formatBRL(detail.valorEsperado) : "—"} />
              <DetailRow label="Valor apresentado" value={detail.valorApresentado != null ? formatBRL(detail.valorApresentado) : "—"} />
              <DetailRow label="Glosa" value={detail.valorGlosa > 0 ? formatBRL(detail.valorGlosa) : "—"} tone={detail.valorGlosa > 0 ? "rose" : undefined} />
              <DetailRow label="Recebido (líquido)" value={formatBRL(detail.valorLiquido)} tone="emerald" />
              {detail.motivoGlosa && (
                <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-600 ring-1 ring-rose-100">
                  <span className="font-semibold">Motivo da glosa: </span>
                  {detail.motivoGlosa}
                </div>
              )}
              <div className="mt-1">
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Recebimento</span>
                  <span>{Math.round(detail.percentualRecebido * 100)}%</span>
                </div>
                <ProgressBar value={detail.percentualRecebido} status={detail.status} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ── Subcomponents ──────────────────────────────────────── */

function KpiCard({
  icon,
  label,
  value,
  sub,
  gradient,
  progress,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  gradient: string;
  progress?: number;
  loading?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-xl transition group-hover:opacity-20`} />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white shadow-sm`}>
          {icon}
        </span>
      </div>
      {loading ? (
        <div className="mt-3 h-7 w-20 animate-pulse rounded bg-slate-100" />
      ) : (
        <div className="mt-2 text-[22px] font-bold leading-none text-slate-900">{value}</div>
      )}
      <div className="mt-1 text-[11px] text-slate-400">{sub}</div>
      {progress != null && (
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`}
            style={{ width: `${Math.round(Math.min(1, progress) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ConciliacaoStatus }) {
  const meta = STATUS_META[status];
  const Icon =
    status === "pago_integral"
      ? CheckCircle2
      : status === "pago_parcial"
        ? AlertTriangle
        : status === "glosado_total"
          ? XCircle
          : Clock;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${meta.bg} ${meta.text}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

function ProgressBar({ value, status }: { value: number; status: ConciliacaoStatus }) {
  const meta = STATUS_META[status];
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.round(Math.min(1, value) * 100)}%`, background: meta.chart }}
        />
      </div>
      <span className="w-9 text-right text-[11px] tabular-nums text-slate-400">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  dot,
  className,
  children,
}: {
  active: boolean;
  onClick: () => void;
  dot?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      } ${className ?? ""}`}
    >
      {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
      {children}
    </button>
  );
}

function DetailRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | null | undefined;
  tone?: "emerald" | "rose";
}) {
  const toneClass =
    tone === "emerald" ? "text-emerald-600" : tone === "rose" ? "text-rose-600" : "text-slate-800";
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-right text-[13px] font-medium ${toneClass}`}>{value || "—"}</span>
    </div>
  );
}

export default AdminConciliacao;
