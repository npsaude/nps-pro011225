import type { FieldValues, Path } from "react-hook-form";

/**
 * Descritor de um campo regular (input/textarea) dentro de uma seção.
 * Mapeia diretamente para um `<TextField>`.
 */
export interface FieldConfig<T extends FieldValues> {
  name: Path<T>;
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: "text" | "date" | "time" | "number";
  span?: "full" | "2";
  maxLength?: number;
  step?: string;
  min?: string;
  /** Renderiza um Textarea no lugar de um input. */
  multiline?: boolean;
  /** Linhas do Textarea (apenas quando multiline). */
  rows?: number;
}
