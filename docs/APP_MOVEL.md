# Laço móvel — Android e iPhone

## Beta 0.6.1 — sessão e ligação à nuvem

- Mesmos endpoints de produção: Supabase Auth e API Laço em `https://laco-familia.flowy-mouse-8040.chatgpt.site`. As famílias, SOS e telemetria continuam na base de dados D1 do servidor. O login não significa que toda a base de dados tenha sido migrada para Supabase.
- O perfil permite ao adulto terminar a sessão apenas neste dispositivo. A limpeza local não depende do GPS, push ou rede; cada operação tem um prazo. Se o servidor não confirmar a revogação, a mensagem distingue isso da sessão removida localmente.
- A sessão usa armazenamento seguro com marcador persistente de saída e gerações: leituras, respostas HTTP e refreshes de uma conta antiga não podem voltar a preencher a interface nem sobrescrever um novo login. A app não reativa o acompanhamento ao sair/reabrir. Erros ao limpar o armazenamento apresentam uma opção de repetir.
- O indicador de nuvem mostra a última sincronização confirmada, sem apresentar dados em cache como uma ligação atual quando um pedido falha.
- A versão nativa é 0.6.1, build 2. O workflow compila Android, simulador iOS e um arquivo iPhone Release sem assinatura. O arquivo `.xcarchive` exige assinatura/provisionamento do proprietário antes da instalação; não é um IPA instalável nem uma publicação no TestFlight.
- Testes físicos ainda necessários: sair com e sem rede, falha das permissões, fechar/reabrir depois de sair, entrar com outra conta e confirmar que não reaparecem familiares anteriores. Não foram usados dados de login reais nos testes automatizados.

## O que existe nesta entrega

- App local em HTML/CSS/JavaScript, empacotada com Capacitor 8; projetos nativos `android/` e `ios/` gerados e sincronizados com os cinco plugins.
- Login Supabase na app, com sessão persistida em armazenamento seguro nativo. No iPhone a chave só é acessível após o primeiro desbloqueio e não migra para outro dispositivo nem para iCloud. Não há service-role key na app.
- Seleção de família, vista dos responsáveis, vista do familiar, SOS premido durante três segundos, confirmação de chegada, alertas e confirmação de resposta pelo administrador.
- Perfil com alteração de palavra-passe para adultos, incluindo superadmin; menores sem controlo de partilha ou palavra-passe na app. A API e o guard existente do Supabase mantêm as restrições.
- Localização em segundo plano usando `@capacitor-community/background-geolocation` 1.3.1, com aviso Android visível e uso de HTTP nativo. Pede leituras atuais, filtro de 25 m e rejeita leituras antigas, futuras e simuladas. A velocidade é convertida de m/s para km/h.
- A cada posição, a app volta a verificar sessão, família, licença e consentimento no servidor antes de enviar a própria posição. Envia bateria nativa quando autorizada, nas leituras GPS e nas atualizações em primeiro plano. Não há fila offline de posições ou histórico de percursos.
- A autorização de leitura GPS não é uma garantia de continuidade: depende do sistema, permissões, rede, restrições de bateria e encerramento forçado. Não se promete um intervalo fixo. Com o aparelho parado, a bateria pode ficar com uma leitura antiga; o painel mostra o instante da última atualização.
- Registo próprio de dispositivos push, limitado a cinco por conta; FCM para Android e APNs para iPhone. O mesmo token é associado a apenas um registo ativo, incluindo após troca de conta no mesmo dispositivo. Tokens não são expostos no estado da família.
- SOS e fila de notificações gravados atomicamente. Destinatários são apenas os administradores adultos da família. O superadmin global não recebe posições ou SOS de famílias de que não seja administrador.
- O envio é iniciado em `waitUntil`, após guardar o pedido. A entrega revalida licença, papel e alerta ainda aberto. Campos na API distinguem dispositivos, avisos aceites pelo fornecedor e tentativas pendentes. Aceitação pelo fornecedor não prova receção ou leitura no telefone.
- Mensagens de ecrã bloqueado são genéricas: sem nomes, coordenadas ou bateria. Push expira no fornecedor ao fim de 60 segundos. Tentativas são limitadas a três e só durante 15 minutos após o SOS. O administrador pode repetir a tentativa nos alertas da app. Não foi configurado um cron de reenvio.

## Configuração de notificações que ainda falta

### Android

1. Criar/selecionar o projeto Firebase do proprietário e registar a aplicação **pt.laco.familia**.
2. Colocar `google-services.json` em `android/app/` (ignorado pelo Git). O workflow também aceita este JSON no segredo GitHub `LACO_GOOGLE_SERVICES_JSON`.
3. Ativar FCM HTTP v1 e conceder à conta de serviço apenas a permissão necessária de envio.
4. Configurar no runtime do servidor Laço o segredo **LACO_FCM_SERVICE_ACCOUNT**, contendo o JSON da conta de serviço. Nunca colocar na app, Git, capturas de ecrã ou mensagens públicas.
5. Instalar a app num dispositivo e premir «Ativar avisos SOS» para conceder a permissão e registar o token.

