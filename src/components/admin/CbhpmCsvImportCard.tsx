import { useMemo, useRef, useState } from "react";
import { edgeFunctionUrl } from "@/config/supabase";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

type ParsedRow = {
  codigo: string;
  descricao: string;
  porte?: string | null;
  valor_porte?: number | null;
  porte_anestesico?: string | null;
  incidencia?: string | null;
  n_auxiliares?: number | null;
  video?: string | null;
};

function normalizeHeader(text: string) {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function parseDecimalPtBr(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  // remove separador de milhar e troca decimal
  const normalized = v.replace(/\./g, "").replace(/,/g, ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseCsv(content: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i++;
      current.push(field);
      field = "";
      // evita linhas vazias
      if (current.some((c) => c.trim().length > 0)) rows.push(current);
      current = [];
      continue;
    }

    if (!inQuotes && (ch === ";" || ch === ",")) {
      current.push(field);
      field = "";
      continue;
    }

    field += ch;
  }

  // last field
  current.push(field);
  if (current.some((c) => c.trim().length > 0)) rows.push(current);

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);

  return { headers, rows: dataRows };
}

function mapRows(headers: string[], rows: string[][]): ParsedRow[] {
  const headerMap = new Map<number, string>();

  headers.forEach((h, idx) => {
    const key = normalizeHeader(h);
    headerMap.set(idx, key);
  });

  // Mapeamento tolerante de nomes de colunas
  const col = {
    codigo: new Set(["codigo", "codigoprocedimento", "cod", "codigotuss", "codigocbhpm"]),
    descricao: new Set(["descricao", "descricaoprocedimento", "procedimento", "nome", "descr"]),
    porte: new Set(["porte"]),
    valorPorte: new Set(["valorporte", "valor_porte", "valor"]),
    porteAnestesico: new Set(["porteanestesico", "porte_anestesico"]),
    incidencia: new Set(["incidencia"]),
    nAux: new Set(["nauxiliares", "n_auxiliares", "auxiliares"]),
    video: new Set(["video"]),
  };

  const pick = (idx: number, value: string) => {
    const key = headerMap.get(idx) ?? "";
    const v = value?.trim() ?? "";

    if (col.codigo.has(key)) return { field: "codigo" as const, value: v };
    if (col.descricao.has(key)) return { field: "descricao" as const, value: v };
    if (col.porte.has(key)) return { field: "porte" as const, value: v };
    if (col.valorPorte.has(key)) return { field: "valor_porte" as const, value: v };
    if (col.porteAnestesico.has(key)) return { field: "porte_anestesico" as const, value: v };
    if (col.incidencia.has(key)) return { field: "incidencia" as const, value: v };
    if (col.nAux.has(key)) return { field: "n_auxiliares" as const, value: v };
    if (col.video.has(key)) return { field: "video" as const, value: v };

    return null;
  };

  const parsed: ParsedRow[] = [];

  for (const r of rows) {
    const obj: ParsedRow = { codigo: "", descricao: "" };

    for (let i = 0; i < headers.length; i++) {
      const p = pick(i, r[i] ?? "");
      if (!p) continue;

      if (p.field === "codigo") obj.codigo = p.value;
      else if (p.field === "descricao") obj.descricao = p.value;
      else if (p.field === "porte") obj.porte = p.value || null;
      else if (p.field === "valor_porte") obj.valor_porte = parseDecimalPtBr(p.value);
      else if (p.field === "porte_anestesico") obj.porte_anestesico = p.value || null;
      else if (p.field === "incidencia") obj.incidencia = p.value || null;
      else if (p.field === "n_auxiliares") {
        const n = Number.parseInt(p.value, 10);
        obj.n_auxiliares = Number.isFinite(n) ? n : null;
      } else if (p.field === "video") obj.video = p.value || null;
    }

    const codigo = obj.codigo.trim();
    const descricao = obj.descricao.trim();
    if (!codigo || !descricao) continue;

    parsed.push({
      ...obj,
      codigo,
      descricao,
    });
  }

  return parsed;
}

