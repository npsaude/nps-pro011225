import React from "react";

/**
 * Cartão de seção usado nos formulários administrativos de guia.
 *
 * Visual e markup preservados a partir do componente `Section` que era
 * duplicado em GuiaSolicitacaoForm / GuiaAutorizacaoForm / GuiaHonorariosForm.
 * A cor (`color`) continua sendo escolhida por seção (ex.: bg-blue-600).
 */
export default function FormSection({
  icon: Icon,
  color,
  title,
  children,
}: {
  icon: React.ElementType;
  color: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-white ${color}`}>
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}
