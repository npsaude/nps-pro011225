import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileDown,
  FileText,
  Table as TableIcon,
  UploadCloud,
} from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { showError, showSuccess } from "@/utils/toast";

type ParsedRow = {
  coluna1: string;
  coluna2: string;
  coluna3: string;
};

const AdminConverterPdf = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) {
      setFile(null);
      setRows([]);
      return;
    }

    if (selected.type !== "application/pdf") {
      showError("Envie apenas arquivos PDF.");
      setFile(null);
      setRows([]);
      return;
    }

    setFile(selected);
    setRows([]);
  };

  const simulateProgress = () => {
    setProgress(0);
    let value = 0;
    const step = () => {
      value += 15;
      if (value >= 100) {
        setProgress(100);
        return;
      }
      setProgress(value);
      window.setTimeout(step, 250);
    };
    step();
  };

  // Aqui é o ponto onde, no futuro, você pode plugar Docling via backend (Edge Function ou API própria).
  const handleConvert = async () => {
    if (!file) {
      showError("Selecione um PDF para converter.");
      return;
    }

    setParsing(true);
    simulateProgress();

    try {
      // Hoje: mock de conversão.
      // Futuro: enviar `file` para uma API com Docling e receber linhas estruturadas.
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const fakeRows: ParsedRow[] = [
        {
          coluna1: "Linha 1",
          coluna2: "Dado extraído do PDF",
          coluna3: file.name,
        },
        {
          coluna1: "Linha 2",
          coluna2: "Outro campo interpretado",
          coluna3: "Página 1",
        },
        {
          coluna1: "Linha 3",
          coluna2: "Exemplo de código/valor",
          coluna3: "R$ 1.250,00",
        },
      ];

      setRows(fakeRows);
      showSuccess("PDF processado com sucesso (mock de Docling).");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível converter o PDF.";
      showError(message);
    } finally {
      setParsing(false);
      setProgress(100);
    }
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
                  Converter PDF
                </h1>
                <p className="text-xs text-slate-400 sm:text-sm">
                  Envie um arquivo PDF para extrair os dados em formato de tabela.
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800/70 dark:ring-slate-700 sm:flex">
              <FileDown className="mr-1.5 h-4 w-4 text-slate-400" />
              <span className="text-slate-500 dark:text-slate-300">
                Conversão via motor externo (Docling/IA)
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
                    Selecione o PDF que deseja converter. No futuro, esta etapa poderá usar Docling no backend.
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
                      Suporta arquivos PDF até o limite configurado no servidor.
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
                    <Button
                      type="button"
                      className="h-9 w-full rounded-full bg-[#135bec] text-xs font-semibold text-white hover:bg-[#0f4ac0] sm:w-auto sm:px-6 sm:text-sm"
                      disabled={!file || parsing}
                      onClick={handleConvert}
                    >
                      {parsing ? "Convertendo..." : "Converter PDF"}
                    </Button>
                    {parsing && (
                      <div className="space-y-1">
                        <Progress
                          value={progress}
                          className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"
                        />
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Analisando estrutura do PDF e extraindo possíveis tabelas...
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
                    Visualize aqui os dados estruturados obtidos do PDF.
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto pt-1 text-xs sm:text-sm">
                  {rows.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                      Nenhum dado extraído ainda. Envie um PDF e clique em &quot;Converter PDF&quot;.
                    </p>
                  ) : (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-900/80">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-slate-200 text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                            <TableHead>Coluna 1</TableHead>
                            <TableHead>Coluna 2</TableHead>
                            <TableHead>Coluna 3</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((row, index) => (
                            <TableRow
                              key={index}
                              className="border-b border-slate-100 text-xs hover:bg-white dark:border-slate-800 dark:hover:bg-slate-800/60"
                            >
                              <TableCell>{row.coluna1}</TableCell>
                              <TableCell>{row.coluna2}</TableCell>
                              <TableCell>{row.coluna3}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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