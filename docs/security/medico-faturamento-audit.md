# Auditoria de Segurança — Fluxo Medico Faturamento Upload

**Data:** 2026-06-04  
**Branch auditado:** `claude/relaxed-lamport-APaL5`  
**Escopo:** Edge Functions do fluxo `/medico/faturamentos/enviar` e padrões de auth/authz do lado cliente.

---

## Tabela Executiva de Achados

| # | Achado | Severidade | Impacto em uma linha |
|---|--------|------------|----------------------|
| F-1 | `git-hack` exposto sem autenticação | **Crítico** | Qualquer pessoa na internet pode reverter arquivos de código-fonte em produção |
| F-2 | Edge Functions aceitam `userId`/`faturamentoId` do body não verificado com SERVICE_ROLE_KEY | **Crítico** | Usuário autenticado qualquer pode gravar registros sob o `medico_id` de outra pessoa e modificar faturamentos alheios |
| F-3 | Chamadas `fetch()` sem cabeçalho `Authorization` (sem JWT) | **Alto** | Functions não podem verificar identidade do chamador; user ID é controlado pelo cliente |
| F-4 | Rotas `/medico/*` sem guard de papel (role guard) | **Alto** | Qualquer usuário autenticado (admin, médico de outra clínica, etc.) pode acessar o fluxo de upload |
| F-5 | Chave `anon`/publishable hardcoded no repositório | **Baixo/Info** | Esperado para chave pública Supabase; sem impacto isolado, mas combinado com F-2 eleva o risco |

---

## F-1 — Endpoint `git-hack` sem autenticação

### Evidência

**Arquivo:** `supabase/functions/git-hack/index.ts` (linhas 1–9)

```typescript
serve(async (req) => {
  const cmd = new Deno.Command("git", {
    args: ["checkout", "src/pages/MedicoUploadDescricaoCirurgica.tsx",
           "src/pages/MedicoUploadGuiaAutorizacao.tsx",
           "src/pages/MedicoUploadGuiaSolicitacao.tsx"],
  });
  const output = await cmd.output();
  return new Response(new TextDecoder().decode(output.stdout));
});
```

A função:
- Não verifica qualquer cabeçalho `Authorization`.
- Não checa `verify_jwt` (ausente no `config.toml` implícito do Deno Deploy).
- Executa diretamente `git checkout` no sistema de arquivos do container da edge function com permissões do worker Deno.

### Impacto

Qualquer ator externo pode fazer uma simples requisição `POST https://pokyribuibmbeorrcsgk.supabase.co/functions/v1/git-hack` sem credenciais e desencadear a reversão dos três arquivos de código-fonte de produção. Dependendo de quando e como os containers são reciclados, isso pode causar:

- Regressão silenciosa de código corrigido em produção.
- Sabotagem do fluxo de upload: reverter para versões comprometidas dos arquivos.
- Uso como primitiva de persistência por um atacante (manter código vulnerável ativo).

### Remediação

**Lado servidor (requer redeploy):**
1. **Remover** a function `git-hack` imediatamente — ela não tem uso legítimo em produção. Qualquer operação de deploy/rollback deve ocorrer via pipeline CI/CD, não via endpoint HTTP público.
2. Se houver necessidade de manter para uso interno: adicionar verificação de JWT e restringir ao papel `super_admin` antes de executar qualquer comando.
3. Nunca expor primitivas de execução de shell via endpoint HTTP sem autenticação e autorização rigorosas.

**Lado cliente:** Não aplicável (a vulnerabilidade é puramente no servidor).

**Classificação:** Requer exclusão/redeploy da edge function. Não pode ser mitigado pelo cliente.

---

## F-2 — `userId` e `faturamentoId` lidos do body não verificado (SERVICE_ROLE_KEY ignora RLS)

### Evidência

Padrão idêntico em todas as quatro functions de processamento:

**`supabase/functions/process-guia-solicitacao/index.ts`** (linhas 90–91, 107, 120, 403–404)
```typescript
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, serviceKey);  // ignora RLS
// ...
const { userId, faturamentoId, files } = body;  // vem do body HTTP, não do JWT
// ...
const insertGuia = {
  medico_id: userId,   // userId controlado pelo atacante
  // ...
};
```

**`supabase/functions/process-guia-autorizacao/index.ts`** (linhas 67–68, 83, 100, 429–432)
```typescript
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, serviceKey);
// ...
const { userId, faturamentoId, files } = body;
// ...
await supabase.from("faturamentos").update(updateData).eq("id", faturamentoId);
// Sem verificação se faturamentoId pertence ao userId informado
```

**`supabase/functions/process-descricao-cirurgica/index.ts`** (linhas 80–89, 100, 683, 972–977)
```typescript
const supabase = createClient(supabaseUrl, serviceKey); // SERVICE_ROLE
const { userId, faturamentoId, files } = body;
// ...
await supabase.from("faturamentos").update(updateData).eq("id", faturamentoId);
// ...
await supabase.from("itens_faturamento").insert({
  faturamento_id: faturamentoId,
  medico_id: medicoId,  // medicoId = faturamentoInfo?.medico_id ?? userId
});
```

**`supabase/functions/process-guia-honorarios/index.ts`** (linhas 87–103, 120, 473–476, 503)
```typescript
const supabase = createClient(supabaseUrl, serviceKey); // SERVICE_ROLE
const { userId, faturamentoId, files } = body;
// ...
await supabase.from("faturamentos").update(updateData).eq("id", faturamentoId);
const medicoId = faturamentoInfo?.medico_id ?? userId;
```

### Resumo do problema

| Verificação | process-guia-solicitacao | process-guia-autorizacao | process-descricao-cirurgica | process-guia-honorarios |
|-------------|:---:|:---:|:---:|:---:|
| Lê `userId` do JWT (`supabase.auth.getUser`) | ✗ | ✗ | ✗ | ✗ |
| Lê `userId` do body (não confiável) | ✓ | ✓ | ✓ | ✓ |
| Usa `SERVICE_ROLE_KEY` (bypassa RLS) | ✓ | ✓ | ✓ | ✓ |
| Verifica se `faturamentoId` pertence ao `userId` | ✗ | ✗ | ✗ | ✗ |
| Verifica JWT / Authorization header | ✗ | ✗ | ✗ | ✗ |
| `verify_jwt` habilitado | ✗ | ✗ | ✗ | ✗ |

### Impacto

Um usuário autenticado (qualquer médico com login) pode:
1. **Injeção de medico_id forjado:** Enviar `userId` = UUID de outra pessoa → registros `guia_solicitacao` / `itens_faturamento` são gravados com `medico_id` da vítima.
2. **Modificação de faturamento alheio:** Enviar `faturamentoId` = UUID de faturamento de outro médico → atualiza campos como `paciente_nome`, `cirurgiao_crm`, `url_guia_autorizacao`, etc. sem ser o dono.
3. **Consumo ilimitado de tokens OpenAI:** Disparar processamento de imagens para qualquer `faturamentoId`, gerando custo para a plataforma sem limite.
4. **Escalada de privilégio via `atuou_como`:** `process-descricao-cirurgica` grava o campo `atuou_como` no faturamento baseado no `userId` do body — atacante pode reivindicar atuação como cirurgião principal em cirurgia que não realizou.

### Remediação

**Lado servidor (requer redeploy):**
1. Derivar o `userId` do JWT verificado, nunca do body:
   ```typescript
   const authHeader = req.headers.get("Authorization");
   const jwt = authHeader?.replace("Bearer ", "") ?? "";
   // Criar cliente temporário com anon key + JWT para validar identidade
   const anonClient = createClient(supabaseUrl, anonKey);
   const { data: { user }, error } = await anonClient.auth.getUser(jwt);
   if (error || !user) return new Response("Unauthorized", { status: 401 });
   const userId = user.id;
   ```
2. Verificar que o `faturamentoId` do body pertence ao `userId` autenticado antes de processar:
   ```typescript
   const { data: fat } = await supabase
     .from("faturamentos")
     .select("medico_id")
     .eq("id", faturamentoId)
     .single();
   if (!fat || fat.medico_id !== userId) return new Response("Forbidden", { status: 403 });
   ```
3. Habilitar `verify_jwt = true` no `config.toml` de cada function para rejeitar requisições sem JWT válido na borda antes de entrar no handler.

**Lado cliente (pode ser feito sem redeploy):**
- Migrar todas as chamadas `fetch()` para `supabase.functions.invoke()`, que anexa automaticamente o JWT da sessão corrente no cabeçalho `Authorization`. Isso não corrige o F-2 no servidor, mas prepara o terreno e garante que o JWT chegue ao handler quando o servidor for corrigido.

**Classificação:** A correção definitiva requer redeploy das quatro edge functions. A migração para `supabase.functions.invoke()` no cliente é um pré-requisito que pode ser feito antes.

---

## F-3 — Chamadas `fetch()` hardcoded sem cabeçalho `Authorization`

### Evidência — Todos os call sites sem `Authorization`

| Arquivo | Linha | Function chamada |
|---------|-------|-----------------|
| `src/pages/MedicoUploadDescricaoCirurgica.tsx` | 813–825 | `process-guia-solicitacao` |
| `src/pages/MedicoUploadDescricaoCirurgica.tsx` | 1112–1125 | `process-guia-autorizacao` |
| `src/pages/MedicoUploadDescricaoCirurgica.tsx` | 1386–1398 | `process-descricao-cirurgica` |
| `src/pages/MedicoUploadGuiaAutorizacao.tsx` | 215–228 | `process-guia-autorizacao` |
| `src/pages/MedicoUploadGuiaSolicitacao.tsx` | 209–221 | `process-guia-solicitacao` |
| `src/pages/MedicoUploadSadtAcompanhamento.tsx` | 217–228 | `process-sadt-acompanhamento` |
| `src/pages/AdminConverterPdf.tsx` | 141–149 | `process-extrato-pagamento` |
| `src/components/faturamento/ProcedureReviewDialog.tsx` | 54–55 | `process-descricao-cirurgica` |
| `src/components/faturamento/SendBillingEmailsDialog.tsx` | 135–151 | `send-billing-emails` (dry-run) |
| `src/components/faturamento/SendBillingEmailsDialog.tsx` | 243–258 | `send-billing-emails` (envio real) |
| `src/services/relatorios-retorno-service.ts` | 58–59 | `process-relatorio-retorno` |

**Exemplo representativo** (`MedicoUploadDescricaoCirurgica.tsx:815`):
```typescript
const response = await fetch(functionUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",   // <-- sem Authorization
  },
  body: JSON.stringify({ userId, faturamentoId, files }),
});
```

**Exceção (call site COM Authorization):**
- `src/components/admin/CbhpmCsvImportCard.tsx:266–275` — única chamada que inclui `Authorization: Bearer ${token}`.

### Observação sobre `userId` no cliente

Nas páginas de médico, o `userId` é derivado corretamente de `supabase.auth.getUser()` (ex.: `MedicoUploadDescricaoCirurgica.tsx:756`, linha `const userId = userData.user.id`). O problema não é a obtenção do valor no cliente, mas o fato de que esse valor é enviado no body e o servidor o aceita sem verificação — tornando-o trivialmente falsificável por qualquer requisição HTTP direta.

### Impacto

- O JWT nunca chega ao servidor, logo nenhuma edge function consegue verificar a identidade do chamador com base na sessão Supabase.
- Combinado com F-2, qualquer pessoa com curl pode enviar um `userId` arbitrário sem precisar de credenciais válidas (pois `verify_jwt` também está desabilitado).

### Remediação

**Lado cliente:**
Substituir todos os `fetch()` diretos para edge functions por `supabase.functions.invoke()`:
```typescript
// Antes
const response = await fetch(
  "https://pokyribuibmbeorrcsgk.supabase.co/functions/v1/process-guia-solicitacao",
  { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
);

// Depois
const { data, error } = await supabase.functions.invoke("process-guia-solicitacao", {
  body: payload,  // supabase-js injeta automaticamente Authorization: Bearer <jwt>
});
```
Isso cobre todos os 11 call sites listados na tabela acima.

**Lado servidor:** Ver F-2 (deve ler `userId` do JWT verificado, não do body).

**Classificação:** Migração para `supabase.functions.invoke()` é client-only e pode ser feita sem redeploy. É o primeiro passo recomendado.

---

## F-4 — Rotas `/medico/*` sem guard de papel (role guard)

### Evidência

**Arquivo:** `src/App.tsx` (linhas 103–125)

```tsx
<Route path="/medico/dashboard" element={<MedicoInicio />} />
<Route path="/medico/informacoes" element={<DashboardMedico />} />
<Route path="/medico/faturamentos/enviar" element={<MedicoUploadDescricaoCirurgica />} />
<Route path="/medico/guia-autorizacao/enviar" element={<MedicoUploadGuiaAutorizacao />} />
<Route path="/medico/faturamentos" element={<MedicoFaturamentos />} />
```

Nenhuma dessas rotas está envolta por `SuperAdminGuard` ou `AdminOrSuperAdminGuard`.

