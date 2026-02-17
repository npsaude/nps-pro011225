import React, { useState } from "react";
import {
  Eye,
  Pencil,
  Trash2,
  Plus,
  Paperclip,
  Download,
  Code,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  type GuiaFaturamentoHonorarios,
  excluirGuiaFaturamento,
  getArquivoModeloUrl,
  uploadArquivoModelo,
} from "@/services/gft-service";

interface GftListProps {
  items: GuiaFaturamentoHonorarios[];
  isLoading: boolean;
  onNovaGuia: () => void;
  onEditar: (item: GuiaFaturamentoHonorarios) => void;
  onRefresh: () => void;
}

const GftList: React.FC<GftListProps> = ({
  items,
  isLoading,
  onNovaGuia,
  onEditar,
  onRefresh,
}) => {
  const [viewItem, setViewItem] = useState<GuiaFaturamentoHonorarios | null>(null);
  const [previewHtmlOpen, setPreviewHtmlOpen] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState("");
  const [deleteItem, setDeleteItem] = useState<GuiaFaturamentoHonorarios | null>(null);
  const [processando, setProcessando] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const handleVisualizar = (item: GuiaFaturamentoHonorarios) => {
    setViewItem(item);
  };

  const handlePreviewHtml = (item: GuiaFaturamentoHonorarios) => {
    if (item.html_documento) {
      setHtmlPreview(item.html_documento);
      setPreviewHtmlOpen(true);
    }
  };

  const handleExcluir = async () => {
    if (!deleteItem) return;

    setProcessando(true);
    try {
      await excluirGuiaFaturamento(deleteItem.id);
      showSuccess("Guia de faturamento excluída com sucesso.");
      setDeleteItem(null);
      onRefresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível excluir a guia de faturamento.";
      showError(message);
    } finally {
      setProcessando(false);
    }
  };

  const handleDownloadArquivo = async (item: GuiaFaturamentoHonorarios) => {
    if (!item.arquivo_modelo_path) return;

    try {
      const url = await getArquivoModeloUrl(item.arquivo_modelo_path);
      window.open(url, "_blank");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível baixar o arquivo.";
      showError(message);
    }
  };

  const handleUploadArquivo = async (
    e: React.ChangeEvent<HTMLInputElement>,
    item: GuiaFaturamentoHonorarios
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(item.id);
    try {
      await uploadArquivoModelo(file, item.id);
      showSuccess("Arquivo modelo enviado com sucesso.");
      onRefresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o arquivo.";
      showError(message);
    } finally {
      setUploadingId(null);
      e.target.value = "";
    }
  };

  return (
    <>
      <Card className="rounded-3xl border border-slate-100 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-semibold sm:text-base">
                Guias de Faturamento de Honorários
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                Gerencie os modelos de guias para faturamento.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Total:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {items.length}
                </span>{" "}
                registro(s)
              </p>
              <Button
                type="button"
                size="sm"
                className="inline-flex items-center gap-2 rounded-full bg-[#135bec] px-3 text-xs font-medium text-white shadow-sm hover:bg-[#0f4ac0]"
                onClick={onNovaGuia}
              >
                <Plus className="h-4 w-4" />
                Adicionar Guia
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="max-h-[500px] overflow-auto rounded-2xl border border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/70">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <TableHead className="whitespace-nowrap px-3 py-2">
                    ID
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">
                    Nome da Guia
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">
                    Clínica / Hospital
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">
                    HTML
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">
                    Arquivo
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2 text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="px-3 py-5 text-center text-xs text-slate-500 dark:text-slate-300"
                    >
                      Carregando guias de faturamento...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="px-3 py-5 text-center text-xs text-slate-500 dark:text-slate-300"
                    >
                      Nenhuma guia de faturamento cadastrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="border-b border-slate-100 text-xs hover:bg-white dark:border-slate-800 dark:hover:bg-slate-800/70"
                    >
                      <TableCell className="px-3 py-2 font-mono text-[10px] text-slate-400">
                        {item.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="px-3 py-2 font-medium text-slate-800 dark:text-slate-50">
                        {item.nome_guia}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {item.clinica ? (
                          <div className="flex flex-col">
                            <span className="text-slate-700 dark:text-slate-200">
                              {item.clinica.nome_fantasia}
                            </span>
                            <Badge
                              variant="outline"
                              className="mt-0.5 w-fit text-[10px]"
                            >
                              {item.clinica.tipo_unidade === "HOSPITAL"
                                ? "Hospital"
                                : "Clínica"}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {item.html_documento ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-[10px]"
                            onClick={() => handlePreviewHtml(item)}
                          >
                            <Play className="h-3 w-3" />
                            Executar
                          </Button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {item.arquivo_modelo_path ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                            Anexado
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-slate-400"
                          >
                            Sem arquivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            onClick={() => handleVisualizar(item)}
                            aria-label="Visualizar guia"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            onClick={() => onEditar(item)}
                            aria-label="Editar guia"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <label
                            className="relative"
                            aria-label="Anexar documento"
                          >
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 rounded-full border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                              disabled={uploadingId === item.id}
                              asChild
                            >
                              <span>
                                <Paperclip className="h-3.5 w-3.5" />
                              </span>
                            </Button>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                              className="absolute inset-0 cursor-pointer opacity-0"
                              onChange={(e) => handleUploadArquivo(e, item)}
                              disabled={uploadingId === item.id}
                            />
                          </label>
                          {item.arquivo_modelo_path && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 rounded-full border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                              onClick={() => handleDownloadArquivo(item)}
                              aria-label="Baixar arquivo modelo"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
                            onClick={() => setDeleteItem(item)}
                            aria-label="Excluir guia"
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
        </CardContent>
      </Card>

      {/* Dialog de Visualização */}
      <Dialog
        open={!!viewItem}
        onOpenChange={(open) => {
          if (!open) setViewItem(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Guia de Faturamento</DialogTitle>
            <DialogDescription>
              Informações completas da guia selecionada.
            </DialogDescription>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">ID</p>
                  <p className="font-mono text-xs text-slate-700 dark:text-slate-200">
                    {viewItem.id}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Nome da Guia</p>
                  <p className="font-medium text-slate-800 dark:text-slate-50">
                    {viewItem.nome_guia}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  Clínica / Hospital
                </p>
                <p className="text-slate-700 dark:text-slate-200">
                  {viewItem.clinica?.nome_fantasia || "Não vinculado"}
                  {viewItem.clinica && (
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      {viewItem.clinica.tipo_unidade === "HOSPITAL"
                        ? "Hospital"
                        : "Clínica"}
                    </Badge>
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  Arquivo Modelo
                </p>
                {viewItem.arquivo_modelo_path ? (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                      Anexado
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handleDownloadArquivo(viewItem)}
                    >
                      <Download className="h-3 w-3" />
                      Baixar
                    </Button>
                  </div>
                ) : (
                  <p className="text-slate-400">Nenhum arquivo anexado</p>
                )}
              </div>

              {viewItem.html_documento && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">
                      HTML do Documento
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handlePreviewHtml(viewItem)}
                    >
                      <Play className="h-3 w-3" />
                      Executar HTML
                    </Button>
                  </div>
                  <pre className="max-h-48 overflow-auto rounded-lg bg-slate-100 p-3 font-mono text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {viewItem.html_documento}
                  </pre>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">Criado em</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {new Date(viewItem.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Atualizado em
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {new Date(viewItem.updated_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Preview HTML */}
      <Dialog open={previewHtmlOpen} onOpenChange={setPreviewHtmlOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Preview do HTML
            </DialogTitle>
            <DialogDescription>
              Visualização do código HTML renderizado.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <iframe
              srcDoc={htmlPreview}
              title="Preview HTML"
              className="h-[500px] w-full border-0"
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog de Exclusão */}
      <AlertDialog
        open={!!deleteItem}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a guia "{deleteItem?.nome_guia}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluir}
              disabled={processando}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {processando ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default GftList;
