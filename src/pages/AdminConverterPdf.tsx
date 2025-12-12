import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileDown,
  FileText,
  Table as TableIcon,
  UploadCloud,
  Download,
} from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { showError, showSuccess } from "@/utils/toast";
import { carregarAppSettings } from "@/services/app-settings-service";

type ParsedRow = string[];

const MAX_ROWS_PREVIEW = 200;
const MAX_BASE64_LENGTH = 100_000;

const AdminConverterPdf = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [header, setHeader] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [openaiToken, setOpenaiToken] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) {
      setFile(null);
      setRows([]);
      setHeader([]);
      return;
    }

    if (selected.type !== "application/pdf") {
      showError("Envie apenas arquivos PDF.");
      setFile(null);
      setRows([]);
      setHeader([]);
      return;
    }

    setFile(selected);
    setRows([]);
    setHeader([]);
  };

  const simulateProgress = () => {
    setProgress(0);
    let value = 0;
    const step = () => {
      value += 14;
      if (value >= 100) {
        setProgress(100);
        return;
      }
      setProgress(value);
      window.setTimeout(step, 220);
    };
    step();
  };

  const fileToBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error || new Error("Erro ao ler o arquivo PDF."));
      reader.readAsDataURL(f);
    });

  const ensureOpenAiToken = async (): Promise<string> => {
    if (openaiToken) return openaiToken;

    const settings = await carregarAppSettings();
    const token = settings?.openaiApiToken?.trim();
    if (!token) {
      throw new Error(
        "Token OpenAI não configurado. Acesse Configurações > Token OpenAI para informar a chave.",
      );
    }
    setOpenaiToken(token);
    return token;
  };

  /**
   * Envia o PDF em base64 (possivelmente truncado) para o ChatGPT
   * usando o prompt específico em português, e pede que devolva APENAS um CSV com ';'.
   */
  const askChatGptForCsvFromPdfBase64 = async (
    base64Pdf: string,
    token: string,
    truncated: boolean,
  ): Promise<string> => {
    const systemPrompt =
      "Você é um assistente especializado em ler PDFs de relatórios analíticos de faturamento médico. " +
      "Sua tarefa é receber o conteúdo de um arquivo PDF em base64 e devolver APENAS um arquivo CSV " +
      "seguindo exatamente as regras descritas pelo usuário. " +
      "Use sempre ponto e vírgula (;) como separador de coluna. " +
      "Não escreva nenhuma explicação, texto extra ou comentários fora do CSV.";

    const truncationNote = truncated
      ? "ATENÇÃO IMPORTANTE: o conteúdo em base64 foi truncado para caber no limite do modelo. " +
        "Priorize a extração da tabela principal de atendimentos e dos valores relacionados a cada atendimento. " +
        "Se algum trecho estiver incompleto, faça a melhor inferência possível, mas nunca invente valores fora de contexto.\n\n"
      : "";

    const userPrompt =
      truncationNote +
      "Usando o PDF de relatório analítico em anexo (conteúdo em base64 abaixo) como referência, " +
      "extraia os dados do PDF e crie um CSV com as seguintes instruções:\n\n" +
      "1. Nome do médico: campo textual (ex.: Jose Airton Case Neto)\n" +
      "2. Período: campo textual com o período do relatório (ex.: 'Novembro/2025' ou equivalente no PDF)\n\n" +
      "3. Para cada atendimento/paciente, devem existir uma ou mais linhas, com as seguintes colunas:\n" +
      "   3.1 Nome do paciente (ex.: WALLACY FILIPE DA MOTA SILVA)\n" +
      "   3.2 Data do Atendimento (ex.: 28/08/2025)\n" +
      "   3.3 Data do Pagamento (ex.: 03/10/2025)\n" +
      "   3.4 Pagante (ex.: AMIL)\n" +
      "   3.5 Código do Procedimento (ex.: 10101012)\n" +
      "   3.6 Descrição do Procedimento (ex.: CONSULTA CONSULTORIO SADT)\n" +
      "   3.7 Valor Base (ex.: 91,00)\n" +
      "   3.8 Glosa (ex.: 0,00)\n" +
      "   3.9 Desconto (ex.: 9,24)\n" +
      "   3.10 Líquido (ex.: 81,76)\n\n" +
      "   Podem haver outras linhas de procedimentos para o mesmo paciente/atendimento. " +
      "   Se houver, todas as linhas devem ser trazidas no CSV com os respectivos valores.\n\n" +
      "4. Total de repasse:\n" +
      "   Para cada atendimento (ou bloco de linhas do mesmo paciente/atendimento), calcule o Total de repasse do médico " +
      "   conforme indicado no PDF. O valor do repasse deve aparecer APENAS NA ÚLTIMA LINHA daquele atendimento/paciente. " +
      "   Nas demais linhas desse mesmo atendimento, deixe a coluna de Total de repasse vazia.\n\n" +
      "Regras adicionais IMPORTANTES:\n" +
      "- Use SEMPRE vírgula como separador decimal (ex.: 81,76), igual ao PDF.\n" +
      "- Tenha muito cuidado com as casas decimais dos valores. Não perca precisão e não misture separador de milhar com decimal.\n" +
      "- Os valores devem refletir exatamente o que está no PDF.\n" +
      "- O CSV deve ter uma linha de cabeçalho com as colunas na ordem abaixo, e depois uma linha para cada procedimento:\n" +
      "  NomeMedico;Periodo;NomePaciente;DataAtendimento;DataPagamento;Pagante;CodigoProcedimento;DescricaoProcedimento;ValorBase;Glosa;Desconto;Liquido;TotalRepasse\n\n" +
      "Agora, gere APENAS o conteúdo CSV (sem texto extra, sem markdown, sem comentários). " +
      "Segue o conteúdo base64 do PDF:\n\n" +
      base64Pdf;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Erro ao chamar a API OpenAI (${response.status}): ${
          errText || "sem detalhes"
        }`,
      );
    }

    const data = (await response.json()) as any;
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("Resposta da OpenAI não contém texto CSV utilizável.");
    }

    return content.trim();
  };

  const parseCsvFromChatGpt = (
    csvText: string,
  ): { header: string[]; rows: ParsedRow[] } => {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      return { header: [], rows: [] };
    }

    const headerLine = lines[0];
    const headerCols = headerLine.split(";").map((c) => c.trim());
    const bodyLines = lines.slice(1);

    const rawRows: ParsedRow[] = bodyLines.map((line) =>
      line.split(";").map((c) => c.trim()),
    );

    const width = headerCols.length;
    const normalizedRows = rawRows.map((row) => {
      if (row.length === width) return row;
      if (row.length > width) return row.slice(0, width);
      return [...row, ...Array(width - row.length).fill("")];
    });

    return { header: headerCols, rows: normalizedRows };
  };

  const handleConvert = async () => {
    if (!file) {
      showError("Selecione um PDF para converter.");
      return;
    }

    setParsing(true);
    simulateProgress();

    try {
      const token = await ensureOpenAiToken();
      const base64 = await fileToBase64(file);

      const truncated = base64.length > MAX_BASE64_LENGTH;
      const base64ToSend = truncated ? base64.slice(0, MAX_BASE64_LENGTH) : base64;

      const csvText = await askChatGptForCsvFromPdfBase64(base64ToSend, token, truncated);
      const { header: builtHeader, rows: builtRows } = parseCsvFromChatGpt(csvText);

      if (builtRows.length === 0) {
        showError(
          "ChatGPT não conseguiu extrair dados tabulares deste PDF com o formato solicitado.",
        );
        setRows([]);
        setHeader([]);
        return;
      }

      setHeader(builtHeader);
      setRows(builtRows);
      showSuccess(
        `PDF processado com sucesso via ChatGPT. ${builtRows.length} linha(s) de dados extraídas.`,
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível converter o PDF com ChatGPT.";
      showError(message);
      setRows([]);
      setHeader([]);
    } finally {
      setParsing(false);
      setProgress(100);
    }
  };

  const handleExportCsv = () => {
    if (!rows.length || !header.length) {
      showError("Não há dados para exportar. Converta um PDF primeiro.");
      return;
    }

    const escapeCsv = (value: string) => {
      const needQuotes = /[\",;\n]/.test(value);
      const normalized = value.replace(/"/g, '""');
      return needQuotes ? `"${normalized}"` : normalized;
    };

    const allRows = [header, ...rows];
    const csvContent = allRows
      .map((row) => row.map(escapeCsv).join(";"))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const nameBase = file?.name?.replace(/\.pdf$/i, "") || "dados_pdf";
    link.href = url;
    link.setAttribute("download", `${nameBase}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSuccess("Arquivo CSV gerado com sucesso.");
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="config" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl dark:bg-slate-900/90">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                onClick={() => navigate("/admin/configuracoes")}
              >
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                Voltar
              </Button>
              <div className="flex flex-col">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">
                  Converter PDF (ChatGPT)
                </h1>
                <p className="text-xs text-slate-400 sm:text-sm">
                  Envie um PDF; o ChatGPT usa o prompt específico para montar um CSV com os campos de repasse.
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800/70 dark:ring-slate-700 sm:flex">
              <FileDown className="mr-1.5 h-4 w-4 text-slate-400" />
              <span className="text-slate-500 dark:text-slate-300">
                Prompt customizado de repasse (apenas ChatGPT, sem libs de PDF)
              </span>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pb-2">
            <div className="mt-2 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              {/* Upload e status */}
              <Card className="rounded-3xl border border-slate-100 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                      <UploadCloud className="h-4 w-4" />
                    </span>
                    <span>Upload de PDF</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Selecione o PDF analítico (como o exemplo do médico Jose Airton) para gerar o CSV de repasse.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs sm:text-sm">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Arquivo PDF
                    </label>
                    <Input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="h-10 rounded-xl border-slate-200 bg-slate-50 text-xs sm:text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      O PDF é convertido para base64 e enviado à API da OpenAI com um prompt específico
                      para extrair dados de paciente, procedimentos e total de repasse.
                    </p>
                  </div>

                  {file && (
                    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-slate-50 dark:bg-slate-800">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {file.name}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • PDF
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="h-9 rounded-full bg-[#135bec] px-5 text-xs font-semibold text-white hover:bg-[#0f4ac0] sm:text-sm"
                        disabled={!file || parsing}
                        onClick={handleConvert}
                      >
                        {parsing ? "Convertendo com ChatGPT..." : "Converter PDF"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-full border-slate-200 px-4 text-xs sm:text-sm dark:border-slate-700"
                        disabled={!rows.length || !header.length}
                        onClick={handleExportCsv}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Exportar CSV
                      </Button>
                    </div>

                    {parsing && (
                      <div className="space-y-1">
                        <Progress
                          value={progress}
                          className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"
                        />
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Enviando o PDF (base64) para o ChatGPT com o prompt de repasse...
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tabela de resultado */}
              <Card className="rounded-3xl border border-slate-100 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                      <TableIcon className="h-4 w-4" />
                    </span>
                    <span>Tabela extraída</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Visualize os dados estruturados (Nome do médico, período, paciente, procedimentos, total de repasse).
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto pt-1 text-xs sm:text-sm">
                  {!rows.length || !header.length ? (
                    <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                      Nenhum dado extraído ainda. Envie um PDF e clique em &quot;Converter PDF&quot;.
                    </p>
                  ) : (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-900/80">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-slate-200 text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                            {header.map((col, idx) => (
                              <TableHead key={idx}>{col || `Coluna ${idx + 1}`}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.slice(0, MAX_ROWS_PREVIEW).map((row, rowIndex) => (
                            <TableRow
                              key={rowIndex}
                              className="border-b border-slate-100 text-xs hover:bg-white dark:border-slate-800 dark:hover:bg-slate-800/60"
                            >
                              {row.map((cell, cellIndex) => (
                                <TableCell key={cellIndex}>{cell}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {rows.length > MAX_ROWS_PREVIEW && (
                        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                          Exibindo {MAX_ROWS_PREVIEW} de {rows.length} linha(s). Use o botão
                          &quot;Exportar CSV&quot; para baixar todos os dados.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminConverterPdf;