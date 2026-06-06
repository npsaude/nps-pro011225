-- Permite que super_admins leiam todas as linhas de usuarios_sistema.
--
-- Contexto: a única policy de SELECT existente
-- (usuarios_sistema_select_self) restringe a leitura à própria linha do
-- usuário. Isso quebrava o cadastro de médicos (a tela "Novo médico" lista
-- usuários com regra MEDICO de usuarios_sistema), pois o super_admin não
-- conseguia ler as linhas de outros usuários.
--
-- Esta policy é ADITIVA (políticas RLS são combinadas com OR), então não
-- altera o acesso dos demais usuários. Usa is_super_admin() (SECURITY
-- DEFINER) para evitar recursão de RLS.

create policy "usuarios_sistema_select_super_admin"
on public.usuarios_sistema
for select
to authenticated
using (public.is_super_admin(auth.uid()));
