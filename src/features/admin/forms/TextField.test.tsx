import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { FormAccentProvider } from "./FormAccentContext";
import TextField from "./TextField";
import type { FieldConfig } from "./field-config";

type Vals = { foo: string; obs: string };

function Harness({ config }: { config: FieldConfig<Vals> }) {
  const { register } = useForm<Vals>({ defaultValues: { foo: "", obs: "" } });
  return (
    <FormAccentProvider accent="blue">
      <TextField config={config} register={register} />
    </FormAccentProvider>
  );
}

describe("TextField", () => {
  it("renderiza um input com label e placeholder", () => {
    render(<Harness config={{ name: "foo", label: "Campo", placeholder: "digite" }} />);
    expect(screen.getByText("Campo")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("digite")).toBeInTheDocument();
  });

  it("renderiza um textarea quando multiline", () => {
    render(<Harness config={{ name: "obs", label: "Obs", multiline: true, placeholder: "texto" }} />);
    expect(screen.getByPlaceholderText("texto").tagName).toBe("TEXTAREA");
  });
});
