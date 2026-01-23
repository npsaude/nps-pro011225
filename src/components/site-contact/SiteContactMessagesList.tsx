import { useEffect, useMemo, useState } from "react";
import { Eye, MessageCircle, Search, Trash2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { showError, showSuccess } from "@/utils/toast";
import {
  excluirSiteContactMessage,
  listarSiteContactMessages,
  type SiteContactMessage,
} from "@/services/site-contact-messages-service";

function safeLower(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function formatDateTimeBR(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  const date = d.toLocaleDateString("pt-BR");
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} ${time}`;
}

export default function SiteContactMessagesList() {
  const [rows, setRows] = useState<SiteContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const term = safeLower(search);
    if (!term) return rows;

    return rows.filter((r) => {
      return (
        safeLower(r.name).includes(term) ||
        safeLower(r.email).includes(term) ||
        safeLower(r.whatsapp).includes(term) ||
        safeLower(r.city).includes(term) ||
        safeLower(r.uf).includes(term) ||
        safeLower(r.message).includes(term)
      );
    });
  }, [rows, search]);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<SiteContactMessage | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const data = await listarSiteContactMessages();
        setRows(data);
      } catch (e) {
        showError(
          e instanceof Error ? e.message : "Não foi possível carregar as mensagens.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const openView = (row: SiteContactMessage) => {
    setViewing(row);
    setViewOpen(true);
  };

  const handleDelete = async (row: SiteContactMessage) => {
    try {
      await excluirSiteContactMessage(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      showSuccess("Mensagem excluída com sucesso.");
    } catch (e) {
      showError(
        e instanceof Error ? e.message : "Não foi possível excluir a mensagem.",
      );
    }
  };

  return (
    <>
      <Card className="h-full rounded-3xl border border-slate-100 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80 pb-3 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:text-base">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <span>Formulário do Site</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Base: site_contact_messages
              </CardDescription>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Total:{" "}
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {rows.length}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="w-full min-w-[220px] sm:w-80">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Buscar por nome, e-mail, whatsapp, cidade, UF ou mensagem..."
                    className="h-9 rounded-full border-slate-200 bg-white pl-9 text-xs shadow-sm placeholder:text-slate-400 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="mt-1 overflow-hidden rounded-b-2xl bg-white/90 dark:bg-slate-900/80">
          {loading ? (
            <p className="px-4 py-6 text-xs text-slate-500 dark:text-slate-400">
              Carregando mensagens...
            </p>
          ) : (
            <div className="max-h-[560px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <TableHead className="px-4 py-3">Contato</TableHead>
                    <TableHead className="px-4 py-3">Local</TableHead>
                    <TableHead className="px-4 py-3">Enviado em</TableHead>
                    <TableHead className="px-4 py-3 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="px-4 py-6 text-center text-xs text-slate-400"
                      >
                        Nenhuma mensagem encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => (
                      <TableRow
                        key={r.id}
                        className="border-b border-slate-50 text-xs hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/60"
                      >
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900 dark:text-slate-50">
                              {r.name}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              {r.email}
                              {r.whatsapp ? ` • ${r.whatsapp}` : ""}
                            </span>
                            <span className="mt-1 line-clamp-1 text-[11px] text-slate-400 dark:text-slate-500">
                              {r.message}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {r.city}
                          {r.uf ? ` / ${r.uf}` : ""}
                        </TableCell>

                        <TableCell className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {formatDateTimeBR(r.created_at)}
                        </TableCell>

                        <TableCell className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
                            onClick={() => openView(r)}
                            title="Visualizar"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="ml-1 h-7 w-7 rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-rose-300"
                                title="Excluir"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Excluir mensagem?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. A mensagem de{" "}
                                  <span className="font-medium">
                                    {r.name}
                                  </span>{" "}
                                  será removida.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => void handleDelete(r)}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setViewing(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mensagem do Formulário</DialogTitle>
            <DialogDescription>
              Detalhes do contato recebido pelo site.
            </DialogDescription>
          </DialogHeader>

          {viewing ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Nome
                  </p>
                  <p className="mt-1 text-sm">{viewing.name}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Enviado em
                  </p>
                  <p className="mt-1 text-sm">
                    {formatDateTimeBR(viewing.created_at)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    E-mail
                  </p>
                  <p className="mt-1 text-sm">{viewing.email}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    WhatsApp
                  </p>
                  <p className="mt-1 text-sm">{viewing.whatsapp || "—"}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 sm:col-span-2 dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Local
                  </p>
                  <p className="mt-1 text-sm">
                    {viewing.city}
                    {viewing.uf ? ` / ${viewing.uf}` : ""}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Mensagem
                </p>
                <ScrollArea className="mt-2 max-h-64 rounded-xl bg-white/70 p-3 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:ring-slate-800">
                  <p className="whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-50">
                    {viewing.message}
                  </p>
                </ScrollArea>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  className="rounded-full"
                  onClick={() => {
                    setViewOpen(false);
                    setViewing(null);
                  }}
                >
                  Fechar
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}