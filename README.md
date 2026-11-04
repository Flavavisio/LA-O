# Laço — Sempre por perto. · v0.3

Aplicação web em HTML, CSS e JavaScript (React/Vinext), com API JavaScript e base de dados D1. A identidade visual inclui o logótipo corporativo e o ícone da app em PNG.

## Incluído

- Painel de demonstração com família fictícia, mapa ilustrativo e vista do familiar.
- Superadmin: configurar a instalação privada, criar famílias e o administrador principal por e-mail, alterar capacidade/validade e suspender/reativar famílias.
- Administradores da família: gerir familiares, segundo administrador opcional, máximo de dois administradores, lugares reservados também para contas ainda por associar.
- Os administradores contam para o número de familiares na licença. A validade é inclusiva até ao fim do dia UTC nesta versão.
- Todos os acessos são verificados no servidor. O superadmin não recebe localização familiar pelo seu perfil.
- Identidade através do início de sessão da plataforma Sites. Um e-mail preparado associa-se ao identificador estável do utilizador quando este entra. Não são enviados e-mails de convite.
- Adultos autorizam a própria partilha e podem revogá-la; a revogação elimina a última localização. A ativação e a desativação para menores exigem um administrador adulto responsável.
- Localização real apenas pelo botão explícito no navegador, com precisão e instante de atualização. Só o próprio membro pode enviar coordenadas.
- Registo real de SOS e confirmações na base de dados; os painéis abertos consultam atualizações de 15 em 15 segundos. Confirmação do administrador visível ao familiar.
- Testes de permissões/isolamento, capacidade, administradores, consentimento, localização, suspensão, SOS e telemetria de bateria.

## Primeiro acesso

A instalação mantém-se privada. Abrir Superadmin e premir “Ativar o meu superadmin” para atribuir o perfil à conta autenticada proprietária. Criar uma família com o e-mail do administrador. Se for o próprio proprietário, entrar em Visão geral e selecionar a família.

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
