import React from "react";
import { Save, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAccentTokens } from "./FormAccentContext";

/**
 * Estrutura compartilhada do corpo dos formulários de guia:
 * - em criação: apenas o `<form>` com as seções (children) e o rodapé;
 * - em edição: abas "Dados da Guia" + "Documentos", com o mesmo form na
 *   primeira aba e o painel de documentos (passado em `documentos`) na
 *   segunda, dentro do card padrão.
 *
 * Markup e comportamento preservados a partir das páginas.
 */
export default function AdminFormTabs({
  isEdit,
  dadosIcon: DadosIcon,
  formId,
  onSubmit,
  saving,
  onCancel,
  documentos,
  children,
  dadosLabel = "Dados da Guia",
  createLabel = "Salvar Guia",
  editLabel = "Salvar Alterações",
}: {
  isEdit: boolean;
  dadosIcon: React.ElementType;
  formId: string;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  saving: boolean;
  onCancel: () => void;
  documentos?: React.ReactNode;
  children: React.ReactNode;
  dadosLabel?: string;
  createLabel?: string;
  editLabel?: string;
}) {
  const tokens = useAccentTokens();

  const form = (
    <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-4 pb-6">
      {children}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
          className="rounded-full border-slate-300 bg-white px-6 text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className={`gap-2 rounded-full ${tokens.submitButton} px-6 text-white`}
        >
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : isEdit ? editLabel : createLabel}
        </Button>
      </div>
    </form>
  );

  if (!isEdit) {
    return form;
  }

  return (
    <Tabs defaultValue="dados" className="flex flex-col gap-4">
      <TabsList className="w-fit rounded-full bg-slate-100 p-1">
        <TabsTrigger
          value="dados"
          className="rounded-full px-5 text-sm text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
        >
          <DadosIcon className="mr-2 h-4 w-4" />
          {dadosLabel}
        </TabsTrigger>
        <TabsTrigger
          value="documentos"
          className="rounded-full px-5 text-sm text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          Documentos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dados" className="mt-0">
        {form}
      </TabsContent>

      <TabsContent value="documentos" className="mt-0">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tokens.docPanelBadge} text-white`}>
              <FolderOpen className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-semibold text-slate-700">Documentos enviados</h2>
          </div>
          {documentos}
        </div>
      </TabsContent>
    </Tabs>
  );
}