### iPhone

1. No Apple Developer, registar o bundle **pt.laco.familia**, confirmar disponibilidade e ativar Push Notifications. Associar o projeto Xcode à equipa do proprietário.
2. Configurar no servidor os segredos **LACO_APNS_KEY**, **LACO_APNS_KEY_ID** e **LACO_APNS_TEAM_ID**. A chave `.p8` não vai para a app nem para Git.
3. O projeto inclui entitlements com `APS_ENVIRONMENT=development` no Debug e `production` no Release, textos de localização e modos de localização/remotes no Info.plist.
4. Builds de desenvolvimento usam tokens APNs sandbox. Antes de TestFlight/Release executar `VITE_APNS_ENV=production npm run mobile:sync`. Não confundir o token APNs com um token FCM.
5. Assinar e distribuir com a conta do proprietário. Não foram criados certificados, contas pagas, inscrições, convites ou publicações em lojas.

Sem configuração do fornecedor, o servidor mantém a tentativa em `configuration`; não apresenta uma notificação como enviada. A configuração e as chaves reais não foram disponibilizadas nesta tarefa.

## Compilar e instalar

Na raiz, com Node 24 e pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
npm test
npm run mobile:build
npm run mobile:sync
```

Android: usar Android Studio/SDK e JDK 21. Abrir com `npm run mobile:android`, executar no telefone ou compilar `android/gradlew assembleDebug`. Um APK debug é apenas para testes; assinatura de produção é trabalho separado. O wrapper foi gerado pelo Capacitor.

iPhone: usar Mac/Xcode, abrir com `npm run mobile:ios`, escolher a equipa e um dispositivo. O projeto usa SPM e deve ser sincronizado depois da instalação de dependências. Um resultado para simulador não é um IPA instalável num iPhone.

O workflow **Compilar Laço móvel** em `.github/workflows/mobile-build.yml` compila Android quando são alterados os ficheiros móveis na main e também permite execução manual (`workflow_dispatch`). Pode produzir um APK debug Android e builds iOS sem assinatura para simulador e arquivo de dispositivo. A compilação Android foi executada com sucesso no GitHub Actions e produziu um APK debug. Isso não substitui o teste físico. Os resultados e artefactos devem ser consultados no GitHub Actions.

`npm run mobile:dev` abre a interface no navegador; `?preview` usa um familiar fictício e `?preview=parent` um responsável fictício. Não pede permissões ou envia dados. Não serve para testar segundo plano ou entrega push.

## Limites operacionais e validação obrigatória no telefone

Não foi produzido um APK/IPA nesta máquina local: o wrapper Android não conseguiu descarregar Gradle (`Network is unreachable`); também não existem SDK Android/JDK 21 completos ou Xcode no ambiente. A compilação do bundle web e a sincronização de plugins não substituem uma compilação Java/Swift nem um teste físico. A pré-visualização visual gerida também não iniciou corretamente neste ambiente; não foi validada no navegador nesta entrega.

Antes de distribuir: testar localização com ecrã bloqueado, após cinco minutos em segundo plano, sem rede, depois de revogação/suspensão, com bateria reduzida e após encerramento/reabertura; testar notificações com a app aberta, em segundo plano e terminada; confirmar que os dois administradores certos recebem e que outras famílias não recebem; verificar Android 13+ e ambiente APNs sandbox/produção.

Não há proteção contra desinstalação ou bloqueio dos interruptores de localização do sistema. Isso exige supervisão/gestão do aparelho fora da app; instalar a Laço não configura esses mecanismos. Um menor não pode alterar o consentimento na Laço, mas esta versão não impede alterações nas definições do telefone. A configuração inicial de permissões deve ser acompanhada pelos responsáveis.

A fila usa reivindicação atómica para evitar envios concorrentes. Se o processo terminar depois de reclamar um trabalho, o estado `sending` exige reconciliação pelo operador; não há reenvio cego que possa duplicar o aviso. Falhas de push nunca desfazem o SOS guardado. Não há SMS ou chamada automática. O sistema ainda não está validado para uso como serviço de emergência.

As famílias e a fila continuam em D1; o Supabase mantém Auth e permissões de superadmin. Esta entrega não migra toda a aplicação para Supabase. A retenção automática dos registos de dispositivos e da fila ainda não está implementada; registos de dispositivos com mais de 30 dias sem renovação não são selecionados para novos envios.

## Fontes técnicas consultadas

- https://github.com/capacitor-community/background-geolocation
- https://capacitorjs.com/docs/apis/http
- https://capacitorjs.com/docs/apis/push-notifications
- https://capacitorjs.com/docs/getting-started/environment-setup
- https://firebase.google.com/docs/cloud-messaging/server-environment

Os 59 testes cobrem autenticação, permissões, normalização e ciclo do watcher com adaptadores falsos, transporte, isolamento de SOS, dispositivos, fila e pedidos FCM/APNs com chaves efémeras e HTTP simulado. Não usam contas reais nem enviam notificações.
