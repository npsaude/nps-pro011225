import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Pencil,
  Paperclip,
  Plus,
  Trash2,
  FileText,
  Building2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { showError, showSuccess } from "@/utils/toast";
import {
  atualizarGuiaGft,
  criarGuiaGft,
  criarModeloSignedUrl,
  excluirGuiaGft,
  listarGuiasGft,
  uploadModeloGft,
  type GftGuia,
  type GftGuiaInput,
} from "@/services/gft-service";
import { listarClinicas, type Clinica } from "@/services/clinicas-service";

function cleanHtmlForPreview(html: string) {
  // Removemos scripts por segurança e para evitar comportamento inesperado no preview.
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

const GftList = () => {
  const [guias, setGuias] = useState<GftGuia[]>([]);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GftGuia | null>(null);
  const [saving, setSaving] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewTitle, setPreviewTitle] = useState<string>("Pré-visualização");

  const [attachOpen, setAttachOpen] = useState(false);
  const [attachItem, setAttachItem] = useState<GftGuia | null>(null);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachSaving, setAttachSaving] = useState(false);

  const [formValues, setFormValues] = useState<GftGuiaInput>({
    nome_guia: "",
    clinica_id: "",
    documento_html: "",
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [guiasDb, clinicasDb] = await Promise.all([
        listarGuiasGft(),
        listarClinicas(),
      ]);
      setGuias(guiasDb);
      setClinicas(clinicasDb);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível carregar as guias.";
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const clinicaById = useMemo(() => {
    const map = new Map<string, Clinica>();
    clinicas.forEach((c) => map.set(c.id, c));
    return map;
  }, [clinicas]);

  const filtered = useMemo(() => {
    if (!search.trim()) return guias;
    const term = search.toLowerCase();
    return guias.filter((g) => {
      const unidade = clinicaById.get(g.clinica_id);
      return (
        g.id.toLowerCase().includes(term) ||
        g.nome_guia.toLowerCase().includes(term) ||
        (unidade?.nome_fantasia ?? "").toLowerCase().includes(term) ||
        (unidade?.razao_social ?? "").toLowerCase().includes(term)
      );
    });
  }, [guias, search, clinicaById]);

  const openNew = () => {
    setEditing(null);
    setFormValues({ nome_guia: "", clinica_id: "", documento_html: "" });
    setFormOpen(true);
  };

  const openEdit = (item: GftGuia) => {
    setEditing(item);
    setFormValues({
      nome_guia: item.nome_guia,
      clinica_id: item.clinica_id,
      documento_html: item.documento_html ?? "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!formValues.nome_guia.trim()) {
      showError("Informe o nome da guia.");
      return;
    }
    if (!formValues.clinica_id) {
      showError("Selecione a clínica/hospital.");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const updated = await atualizarGuiaGft(editing.id, {
          nome_guia: formValues.nome_guia,
          clinica_id: formValues.clinica_id,
          documento_html: formValues.documento_html ?? "",
        });
        setGuias((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
        showSuccess("Guia atualizada com sucesso.");
      } else {
        const created = await criarGuiaGft({
          nome_guia: formValues.nome_guia,
          clinica_id: formValues.clinica_id,
          documento_html: formValues.documento_html ?? "",
        });
        setGuias((prev) => [created, ...prev]);
        showSuccess("Guia criada com sucesso.");
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível salvar a guia.";
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: GftGuia) => {
    const ok = window.confirm(
      `Excluir a guia "${item.nome_guia}"? Esta ação não pode ser desfeita.`,
    );
    if (!ok) return;

    try {
      await excluirGuiaGft(item.id);
      setGuias((prev) => prev.filter((g) => g.id !== item.id));
      showSuccess("Guia excluída.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível excluir a guia.";
      showError(message);
    }
  };

  const handleVisualizar = async (item: GftGuia) => {
    const html = item.documento_html ?? "";
    if (!html.trim()) {
      showError("Esta guia não possui HTML cadastrado.");
      return;
    }

    setPreviewTitle(`Visualizar: ${item.nome_guia}`);
    setPreviewHtml(cleanHtmlForPreview(html));
    setPreviewOpen(true);
  };

  const handlePreviewFromForm = () => {
    if (!formValues.documento_html?.trim()) {
      showError("Informe um HTML para pré-visualizar.");
      return;
    }
    setPreviewTitle("Pré-visualização do HTML");
    setPreviewHtml(cleanHtmlForPreview(formValues.documento_html));
    setPreviewOpen(true);
  };

  const openAttach = (item: GftGuia) => {
    setAttachItem(item);
    setAttachFile(null);
    setAttachOpen(true);
  };

  const handleAttach = async () => {
    if (!attachItem) return;
    if (!attachFile) {
      showError("Selecione um arquivo.");
      return;
    }

    setAttachSaving(true);
    try {
      await uploadModeloGft({ guiaId: attachItem.id, file: attachFile });
      const refreshed = await listarGuiasGft();
      setGuias(refreshed);
      showSuccess("Modelo anexado com sucesso.");
      setAttachOpen(false);
      setAttachItem(null);
      setAttachFile(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível anexar o modelo.";
      showError(message);
    } finally {
      setAttachSaving(false);
    }
  };

  const handleAbrirModelo = async (item: GftGuia) => {
    const path = item.modelo_arquivo_path ?? null;
    if (!path) {
      showError("Esta guia ainda não possui modelo anexado.");
      return;
    }

    try {
      const url = await criarModeloSignedUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível abrir o modelo.";
      showError(message);
    }
  };

  return (
    <Card className="h-full rounded-3xl border border-slate-100 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <CardHeader className="border-b border-slate-100 bg-slate-50/80 pb-3 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:text-base">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                <FileText className="h-4 w-4" />
              </span>
              <span>Guias de Faturamento de Honorários (GFT)</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Cadastre guias com HTML e anexe um arquivo modelo.
            </CardDescription>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Total:{" "}
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {guias.length}
              </span>{" "}
              registro(s)
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full min-w-[200px] sm:w-72">
              <Input
                placeholder="Buscar por ID, nome ou clínica/hospital..."
                className="h-9 rounded-full border-slate-200 bg-white px-3 text-xs shadow-sm placeholder:text-slate-400 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="rounded-full bg-indigo-600 px-4 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
              onClick={openNew}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Adicionar guia
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="mt-1 overflow-hidden rounded-b-2xl bg-white/90 dark:bg-slate-900/80">
        {loading ? (
          <p className="px-4 py-6 text-xs text-slate-500 dark:text-slate-400">
            Carregando guias...
          </p>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <TableHead className="px-4 py-3">ID</TableHead>
                  <TableHead className="px-4 py-3">Nome da guia</TableHead>
                  <TableHead className="px-4 py-3">Clínica / Hospital</TableHead>
                  <TableHead className="px-4 py-3">HTML</TableHead>
                  <TableHead className="px-4 py-3">Modelo</TableHead>
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
                      Nenhuma guia cadastrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((g) => {
                    const unidade = clinicaById.get(g.clinica_id);
                    const unidadeLabel = unidade
                      ? `${unidade.nome_fantasia} (${unidade.tipo_unidade === "HOSPITAL" ? "Hospital" : "Clínica"})`
                      : "-";

                    return (
                      <TableRow
                        key={g.id}
                        className="border-b border-slate-50 text-xs hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/60"
                      >
                        <TableCell className="max-w-[180px] truncate px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {g.id}
                        </TableCell>
                        <TableCell className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                          {g.nome_guia}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                              <Building2 className="h-4 w-4" />
                            </span>
                            <span className="flex flex-col">
                              <span className="font-medium text-slate-800 dark:text-slate-100">
                                {unidade?.nome_fantasia ?? "-"}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {unidade?.cidade ?? ""}{unidade?.uf ? ` / ${unidade.uf}` : ""}
                              </span>
                            </span>
                          </span>
                          <span className="mt-1 block text-[11px] text-slate-400">
                            {unidadeLabel}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {g.documento_html?.trim() ? "Cadastrado" : "-"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {g.modelo_arquivo_path ? "Anexado" : "-"}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 rounded-full border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                              onClick={() => handleVisualizar(g)}
                              aria-label="Visualizar HTML"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 rounded-full border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                              onClick={() => openEdit(g)}
                              aria-label="Editar guia"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 rounded-full border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                              onClick={() => openAttach(g)}
                              aria-label="Anexar modelo"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 rounded-full border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                              onClick={() => handleAbrirModelo(g)}
                              aria-label="Abrir modelo"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
                              onClick={() => handleDelete(g)}
                              aria-label="Excluir guia"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

      {/* Form: Nova/Editar */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar guia de GFT" : "Adicionar guia de GFT"}
            </DialogTitle>
            <DialogDescription>
              Informe o nome, selecione a clínica/hospital e cole o HTML do documento.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome da guia</Label>
              <Input
                value={formValues.nome_guia}
                onChange={(e) =>
                  setFormValues((p) => ({ ...p, nome_guia: e.target.value }))
                }
                placeholder="Ex: Guia Honorários Unimed"
                className="rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Clínica / Hospital</Label>
              <Select
                value={formValues.clinica_id}
                onValueChange={(value) =>
                  setFormValues((p) => ({ ...p, clinica_id: value }))
                }
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {clinicas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_fantasia} ({c.tipo_unidade === "HOSPITAL" ? "Hospital" : "Clínica"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>HTML do documento</Label>
            <Textarea
              value={formValues.documento_html ?? ""}
              onChange={(e) =>
                setFormValues((p) => ({ ...p, documento_html: e.target.value }))
              }
              placeholder="Cole aqui o HTML..."
              className="min-h-[220px] rounded-2xl font-mono text-[11px]"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-slate-400">
                Dica: após inserir o HTML, clique em “Executar HTML” para visualizar.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={handlePreviewFromForm}
                  disabled={!formValues.documento_html?.trim()}
                >
                  Executar HTML
                </Button>
                <Button
                  type="button"
                  className="rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
            <DialogDescription>
              Pré-visualização do HTML (scripts são removidos no preview).
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <iframe
              title="preview-html"
              className="h-[70vh] w-full"
              sandbox="allow-forms allow-modals allow-popups allow-same-origin"
              srcDoc={previewHtml}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Anexar modelo */}
      <Dialog
        open={attachOpen}
        onOpenChange={(open) => {
          setAttachOpen(open);
          if (!open) {
            setAttachItem(null);
            setAttachFile(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Anexar arquivo modelo</DialogTitle>
            <DialogDescription>
              Selecione o arquivo que será usado como modelo para esta guia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Arquivo</Label>
            <Input
              type="file"
              onChange={(e) => setAttachFile(e.target.files?.[0] ?? null)}
              className="rounded-2xl"
            />
            <p className="text-[11px] text-slate-400">
              Guia: <span className="font-medium">{attachItem?.nome_guia}</span>
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setAttachOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={handleAttach}
              disabled={attachSaving}
            >
              {attachSaving ? "Anexando..." : "Anexar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default GftList;
