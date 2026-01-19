import { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, Pencil, Plus, Search, Trash2 } from "lucide-react";

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { showError, showSuccess } from "@/utils/toast";
import SubscriptionPlanForm from "./SubscriptionPlanForm";
import {
  atualizarSubscriptionPlan,
  criarSubscriptionPlan,
  excluirSubscriptionPlan,
  listarSubscriptionPlans,
  type SubscriptionPlan,
  type SubscriptionPlanInput,
} from "@/services/subscription-plans-service";

function formatBRLFromCents(cents: number) {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function intervalLabel(interval: string, count: number) {
  const n = count ?? 1;
  const base =
    interval === "DAY"
      ? "dia"
      : interval === "WEEK"
        ? "semana"
        : interval === "MONTH"
          ? "mês"
          : "ano";
  return n === 1 ? `todo ${base}` : `a cada ${n} ${base}s`;
}

export default function SubscriptionPlansList() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return plans;
    const term = search.toLowerCase();
    return plans.filter((p) => {
      return (
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        (p.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [plans, search]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<SubscriptionPlan | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await listarSubscriptionPlans();
        setPlans(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Não foi possível carregar os planos.";
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

  const openEdit = (plan: SubscriptionPlan) => {
    setEditing(plan);
    setDialogOpen(true);
  };

  const openDelete = (plan: SubscriptionPlan) => {
    setDeleting(plan);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;

    setDeleteLoading(true);
    try {
      await excluirSubscriptionPlan(deleting.id);
      setPlans((prev) => prev.filter((p) => p.id !== deleting.id));
      showSuccess("Plano excluído com sucesso.");
      setDeleteOpen(false);
      setDeleting(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível excluir o plano.";
      showError(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSubmit = async (payload: SubscriptionPlanInput) => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await atualizarSubscriptionPlan(editing.id, payload);
        setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showSuccess("Plano atualizado com sucesso.");
      } else {
        const created = await criarSubscriptionPlan(payload);
        setPlans((prev) => [created, ...prev]);
        showSuccess("Plano criado com sucesso.");
      }

      setDialogOpen(false);
      setEditing(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível salvar o plano.";
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
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                <BadgeDollarSign className="h-4 w-4" />
              </span>
              <span>Planos de assinatura</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Cadastre e mantenha os planos que serão usados nas assinaturas (Asaas).
            </CardDescription>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Total:{" "}
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {plans.length}
              </span>{" "}
              plano(s)
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full min-w-[200px] sm:w-72">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar por nome, código ou descrição..."
                  className="h-9 rounded-full border-slate-200 bg-white pl-9 text-xs shadow-sm placeholder:text-slate-400 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              className="rounded-full bg-indigo-600 px-4 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
              onClick={openNew}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Novo plano
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="mt-1 overflow-hidden rounded-b-2xl bg-white/90 dark:bg-slate-900/80">
        {loading ? (
          <p className="px-4 py-6 text-xs text-slate-500 dark:text-slate-400">
            Carregando planos...
          </p>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <TableHead className="px-4 py-3">Nome</TableHead>
                  <TableHead className="px-4 py-3">Código</TableHead>
                  <TableHead className="px-4 py-3">Preço</TableHead>
                  <TableHead className="px-4 py-3">Recorrência</TableHead>
                  <TableHead className="px-4 py-3">Status</TableHead>
                  <TableHead className="px-4 py-3 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="px-4 py-6 text-center text-xs text-slate-400"
                    >
                      Nenhum plano encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow
                      key={p.id}
                      className="border-b border-slate-50 text-xs hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/60"
                    >
                      <TableCell className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                        {p.name}
                        {p.description ? (
                          <span className="mt-0.5 block text-[11px] text-slate-400">
                            {p.description}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {p.code}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {formatBRLFromCents(p.price_cents)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {intervalLabel(p.billing_interval, p.interval_count)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                            p.active
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-700"
                              : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
                          }`}
                        >
                          {p.active ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
                            onClick={() => openEdit(p)}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-rose-300"
                            onClick={() => openDelete(p)}
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
              {editing ? "Editar plano" : "Novo plano"}
            </DialogTitle>
            <DialogDescription>
              Cadastre os dados do plano que será utilizado na assinatura (sandbox Asaas).
            </DialogDescription>
          </DialogHeader>

          <SubscriptionPlanForm
            plan={editing}
            onSubmit={handleSubmit}
            isSubmitting={saving}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `Tem certeza que deseja excluir o plano "${deleting.name}"?`
                : "Tem certeza que deseja excluir este plano?"}
              <span className="mt-2 block text-[11px] text-slate-500">
                Atenção: se houver assinantes vinculados, o banco pode bloquear a exclusão.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={deleteLoading}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleteLoading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}