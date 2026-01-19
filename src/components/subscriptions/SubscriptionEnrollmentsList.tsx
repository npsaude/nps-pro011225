import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { showError, showSuccess } from "@/utils/toast";
import SubscriptionEnrollmentForm from "./SubscriptionEnrollmentForm";
import {
  atualizarSubscriptionEnrollment,
  criarSubscriptionEnrollment,
  listarSubscriptionEnrollments,
  type SubscriptionEnrollment,
  type SubscriptionEnrollmentInput,
} from "@/services/subscription-enrollments-service";
import {
  listarSubscriptionPlans,
  type SubscriptionPlan,
} from "@/services/subscription-plans-service";

function normalizeStatusKey(status: string) {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "active") return "ACTIVE";
  if (s === "trial") return "TRIAL";
  if (s === "pending") return "PENDING";
  if (s === "paused") return "PAUSED";
  if (s === "canceled" || s === "cancelled") return "CANCELED";
  if (s === "failed") return "FAILED";

  // Caso a base já esteja em PT-BR (ex.: "Ativo"), não normalizamos
  return null;
}

function statusLabel(status: string) {
  const key = normalizeStatusKey(status);
  if (!key) return status; // já vem como está na base

  if (key === "ACTIVE") return "Ativo";
  if (key === "TRIAL") return "Trial";
  if (key === "PENDING") return "Pendente";
  if (key === "PAUSED") return "Pausado";
  if (key === "CANCELED") return "Cancelado";
  if (key === "FAILED") return "Falhou";
  return status;
}

function statusBadge(status: string) {
  const key = normalizeStatusKey(status) ?? status.trim().toUpperCase();

  if (key === "ACTIVE" || key === "ATIVO")
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (key === "TRIAL")
    return "bg-sky-50 text-sky-700 ring-sky-200";
  if (key === "PENDING" || key === "PENDENTE")
    return "bg-amber-50 text-amber-700 ring-amber-200";
  if (key === "PAUSED" || key === "PAUSADO")
    return "bg-slate-100 text-slate-700 ring-slate-200";
  if (key === "CANCELED" || key === "CANCELADO")
    return "bg-rose-50 text-rose-700 ring-rose-200";
  if (key === "FAILED" || key === "FALHOU")
    return "bg-slate-100 text-slate-700 ring-slate-200";

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export default function SubscriptionEnrollmentsList() {
  const [enrollments, setEnrollments] = useState<SubscriptionEnrollment[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return enrollments;
    const term = search.toLowerCase();
    return enrollments.filter((e) => {
      return (
        e.user_name.toLowerCase().includes(term) ||
        e.user_email.toLowerCase().includes(term) ||
        (e.user_phone ?? "").toLowerCase().includes(term) ||
        e.status.toLowerCase().includes(term)
      );
    });
  }, [enrollments, search]);

  const planById = useMemo(() => {
    const map = new Map<string, SubscriptionPlan>();
    plans.forEach((p) => map.set(p.id, p));
    return map;
  }, [plans]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionEnrollment | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [plansData, enrollmentsData] = await Promise.all([
          listarSubscriptionPlans(),
          listarSubscriptionEnrollments(),
        ]);
        setPlans(plansData);
        setEnrollments(enrollmentsData);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Não foi possível carregar os assinantes.";
        showError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (enrollment: SubscriptionEnrollment) => {
    setEditing(enrollment);
    setDialogOpen(true);
  };

  const handleSubmit = async (payload: SubscriptionEnrollmentInput) => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await atualizarSubscriptionEnrollment(editing.id, payload);
        setEnrollments((prev) =>
          prev.map((e) => (e.id === updated.id ? updated : e)),
        );
        showSuccess("Assinante atualizado com sucesso.");
      } else {
        const created = await criarSubscriptionEnrollment(payload);
        setEnrollments((prev) => [created, ...prev]);
        showSuccess("Assinante criado com sucesso.");
      }

      setDialogOpen(false);
      setEditing(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o assinante.";
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="h-full rounded-3xl border border-slate-100 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <CardHeader className="border-b border-slate-100 bg-slate-50/80 pb-3 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:text-base">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                <Users className="h-4 w-4" />
              </span>
              <span>Assinantes</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Lista de assinantes (subscription_enrollments) e status de assinatura.
            </CardDescription>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Total:{" "}
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {enrollments.length}
              </span>{" "}
              assinante(s)
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full min-w-[200px] sm:w-72">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar por nome, e-mail, telefone ou status..."
                  className="h-9 rounded-full border-slate-200 bg-white pl-9 text-xs shadow-sm placeholder:text-slate-400 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              className="rounded-full bg-sky-600 px-4 text-xs font-medium text-white shadow-sm hover:bg-sky-700"
              onClick={openNew}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Novo assinante
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="mt-1 overflow-hidden rounded-b-2xl bg-white/90 dark:bg-slate-900/80">
        {loading ? (
          <p className="px-4 py-6 text-xs text-slate-500 dark:text-slate-400">
            Carregando assinantes...
          </p>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <TableHead className="px-4 py-3">Assinante</TableHead>
                  <TableHead className="px-4 py-3">Plano</TableHead>
                  <TableHead className="px-4 py-3">Status</TableHead>
                  <TableHead className="px-4 py-3">Criado em</TableHead>
                  <TableHead className="px-4 py-3 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="px-4 py-6 text-center text-xs text-slate-400"
                    >
                      Nenhum assinante encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((e) => {
                    const plan = planById.get(e.plan_id);
                    const createdAt = e.created_at
                      ? new Date(e.created_at).toLocaleDateString("pt-BR")
                      : "-";

                    return (
                      <TableRow
                        key={e.id}
                        className="border-b border-slate-50 text-xs hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/60"
                      >
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900 dark:text-slate-50">
                              {e.user_name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {e.user_email}
                              {e.user_phone ? ` • ${e.user_phone}` : ""}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {plan?.name ?? "—"}
                          {plan?.code ? (
                            <span className="mt-0.5 block text-[11px] text-slate-400">
                              {plan.code}
                            </span>
                          ) : null}
                        </TableCell>

                        <TableCell className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${statusBadge(
                              e.status,
                            )} dark:bg-opacity-20 dark:text-slate-100`}
                          >
                            {statusLabel(e.status)}
                          </span>
                        </TableCell>

                        <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {createdAt}
                        </TableCell>

                        <TableCell className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-slate-500 hover:bg-sky-50 hover:text-sky-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-sky-300"
                            onClick={() => openEdit(e)}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar assinante" : "Novo assinante"}
            </DialogTitle>
            <DialogDescription>
              Cadastre/ajuste os dados do assinante. (Dados financeiros/datas podem ser atualizados via integração Asaas.)
            </DialogDescription>
          </DialogHeader>

          <SubscriptionEnrollmentForm
            enrollment={editing}
            plans={plans}
            onSubmit={handleSubmit}
            isSubmitting={saving}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}