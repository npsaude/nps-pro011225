import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Upload, X, Scissors, Loader2, ImageIcon, ZoomIn, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  fetchModeloDescricaoCirurgica,
  createSignedModeloImageUrl,
  uploadModeloImage,
  saveModeloDescricaoCirurgica,
} from "@/services/modelos-descricao-cirurgica-service";
import { showError, showSuccess } from "@/utils/toast";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";

interface FormData {
  nome: string;
  descricao: string;
  campo_procedimentos: string;
  tipo_documento: "narrativo" | "tabela";
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
  file: null, previewUrl: null, existingPath: null, signedUrl: null,
});

export default function AdminModelosDescricaoCirurgicaForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [form, setForm] = useState<FormData>({
    nome: "",
    descricao: "",
    campo_procedimentos: "",
    tipo_documento: "narrativo",
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

  useEffect(() => {
    if (!isEditing || !id) return;
    const load = async () => {
      const row = await fetchModeloDescricaoCirurgica(id);
      if (!row) {
        showError("Modelo não encontrado.");
        navigate("/admin/modelos-descricao-cirurgica");
        return;
      }
      setForm({
        nome: row.nome ?? "",
        descricao: row.descricao ?? "",
        campo_procedimentos: row.campo_procedimentos ?? "",
        tipo_documento: row.tipo_documento === "tabela" ? "tabela" : "narrativo",
        instrucao_ia: row.instrucao_ia ?? "",
        ativo: row.ativo ?? true,
      });
      if (row.imagem_descricao_path) {
        const signedUrl = await createSignedModeloImageUrl(row.imagem_descricao_path);
        setImgDescricao({ file: null, previewUrl: null, existingPath: row.imagem_descricao_path, signedUrl });
      }
      if (row.imagem_destaque_path) {
        const signedUrl = await createSignedModeloImageUrl(row.imagem_destaque_path);
        setImgDestaque({ file: null, previewUrl: null, existingPath: row.imagem_destaque_path, signedUrl });
      }
      setLoading(false);
    };
    void load();
  }, [id, isEditing, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<ImageState>>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showError("Selecione apenas arquivos de imagem."); return; }
    setter(prev => ({ ...prev, file, previewUrl: URL.createObjectURL(file) }));
    e.target.value = "";
  };

  const uploadImage = async (img: ImageState, folder: string): Promise<string | null> => {
    if (img.file) {
      return uploadModeloImage(img.file, folder);
    }
    return img.existingPath ?? null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { showError("O nome do hospital/clínica é obrigatório."); return; }
    setSaving(true);
    try {
      const [descricaoPath, destaquePath] = await Promise.all([
        uploadImage(imgDescricao, "descricao"),
        uploadImage(imgDestaque, "destaque"),
      ]);
      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        campo_procedimentos: form.campo_procedimentos.trim() || null,
        tipo_documento: form.tipo_documento,
        instrucao_ia: form.instrucao_ia.trim() || null,
        ativo: form.ativo,
        imagem_descricao_path: descricaoPath,
        imagem_destaque_path: destaquePath,
        updated_at: new Date().toISOString(),
      };
      const { error } = await saveModeloDescricaoCirurgica(payload, isEditing && id ? id : undefined);
      if (error) throw error;
      showSuccess(isEditing ? "Modelo atualizado com sucesso!" : "Modelo cadastrado com sucesso!");
      navigate("/admin/modelos-descricao-cirurgica");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro ao salvar modelo.");
    } finally {
      setSaving(false);
    }
  };

  const displayUrl = (img: ImageState) => img.previewUrl ?? img.signedUrl ?? null;

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar section="cadastro" cadastroSubsection="modelos-descricao" />

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/admin/modelos-descricao-cirurgica")}>
              <ArrowLeft className="h-4 w-4" />Voltar
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

        <div className="flex-1 overflow-auto p-6">
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">

            {/* ── Seção 1: Identificação ── */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Identificação do Hospital / Clínica</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  A IA lê o nome do hospital no documento e compara com este campo para saber qual modelo aplicar.
                </p>
              </div>

              <div>
                <Label htmlFor="nome">
                  Nome do hospital / clínica <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nome"
                  placeholder="Ex: Memorial São José, Hospital Santa Catarina, Clínica Ortopédica..."
                  value={form.nome}
                  onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Use o nome <strong>exato</strong> como aparece no cabeçalho/logotipo do documento.
                  A comparação é parcial — "Memorial São José" vai bater com "MEMORIAL SÃO JOSÉ HOSPITAL E CLÍNICAS".
                </p>
              </div>

              <div>
                <Label htmlFor="descricao">Observações internas (opcional)</Label>
                <Textarea
                  id="descricao"
                  placeholder="Ex: Ficha cirúrgica padrão usada desde 2020. Versão impressa em papel timbrado."
                  value={form.descricao}
                  onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))}
                  className="mt-1.5 min-h-[70px] resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch id="ativo" checked={form.ativo} onCheckedChange={(v) => setForm(f => ({ ...f, ativo: v }))} />
                <Label htmlFor="ativo" className="cursor-pointer">Modelo ativo (será consultado pela IA)</Label>
              </div>
            </section>

            {/* ── Seção 2: Configuração de extração ── */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Configuração de Extração de Procedimentos</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Ensine a IA <strong>onde</strong> e <strong>como</strong> encontrar os procedimentos neste documento.
                </p>
              </div>

              {/* Tipo de documento */}
              <div>
                <Label className="mb-2 block">Tipo de documento</Label>
                <RadioGroup
                  value={form.tipo_documento}
                  onValueChange={(v) => setForm(f => ({ ...f, tipo_documento: v as "narrativo" | "tabela" }))}
                  className="flex gap-4"
                >
                  <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3 flex-1 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="narrativo" id="tipo-narrativo" className="mt-0.5" />
                    <div>
                      <Label htmlFor="tipo-narrativo" className="cursor-pointer font-medium">Boletim operatório / narrativo</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Documento com texto descritivo. Os procedimentos estão escritos em um campo específico (ex: "Procedimento(s):").
                        <strong className="text-foreground"> Não há tabela com códigos numéricos.</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3 flex-1 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="tabela" id="tipo-tabela" className="mt-0.5" />
                    <div>
                      <Label htmlFor="tipo-tabela" className="cursor-pointer font-medium">Guia com tabela de códigos</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Documento com tabela contendo colunas de código numérico CBHPM e descrição.
                        <strong className="text-foreground"> A IA extrai os códigos diretamente da tabela.</strong>
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Campo âncora — o mais crítico */}
              <div>
                <Label htmlFor="campo_procedimentos">
                  Rótulo do campo de procedimentos
                  <span className="ml-1.5 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">CRÍTICO</span>
                </Label>
                <Input
                  id="campo_procedimentos"
                  placeholder={form.tipo_documento === "tabela"
                    ? 'Ex: PROCEDIMENTOS REALIZADOS, ATOS CIRÚRGICOS, PROCEDIMENTOS CIRÚRGICOS'
                    : 'Ex: Procedimento(s):, PROCEDIMENTO REALIZADO:, Intervenção feita:'}
                  value={form.campo_procedimentos}
                  onChange={(e) => setForm(f => ({ ...f, campo_procedimentos: e.target.value }))}
                  className="mt-1.5 font-mono text-sm"
                />
                <div className="mt-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 flex gap-2">
                  <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                    <p><strong>Este é o campo mais importante.</strong> Informe o rótulo exato que aparece no documento antes dos procedimentos.</p>
                    {form.tipo_documento === "narrativo" ? (
                      <p>
                        Exemplo: se o documento mostra <code className="bg-amber-500/20 px-1 rounded">Procedimento(s): MICRONEUROLISES + TENOLISE</code>,
                        o rótulo é <code className="bg-amber-500/20 px-1 rounded">Procedimento(s):</code>
                      </p>
                    ) : (
                      <p>
                        Exemplo: se a tabela tem o cabeçalho <code className="bg-amber-500/20 px-1 rounded">PROCEDIMENTOS REALIZADOS</code>,
                        informe exatamente isso.
                      </p>
                    )}
                    <p className="text-amber-600 dark:text-amber-500">
                      ⚠️ Sem este campo, a IA pode ler a lista de passos cirúrgicos (1. Antissepsia, 2. Incisão...) em vez dos procedimentos faturáveis.
                    </p>
                  </div>
                </div>
              </div>

              {/* Instrução adicional */}
              <div>
                <Label htmlFor="instrucao_ia">Instrução adicional para a IA (opcional)</Label>
                <Textarea
                  id="instrucao_ia"
                  placeholder={form.tipo_documento === "narrativo"
                    ? `Ex: Neste modelo, o campo "Procedimento(s)" fica entre o diagnóstico pré-operatório e o nome do cirurgião. Separe os procedimentos pelo símbolo "+". NÃO leia a lista numerada abaixo de "Descrição Cirúrgica" — ela é o passo-a-passo operatório, não os procedimentos faturáveis.`
                    : `Ex: A tabela de procedimentos fica no rodapé do documento. A coluna de código tem o cabeçalho "COD" e a de descrição tem "PROCEDIMENTO". Ignore linhas com valor zero na coluna "QTD".`}
                  value={form.instrucao_ia}
                  onChange={(e) => setForm(f => ({ ...f, instrucao_ia: e.target.value }))}
                  className="mt-1.5 min-h-[110px] resize-none text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Use este campo para detalhar posição, separadores, colunas ou qualquer particularidade do documento que ajude a IA a não se confundir.
                </p>
              </div>
            </section>

            {/* ── Seção 3: Imagens ── */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Imagens de Referência Visual</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  As imagens ajudam a IA a reconhecer o layout do documento e localizar visualmente os campos.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <ImageUploadCard
                  label="Documento completo"
                  hint="Foto/scan do documento inteiro. Usada para reconhecer o hospital pelo layout geral."
                  inputRef={refDescricao}
                  onFileChange={(e) => handleFileChange(e, setImgDescricao)}
                  onRemove={() => setImgDescricao(emptyImage())}
                  onZoom={setZoomImg}
                  displayUrl={displayUrl(imgDescricao)}
                />
                <ImageUploadCard
                  label="Zoom do campo de procedimentos ⭐"
                  hint={`Recorte ampliado do campo "${form.campo_procedimentos || 'de procedimentos'}". A IA usa esta imagem para saber exatamente onde olhar.`}
                  inputRef={refDestaque}
                  onFileChange={(e) => handleFileChange(e, setImgDestaque)}
                  onRemove={() => setImgDestaque(emptyImage())}
                  onZoom={setZoomImg}
                  displayUrl={displayUrl(imgDestaque)}
                  highlight
                />
              </div>
            </section>

            <div className="flex items-center justify-end gap-3 pb-6">
              <Button type="button" variant="outline" onClick={() => navigate("/admin/modelos-descricao-cirurgica")} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="gap-2 min-w-[140px]">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</> : isEditing ? "Salvar alterações" : "Cadastrar modelo"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {zoomImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setZoomImg(null)}>
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img src={zoomImg} alt="Zoom" className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl" />
            <button className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-lg" onClick={() => setZoomImg(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ImageUploadCardProps {
  label: string;
  hint: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  onZoom: (url: string) => void;
  displayUrl: string | null;
  highlight?: boolean;
}

function ImageUploadCard({ label, hint, inputRef, onFileChange, onRemove, onZoom, displayUrl, highlight }: ImageUploadCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className={`text-sm font-medium ${highlight ? "text-primary" : "text-foreground"}`}>{label}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      {displayUrl ? (
        <div className={`group relative overflow-hidden rounded-xl border bg-muted ${highlight ? "border-primary/40" : "border-border"}`}>
          <img src={displayUrl} alt={label} className="h-48 w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Button type="button" size="sm" variant="secondary" className="gap-1.5 text-xs" onClick={() => onZoom(displayUrl)}>
              <ZoomIn className="h-3.5 w-3.5" />Ver
            </Button>
            <Button type="button" size="sm" variant="secondary" className="gap-1.5 text-xs" onClick={() => inputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />Trocar
            </Button>
            <Button type="button" size="sm" variant="destructive" className="gap-1.5 text-xs" onClick={onRemove}>
              <X className="h-3.5 w-3.5" />Remover
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`flex h-48 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-muted/50 text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary ${highlight ? "border-primary/30 hover:border-primary" : "border-border hover:border-primary/50"}`}
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
