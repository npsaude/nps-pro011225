import type { FieldValues, UseFormRegister } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import FormField from "./FormField";
import type { FieldConfig } from "./field-config";
import { useAccentTokens } from "./FormAccentContext";

/**
 * Classe base do input, sem as classes de foco que dependem do accent.
 * Extraída verbatim do `inputCls` duplicado nas páginas.
 */
const INPUT_BASE =
  "h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-1 w-full";

const TEXTAREA_BASE =
  "resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-1";

/**
 * Campo regular (Label + input/textarea registrado via react-hook-form),
 * dirigido por um `FieldConfig`. A cor de foco vem do accent do formulário
 * (via contexto), preservando a aparência por página.
 */
export default function TextField<T extends FieldValues>({
  config,
  register,
}: {
  config: FieldConfig<T>;
  register: UseFormRegister<T>;
}) {
  const tokens = useAccentTokens();
  const { name, label, required, placeholder, type, span, maxLength, step, min, multiline, rows } =
    config;

  return (
    <FormField label={label} required={required} span={span}>
      {multiline ? (
        <Textarea
          {...register(name)}
          rows={rows}
          placeholder={placeholder}
          className={`${TEXTAREA_BASE} ${tokens.inputFocus}`}
        />
      ) : (
        <input
          {...register(name)}
          type={type}
          placeholder={placeholder}
          maxLength={maxLength}
          step={step}
          min={min}
          className={`${INPUT_BASE} ${tokens.inputFocus}`}
        />
      )}
    </FormField>
  );
}
