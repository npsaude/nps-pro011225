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
import SubscriptionEnrollmentForm from "@/components/subscriptions/SubscriptionEnrollmentForm";

export default function SubscriptionEnrollmentsList() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [rows, setRows] = useState<SubscriptionEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      return (
        r.user_name.toLowerCase().includes(term) ||
        r.user_email.toLowerCase().includes(term) ||
        (r.user_phone ?? "").toLowerCase().includes(term) ||
        String(r.status ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, search]);

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

      const [plansRes, enrollmentsRes] = await Promise.allSettled([
        listarSubscriptionPlans(),
        listarSubscriptionEnrollments(),
      ]);

      if (plansRes.status === "fulfilled") {
        setPlans(plansRes.value);
      } else {
        showError(
          plansRes.reason instanceof Error
            ? plansRes.reason.message
            : "Não foi possível carregar planos.",
        );
      }

      if (enrollmentsRes.status === "fulfilled") {
        setRows(enrollmentsRes.value);
      } else {
        showError(
          enrollmentsRes.reason instanceof Error
            ? enrollmentsRes.reason.message
            : "Não foi possível carregar assinantes.",
        );
      }

      setLoading(false);
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
        setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        showSuccess("Assinante atualizado com sucesso.");
      } else {
        const created = await criarSubscriptionEnrollment(payload);
        setRows((prev) => [created, ...prev]);
        showSuccess("Assinante criado com sucesso.");
      }

      setDialogOpen(false);
      setEditing(null);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="h-full rounded-3xl border border-border bg-card/90 shadow-sm">
      <CardHeader className="border-b border-border bg-secondary/30 pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:text-base">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Users className="h-4 w-4" />
              </span>
              <span>Assinantes</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Base: subscription_enrollments
            </CardDescription>
            <p className="text-[11px] text-muted-foreground">
              Total: <span className="font-medium text-foreground">{rows.length}</span>
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full min-w-[220px] sm:w-80">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, e-mail, telefone ou status..."
                  className="h-9 rounded-full pl-9 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              className="rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground hover:opacity-95"
              onClick={openNew}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Novo assinante
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="mt-1 overflow-hidden rounded-b-2xl">
        {loading ? (
          <p className="px-4 py-6 text-xs text-muted-foreground">
            Carregando assinantes...
          </p>
        ) : (
          <div className="max-h-[560px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border text-xs text-muted-foreground">
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
                      className="px-4 py-6 text-center text-xs text-muted-foreground"
                    >
                      Nenhum assinante encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const plan = planById.get(r.plan_id);
                    const createdAt = r.created_at
                      ? new Date(r.created_at).toLocaleDateString("pt-BR")
                      : "-";

                    return (
                      <TableRow
                        key={r.id}
                        className="border-b border-border/50 text-xs hover:bg-secondary/30"
                      >
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {r.user_name}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {r.user_email}
                              {r.user_phone ? ` • ${r.user_phone}` : ""}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-3 text-muted-foreground">
                          {plan?.name ?? "—"}
                          {plan?.code ? (
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">
                              {plan.code}
                            </span>
                          ) : null}
                        </TableCell>

                        {/* IMPORTANTE: status exatamente como vem do banco */}
                        <TableCell className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground ring-1 ring-border">
                            {String(r.status ?? "")}
                          </span>
                        </TableCell>

                        <TableCell className="px-4 py-3 text-muted-foreground">
                          {createdAt}
                        </TableCell>

                        <TableCell className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                            onClick={() => openEdit(r)}
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
              Cadastro/edição baseado em subscription_enrollments.
            </DialogDescription>
          </DialogHeader>

          <SubscriptionEnrollmentForm
            plans={plans}
            enrollment={editing}
            onSubmit={handleSubmit}
            isSubmitting={saving}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}