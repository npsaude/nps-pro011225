import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { FileText } from "lucide-react";
import { FormAccentProvider } from "./FormAccentContext";
import ConfiguredSection from "./ConfiguredSection";

type Vals = { a: string; b: string };

function Harness() {
  const { register } = useForm<Vals>({ defaultValues: { a: "", b: "" } });
  return (
    <FormAccentProvider accent="blue">
      <ConfiguredSection
        icon={FileText}
        color="bg-blue-600"
        title="Seção"
        fields={[
          { name: "a", label: "Campo A" },
          { name: "b", label: "Campo B" },
        ]}
        register={register}
      />
    </FormAccentProvider>
  );
}

describe("ConfiguredSection", () => {
  it("renderiza o título e todos os campos da config", () => {
    render(<Harness />);
    expect(screen.getByText("Seção")).toBeInTheDocument();
    expect(screen.getByText("Campo A")).toBeInTheDocument();
    expect(screen.getByText("Campo B")).toBeInTheDocument();
  });
});
