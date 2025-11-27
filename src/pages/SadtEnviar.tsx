import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Paperclip,
  Image as ImageIcon,
  FileText,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  enviarSadt,
  type EnviarSadtPayload,
  type EnviarSadtResponse,
} from "@/services/sadt-service";
import { showError, showSuccess } from "@/utils/toast";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const phoneSchema = z
  .string()
  .min(1, "Telefone é obrigatório")
  .refine((value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length === 10 || digits.length === 11;
  }, "Telefone inválido");

const formSchema = z.object({
  telefone: phoneSchema,
});

type FormValues = z.infer<typeof formSchema>;

interface ArquivoAnexado {
  id: string;
  file: File;
  previewUrl?: string;
}

function formatarTelefone(valor: string) {
  const digits = valor.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const SadtEnviar = () => {
  const navigate = useNavigate();
  const [arquivos, setArquivos] = useState<ArquivoAnexado[]>([]);
  const [arquivoErro, setArquivoErro] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      telefone: "",
    },
  });

  const { mutateAsync, isPending } = useMutation<
    EnviarSadtResponse,
    Error,
    EnviarSadtPayload
  >({
    mutationFn: enviarSadt,
  });

  const aceitarArquivos = (lista: FileList | null) => {
    if (!lista || lista.length === 0) return;

    const novos: ArquivoAnexado[] = [];
    const erros: string[] = [];

    Array.from(lista).forEach((file) => {
      const tipoValido = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/pdf",
      ].includes(file.type);

      if (!tipoValido) {
        erros.push(
          `Tipo de arquivo inválido: ${file.name}. Tipos permitidos: JPG, PNG, JPEG, PDF.`,
        );
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        erros.push(
          `Arquivo muito grande: ${file.name}. Tamanho máximo: 10MB.`,
        );
        return;
      }

      const isImagem = file.type.startsWith("image/");
      const previewUrl = isImagem ? URL.createObjectURL(file) : undefined;

      novos.push({
        id: `${file.name}-${file.lastModified}-${file.size}-${Math.random()}`,
        file,
        previewUrl,
      });
    });

    if (erros.length > 0) {
      const msg = erros.join("\n");
      setArquivoErro(msg);
      showError(msg);
    } else {
      setArquivoErro(null);
    }

    if (novos.length > 0) {
      setArquivos((atual) => [...atual, ...novos]);
    }
  };

  const removerArquivo = (id: string) => {
    setArquivos((atual) => {
      atual.forEach((item) => {
        if (item.id === id && item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      return atual.filter((item) => item.id !== id);
    });
  };

  const limparArquivos = () => {
    setArquivos((atual) => {
      atual.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
  };

  const handleSubmit = async (values: FormValues) => {
    if (arquivos.length === 0) {
      const msg = "Pelo menos um arquivo é obrigatório.";
      setArquivoErro(msg);
      showError(msg);
      return;
    }

    const telefoneNormalizado = values.telefone.replace(/\D/g, "");

    const payload: EnviarSadtPayload = {
      telefone: telefoneNormalizado,
      arquivos: arquivos.map((a) => a.file),
    };

    const resposta = await mutateAsync(payload);

    showSuccess("SADT enviada com sucesso!");

    limparArquivos();
    form.reset();

    navigate("/sadt/sucesso", {
      state: {
        protocolo: resposta.protocolo,
      },
    });
  };

  const temArquivos = arquivos.length > 0;

  const tamanhoTotalFormatado = useMemo(() => {
    if (!temArquivos) return "";
    const total = arquivos.reduce((acc, item) => acc + item.file.size, 0);
    if (total < 1024 * 1024) {
      return `${(total / 1024).toFixed(1)} KB`;
    }
    return `${(total / (1024 * 1024)).toFixed(1)} MB`;
  }, [arquivos, temArquivos]);

  return (
    <div className="relative flex min-h-screen w-full bg-[#f4f7ff] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Fundo gradiente */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#e5f0ff] via-[#f8fbff] to-[#e3eeff] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />

      <div className="flex min-h-screen w-full flex-col px-4 py-5 sm:px-6 lg:px-10">
        {/* Header */}
        <header className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            className="flex items-center gap-3 rounded-2xl bg-white/80 px-3 py-2 shadow-sm ring-1 ring-slate-100/80 backdrop-blur dark:bg-slate-900/80 dark:ring-slate-800"
            onClick={() => navigate("/")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#135bec] shadow-md shadow-blue-500/40">
              <img
                src="/logo.jpeg"
                alt="Logo NP Saúde Pró"
                className="h-7 w-7 rounded-lg object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                NP Saúde Pró
              </span>
              <span className="text-[11px] text-slate-400">
                Envio de SADT · passo único
              </span>
            </div>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-400 sm:text-sm">
            <span className="hidden sm:inline">Atendimento</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>(00) 0000-0000</span>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex flex-1 items-start justify-center">
          <div className="grid w-full max-w-4xl gap-5 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)]">
            {/* Card de formulário */}
            <div className="rounded-3xl bg-white/90 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.12)] ring-1 ring-slate-100/80 backdrop-blur-xl dark:bg-slate-900/90 dark:ring-slate-800 sm:p-7">
              <div className="flex flex-col gap-1 pb-4">
                <h1 className="text-xl font-semibold leading-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
                  Envio de SADT
                </h1>
                <p className="text-xs text-slate-400 sm:text-sm">
                  Preencha o telefone de contato e anexe os arquivos
                  necessários para enviar sua solicitação.
                </p>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="border-t border-slate-100/80 pt-5 dark:border-slate-800"
                >
                  <div className="flex flex-col gap-6">
                    {/* Telefone */}
                    <FormField
                      control={form.control}
                      name="telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="pb-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                            Telefone para contato *
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              inputMode="tel"
                              placeholder="(XX) XXXXX-XXXX"
                              className="h-12 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#135bec]/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-500"
                              onChange={(e) =>
                                field.onChange(formatarTelefone(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Área de anexos */}
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-slate-700 dark:text-slate-100">
                        Anexe o comprovante em formato de imagem ou PDF.
                      </p>
                      <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                        {/* Tirar foto */}
                        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => aceitarArquivos(e.target.files)}
                          />
                          <Camera className="h-4 w-4" />
                          <span>Tirar foto</span>
                        </label>

                        {/* Anexar arquivo */}
                        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800">
                          <input
                            type="file"
                            multiple
                            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                            className="hidden"
                            onChange={(e) => aceitarArquivos(e.target.files)}
                          />
                          <Paperclip className="h-4 w-4" />
                          <span>Anexar arquivo</span>
                        </label>
                      </div>

                      {arquivoErro && (
                        <p className="pt-1 text-xs font-medium text-rose-500">
                          {arquivoErro}
                        </p>
                      )}

                      {/* Lista de arquivos */}
                      {temArquivos && (
                        <div className="mt-2 flex flex-col gap-2">
                          {arquivos.map((item) => {
                            const isImagem = item.file.type.startsWith(
                              "image/",
                            );
                            const tamanho =
                              item.file.size < 1024 * 1024
                                ? `${(item.file.size / 1024).toFixed(1)} KB`
                                : `${(
                                    item.file.size /
                                    (1024 * 1024)
                                  ).toFixed(1)} MB`;

                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between rounded-xl bg-slate-50/80 px-3 py-3 text-xs ring-1 ring-slate-100/80 dark:bg-slate-900/80 dark:ring-slate-800"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#dbeafe] text-[#135bec] dark:bg-slate-800 dark:text-slate-100">
                                    {isImagem ? (
                                      <ImageIcon className="h-4 w-4" />
                                    ) : (
                                      <FileText className="h-4 w-4" />
                                    )}
                                  </div>
                                  <div className="flex flex-col">
                                    <p className="max-w-[220px] truncate text-xs font-medium text-slate-900 dark:text-slate-50 sm:max-w-xs">
                                      {item.file.name}
                                    </p>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-400">
                                      {tamanho}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                  onClick={() => removerArquivo(item.id)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span className="sr-only">Remover</span>
                                </button>
                              </div>
                            );
                          })}

                          {arquivos.length > 1 && (
                            <p className="pl-[52px] text-[11px] text-slate-400 dark:text-slate-400">
                              {arquivos.length} arquivos anexados · Total{" "}
                              {tamanhoTotalFormatado}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rodapé com botões */}
                  <div className="mt-7 flex flex-col justify-end gap-3 border-t border-slate-100/80 pt-4 sm:flex-row sm:gap-4 dark:border-slate-800">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-10 rounded-full bg-transparent text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50 sm:text-sm"
                      disabled={isPending}
                      onClick={() => {
                        form.reset();
                        limparArquivos();
                        setArquivoErro(null);
                      }}
                    >
                      Limpar formulário
                    </Button>
                    <Button
                      type="submit"
                      className="h-10 rounded-full bg-[#135bec] px-6 text-xs font-semibold text-white shadow-md shadow-blue-500/40 hover:bg-[#135bec]/90 sm:text-sm"
                      disabled={isPending}
                    >
                      {isPending ? "Enviando..." : "Enviar SADT"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>

            {/* Coluna lateral com informações/ajuda */}
            <aside className="flex flex-col gap-4">
              <div className="rounded-3xl bg-[#135bec] px-5 py-5 text-white shadow-[0_18px_60px_rgba(37,99,235,0.55)]">
                <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />
                  Dica de envio
                </p>
                <h2 className="mt-3 text-base font-semibold">
                  Envie fotos legíveis dos documentos
                </h2>
                <p className="mt-1 text-xs text-sky-100">
                  Certifique-se de que todos os dados importantes estejam
                  visíveis antes de enviar as imagens.
                </p>
              </div>

              <div className="rounded-3xl bg-white/90 p-4 text-xs shadow-sm ring-1 ring-slate-100/80 dark:bg-slate-900/90 dark:ring-slate-800 sm:text-sm">
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  Como funciona?
                </p>
                <p className="mt-1 text-slate-500 dark:text-slate-300">
                  Após o envio, você receberá um protocolo de acompanhamento.
                  Nossa equipe irá analisar a solicitação e o status poderá ser
                  consultado na área administrativa.
                </p>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SadtEnviar;