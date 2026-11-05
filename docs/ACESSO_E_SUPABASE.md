# Laço v0.4 — Início, login e plataforma

## Percurso de acesso

- `/`: página inicial (index) com identidade Laço e botão Aceder à plataforma.
- `/login`: autenticação por e-mail e palavra-passe através de Supabase Auth.
- `/plataforma`: verifica a sessão e mostra o painel existente. O perfil e as famílias são determinados pelo servidor; o formulário não permite escolher privilégios.
- `/demonstracao`: experiência com dados fictícios, preservando o mockup aprovado.

A plataforma redireciona sessões ausentes/expiradas para o login. Cada API verifica independentemente o token com `auth.getUser(token)`; não considera um JWT decodificado nem metadados editáveis como prova de autorização. O cliente só envia o bearer para os endpoints internos de estado/ação.

## Projeto e chave

Projeto: `ivuhuhegclsxfxaanmyc`. A URL e a publishable key fornecida pelo proprietário são públicas e estão em `lib/supabase/config.js`. Não existe service-role/secret key no frontend. Supabase Auth é o fornecedor de login para o percurso novo. A identidade Sites é conservada apenas como compatibilidade da pré-visualização privada existente.

A chave foi testada no endpoint público de configuração de autenticação: HTTP 200 e autenticação de e-mail ativa. Não foram criados utilizadores, alteradas configurações nem enviados e-mails.

## O que ainda depende de acesso de gestão

A aplicação de gestão v0.3 conserva os registos na base D1 existente. Esta entrega NÃO declara a migração dos registos para Supabase concluída. O acesso de gestão ao projeto já foi autorizado. As estruturas privadas de superadmin e auditoria foram aplicadas; a migração do domínio familiar ainda está pendente.

Após a autorização do projeto, falta concluir:

1. Inspecionar as tabelas e utilizadores existentes.
2. Criar/migrar famílias, membros, licenças, permissões e telemetria com RLS.
3. Ligar a criação de contas pelo superadmin aos utilizadores de Supabase Auth.
4. Definir o superadmin, associar identidades antigas de forma controlada e configurar URLs de redirecionamento/convite.

Autenticar no Supabase, por si só, não atribui uma família ou perfil de administrador. Sem associação, a conta fica sem família. O formulário não tem registo público. O endpoint remoto de Auth pode ter registo público ativo na configuração do projeto; contas assim criadas continuam sem privilégios na Laço.

## Superadmin e migração de identidade

A reserva inicial é guardada na tabela privada Supabase e associada apenas após confirmação do endereço pela conta Auth. O backend consulta o papel atual através de RPC; `LACO_SUPERADMIN_EMAIL` deixou de ser utilizado para conceder o perfil no percurso Supabase. O superadmin pode posteriormente acrescentar/substituir outros, com proteção do último administrador ativo. Um utilizador normal não pode reclamar a instalação. Consulte `docs/SUPERADMIN_INICIAL.md`.

Não substituir automaticamente o superadmin atual nem reassociar membros que já tenham um identificador de outro fornecedor. A migração de identidades tem de ser explícita após inspeção dos dados.

## Publicação

Código preparado para deploy posterior. Nenhum deploy feito nesta entrega. O Site existente continua privado; para um index acessível sem ChatGPT é necessário escolher um alojamento/audiência apropriados na fase de publicação, com o login Supabase e as permissões familiares validados.

