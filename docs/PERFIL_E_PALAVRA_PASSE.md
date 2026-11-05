# Perfil e palavra-passe — v0.5

`/perfil` mostra o nome e o e-mail verificados da conta. Todos os adultos associados, incluindo ambos os administradores familiares e o superadmin sem família, podem alterar a sua própria palavra-passe. Qualquer associação persistida como menor bloqueia a alteração em toda a conta, independentemente da família selecionada ou de user_metadata.

O formulário confirma a palavra-passe atual no Supabase, exige 12–128 caracteres, confirma a repetição e limpa os campos após a tentativa. A password segue diretamente para Supabase Auth: a API Laço não a recebe, guarda ou regista. Após a alteração, tenta terminar as outras sessões; tokens já emitidos podem permanecer válidos até expirarem.

## Restrição também na API Auth

Ocultar o botão não impediria chamadas diretas a auth.updateUser. O SQL de referência `supabase/password_guard.sql` foi aplicado como migração: um trigger BEFORE UPDATE OF encrypted_password em auth.users exige uma autorização de uso único válida durante 15 segundos. A API Laço só a emite após verificar a sessão e todas as associações familiares.

O RPC valida HMAC vinculada ao UUID autenticado, validade e nonce. A chave fica numa tabela privada sem acesso dos clientes e no segredo de runtime LACO_PASSWORD_PERMIT_SECRET. Nunca guardar o valor no Git, no manifest ou no navegador. O RPC público é invoker, as funções privilegiadas estão no esquema privado e o trigger consome as autorizações atomicamente.

A criação da password inicial não é afetada. Todas as alterações posteriores, incluindo recuperação e alterações pela API administrativa do Auth, exigem o fluxo autorizado. Ainda não existe reposição pelos responsáveis. O provisionamento Auth de novos familiares continua manual no Supabase nesta fase.

O trigger depende de auth.users.encrypted_password: revalidar em atualizações do Auth, incluindo eventuais mudanças no rehash durante login. O projeto ainda utiliza D1 para famílias e Supabase para Auth e superadmins; esta versão não migra todos os dados familiares.

Testes unitários cobrem adultos, menores, múltiplas famílias e assinatura. Testes SQL com rollback verificam recusa direta, assinatura, validade e consumo único, sem alterar passwords reais.
