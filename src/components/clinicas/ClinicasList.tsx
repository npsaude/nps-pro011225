import { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  Pencil,
  Mail,
  Phone,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  listarClinicas,
  criarClinica,
  atualizarClinica,
  type Clinica,
  type ClinicaInput,
} from "@/services/clinicas-service";
import ClinicaForm from "@/components/clinicas/ClinicaForm";
import { showError, showSuccess } from "@/utils/toast";

const ClinicasList = () => {
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [filtered, setFiltered] = useState<Clinica[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Clinica | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await listarClinicas();
        setClinicas(data);
        setFiltered(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erro ao carregar clínicas/hospitais.";
        showError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(clinicas);
      return;
    }
    const term = search.toLowerCase();
    setFiltered(
      clinicas.filter((c) => {
        return (
          c.razao_social.toLowerCase().includes(term) ||
          c.nome_fantasia.toLowerCase().includes(term) ||
          (c.cnpj ?? "").toLowerCase().includes(term) ||
          (c.cidade ?? "").toLowerCase().includes(term) ||
          (c.codigo_referencial_got ?? "").toLowerCase().includes(term)
        );
      }),
    );
  }, [search, clinicas]);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (clinica: Clinica) => {
    setEditing(clinica);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: ClinicaInput) => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await atualizarClinica(editing.id, values);
        setClinicas((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)),
        );
        showSuccess("Cadastro atualizado com sucesso.");
      } else {
        const created = await criarClinica(values);
        setClinicas((prev) => [...prev, created]);
        showSuccess("Cadastro criado com sucesso.");
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o cadastro.";
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const labelTipo = (tipo: Clinica["tipo_unidade"]) =>
    tipo === "HOSPITAL" ? "Hospital" : "Clínica";

  return (
    <Card className="h-full rounded-3xl border border-slate-100 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <CardHeader className="border-b border-slate-100 bg-slate-50/80 pb-3 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:text-base">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                <Building2 className="h-4 w-4" />
              </span>
              <span>Cadastro de clínicas/hospitais</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Unifique aqui o cadastro de clínicas e hospitais para uso nas SADTs e faturamento.
            </CardDescription>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Total:{" "}
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {clinicas.length}
              </span>{" "}
              registro(s)
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full min-w-[200px] sm:w-60">
              <div className="relative">
                <Input
                  placeholder="Buscar por tipo, nome, CNPJ, cidade, GOT..."
                  className="h-9 rounded-full border-slate-200 bg-white px-3 text-xs shadow-sm placeholder:text-slate-400 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-500"
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
              Novo cadastro
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="mt-1 overflow-hidden rounded-b-2xl bg-white/90 dark:bg-slate-900/80">
        {loading ? (
          <p className="px-4 py-6 text-xs text-slate-500 dark:text-slate-400">
            Carregando cadastros...
          </p>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <TableHead className="px-4 py-3">Tipo</TableHead>
                  <TableHead className="px-4 py-3">
                    Cód. Ref. (GOT)
                  </TableHead>
                  <TableHead className="px-4 py-3">Razão social</TableHead>
                  <TableHead className="px-4 py-3">Nome fantasia</TableHead>
                  <TableHead className="px-4 py-3">CNPJ</TableHead>
                  <TableHead className="px-4 py-3">Cidade / UF</TableHead>
                  <TableHead className="px-4 py-3">
                    Contato faturamento
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="px-4 py-6 text-center text-xs text-slate-400"
                    >
                      Nenhuma clínica/hospital cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow
                      key={c.id}
                      className="border-b border-slate-50 text-xs hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/60"
                    >
                      <TableCell className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                        {labelTipo(c.tipo_unidade)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {c.codigo_referencial_got || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                        {c.razao_social}
                        {c.nome_rede && (
                          <span className="mt-0.5 block text-[11px] text-slate-400">
                            Rede: {c.nome_rede}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {c.nome_fantasia}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {c.cnpj}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {c.cidade} / {c.uf}
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          {c.bairro}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-medium">
                            {c.nome_contato_faturamento || "-"}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            {c.email_contato_faturamento && (
                              <>
                                <Mail className="h-3 w-3" />
                                <span>{c.email_contato_faturamento}</span>
                              </>
                            )}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            {c.telefone_contato_faturamento && (
                              <>
                                <Phone className="h-3 w-3" />
                                <span>{c.telefone_contato_faturamento}</span>
                              </>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
                          onClick={() => openEdit(c)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
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
          if (!open) {
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Editar clínica/hospital"
                : "Novo cadastro de clínica/hospital"}
            </DialogTitle>
            <DialogDescription>
              Selecione se é uma clínica ou hospital e preencha os dados da unidade para uso nas SADTs e faturamento.
            </DialogDescription>
          </DialogHeader>

          <ClinicaForm
            clinica={editing}
            onSubmit={handleSubmit}
            isSubmitting={saving}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ClinicasList;