export default function CbhpmCsvImportCard() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);

  const total = parsedRows?.length ?? 0;

  const stats = useMemo(() => {
    if (!parsedRows) return null;

    const codigos = new Set<string>();
    let duplicatesInFile = 0;

    for (const r of parsedRows) {
      if (codigos.has(r.codigo)) duplicatesInFile++;
      codigos.add(r.codigo);
    }

    return {
      total: parsedRows.length,
      unique: codigos.size,
      duplicatesInFile,
    };
  }, [parsedRows]);

  const reset = () => {
    setFileName(null);
    setParsedRows(null);
    setProgress(0);
    setProcessed(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handlePickFile = () => inputRef.current?.click();

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showError("Envie um arquivo .csv");
      return;
    }

    setIsParsing(true);
    setParsedRows(null);
    setProgress(0);
    setProcessed(0);

    try {
      setFileName(file.name);
      const text = await file.text();
      const parsed = parseCsv(text);

      if (!parsed.headers.length) {
        throw new Error("Não foi possível ler o cabeçalho do CSV.");
      }

      const rows = mapRows(parsed.headers, parsed.rows);
      if (rows.length === 0) {
        throw new Error("Nenhuma linha válida encontrada (campos código/descrição).");
      }

      // Dedup no próprio arquivo (mantém a última ocorrência)
      const byCodigo = new Map<string, ParsedRow>();
      for (const r of rows) byCodigo.set(r.codigo, r);
      setParsedRows(Array.from(byCodigo.values()));

      showSuccess("CSV carregado. Pronto para importar.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível ler o CSV.";
      showError(message);
      reset();
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parsedRows || parsedRows.length === 0) {
      showError("Selecione um CSV antes de importar.");
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setProcessed(0);

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (sessionErr || !token) {
        showError("Faça login novamente para importar.");
        return;
      }

      const batchSize = 400;
      let done = 0;

      for (let i = 0; i < parsedRows.length; i += batchSize) {
        const batch = parsedRows.slice(i, i + batchSize);

        const resp = await fetch(
          edgeFunctionUrl("import-cbhpm-csv"),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ rows: batch }),
          },
        );

        let json: any = null;
        try {
          json = await resp.json();
        } catch {
          // ignore
        }

        if (!resp.ok || json?.error) {
          const msg = json?.error ?? "Erro ao importar a tabela CBHPM.";
          throw new Error(msg);
        }

        done += batch.length;
        setProcessed(done);
        setProgress(Math.round((done / parsedRows.length) * 100));
      }

      showSuccess("Importação concluída com sucesso.");
      reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao importar a tabela CBHPM.";
      showError(message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Upload className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">Importar tabela CBHPM (CSV)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Envie um arquivo .csv para gravar em{" "}
            <code className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[11px] text-primary">
              public.cbhpm_cirurgias
            </code>
            . Duplicadas (mesmo código) serão substituídas.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Arquivo
            </p>
            <p className="text-sm text-foreground">
              {fileName ?? <span className="text-muted-foreground">Nenhum arquivo selecionado</span>}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
              disabled={isParsing || isImporting}
            />
            <Button
              type="button"
              variant="outline"
              className="h-9 px-4 text-xs sm:text-sm"
              onClick={handlePickFile}
              disabled={isParsing || isImporting}
            >
              {isParsing ? "Lendo..." : "Selecionar CSV"}
            </Button>
            <Button
              type="button"
              className="h-9 px-4 text-xs sm:text-sm"
              onClick={() => void handleImport()}
              disabled={isParsing || isImporting || !parsedRows?.length}
            >
              {isImporting ? "Importando..." : "Importar"}
            </Button>
          </div>
        </div>

        {stats && (
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-[11px] text-muted-foreground">Linhas válidas</p>
                <p className="text-sm font-semibold text-foreground">{stats.total}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Códigos únicos</p>
                <p className="text-sm font-semibold text-foreground">{stats.unique}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Duplicadas no arquivo</p>
                <p className="text-sm font-semibold text-foreground">{stats.duplicatesInFile}</p>
              </div>
            </div>

            <div className="mt-3 flex items-start gap-2 text-[11px] text-muted-foreground">
              {stats.duplicatesInFile > 0 ? (
                <>
                  <AlertCircle className="mt-0.5 h-4 w-4 text-amber-400" />
                  <p>
                    Encontramos duplicadas no CSV. O sistema mantém a <strong>última ocorrência</strong> de cada código antes de enviar.
                  </p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                  <p>Arquivo sem duplicadas por código. Pronto para importar.</p>
                </>
              )}
            </div>
          </div>
        )}

        {(isImporting || processed > 0) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Progresso: {processed}/{total}
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}
      </div>
    </div>
  );
}