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

import * as pdfjsLib from "pdfjs-dist";

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
   * Extrai o TEXTO do PDF usando pdfjs-dist, agrupando por linhas visuais.
   * Rodamos o pdf.js SEM worker (disableWorker: true) para evitar problemas de worker no Vite.
   */
  const extractLinesFromPdf = async (pdfFile: File): Promise<string[]> => {
    const arrayBuffer = await pdfFile.arrayBuffer();

    const anyPdf = pdfjsLib as any;
    const loadingTask = anyPdf.getDocument({
      data: arrayBuffer,
      disableWorker: true,
    });
    const pdf = await loadingTask.promise;

    const allLines: string[] = [];
    const numPages: number = pdf.numPages as number;

    for (let pageNum = 1; pageNum <= numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      type TextItem = {
        str?: string;
        transform?: number[];
      };

      const items = (textContent.items as TextItem[]) || [];

      const lineMap = new Map<number, string[]>();
      const yTolerance = 3;

      for (const item of items) {
        const str = (item.str ?? "").trim();
        if (!str) continue;

        const transform = item.transform ?? [];
        const y = typeof transform[5] === "number" ? transform[5] : null;

        if (y == null) {
          allLines.push(str);
          continue;
        }

        let targetKey: number | undefined;
        for (const key of lineMap.keys()) {
          if (Math.abs(key - y) <= yTolerance) {
            targetKey = key;
            break;
          }
        }

        if (targetKey === undefined) {
          targetKey = y;
          lineMap.set(targetKey, []);
        }

        lineMap.get(targetKey)!.push(str);
      }

      const pageLines = Array.from(lineMap.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([, parts]) => parts.join(" ").trim())
        .filter((line) => line.length > 0);

      allLines.push(...pageLines, "");
    }

    return allLines;
  };

  /**
   * Envia o TEXTO do PDF para o ChatGPT pedindo para transformar em CSV (;).
   * Isso é muito menor do que mandar o PDF em base64, evitando estourar o contexto.
   */
  const askChatGptForCsvFromText = async (
    text: string,
    token: string,
  ): Promise<string> => {
    const systemPrompt =
      "Você é um assistente especializado em ler textos extraídos de PDFs de relatórios, " +
      "extratos analíticos e tabelas (como relatórios de faturamento ou produção médica). " +
      "Sua tarefa é receber o texto bruto (sem formatação) e devolver APENAS os dados " +
      "em formato CSV, usando ponto e vírgula (;) como separador de colunas. " +
      "Sempre inclua uma linha de cabeçalho seguida pelas linhas de dados. " +
      "Não escreva nenhuma explicação, texto extra ou comentários fora do CSV.";

    const userPrompt =
      "Abaixo está o texto bruto extraído de um arquivo PDF de relatório analítico. " +
      "O texto está organizado linha a linha, mas sem a formatação original da tabela. " +
      "Interprete esse texto e devolva apenas um CSV, com colunas separadas por ';'. " +
      "Inclua cabeçalho e linhas de dados, e não escreva nada além do CSV.\n\n" +
      text;

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

      // 1) Extrai texto do PDF no navegador
      const lines = await extractLinesFromPdf(file);
      let text = lines.join("\n");

      // Opcional: se o texto for enorme, corta um pouco para evitar chegar perto do limite
      const MAX_CHARS = 100_000; // ~25k tokens aprox.
      if (text.length > MAX_CHARS) {
        text = text.slice(0, MAX_CHARS);
      }

      // 2) Pede para o ChatGPT transformar este texto em CSV
      const csvText = await askChatGptForCsvFromText(text, token);

      // 3) Converte o CSV em header + linhas para a tabela
      const { header: builtHeader, rows: builtRows } = parseCsvFromChatGpt(csvText);

      if (builtRows.length === 0) {
        showError(
          "ChatGPT não conseguiu extrair dados tabulares deste texto. Verifique o arquivo ou tente ajustar o modelo.",
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
                  Envie um PDF, o sistema extrai o texto e o ChatGPT gera um CSV tabular.
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800/70 dark:ring-slate-700 sm:flex">
              <FileDown className="mr-1.5 h-4 w-4 text-slate-400" />
              <span className="text-slate-500 dark:text-slate-300">
                Texto extraído localmente + análise de tabela com ChatGPT
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
                    Selecione o PDF que deseja converter. O texto é extraído no navegador e
                    enviado ao ChatGPT para montagem do CSV.
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
                      O conteúdo não formatado do PDF será enviado à API da OpenAI para
                      interpretação em formato tabular.
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
                          Extraindo texto do PDF e pedindo para o ChatGPT montar o CSV...
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
                    Visualize os dados estruturados obtidos pelo ChatGPT. A pré-visualização
                    mostra até {MAX_ROWS_PREVIEW} linhas.
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