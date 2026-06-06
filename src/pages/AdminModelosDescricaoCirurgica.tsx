import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, EyeOff, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";

interface ModeloDescricao {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_descricao_path: string | null;
  imagem_destaque_path: string | null;
  instrucao_ia: string | null;
  ativo: boolean;
  created_at: string;
}

export default function AdminModelosDescricaoCirurgica() {
  const navigate = useNavigate();
  const [modelos, setModelos] = useState<ModeloDescricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchModelos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("modelos_descricao_cirurgica")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showError("Erro ao carregar modelos.");
    } else {
      setModelos((data ?? []) as ModeloDescricao[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchModelos();
  }, []);

  const handleToggleAtivo = async (modelo: ModeloDescricao) => {
    setTogglingId(modelo.id);
    const { error } = await supabase
      .from("modelos_descricao_cirurgica")
      .update({ ativo: !modelo.ativo, updated_at: new Date().toISOString() })
      .eq("id", modelo.id);

    if (error) {
      showError("Erro ao atualizar status.");
    } else {
      showSuccess(modelo.ativo ? "Modelo desativado." : "Modelo ativado.");
      setModelos((prev) =>
        prev.map((m) => (m.id === modelo.id ? { ...m, ativo: !m.ativo } : m))
      );
    }
    setTogglingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este modelo? Esta ação não pode ser desfeita.")) return;
    setDeletingId(id);

    // Buscar paths das imagens para deletar do storage
    const modelo = modelos.find((m) => m.id === id);
    if (modelo) {
      const pathsToDelete = [
        modelo.imagem_descricao_path,
        modelo.imagem_destaque_path,
      ].filter(Boolean) as string[];

      if (pathsToDelete.length > 0) {
        await supabase.storage.from("NPS-pro").remove(pathsToDelete);
      }
    }

    const { error } = await supabase
      .from("modelos_descricao_cirurgica")
      .delete()
      .eq("id", id);

    if (error) {
      showError("Erro ao excluir modelo.");
    } else {
      showSuccess("Modelo excluído com sucesso.");
      setModelos((prev) => prev.filter((m) => m.id !== id));
    }
    setDeletingId(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="cadastro" cadastroSubsection="modelos-descricao" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Scissors className="h-4 w-4" />
              </span>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                  Modelos de Descrição Cirúrgica
                </h1>
                <p className="text-xs text-slate-400 sm:text-sm">
                  Exemplos visuais para auxiliar a IA na extração de procedimentos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AdminHeaderActions />
              <Button
                onClick={() => navigate("/admin/modelos-descricao-cirurgica/novo")}
                className="gap-2 rounded-full bg-violet-600 px-5 text-white hover:bg-violet-700"
              >
                <Plus className="h-4 w-4" />
                Novo Modelo
              </Button>
            </div>
          </header>

          <main className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            </div>
          ) : modelos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Scissors className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">
                Nenhum modelo cadastrado
              </h3>
              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Cadastre modelos de descrição cirúrgica para ajudar a IA a identificar
                os campos de procedimentos em diferentes formatos de documentos.
              </p>
              <Button
                className="mt-6 gap-2 rounded-full bg-violet-600 px-5 text-white hover:bg-violet-700"
                onClick={() => navigate("/admin/modelos-descricao-cirurgica/novo")}
              >
                <Plus className="h-4 w-4" />
                Cadastrar primeiro modelo
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modelos.map((modelo) => (
                <div
                  key={modelo.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md"
                >
                  {/* Preview das imagens */}
                  <div className="relative flex h-40 items-center justify-center overflow-hidden bg-slate-50">
                    {modelo.imagem_descricao_path ? (
                      <ImagePreview path={modelo.imagem_descricao_path} alt="Descrição cirúrgica" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-300">
                        <Scissors className="h-10 w-10 opacity-40" />
                        <span className="text-xs">Sem imagem</span>
                      </div>
                    )}
                    {/* Badge destaque */}
                    {modelo.imagem_destaque_path && (
                      <div className="absolute bottom-2 right-2 rounded-lg border border-slate-200 bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-600 backdrop-blur-sm">
                        + destaque
                      </div>
                    )}
                    {/* Badge status */}
                    <div className="absolute left-2 top-2">
                      <Badge variant={modelo.ativo ? "default" : "secondary"}>
                        {modelo.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>

                  {/* Conteúdo */}
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="font-semibold leading-tight text-slate-800">
                      {modelo.nome}
                    </h3>
                    {modelo.descricao && (
                      <p className="line-clamp-2 text-xs text-slate-500">
                        {modelo.descricao}
                      </p>
                    )}
                    {modelo.instrucao_ia && (
                      <p className="line-clamp-2 rounded-lg bg-violet-50 px-2 py-1.5 text-[11px] text-violet-700">
                        IA: {modelo.instrucao_ia}
                      </p>
                    )}
                    <p className="mt-auto text-[11px] text-slate-400">
                      Criado em {formatDate(modelo.created_at)}
                    </p>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 border-t border-slate-100 px-3 py-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1.5 text-xs text-slate-600"
                      onClick={() =>
                        navigate(`/admin/modelos-descricao-cirurgica/editar/${modelo.id}`)
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1.5 text-xs text-slate-600"
                      disabled={togglingId === modelo.id}
                      onClick={() => handleToggleAtivo(modelo)}
                    >
                      {modelo.ativo ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      {modelo.ativo ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto h-8 gap-1.5 text-xs text-rose-600 hover:text-rose-700"
                      disabled={deletingId === modelo.id}
                      onClick={() => handleDelete(modelo.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </main>
        </div>
      </div>
    </div>
  );
}

// Componente para preview de imagem com URL assinada
function ImagePreview({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.storage
      .from("NPS-pro")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setUrl(data.signedUrl);
      });
  }, [path]);

  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
    />
  );
}
