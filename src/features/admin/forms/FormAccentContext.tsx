import React, { createContext, useContext } from "react";
import { accentTokens, type AccentTokens, type FormAccent } from "./accent";

const FormAccentContext = createContext<FormAccent>("blue");

export function FormAccentProvider({
  accent,
  children,
}: {
  accent: FormAccent;
  children: React.ReactNode;
}) {
  return <FormAccentContext.Provider value={accent}>{children}</FormAccentContext.Provider>;
}

export function useFormAccent(): FormAccent {
  return useContext(FormAccentContext);
}

export function useAccentTokens(): AccentTokens {
  return accentTokens(useContext(FormAccentContext));
}
