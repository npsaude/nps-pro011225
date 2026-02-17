import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { X, Upload, Play, Code } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  clinica_id: string;
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
      clinica_id: "",
      html_documento: "",
    },
  });

  const htmlDocumento = watch("html_documento");

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
        clinica_id: editingItem.clinica_id || "",
        html_documento: editingItem.html_documento || "",
      });
    } else {
      reset({
        nome_guia: "",
        clinica_id: "",
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
        clinica_id: data.clinica_id || null,
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

  return (
    <>
      <Card className="mb-4 border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/70">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold">
                {editingItem ? "Editar guia de faturamento" : "Nova guia de faturamento"}
              </CardTitle>
              <CardDescription className="text-xs">
                Preencha os dados da guia de faturamento de honorários.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={salvando}
                onClick={onCancel}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                form="gft-form"
                disabled={salvando}
              >
                {editingItem ? "Salvar alterações" : "Salvar guia"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            id="gft-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 text-sm"
          >
            {/* Nome da Guia */}
            <div className="space-y-1.5">
              <Label htmlFor="nome_guia" className="text-xs font-medium">
                Nome da Guia *
              </Label>
              <Input
                id="nome_guia"
                placeholder="Ex: Guia TISS - Consulta"
                {...register("nome_guia", { required: "Nome da guia é obrigatório" })}
                className="h-9 text-sm"
              />
              {errors.nome_guia && (
                <p className="text-xs text-rose-500">{errors.nome_guia.message}</p>
              )}
            </div>

            {/* Clínica/Hospital */}
            <div className="space-y-1.5">
              <Label htmlFor="clinica_id" className="text-xs font-medium">
                Clínica / Hospital
              </Label>
              <Select
                value={watch("clinica_id") || ""}
                onValueChange={(value) => setValue("clinica_id", value)}
                disabled={carregandoClinicas}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione uma clínica ou hospital" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {clinicas.map((clinica) => (
                    <SelectItem key={clinica.id} value={clinica.id}>
                      {clinica.nome_fantasia} ({clinica.tipo_unidade === "HOSPITAL" ? "Hospital" : "Clínica"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* HTML do Documento */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="html_documento" className="text-xs font-medium">
                  HTML do Documento
                </Label>
                {htmlDocumento && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={handlePreviewHtml}
                  >
                    <Play className="h-3 w-3" />
                    Executar HTML
                  </Button>
                )}
              </div>
              <Textarea
                id="html_documento"
                placeholder="Cole aqui o código HTML do documento..."
                {...register("html_documento")}
                className="min-h-[200px] font-mono text-xs"
              />
              <p className="text-[11px] text-slate-400">
                Insira o código HTML que será usado para gerar o documento da guia.
              </p>
            </div>

            {/* Arquivo Modelo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Arquivo Modelo</Label>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="arquivo_modelo"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-xs text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700"
                >
                  <Upload className="h-4 w-4" />
                  <span>
                    {arquivoModelo
                      ? arquivoModelo.name
                      : editingItem?.arquivo_modelo_path
                        ? "Substituir arquivo existente"
                        : "Selecionar arquivo"}
                  </span>
                </label>
                <input
                  id="arquivo_modelo"
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {arquivoModelo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setArquivoModelo(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {editingItem?.arquivo_modelo_path && !arquivoModelo && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  ✓ Arquivo modelo já anexado
                </p>
              )}
              <p className="text-[11px] text-slate-400">
                Formatos aceitos: PDF, DOC, DOCX, PNG, JPG (máx. 50MB)
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

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
    </>
  );
};

export default GftForm;
