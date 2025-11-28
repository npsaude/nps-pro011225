import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SadtResumo } from "@/components/sadt/types";
import { Search, Filter, Eye, Pencil, Trash2 } from "lucide-react";

const statusLabel: Record<SadtResumo["status"], string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
};

const estagioLabel: Record<SadtResumo["estagio"], string> = {
  AGUARDANDO: "Aguardando",
  RECEBIDO: "Recebido",
  EM_FATURAMENTO: "Em faturamento",
  PAGO: "Pago",
  RETORNO_POR_GLOSA: "Retorno por glosa",
  DEFESA_POR_GLOSA: "Defesa por glosa",
};

interface SadtListProps {
  items: SadtResumo[];
  onNewClick: () => void;
  onView: (item: SadtResumo) => void;
  onEdit: (item: SadtResumo) => void;
  onDelete: (item: SadtResumo) => void;
}

const SadtList: React.FC<SadtListProps> = ({
  items,
  onNewClick,
  onView,
  onEdit,
  onDelete,
}) => {
  return (
    <Card className="h-full rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="border-b border-slate-100 bg-slate-50/80 pb-3 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold sm:text-base">
              SADTs cadastradas
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Lista de guias de SADT com status e estágio.
            </CardDescription>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Total:{" "}
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {items.length}
              </span>{" "}
              guia(s)
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="w-full min-w-[200px] sm:w-52">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                <Input
                  placeholder="Pesquisar por nº da guia ou profissional"
                  className="h-9 rounded-full border-slate-200 bg-white pl-8 pr-3 text-xs shadow-sm placeholder:text-slate-400 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-slate-200 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                Filtros
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-full bg-indigo-600 px-4 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
                onClick={onNewClick}
              >
                Nova SADT
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="mt-1 overflow-hidden rounded-b-2xl bg-white/80 dark:bg-slate-900/70">
        <div className="max-h-[520px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <TableHead className="whitespace-nowrap px-4 py-3">
                  Nº Guia Principal
                </TableHead>
                <TableHead className="whitespace-nowrap px-4 py-3">
                  Data da Autorização
                </TableHead>
                <TableHead className="whitespace-nowrap px-4 py-3">
                  Profissional Solicitante
                </TableHead>
                <TableHead className="whitespace-nowrap px-4 py-3">
                  Identificação da Operadora
                </TableHead>
                <TableHead className="whitespace-nowrap px-4 py-3">
                  Status
                </TableHead>
                <TableHead className="whitespace-nowrap px-4 py-3">
                  Estágio
                </TableHead>
                <TableHead className="whitespace-nowrap px-4 py-3 text-right">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="px-4 py-6 text-center text-xs text-slate-400"
                  >
                    Nenhuma SADT cadastrada até o momento.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-slate-50 text-xs hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/60"
                  >
                    <TableCell className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                      {item.numeroGuiaPrincipal || "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {item.dataAutorizacao || "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {item.nomeProfissionalSolicitante || "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {item.identificacaoOperadora || "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        className={
                          item.status === "ATIVO"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-700/70 dark:text-slate-200"
                        }
                      >
                        {statusLabel[item.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                        {estagioLabel[item.estagio]}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                          onClick={() => onView(item)}
                          title="Visualizar"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
                          onClick={() => onEdit(item)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-rose-300"
                          onClick={() => onDelete(item)}
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default SadtList;