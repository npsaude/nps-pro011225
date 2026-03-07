/**
 * Hook de conveniência que expõe o SystemUserContext.
 * Todos os componentes que já importam useSystemUser continuam funcionando
 * sem alteração, mas agora compartilham o mesmo estado global — sem
 * múltiplas chamadas ao banco e sem flash de reposição no menu.
 */
import { useSystemUserContext } from "@/contexts/SystemUserContext";

export function useSystemUser() {
  return useSystemUserContext();
}
