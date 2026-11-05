# Contas de clientes

O superadmin cria a família, a licença e a conta Auth do administrador principal em «Clientes → Criar cliente». A palavra-passe inicial exige 12–128 caracteres e confirmação. O cliente entra em `/login` e pode alterar a sua palavra-passe em `/perfil`, conforme a política existente para adultos. As restrições dos menores mantêm-se.

«Associar conta existente» reutiliza uma conta com e-mail confirmado e mantém a palavra-passe. Nunca altera credenciais de contas existentes. «Concluir acesso» permite ativar contas antigas ou recuperar uma criação interrompida sem duplicar a licença.

## Serviços

- A API da plataforma verifica sessão e papel de superadmin; a Edge Function `laco-create-customer` repete essas verificações com Auth e `laco_platform_access`.
- A Edge Function usa uma chave de servidor do ambiente Supabase. Nenhuma chave secreta é enviada ao navegador ou guardada no código.
- `supabase/customer_account.sql` cria uma consulta mínima de Auth, acessível apenas a `service_role`. A função privada valida esse papel (o serviço não tem `auth.uid()` de utilizador); não devolve hashes de palavras-passe.
- `verify_jwt=false` na Edge Function porque a autorização é verificada no corpo com `auth.getUser()` e a função de papéis, compatível com as chaves publishable atuais.
- A família é criada em estado `provisioning`; só fica ativa depois de associar o UUID Auth. O UUID da família serve de chave de repetição. Uma repetição nunca redefine a palavra-passe de uma conta criada anteriormente.
- Não existem transações distribuídas entre D1 e Auth: em falhas, a família fica visível como acesso por concluir. Não há eliminação automática de contas ou licenças. O utilizador pode repetir o pedido.
- As palavras-passe não são gravadas em D1, auditoria, logs ou Git. Só passam por HTTPS para a API, Edge Function e Auth.

## Verificação

`node --test tests/*.test.mjs` inclui permissões independentes na Edge Function, validação de palavras-passe antes de escritas, repetição sem duplicados, recuperação de falhas e proteção de contas existentes. Os testes usam Auth simulado e não criam clientes reais. Verificação live: endpoint sem sessão deve responder 401; a consulta Auth deve negar anon/authenticated e permitir service_role.
