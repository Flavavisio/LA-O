# Entrada pública da Laço

O endereço principal `/` apresenta o index. Os botões «Aceder à plataforma» abrem `/login`; após autenticação Supabase, o utilizador entra em `/plataforma`. O index e a demonstração não contêm dados familiares reais.

O alojamento deve estar em modo público para não interpor o ecrã de login do ChatGPT antes do index. A API exige sempre um bearer verificado pelo Supabase, com permissões atuais: a identidade do alojamento deixou de conceder acesso ou permitir configuração inicial de superadmin. Esta alteração deve ser publicada antes de tornar o index público.

O superadmin continua definido na base de dados privada do Supabase. Famílias, licenças, localização e SOS mantêm as autorizações existentes. Visitar a página inicial não concede acesso aos dados.
