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
    <div className="relative flex min-h-screen w-full flex-col bg-[#101622] text-gray-100">
      {/* Gradiente de fundo suave */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[#135bec]/20 blur-3xl" />
        <div className="absolute -right-40 -bottom-40 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />
      </div>

      {/* Layout principal */}
      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/5 px-4 py-3 sm:px-10">
          <div className="flex items-center gap-3 text-white">
            <img
              src="/logo.jpeg"
              alt="Logo NP Saúde Pró"
              className="h-8 w-8 rounded-full object-cover"
            />
            <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">
              NP Saúde Pró
            </h2>
          </div>

          <div className="hidden items-center gap-9 text-sm font-medium text-slate-300 md:flex">
            <button className="transition-colors hover:text-white">
              Dashboard
            </button>
            <button className="transition-colors hover:text-white">
              Minhas Solicitações
            </button>
            <button className="text-[#135bec]">Nova Solicitação</button>
            <button className="transition-colors hover:text-white">Ajuda</button>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition-colors hover:bg-white/10">
              <span className="sr-only">Notificações</span>
              <span>🔔</span>
            </button>
            <button className="hidden h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition-colors hover:bg-white/10 md:flex">
              <span className="sr-only">Configurações</span>
              <span>⚙️</span>
            </button>
            <img
              src="/perfil.jpeg"
              alt="Foto do usuário"
              className="hidden h-10 w-10 rounded-full object-cover md:block"
            />
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex w-full max-w-2xl flex-col">
            <div className="px-1 pb-2">
              <h1 className="text-3xl font-black leading-tight tracking-[-0.03em] text-white sm:text-4xl">
                Envio de SADT
              </h1>
            </div>

            <div className="mt-4 flex flex-col gap-8">
              <div className="rounded-xl border border-white/10 bg-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
                {/* Cabeçalho do card */}
                <div className="flex flex-col gap-1 px-6 py-6 sm:px-8 sm:py-8">
                  <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] text-white">
                    Solicitação de Envio de SADT
                  </h3>
                  <p className="text-base font-normal leading-normal text-slate-300">
                    Preencha o campo abaixo e anexe o comprovante para enviar
                    sua solicitação.
                  </p>
                </div>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleSubmit)}
                    className="border-t border-white/10 px-6 py-6 sm:px-8 sm:py-8"
                  >
                    <div className="flex flex-col gap-6">
                      {/* Telefone */}
                      <FormField
                        control={form.control}
                        name="telefone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="pb-2 text-base font-medium text-slate-200">
                              Telefone *
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                inputMode="tel"
                                placeholder="(XX) XXXXX-XXXX"
                                className="h-14 rounded-lg border border-white/20 bg-black/40 text-base text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[#135bec]/60"
                                onChange={(e) =>
                                  field.onChange(
                                    formatarTelefone(e.target.value),
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Área de anexos */}
                      <div className="flex flex-col gap-3">
                        <p className="text-base font-normal leading-normal text-slate-200">
                          Anexe o comprovante em formato de imagem ou PDF.
                        </p>
                        <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
                          {/* Tirar foto */}
                          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-white/5 px-4 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/10">
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
                          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-white/5 px-4 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/10">
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
                          <p className="pt-1 text-sm font-medium text-red-400">
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
                                  className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 px-3 py-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#135bec]/10 text-[#135bec]">
                                      {isImagem ? (
                                        <ImageIcon className="h-5 w-5" />
                                      ) : (
                                        <FileText className="h-5 w-5" />
                                      )}
                                    </div>
                                    <div className="flex flex-col">
                                      <p className="max-w-[220px] truncate text-sm font-medium text-slate-100 sm:max-w-xs">
                                        {item.file.name}
                                      </p>
                                      <p className="text-xs text-slate-400">
                                        {tamanho}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100"
                                    onClick={() => removerArquivo(item.id)}
                                  >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Remover</span>
                                  </button>
                                </div>
                              );
                            })}

                            {arquivos.length > 1 && (
                              <p className="pl-[52px] text-xs text-slate-400">
                                {arquivos.length} arquivos anexados · Total{" "}
                                {tamanhoTotalFormatado}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rodapé com botões */}
                    <div className="mt-8 flex flex-col justify-end gap-3 border-t border-white/10 pt-6 sm:flex-row sm:gap-4">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-11 rounded-lg bg-transparent text-sm font-semibold text-slate-200 hover:bg-white/5"
                        disabled={isPending}
                        onClick={() => {
                          form.reset();
                          limparArquivos();
                          setArquivoErro(null);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="h-11 rounded-lg bg-[#135bec] px-6 text-sm font-semibold text-white hover:bg-[#135bec]/90"
                        disabled={isPending}
                      >
                        {isPending ? "Enviando..." : "Enviar"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SadtEnviar;