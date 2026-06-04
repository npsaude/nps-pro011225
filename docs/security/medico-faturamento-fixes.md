# Correções de segurança — módulo medico/faturamento

Este documento descreve as correções aplicadas para os achados do relatório
`medico-faturamento-audit.md` e a ordem segura de publicação. **Nenhuma edge
function foi deployada por esta mudança** — o código está pronto para revisão
e deploy manual.

## F-1 (Crítico) — `git-hack` removida

A edge function `supabase/functions/git-hack` era um endpoint sem autenticação
que executava `git checkout` para reverter arquivos-fonte. O diretório foi
**removido do repositório**.

**Ação de deploy necessária:** remover a função do projeto Supabase (ela pode
continuar publicada mesmo após a remoção do código):

```bash
supabase functions delete git-hack --project-ref pokyribuibmbeorrcsgk
```

## F-2 (Crítico) — IDOR: `userId` vinha do body sob service-role

As funções `process-guia-solicitacao`, `process-guia-autorizacao`,
`process-descricao-cirurgica` e `process-sadt-acompanhamento` usavam a
service-role key (ignora RLS) e gravavam `medico_id` a partir do `userId`
**enviado no corpo da requisição** — permitindo que qualquer chamador gravasse
dados como outro médico.

### O que mudou
- Novo helper `supabase/functions/_shared/auth.ts`:
  - `getAuthenticatedUserId(req)` — valida o JWT do header `Authorization`
    (anexado automaticamente pelo `supabase.functions.invoke` do cliente) e
    retorna o id do usuário autenticado.
  - `resolveEffectiveUserId(authUserId, bodyUserId, fn)` — usa o id do JWT
    quando presente (caminho seguro); se um `body.userId` divergir, é ignorado
    e logado.
- Cada uma das 4 funções passou a derivar `userId` do JWT em vez do body.

### Compatibilidade (importante)
A implementação é **retrocompatível**: se não houver JWT válido, ela ainda cai
para o `body.userId`, registrando um aviso `INSEGURO, descontinuado`. Isso evita
quebra durante a transição, mas **mantém o buraco aberto enquanto o fallback
existir**. Veja "Endurecimento" abaixo.

### Ordem de deploy (evita quebra em produção)
1. **Primeiro publique o cliente** (Vercel) já contido nesta branch — todas as
   páginas medico chamam via `supabase.functions.invoke`, que anexa o JWT.
2. **Depois publique as edge functions**:
   ```bash
   supabase functions deploy process-guia-solicitacao \
     process-guia-autorizacao process-descricao-cirurgica \
     process-sadt-acompanhamento --project-ref pokyribuibmbeorrcsgk
   ```
3. Garanta que `SUPABASE_ANON_KEY` está disponível às functions (secret padrão
   do Supabase; já costuma estar).

### Endurecimento (passo final, após validar em produção)
Quando confirmar que todo o tráfego chega com JWT (logs sem o aviso
`INSEGURO`), remova o fallback em `resolveEffectiveUserId` e passe a **rejeitar
com 401** requisições sem JWT. Isso fecha definitivamente o F-2.

## F-3 (Alto) — chamadas anônimas a edge functions
Já corrigido no código do app (Fases 2 e 6): todas as páginas medico chamam as
functions via cliente tipado `supabase.functions.invoke` (JWT anexado), sem
mais `fetch` cru a URLs hardcoded. Requer apenas o deploy do cliente (passo 1
acima).

## F-4 (Alto) — rotas `/medico/*` sem guard de papel
**Não tratado nesta entrega.** Recomenda-se um `MedicoGuard` (ou checagem de
`regra`) envolvendo as rotas `/medico/*` em `src/App.tsx`, análogo aos guards
de admin já existentes. Pode ser feito como bloco isolado.

## Como testar antes do endurecimento
- Logado como Médico A, enviar um documento: deve gravar com `medico_id` = A
  (id do JWT), mesmo que o body trouxesse outro id.
- Sem `Authorization` (cliente antigo): ainda funciona (fallback) e loga o aviso
  `INSEGURO` — sinal de que ainda há cliente desatualizado em uso.
