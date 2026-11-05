# Superadmin inicial e futura substituição

O proprietário indicou um e-mail para o superadmin inicial. A reserva foi guardada exclusivamente na base privada do projeto, sem publicar o endereço no repositório.

## Estado

- Aplicadas as estruturas privadas de superadmins e auditoria, com RLS.
- Reservado o e-mail inicial. Ainda não existe um utilizador em Supabase Auth para essa reserva.
- A associação só acontece depois de a conta existir e o endereço estar confirmado no registo atual de Auth. Uma alegação de e-mail no JWT ou nos metadados não chega.
- O backend passa a consultar `laco_platform_access()` para o perfil de plataforma. Uma falha nessa consulta bloqueia a operação; não reaproveita privilégios antigos.
- A interface aprovada não foi alterada. Não foi feito deploy da aplicação.

## Mais tarde

`laco_set_platform_admin(target_email, allow_access)` permite reservar/adicionar e revogar superadmins, exigindo um superadmin autenticado. Não existe um único superadmin fixo no código. Não é possível remover o último superadmin associado e ativo sem outro já ativado. O processo deixa um registo de auditoria privado. A interface específica desta gestão ainda não foi criada.

## Ativação e limites

A conta Auth inicial ainda precisa de ser criada e de confirmar o endereço antes de poder entrar como superadmin. Não foi definida uma palavra-passe pelo agente nem enviado um convite por e-mail nesta etapa.

Esta configuração trata apenas da administração da plataforma. A migração das famílias, licenças e telemetria da base anterior para Supabase continua pendente.

## Verificação

Testados o isolamento da tabela de papéis, a ausência de acesso anónimo, a recusa de privilégio por uma identidade inexistente mesmo alegando o e-mail reservado, e a revogação/substituição de permissões no serviço. Os advisors de segurança não apresentam avisos.

Os SQL em `supabase/` documentam as estruturas já aplicadas. Não os executar novamente numa base onde estas funções/tabelas já existem. O registo pessoal inicial foi inserido separadamente e não faz parte dos SQL públicos.
