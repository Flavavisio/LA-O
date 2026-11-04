# Laço — Sempre por perto. · v0.4

Aplicação web em HTML, CSS e JavaScript (React/Vinext), com API JavaScript e base de dados D1. A identidade visual inclui o logótipo corporativo e o ícone da app em PNG.

## Incluído

- Painel de demonstração com família fictícia, mapa ilustrativo e vista do familiar.
- Superadmin: configurar a instalação privada, criar famílias e o administrador principal por e-mail, alterar capacidade/validade e suspender/reativar famílias.
- Administradores da família: gerir familiares, segundo administrador opcional, máximo de dois administradores, lugares reservados também para contas ainda por associar.
- Os administradores contam para o número de familiares na licença. A validade é inclusiva até ao fim do dia UTC nesta versão.
- Todos os acessos são verificados no servidor. O superadmin não recebe localização familiar pelo seu perfil.
- Login por e-mail e palavra-passe com Supabase Auth em `/login`. A API verifica o token no servidor. A identidade Sites existente fica apenas como compatibilidade da pré-visualização privada. Não são enviados convites nesta entrega.
- Adultos autorizam a própria partilha e podem revogá-la; a revogação elimina a última localização. A ativação e a desativação para menores exigem um administrador adulto responsável.
- Localização real apenas pelo botão explícito no navegador, com precisão e instante de atualização. Só o próprio membro pode enviar coordenadas.
- Registo real de SOS e confirmações na base de dados; os painéis abertos consultam atualizações de 15 em 15 segundos. Confirmação do administrador visível ao familiar.
- Testes de permissões/isolamento, capacidade, administradores, consentimento, localização, suspensão, SOS e telemetria de bateria.

## Primeiro acesso

O percurso é `/` → `/login` → `/plataforma`. O mockup com dados fictícios está em `/demonstracao`. As contas têm de existir em Supabase Auth e estar associadas à família no backend; o formulário não cria contas nem atribui perfis.

A instalação publicada anteriormente mantém-se privada e não foi atualizada nesta entrega. O e-mail de bootstrap do superadmin deve ser definido no servidor em `LACO_SUPERADMIN_EMAIL`. Contas normais não podem reclamar a instalação. A migração de famílias, registos e identidades para Supabase aguarda autorização de gestão do projeto. Consulte `docs/ACESSO_E_SUPABASE.md`.

Acesso de outras pessoas depende de configurar uma audiência adequada e o fluxo de autenticação para o lançamento. Não publicar uma instalação sem superadmin configurado. Nesta entrega, a audiência privada fica preservada.

## Limites desta versão

Não é uma app móvel pronta para emergências. Não inclui localização contínua em segundo plano, push, SMS, chamada automática, deteção de chegada/saída real, cobrança, pairing móvel, proteção contra desinstalação, recuperação independente de conta ou transferência de administrador principal. Não há históricos reais de percurso: conserva-se apenas a última posição até revogar/remover a pessoa. Retenção automática, eliminação integral de conta, exportação e revisão jurídica são trabalho de preparação do lançamento.

Os locais seguros e o mapa demonstrativo são apenas dados de exemplo e não geram alertas. Velocidade e bateria na demonstração são fictícias. Não prometer precisão exata, entrega garantida de SOS ou impossibilidade universal de desinstalação.

A v0.2 acrescenta leitura de bateria no navegador compatível e adaptador oficial Capacitor, persistência da percentagem/estado de carga/data, isolamento, autorização explícita e eliminação ao revogar. Consulte `docs/BATERIA_E_INTEGRACAO_MOVEL.md`. O visual aprovado é preservado. Esta entrega é guardada sem deploy.

No Android, monitorização parental deve ser transparente. A monitorização familiar de adultos requer uma experiência de partilha voluntária distinta, a validar para distribuição nas lojas.

## Desenvolvimento

`npm run dev` — desenvolvimento pela infraestrutura Sites.

`npm test` — testes usando SQLite em memória (Node >=24).

`npm run db:generate` — criar futuras migrações após alteração de db/schema.ts. Migrações já aplicadas são imutáveis.

`npm run build` — compilar app e Worker. Seguir a configuração Sites para publicar, preservando a identidade em .openai/hosting.json e as migrações.

## Próxima fase móvel

Empacotamento nativo (por exemplo Capacitor), permissões/background location de cada sistema, identidade apropriada às contas familiares, notificações push com confirmação e tentativas adicionais de entrega, associação segura de dispositivos, locais seguros reais, retenção configurável e proteção parental oficial. As partilhas voluntárias de adultos não usam os bloqueios parentais de menores.

A v0.3 torna a partilha do menor exclusivamente controlada pelos administradores: sem interruptor para o menor, com proteção na API para ambos os estados. Consulte `docs/CONTROLO_LOCALIZACAO_MENORES.md` para distinguir este controlo do bloqueio das definições globais do telemóvel.

A v0.4 acrescenta o index em `/`, login Supabase em `/login`, painel autenticado em `/plataforma` e o mockup em `/demonstracao`. O login usa a chave pública fornecida, mas a migração dos dados D1 para Supabase e o aprovisionamento de contas ainda dependem do acesso de gestão. Consulte `docs/ACESSO_E_SUPABASE.md`. Não foi feito deploy.
