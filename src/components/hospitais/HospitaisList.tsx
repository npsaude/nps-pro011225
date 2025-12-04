import { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  Pencil,
  Mail,
  Phone,
  FileText,
  Paperclip,
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
  listarHospitais,
  criarHospital,
  atualizarHospital,
  listarDocumentosEspecificos,
  uploadDocumentoEspecifico,
  type Hospital,
  type HospitalInput,
  type HospitalDocumentoEspecifico,
} from "@/services/hospitais-service";
import HospitalForm from "@/components/hospitais/HospitalForm";
import { showError, showSuccess } from "@/utils/toast";

const HospitaisList = () => {
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [filtered, setFiltered] = useState<Hospital[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Hospital | null>(null);
  const [saving, setSaving] = useState(false);

  // Documentos específicos
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(
    null,
  );
  const [documentos, setDocumentos] = useState<HospitalDocumentoEspecifico[]>(
    [],
  );
  const [docsLoading, setDocsLoading] = useState(false);
  const [docNome, setDocNome] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docSaving, setDocSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await listarHospitais();
        setHospitais(data);
        setFiltered(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erro ao carregar hospitais.";
        showError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(hospitais);
      return;
    }
    const term = search.toLowerCase();
    setFiltered(
      hospitais.filter((h) => {
        return (
          h.razao_social.toLowerCase().includes(term) ||
          h.nome_fantasia.toLowerCase().includes(term) ||
          (h.cnpj ?? "").toLowerCase().includes(term) ||
          (h.cidade ?? "").toLowerCase().includes(term)
        );
      }),
    );
  }, [search, hospitais]);

  const openNew = () => {
    setEditing(null);
    setSelectedHospital(null);
    setDocumentos([]);
    setDocNome("");
    setDocFile(null);
    setDialogOpen(true);
  };

  const openEdit = async (hospital: Hospital) => {
    setEditing(hospital);
    setDialogOpen(true);
    setSelectedHospital(hospital);
    setDocsLoading(true);
    setDocumentos([]);
    setDocNome("");
    setDocFile(null);

    try {
      const docs = await listarDocumentosEspecificos(hospital.id);
      setDocumentos(docs);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os documentos específicos.";
      showError(message);
    } finally {
      setDocsLoading(false);
    }
  };

  const handleSubmit = async (values: HospitalInput) => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await atualizarHospital(editing.id, values);
        setHospitais((prev) =>
          prev.map((h) => (h.id === updated.id ? updated : h)),
        );
        showSuccess("Hospital atualizado com sucesso.");
      } else {
        const created = await criarHospital(values);
        setHospitais((prev) => [...prev, created]);
        showSuccess("Hospital cadastrado com sucesso.");
      }
      setDialogOpen(false);
      setEditing(null);
      setSelectedHospital(null);
      setDocumentos([]);
      setDocNome("");
      setDocFile(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o hospital.";
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const openDocsDialog = async (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setDocsLoading(true);
    setDocNome("");
    setDocFile(null);
    try {
      const docs = await listarDocumentosEspecificos(hospital.id);
      setDocumentos(docs);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os documentos específicos.";
      showError(message);
    } finally {
      setDocsLoading(false);
    }
  };

  const handleDocFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setDocFile(null);
      return;
    }
    setDocFile(file);
  };

  const handleUploadDocumento = async () => {
    if (!selectedHospital) {
      showError("Selecione um hospital antes de enviar o documento.");
      return;
    }
    if (!docNome.trim()) {
      showError("Informe o nome do documento específico.");
      return;
    }
    if (!docFile) {
      showError("Selecione um arquivo para o documento.");
      return;
    }

    setDocSaving(true);
    try {
      const novo = await uploadDocumentoEspecifico(
        selectedHospital.id,
        docNome.trim(),
        docFile,
      );
      setDocumentos((prev) => [...prev, novo]);
      setDocNome("");
      setDocFile(null);
      showSuccess("Documento específico enviado com sucesso.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o documento específico.";
      showError(message);
    } finally {
      setDocSaving(false);
    }
  };

  return (
    <Card className="h-full rounded-3xl border border-slate-100 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <CardHeader className="border-b border-slate-100 bg-slate-50/80 pb-3 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:text-base">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                <Building2 className="h-4 w-4" />
              </span>
              <span>Hospitais</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Cadastro de hospitais e seus documentos específicos para uso nas SADTs e faturamento.
            </CardDescription>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Total:{" "}
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {hospitais.length}
              </span>{" "}
              registro(s)
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full min-w-[200px] sm:w-60">
              <div className="relative">
                <Input
                  placeholder="Buscar por nome, CNPJ, cidade..."
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
              Novo hospital
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="mt-1 overflow-hidden rounded-b-2xl bg-white/90 dark:bg-slate-900/80">
        {loading ? (
          <p className="px-4 py-6 text-xs text-slate-500 dark:text-slate-400">
            Carregando hospitais...
          </p>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <TableHead className="px-4 py-3">Razão social</TableHead>
                  <TableHead className="px-4 py-3">Nome fantasia</TableHead>
                  <TableHead className="px-4 py-3">CNPJ</TableHead>
                  <TableHead className="px-4 py-3">Cidade / UF</TableHead>
                  <TableHead className="px-4 py-3">
                    Contato faturamento
                  </TableHead>
                  <TableHead className="px-4 py-3">
                    Documentos específicos
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
                      colSpan={7}
                      className="px-4 py-6 text-center text-xs text-slate-400"
                    >
                      Nenhum hospital cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((h) => (
                    <TableRow
                      key={h.id}
                      className="border-b border-slate-50 text-xs hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/60"
                    >
                      <TableCell className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                        {h.razao_social}
                        {h.nome_rede && (
                          <span className="mt-0.5 block text-[11px] text-slate-400">
                            Rede: {h.nome_rede}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {h.nome_fantasia}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {h.cnpj}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {h.cidade} / {h.uf}
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          {h.bairro}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-medium">
                            {h.nome_contato_faturamento || "-"}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            {h.email_contato_faturamento && (
                              <>
                                <Mail className="h-3 w-3" />
                                <span>{h.email_contato_faturamento}</span>
                              </>
                            )}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            {h.telefone_contato_faturamento && (
                              <>
                                <Phone className="h-3 w-3" />
                                <span>{h.telefone_contato_faturamento}</span>
                              </>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 rounded-full px-2 text-[11px]"
                          onClick={() => void openEdit(h)}
                        >
                          <Paperclip className="mr-1.5 h-3 w-3" />
                          Gerenciar
                        </Button>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
                          onClick={() => openEdit(h)}
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

        {/* Diálogo de cadastro/edição de hospital */}
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditing(null);
              setSelectedHospital(null);
              setDocumentos([]);
              setDocNome("");
              setDocFile(null);
            }
          }}
        >
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar hospital" : "Novo hospital"}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do hospital para uso nas SADTs e no faturamento.
              </DialogDescription>
            </DialogHeader>

            <HospitalForm
              hospital={editing}
              onSubmit={handleSubmit}
              isSubmitting={saving}
            />

            {/* Seção de documentos específicos no final do cadastro */}
            <div className="mt-6 space-y-4 text-xs sm:text-sm">
              <div>
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  Documentos específicos
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Cadastre documentos específicos do hospital (protocolos,
                  modelos de contrato, etc.). Os arquivos serão salvos na pasta{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    documentos_especificos/Hospitais
                  </code>{" "}
                  no storage do Supabase.
                </p>
              </div>

              {selectedHospital ? (
                <>
                  {/* Upload */}
                  <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
                    <p className="mb-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                      Novo documento específico
                    </p>
                    <div className="grid gap-2 sm:grid-cols-[1.5fr_1.5fr_auto]">
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-500 dark:text-slate-400">
                          Nome do documento
                        </label>
                        <Input
                          value={docNome}
                          onChange={(e) => setDocNome(e.target.value)}
                          placeholder="Ex.: Protocolo cirúrgico"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-500 dark:text-slate-400">
                          Arquivo
                        </label>
                        <input
                          type="file"
                          onChange={handleDocFileChange}
                          className="block h-8 w-full cursor-pointer text-[11px] text-slate-600 file:mr-2 file:h-8 file:rounded-full file:border-0 file:bg-slate-200 file:px-3 file:text-[11px] file:font-medium file:text-slate-700 hover:file:bg-slate-300 dark:text-slate-200 dark:file:bg-slate-700 dark:file:text-slate-100 dark:hover:file:bg-slate-600"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          size="sm"
                          disabled={docSaving}
                          className="h-8 rounded-full px-3 text-[11px]"
                          onClick={() => void handleUploadDocumento()}
                        >
                          {docSaving ? "Enviando..." : "Enviar"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Lista de documentos */}
                  <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
                    <p className="mb-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                      Documentos cadastrados
                    </p>
                    {docsLoading ? (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Carregando documentos...
                      </p>
                    ) : documentos.length === 0 ? (
                      <p className="text-[11px] text-slate-400">
                        Nenhum documento específico cadastrado para este hospital.
                      </p>
                    ) : (
                      <div className="max-h-60 space-y-2 overflow-auto">
                        {documentos.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                                <FileText className="h-3.5 w-3.5" />
                              </span>
                              <div className="flex flex-col">
                                <span className="text-[11px] font-medium">
                                  {doc.nome_documento}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {doc.file_path}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-2xl bg-slate-50 p-3 text-[11px] text-slate-500 ring-1 ring-dashed ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700">
                  Para anexar documentos específicos, primeiro salve o hospital.
                  Depois, reabra este cadastro na opção{" "}
                  <span className="font-semibold">Editar hospital</span> para
                  liberar o envio de arquivos.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default HospitaisList;