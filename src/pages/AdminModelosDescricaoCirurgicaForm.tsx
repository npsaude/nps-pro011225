import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  X,
  Scissors,
  Loader2,
  ImageIcon,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";

interface FormData {
  nome: string;
  descricao: string;
  instrucao_ia: string;
  ativo: boolean;
}

interface ImageState {
  file: File | null;
  previewUrl: string | null;
  existingPath: string | null;
  signedUrl: string | null;
}

const emptyImage = (): ImageState => ({
  file: null,
  previewUrl: null,
  existingPath: null,
  signedUrl: null,
});

export default function AdminModelosDescricaoCirurgicaForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [form, setForm] = useState<FormData>({
    nome: "",
    descricao: "",
    instrucao_ia: "",
    ativo: true,
  });
  const [imgDescricao, setImgDescricao] = useState<ImageState>(emptyImage());
  const [imgDestaque, setImgDestaque] = useState<ImageState>(emptyImage());
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  const refDescricao = useRef<HTMLInputElement>(null);
  const refDestaque = useRef<HTMLInputElement>(null);

  // Carregar dados existentes ao editar
  useEffect(() => {
    if (!isEditing || !id) return;

    const load = async () => {
      const { data, error } = await supabase
        .from("modelos_descricao_cirurgica")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        showError("Modelo não encontrado.");
        navigate("/admin/modelos-descricao-cirurgica");
        return;
      }

      const row = data as any;
      setForm({
        nome: row.nome ?? "",
        descricao: row.descricao ?? "",
        instrucao_ia: row.instrucao_ia ?? "",
        ativo: row.ativo ?? true,
      });

      // Carregar URLs assinadas das imagens existentes
      if (row.imagem_descricao_path) {
        const { data: signed } = await supabase.storage
          .from("NPS-pro")
          .createSignedUrl(row.imagem_descricao_path, 3600);
        setImgDescricao({
          file: null,
          previewUrl: null,
          existingPath: row.imagem_descricao_path,
          signedUrl: signed?.signedUrl ?? null,
        });
      }

      if (row.imagem_destaque_path) {
        const { data: signed } = await supabase.storage
          .from("NPS-pro")
          .createSignedUrl(row.imagem_destaque_path, 3600);
        setImgDestaque({
          file: null,
          previewUrl: null,
          existingPath: row.imagem_destaque_path,
          signedUrl: signed?.signedUrl ?? null,
        });
      }

      setLoading(false);
    };

    void load();
  }, [id, isEditing, navigate]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<ImageState>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showError("Selecione apenas arquivos de imagem (PNG, JPEG, WEBP).");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setter((prev) => ({
      ...prev,
      file,
      previewUrl,
    }));
    e.target.value = "";
  };

  const handleRemoveImage = (
    setter: React.Dispatch<React.SetStateAction<ImageState>>
  ) => {
    setter(emptyImage());
  };

  const uploadImage = async (
    img: ImageState,
    folder: string
  ): Promise<string | null> => {
    // Se tem arquivo novo, fazer upload
    if (img.file) {
      const ext = img.file.name.split(".").pop() ?? "png";
      const timestamp = Date.now();
      const path = `modelos_descricao_cirurgica/${folder}/${timestamp}.${ext}`;

      const { error } = await supabase.storage
        .from("NPS-pro")
        .upload(path, img.file, {
          cacheControl: "3600",
          upsert: false,
          contentType: img.file.type,
        });

      if (error) {
        throw new Error(`Erro ao fazer upload da imagem: ${error.message}`);
      }
      return path;
    }

    // Se não tem arquivo novo mas tem path existente, manter
    if (img.existingPath) return img.existingPath;

    // Sem imagem
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nome.trim()) {
      showError("O nome do modelo é obrigatório.");
      return;
    }

    setSaving(true);

    try {
      // Upload das imagens
      const [descricaoPath, destaquePath] = await Promise.all([
        uploadImage(imgDescricao, "descricao"),
        uploadImage(imgDestaque, "destaque"),
      ]);

      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        instrucao_ia: form.instrucao_ia.trim() || null,
        ativo: form.ativo,
        imagem_descricao_path: descricaoPath,
        imagem_destaque_path: destaquePath,
        updated_at: new Date().toISOString(),
      };

      if (isEditing && id) {
        const { error } = await supabase
          .from("modelos_descricao_cirurgica")
          .update(payload)
          .eq("id", id);

        if (error) throw error;
        showSuccess("Modelo atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("modelos_descricao_cirurgica")
          .insert(payload);

        if (error) throw error;
        showSuccess("Modelo cadastrado com sucesso!");
      }

      navigate("/admin/modelos-descricao-cirurgica");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar modelo.";
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const displayUrl = (img: ImageState) =>
    img.previewUrl ?? img.signedUrl ?? null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar section="cadastro" cadastroSubsection="modelos-descricao" />

      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => navigate("/admin/modelos-descricao-cirurgica")}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Scissors className="h-4 w-4" />
              </div>
              <h1 className="text-base font-semibold text-foreground">
                {isEditing ? "Editar Modelo" : "Novo Modelo de Descrição Cirúrgica"}
              </h1>
            </div>
          </div>
          <AdminHeaderActions />
        </div>

        {/* Formulário */}
        <div className="flex-1 overflow-auto p-6">
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-8">

            {/* Informações básicas */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-foreground">
                Informações do Modelo
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome">
                    Nome do hospital / clínica <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Hospital São Lucas, Clínica Ortopédica Santa Maria..."
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use o nome exato como aparece no cabeçalho do documento. A IA vai ler o hospital do documento e comparar com este nome para aplicar as instruções corretas.
                  </p>
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição (opcional)</Label>
                  <Textarea
                    id="descricao"
                    placeholder="Descreva o tipo de documento, hospital de origem, características visuais..."
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                    className="mt-1.5 min-h-[80px] resize-none"
                  />
                </div>

                <div>
                  <Label htmlFor="instrucao_ia">
                    Instrução para a IA (opcional)
                  </Label>
                  <Textarea
                    id="instrucao_ia"
                    placeholder="Ex: Neste modelo, os procedimentos estão listados na seção 'ATOS CIRÚRGICOS' no canto inferior direito. O campo de código fica na coluna 'COD'."
                    value={form.instrucao_ia}
                    onChange={(e) => setForm((f) => ({ ...f, instrucao_ia: e.target.value }))}
                    className="mt-1.5 min-h-[100px] resize-none"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Esta instrução será enviada à IA junto com as imagens para ajudá-la a localizar os procedimentos.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    id="ativo"
                    checked={form.ativo}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
                  />
                  <Label htmlFor="ativo" className="cursor-pointer">
                    Modelo ativo (será consultado pela IA)
                  </Label>
                </div>
              </div>
            </section>

            {/* Imagens */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-1 text-sm font-semibold text-foreground">
                Imagens de Referência
              </h2>
              <p className="mb-5 text-xs text-muted-foreground">
                Faça upload de imagens do documento para que a IA aprenda a identificar
                o formato e localizar os campos de procedimentos.
              </p>

              <div className="grid gap-6 sm:grid-cols-2">
                {/* Imagem da descrição completa */}
                <ImageUploadCard
                  label="Descrição Cirúrgica Completa"
                  hint="Imagem do documento inteiro — ajuda a IA a reconhecer o layout geral"
                  imageState={imgDescricao}
                  inputRef={refDescricao}
                  onFileChange={(e) => handleFileChange(e, setImgDescricao)}
                  onRemove={() => handleRemoveImage(setImgDescricao)}
                  onZoom={(url) => setZoomImg(url)}
                  displayUrl={displayUrl(imgDescricao)}
                />

                {/* Imagem do destaque dos procedimentos */}
                <ImageUploadCard
                  label="Destaque do Campo de Procedimentos"
                  hint="Zoom/recorte da área onde ficam os procedimentos — ajuda a IA a focar no campo correto"
                  imageState={imgDestaque}
                  inputRef={refDestaque}
                  onFileChange={(e) => handleFileChange(e, setImgDestaque)}
                  onRemove={() => handleRemoveImage(setImgDestaque)}
                  onZoom={(url) => setZoomImg(url)}
                  displayUrl={displayUrl(imgDestaque)}
                />
              </div>
            </section>

            {/* Botões */}
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/modelos-descricao-cirurgica")}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="gap-2 min-w-[140px]">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : isEditing ? (
                  "Salvar alterações"
                ) : (
                  "Cadastrar modelo"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de zoom */}
      {zoomImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setZoomImg(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={zoomImg}
              alt="Zoom"
              className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            />
            <button
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-lg"
              onClick={() => setZoomImg(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-componente: card de upload de imagem ──────────────────────────────────
interface ImageUploadCardProps {
  label: string;
  hint: string;
  imageState: ImageState;
  inputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  onZoom: (url: string) => void;
  displayUrl: string | null;
}

function ImageUploadCard({
  label,
  hint,
  inputRef,
  onFileChange,
  onRemove,
  onZoom,
  displayUrl,
}: ImageUploadCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      {displayUrl ? (
        <div className="group relative overflow-hidden rounded-xl border border-border bg-muted">
          <img
            src={displayUrl}
            alt={label}
            className="h-48 w-full object-cover"
          />
          {/* Overlay com ações */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-1.5 text-xs"
              onClick={() => onZoom(displayUrl)}
            >
              <ZoomIn className="h-3.5 w-3.5" />
              Ver
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-1.5 text-xs"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Trocar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="gap-1.5 text-xs"
              onClick={onRemove}
            >
              <X className="h-3.5 w-3.5" />
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/50 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background shadow-sm">
            <ImageIcon className="h-6 w-6" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Clique para adicionar</p>
            <p className="text-xs">PNG, JPEG, WEBP</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-background px-3 py-1.5 shadow-sm">
            <Upload className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Selecionar imagem</span>
          </div>
        </button>
      )}
    </div>
  );
}
