import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Image as ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { supabase } from "@/integrations/supabase/client";
import {
  buscarDescricaoCirurgicaPorId,
  listarArquivosDescricaoCirurgica,
  type DescricaoCirurgicaArquivo,
} from "@/services/descricao-cirurgica-service";
import type { DbDescricaoCirurgica } from "@/db/schema";
import { showError } from "@/utils/toast";

interface ArquivoComUrl extends DescricaoCirurgicaArquivo {
  signedUrl: string | null;
  isImage: boolean;
  fileName: string;
}

const bucketName = "NPS-pro";

const DescricaoCirurgicaArquivosPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [descricao, setDescricao] = useState<DbDescricaoCirurgica | null>(null);
  const [arquivos, setArquivos] = useState<ArquivoComUrl[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      if (!id) return;
      setCarregando(true);
      try {
        const [desc, arquivosDb] = await Promise.all([
          buscarDescricaoCirurgicaPorId(id),
          listarArquivosDescricaoCirurgica(id),
        ]);

        setDescricao(desc);

        let arquivosComUrl: ArquivoComUrl[] = [];

        // 1) Primeiro, tenta pelos registros da tabela descricoes_cirurgicas_arquivos
        if (arquivosDb.length > 0) {
          arquivosComUrl = await Promise.all(
            arquivosDb.map(async (arq) => {
              const { data, error } = await supabase.storage
                .from(bucketName)
                .createSignedUrl(arq.file_path, 60 * 60);

              if (error) {
                console.error(
                  "Erro ao criar URL assinada para arquivo:",
                  arq.file_path,
                  error,
                );
              }

              const fileName =
                arq.file_path.split("/")[arq.file_path.split("/").length - 1];

              const isImage = /\.(png|jpe?g|gif|webp)$/i.test(arq.file_path);

              return {
                ...arq,
                signedUrl: data?.signedUrl ?? null,
                isImage,
                fileName,
              };
            }),
          );
        }
        // 2) Se não achar nada na tabela, tenta usar a pasta storage_folder direto no Storage
        else if (desc.storage_folder) {
          const { data: listData, error: listError } = await supabase.storage
            .from(bucketName)
            .list(desc.storage_folder, { limit: 100 });

          if (listError) {
            console.error(
              "Erro ao listar arquivos no Storage para pasta:",
              desc.storage_folder,
              listError,
            );
          } else if (listData && listData.length > 0) {
            arquivosComUrl = await Promise.all(
              listData.map(async (obj) => {
                const filePath = `${desc.storage_folder}/${obj.name}`;

                const { data, error } = await supabase.storage
                  .from(bucketName)
                  .createSignedUrl(filePath, 60 * 60);

                if (error) {
                  console.error(
                    "Erro ao criar URL assinada para arquivo listado:",
                    filePath,
                    error,
                  );
                }

                const isImage = /\.(png|jpe?g|gif|webp)$/i.test(filePath);

                const arquivoBase: DescricaoCirurgicaArquivo = {
                  id: obj.name, // não temos o id da tabela, usamos o nome como identificador
                  descricao_id: desc.id,
                  user_id: desc.user_id,
                  file_path: filePath,
                  created_at:
                    (obj as any).created_at ??
                    new Date().toISOString(),
                };

                return {
                  ...arquivoBase,
                  signedUrl: data?.signedUrl ?? null,
                  isImage,
                  fileName: obj.name,
                };
              }),
            );
          }
        }

        setArquivos(arquivosComUrl);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Não foi possível carregar os dados desta descrição.";
        showError(message);
      } finally {
        setCarregando(false);
      }
    };

    void carregarDados();
  }, [id]);

  const handleVoltar = () => {
    navigate("/descricao-cirurgica");
  };

  const handleAbrirArquivo = (arquivo: ArquivoComUrl) => {
    if (!arquivo.signedUrl) {
      showError("Não foi possível abrir este arquivo.");
      return;
    }
    window.open(arquivo.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="descricao" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl dark:bg-slate-900/90">
          <header className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={handleVoltar}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Voltar
              </Button>
              <div className="flex flex-col">
                <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span>Arquivos da descrição</span>
                </h1>
                <p className="text-xs text-slate-400 sm:text-sm">
                  Visualização dos arquivos enviados pelo médico para esta
                  descrição cirúrgica.
                </p>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pb-2">
            <div className="mb-4 space-y-3">
              <Card className="border-slate-200/80 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    Resumo da descrição
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Informações básicas da descrição selecionada.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {carregando && !descricao ? (
                    <p className="text-xs text-slate-500">
                      Carregando dados da descrição...
                    </p>
                  ) : !descricao ? (
                    <p className="text-xs text-slate-500">
                      Nenhuma descrição encontrada.
                    </p>
                  ) : (
                    <>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <Label className="text-xs text-slate-500">
                            Paciente
                          </Label>
                          <p className="font-medium">
                            {descricao.nome_social ||
                              descricao.registro_civil ||
                              "-"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">
                            Nº prontuário
                          </Label>
                          <p className="font-medium">
                            {descricao.prontuario || "-"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">
                            Cirurgião responsável
                          </Label>
                          <p className="font-medium">
                            {descricao.cirurgiao_responsavel || "-"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-slate-500">
                          Tipo de cirurgia
                        </Label>
                        <p>{descricao.tipo_cirurgia || "-"}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-200/80 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/70">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">
                      Arquivos anexados
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Imagens e PDFs enviados pelo médico.
                    </CardDescription>
                  </div>
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {arquivos.length} arquivo(s)
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {carregando ? (
                  <p className="text-xs text-slate-500">
                    Carregando arquivos anexados...
                  </p>
                ) : arquivos.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Nenhum arquivo anexado encontrado para esta descrição.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {arquivos.map((arquivo) => (
                      <button
                        key={arquivo.id}
                        type="button"
                        className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:ring-slate-700"
                        onClick={() => handleAbrirArquivo(arquivo)}
                      >
                        <div className="relative flex h-40 items-center justify-center bg-slate-100 dark:bg-slate-950">
                          {arquivo.signedUrl && arquivo.isImage ? (
                            <img
                              src={arquivo.signedUrl}
                              alt={arquivo.fileName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-500">
                              {arquivo.isImage ? (
                                <ImageIcon className="mb-2 h-8 w-8" />
                              ) : (
                                <FileText className="mb-2 h-8 w-8" />
                              )}
                              <span className="text-xs">
                                {arquivo.isImage ? "Imagem" : "PDF"}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col justify-between gap-1 px-3 py-2">
                          <p className="line-clamp-2 text-xs font-medium text-slate-800 dark:text-slate-100">
                            {arquivo.fileName}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Enviado em{" "}
                            {new Date(arquivo.created_at).toLocaleString()}
                          </p>
                          <span className="mt-1 inline-flex w-max items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:group-hover:bg-slate-700">
                            Clique para abrir
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DescricaoCirurgicaArquivosPage;