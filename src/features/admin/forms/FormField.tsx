import React from "react";
import { Label } from "@/components/ui/label";

/**
 * Wrapper de campo (Label + indicador de obrigatório + controle) usado nos
 * formulários administrativos de guia. Markup preservado a partir do
 * componente `Field` duplicado nas páginas.
 */
export default function FormField({
  label,
  required,
  children,
  span,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  span?: "full" | "2";
}) {
  return (
    <div className={span === "full" ? "sm:col-span-2 lg:col-span-3" : span === "2" ? "sm:col-span-2" : ""}>
      <Label className="mb-1 block text-xs font-medium text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  );
}
