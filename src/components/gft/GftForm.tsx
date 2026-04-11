import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { 
  X, 
  Upload, 
  Play, 
  Code, 
  FileText, 
  Building2, 
  FileCode,
  Paperclip,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Copy,
  Check
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showError, showSuccess } from "@/utils/toast";
import { listarClinicas, type Clinica } from "@/services/clinicas-service";
import {
  criarGuiaFaturamento,
  atualizarGuiaFaturamento,
  uploadArquivoModelo,
  type GuiaFaturamentoHonorarios,
  type GftInput,
} from "@/services/gft-service";

interface GftFormProps {
  editingItem: GuiaFaturamentoHonorarios | null;
  onCancel: () => void;
  onSuccess: () => void;
}

interface FormData {
  nome_guia: string;
  clinicas_ids: string[];
  html_documento: string;
}

const GftForm: React.FC<GftFormProps> = ({
  editingItem,
  onCancel,
  onSuccess,
}) => {
  const [salvando, setSalvando] = useState(false);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [carregandoClinicas, setCarregandoClinicas] = useState(false);
  const [arquivoModelo, setArquivoModelo] = useState<File | null>(null);
  const [previewHtmlOpen, setPreviewHtmlOpen] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState("");
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      nome_guia: "",
      clinicas_ids: [],
      html_documento: "",
    },
  });

  const htmlDocumento = watch("html_documento");
  const nomeGuia = watch("nome_guia");
  const clinicasIds = watch("clinicas_ids") || [];

  const selectedClinicas = clinicas.filter((c) => clinicasIds.includes(c.id));

  useEffect(() => {
    const carregarClinicas = async () => {
      setCarregandoClinicas(true);
      try {
        const data = await listarClinicas();
        setClinicas(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Não foi possível carregar clínicas/hospitais.";
        showError(message);
      } finally {
        setCarregandoClinicas(false);
      }
    };

    void carregarClinicas();
  }, []);

  useEffect(() => {
    if (editingItem) {
      reset({
        nome_guia: editingItem.nome_guia || "",
        clinicas_ids: editingItem.clinicas_ids || [],
        html_documento: editingItem.html_documento || "",
      });
    } else {
      reset({
        nome_guia: "",
        clinicas_ids: [],
        html_documento: "",
      });
    }
    setArquivoModelo(null);
  }, [editingItem, reset]);

  const onSubmit = async (data: FormData) => {
    setSalvando(true);
    try {
      
      const payload: GftInput = {
        nome_guia: data.nome_guia,
        clinicas_ids: data.clinicas_ids,
        html_documento: data.html_documento || null,
        arquivo_modelo_path: editingItem?.arquivo_modelo_path || null,
      };

      let guia: GuiaFaturamentoHonorarios;

      if (editingItem) {
        guia = await atualizarGuiaFaturamento(editingItem.id, payload);
        showSuccess("Guia de faturamento atualizada com sucesso.");
      } else {
        guia = await criarGuiaFaturamento(payload);
        showSuccess("Guia de faturamento cadastrada com sucesso.");
      }

      // Upload do arquivo modelo se houver
      if (arquivoModelo) {
        await uploadArquivoModelo(arquivoModelo, guia.id);
        showSuccess("Arquivo modelo enviado com sucesso.");
      }

      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível salvar a guia de faturamento.";
      showError(message);
    } finally {
      setSalvando(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivoModelo(file);
    }
  };

  const handlePreviewHtml = () => {
    setHtmlPreview(htmlDocumento);
    setPreviewHtmlOpen(true);
  };

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlDocumento);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError("Não foi possível copiar o código.");
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "📄";
    if (ext === "doc" || ext === "docx") return "📝";
    if (ext === "png" || ext === "jpg" || ext === "jpeg") return "🖼️";
    return "📎";
  };

  return (
    <>
      <Card className="mb-4 overflow-hidden rounded-3xl border-slate-100 bg-white/95 shadow-lg dark:border-slate-800 dark:bg-slate-900/95">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 px-6 py-4 dark:from-violet-500/20 dark:via-purple-500/20 dark:to-fuchsia-500/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {editingItem ? "Editar Guia de Faturamento" : "Nova Guia de Faturamento"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Preencha os dados da guia de faturamento de honorários (GFT)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={salvando}
                onClick={onCancel}
                className="rounded-full"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                form="gft-form"
                disabled={salvando}
                className="rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md hover:from-violet-700 hover:to-purple-700"
              >
                {salvando ? "Salvando..." : editingItem ? "Salvar alterações" : "Salvar guia"}
              </Button>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <form
            id="gft-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* Seção: Informações Básicas */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-800/30">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
                  <FileText className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Informações Básicas
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Nome da Guia */}
                <div className="space-y-2">
                  <Label htmlFor="nome_guia" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Nome da Guia <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="nome_guia"
                    placeholder="Ex: Guia TISS - Consulta Eletiva"
                    {...register("nome_guia", { required: "Nome da guia é obrigatório" })}
                    className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 transition-all focus:border-violet-500 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  {errors.nome_guia && (
                    <p className="text-xs text-rose-500">{errors.nome_guia.message}</p>
                  )}
                </div>

                {/* Clínica/Hospital */}
                <div className="space-y-2">
                  <Label htmlFor="clinicas_ids" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Clínicas / Hospitais
                  </Label>
                  <Select
                    value="none"
                    onValueChange={(val) => {
                      if (val === "none") {
                        setValue("clinicas_ids", []);
                      } else if (val) {
                        const current = watch("clinicas_ids") || [];
                        if (!current.includes(val)) {
                          setValue("clinicas_ids", [...current, val], { shouldDirty: true });
                        }
                      }
                    }}
                    disabled={carregandoClinicas}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                      <SelectValue placeholder="Selecione para adicionar clínica/hospital" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-slate-400">Nenhum selecionado (limpar)</span>
                      </SelectItem>
                      {clinicas
                        .filter((c) => !(watch("clinicas_ids") || []).includes(c.id))
                        .map((clinica) => (
                        <SelectItem key={clinica.id} value={clinica.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>{clinica.nome_fantasia}</span>
                            <Badge variant="outline" className="ml-1 text-[10px]">
                              {clinica.tipo_unidade === "HOSPITAL" ? "Hospital" : "Clínica"}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Display selected clinics */}
                  {selectedClinicas.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedClinicas.map((clinica) => (
                        <div
                          key={clinica.id}
                          className="flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-1.5 text-xs text-violet-700 border border-violet-100 dark:border-violet-800/30 dark:bg-violet-900/30 dark:text-violet-300"
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          <span>
                            {clinica.nome_fantasia} - {clinica.cidade}/{clinica.uf}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setValue(
                                "clinicas_ids",
                                (watch("clinicas_ids") || []).filter((id) => id !== clinica.id),
                                { shouldDirty: true }
                              );
                            }}
                            className="ml-1 rounded-full p-0.5 hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Seção: Código HTML */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-800/30">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <FileCode className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Código HTML do Documento
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Insira o código HTML que será usado para gerar o documento da guia
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {htmlDocumento && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 rounded-full text-xs"
                        onClick={handleCopyHtml}
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copiar
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 rounded-full text-xs"
                        onClick={() => setShowLivePreview(!showLivePreview)}
                      >
                        {showLivePreview ? (
                          <>
                            <EyeOff className="h-3 w-3" />
                            Ocultar Preview
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3" />
                            Preview ao Vivo
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="h-8 gap-1.5 rounded-full bg-emerald-600 text-xs hover:bg-emerald-700"
                        onClick={handlePreviewHtml}
                      >
                        <Play className="h-3 w-3" />
                        Executar HTML
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <Tabs defaultValue="editor" className="w-full">
                <TabsList className="mb-3 h-9 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                  <TabsTrigger value="editor" className="rounded-lg text-xs">
                    <Code className="mr-1.5 h-3 w-3" />
                    Editor
                  </TabsTrigger>
                  {htmlDocumento && (
                    <TabsTrigger value="preview" className="rounded-lg text-xs">
                      <Eye className="mr-1.5 h-3 w-3" />
                      Preview
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="editor" className="mt-0">
                  <div className={`grid gap-4 ${showLivePreview && htmlDocumento ? "lg:grid-cols-2" : ""}`}>
                    <div className="relative">
                      <Textarea
                        id="html_documento"
                        placeholder={`<!DOCTYPE html>
<html>
<head>
  <title>Guia de Faturamento</title>
  <style>
    /* Seus estilos aqui */
  </style>
</head>
<body>
  <!-- Conteúdo da guia -->
</body>
</html>`}
                        {...register("html_documento")}
                        className="min-h-[350px] resize-none rounded-xl border-slate-200 bg-white font-mono text-xs leading-relaxed text-slate-900 transition-all focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                      {htmlDocumento && (
                        <div className="absolute bottom-3 right-3 rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {htmlDocumento.length} caracteres
                        </div>
                      )}
                    </div>

                    {showLivePreview && htmlDocumento && (
                      <div className="relative rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                          <span className="text-[11px] font-medium text-slate-500">Preview ao Vivo</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              setHtmlPreview(htmlDocumento);
                              setPreviewHtmlOpen(true);
                            }}
                          >
                            <Maximize2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <iframe
                          srcDoc={htmlDocumento}
                          title="Live Preview"
                          className="h-[310px] w-full border-0"
                          sandbox="allow-same-origin"
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>

                {htmlDocumento && (
                  <TabsContent value="preview" className="mt-0">
                    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 dark:border-slate-800">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          Visualização do Documento
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          onClick={handlePreviewHtml}
                        >
                          <Maximize2 className="h-3 w-3" />
                          Tela cheia
                        </Button>
                      </div>
                      <iframe
                        srcDoc={htmlDocumento}
                        title="Preview"
                        className="h-[350px] w-full border-0"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </div>

            {/* Seção: Arquivo Modelo */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-800/30">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
                  <Paperclip className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Arquivo Modelo
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Anexe um arquivo modelo para referência (opcional)
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label
                  htmlFor="arquivo_modelo"
                  className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-white px-6 py-8 text-center transition-all hover:border-amber-400 hover:bg-amber-50/50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-amber-600 dark:hover:bg-amber-900/20"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {arquivoModelo
                        ? "Arquivo selecionado"
                        : editingItem?.arquivo_modelo_path
                          ? "Clique para substituir o arquivo"
                          : "Clique para selecionar um arquivo"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      PDF, DOC, DOCX, PNG ou JPG (máx. 50MB)
                    </p>
                  </div>
                </label>
                <input
                  id="arquivo_modelo"
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Arquivo selecionado */}
                {arquivoModelo && (
                  <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/30">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getFileIcon(arquivoModelo.name)}</span>
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {arquivoModelo.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {(arquivoModelo.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-500 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30"
                      onClick={() => setArquivoModelo(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Arquivo existente */}
                {editingItem?.arquivo_modelo_path && !arquivoModelo && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-900/30">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-300">
                      Arquivo modelo já anexado
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Resumo */}
            {(nomeGuia || selectedClinicas.length > 0 || htmlDocumento || arquivoModelo) && (
              <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50 p-5 dark:border-violet-900 dark:from-violet-900/20 dark:to-purple-900/20">
                <h3 className="mb-3 text-sm font-semibold text-violet-800 dark:text-violet-200">
                  Resumo da Guia
                </h3>
                <div className="grid gap-3 text-xs md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg bg-white/70 px-3 py-2 dark:bg-slate-800/50">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Nome</p>
                    <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">
                      {nomeGuia || "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/70 px-3 py-2 dark:bg-slate-800/50">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Clínicas/Hospitais</p>
                    <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-100 truncate" title={selectedClinicas.map((c) => c.nome_fantasia).join(", ")}>
                      {selectedClinicas.length > 0
                        ? `${selectedClinicas.length} selecionado(s)`
                        : "Não vinculado"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/70 px-3 py-2 dark:bg-slate-800/50">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">HTML</p>
                    <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">
                      {htmlDocumento ? `${htmlDocumento.length} caracteres` : "Não definido"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/70 px-3 py-2 dark:bg-slate-800/50">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Arquivo</p>
                    <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">
                      {arquivoModelo
                        ? arquivoModelo.name
                        : editingItem?.arquivo_modelo_path
                          ? "Anexado"
                          : "Não anexado"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Dialog de Preview HTML em Tela Cheia */}
      <Dialog open={previewHtmlOpen} onOpenChange={setPreviewHtmlOpen}>
        <DialogContent className={`overflow-hidden ${isFullscreen ? "h-screen max-h-screen w-screen max-w-full rounded-none" : "max-h-[90vh] max-w-5xl"}`}>
          <DialogHeader className="border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <Code className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="text-base">Preview do HTML</DialogTitle>
                  <DialogDescription className="text-xs">
                    Visualização do código HTML renderizado
                  </DialogDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-full text-xs"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-3 w-3" />
                    Sair da tela cheia
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3 w-3" />
                    Tela cheia
                  </>
                )}
              </Button>
            </div>
          </DialogHeader>
          <div className={`overflow-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${isFullscreen ? "h-[calc(100vh-120px)]" : "max-h-[70vh]"}`}>
            <iframe
              srcDoc={htmlPreview}
              title="Preview HTML"
              className={`w-full border-0 ${isFullscreen ? "h-full" : "h-[600px]"}`}
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GftForm;
