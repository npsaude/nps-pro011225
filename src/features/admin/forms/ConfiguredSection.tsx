import React from "react";
import type { FieldValues, UseFormRegister } from "react-hook-form";
import FormSection from "./FormSection";
import TextField from "./TextField";
import type { FieldConfig } from "./field-config";

/**
 * Seção dirigida por config: um `FormSection` que mapeia uma lista de
 * `FieldConfig` para `TextField`. Para seções irregulares (Select, grupos
 * repetidos), use `FormSection` diretamente com `children` (escape hatch).
 *
 * `extra` permite anexar conteúdo customizado após os campos regulares.
 */
export default function ConfiguredSection<T extends FieldValues>({
  icon,
  color,
  title,
  fields,
  register,
  extra,
}: {
  icon: React.ElementType;
  color: string;
  title: string;
  fields: FieldConfig<T>[];
  register: UseFormRegister<T>;
  extra?: React.ReactNode;
}) {
  return (
    <FormSection icon={icon} color={color} title={title}>
      {fields.map((config) => (
        <TextField key={config.name} config={config} register={register} />
      ))}
      {extra}
    </FormSection>
  );
}
