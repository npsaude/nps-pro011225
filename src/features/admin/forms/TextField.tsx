import type { FieldValues, UseFormRegister } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import FormField from "./FormField";
import type { FieldConfig } from "./field-config";
import { useAccentTokens } from "./FormAccentContext";
import { INPUT_BASE, TEXTAREA_BASE } from "./field-styles";

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