**Contraste com rotas protegidas:**
```tsx
<Route path="/cadastro/gft" element={
  <AdminOrSuperAdminGuard><GftCadastro /></AdminOrSuperAdminGuard>
} />
<Route path="/admin/modelos-descricao-cirurgica" element={
  <SuperAdminGuard><AdminModelosDescricaoCirurgica /></SuperAdminGuard>
} />
```

Os guards existentes (`SuperAdminGuard.tsx`, `AdminOrSuperAdminGuard.tsx`) verificam a `regra` do usuário via `useSystemUser()`. Não existe um guard equivalente para o papel `medico` aplicado às rotas `/medico/*`.

### Impacto

- Um usuário autenticado com papel `admin` ou qualquer outro papel pode navegar diretamente para `/medico/faturamentos/enviar` e executar o fluxo de upload completo.
- No contexto de multi-tenancy (múltiplas clínicas), um médico de uma clínica pode acessar e interagir com dados de outra clínica se o controle não estiver implementado na camada de dados (RLS).
- Combinado com F-2, a ausência de guard facilita a exploração: basta ter qualquer login válido no sistema.

### Remediação

**Lado cliente:**
1. Criar um `MedicoGuard` análogo ao `SuperAdminGuard` que verifica `regra === "MEDICO"` (ou o valor correspondente no sistema):
   ```tsx
   export default function MedicoGuard({ children }) {
     const { systemUser, loading } = useSystemUser();
     const role = String(systemUser?.regra ?? "").trim().toUpperCase();
     // redirecionar se não for médico
   }
   ```
2. Envolver todas as rotas `/medico/*` com esse guard em `App.tsx`.

**Lado servidor:** A correção de F-2 (verificar JWT + ownership de `faturamentoId`) fornece a defesa em profundidade necessária mesmo que um usuário acesse a rota indevidamente.

**Classificação:** Client-only. Não requer redeploy de edge functions.

---

## F-5 — Chave `anon`/publishable hardcoded no repositório

### Evidência

**Arquivo:** `src/integrations/supabase/client.ts` (linhas 4–5)

```typescript
const SUPABASE_URL = "https://pokyribuibmbeorrcsgk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

O comentário no arquivo (`// This file is automatically generated`) confirma que este é o comportamento esperado do tooling Supabase.

### Impacto

A chave `anon` (publishable key) do Supabase é **projetada para ser pública** — ela é enviada para o navegador de qualquer usuário e está sujeita às Row Level Security policies. Expô-la no repositório não representa, por si só, um risco de segurança.

**Ressalva importante:** O risco real existe se a chave for tratada como secreta em algum lugar, ou se as RLS policies forem insuficientes. Com as vulnerabilidades F-2 descritas acima (SERVICE_ROLE_KEY nas edge functions + body não verificado), a chave anon pode ser usada para acionar as functions diretamente — o que amplifica o risco combinado.

### Remediação

Nenhuma ação necessária para esta chave especificamente. Verificar que:
- A `SERVICE_ROLE_KEY` jamais está hardcoded ou commitada (ela não foi encontrada no código-fonte auditado — correto).
- As RLS policies estão adequadas para o nível de exposição da anon key.

**Classificação:** Informativo. Nenhuma mudança necessária isoladamente.

---

## Classificação: Client-only vs. Requer Redeploy

| Achado | Correção client-only | Requer redeploy |
|--------|:---:|:---:|
| F-1 — Remover/auth-gate `git-hack` | — | **Sim** (deletar ou redeployar com auth) |
| F-2 — Derivar `userId` do JWT no servidor | — | **Sim** (todos os 4 handlers) |
| F-3 — Migrar fetch() → supabase.functions.invoke() | **Sim** (11 call sites) | — |
| F-4 — Adicionar MedicoGuard nas rotas /medico/* | **Sim** (App.tsx + novo guard) | — |
| F-5 — Chave anon no repo | — (sem ação necessária) | — |

### Ordem de execução recomendada

1. **Imediato (client, sem risco de regressão):** Migrar `fetch()` → `supabase.functions.invoke()` em todos os 11 call sites (F-3). Isso garante que o JWT chegue ao servidor como pré-requisito para F-2.
2. **Imediato (client):** Criar `MedicoGuard` e proteger rotas `/medico/*` (F-4).
3. **Redeploy coordenado:** Corrigir as 4 edge functions para ler `userId` do JWT verificado e checar ownership de `faturamentoId` (F-2).
4. **Redeploy urgente:** Deletar ou bloquear a function `git-hack` (F-1).
