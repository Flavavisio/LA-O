# Laço v0.2 — Bateria e preparação móvel

O visual aprovado da v0.1 é preservado. O estado real da bateria ocupa o mesmo espaço do indicador de exemplo, junto do familiar. A fotografia de interface não é um teste de leitura num equipamento real.

## Funcionamento implementado

1. O familiar autentica-se e seleciona a sua família.
2. A autorização de partilha explica expressamente localização e bateria. Adultos aceitam pela própria conta; responsáveis autorizam para menores.
3. A página visível lê a bateria a cada minuto. Num navegador usa `navigator.getBattery` apenas se disponível. Num contentor nativo Capacitor usa o plugin oficial `@capacitor/device`, já incluído nas dependências, por `Device.getBatteryInfo()`.
4. O servidor recebe `type: battery`, `battery: 0..100`, `charging: boolean`, `source: web|native`. A família vem do contexto escolhido e o membro é sempre o utilizador autenticado, nunca um alvo arbitrário enviado pelo cliente.
5. O instante da leitura é atribuído pelo servidor. Bateria e localização têm instantes separados: atualizar a bateria nunca torna uma localização antiga aparentemente recente.
6. Leitura inexistente permanece indisponível; 0% é uma leitura válida. A carregar mostra o ícone de energia. Ao passar cinco minutos, a última bateria fica assinalada como antiga no título acessível e nos detalhes.
7. Sem ligação ou com a página oculta, não envia. Ao regressar, obtém uma leitura atual. Não guarda leituras para reenviar mais tarde como se fossem recentes.
8. Revogar a partilha interrompe o emissor, cancela envios pendentes e elimina a última localização e bateria. O servidor volta a verificar autorização e licença no momento da gravação.

## Compatibilidade e consentimento

A API web não é universal; não permite prometer bateria em todos os browsers. O adaptador nativo resolve a leitura dentro de uma futura aplicação nativa que sincronize o plugin Capacitor. A existência do adaptador não equivale a um APK/IPA compilado ou testado.

Consentimentos antigos, dados só para localização na v0.1, não ativam automaticamente a bateria. A migração cria `battery_consent=0`; é necessária nova autorização explícita no controlo existente de partilha.

## Perfis e limites mantidos

Superadmin, administrador principal, segundo administrador opcional e familiares. A licença conta pessoas, incluindo os administradores. Os limites e o isolamento familiar continuam verificados pelo servidor. O superadmin não recebe telemetria pelo seu perfil de plataforma.

## Migrações para o próximo deploy

Aplicar as migrações pendentes na ordem do diário Drizzle. A 0000 pertence à v0.1 e não foi alterada. A 0001 acrescenta as quatro colunas de bateria (valores nulos para dados antigos). A 0002 acrescenta a autorização específica com valor inicial zero. Não recriar ou apagar a base de dados existente. O pacote desta versão contém ambas as migrações novas.

## Validação realizada

Testes de permissões e SQLite, validação de leituras web/nativas por adaptadores simulados, ciclos de pausa/retoma, cancelamento de pedidos e separação de dados. A compilação confirma os imports oficiais Capacitor na aplicação web.

Continuam por validar em equipamento: leitura iOS e Android reais, empacotamento e assinatura, associação ao dispositivo, autenticação adequada ao público familiar, localização/background, notificações push e proteção parental contra desinstalação. Estes pontos não são simulados como se estivessem concluídos.

## Referências técnicas primárias

- https://capacitorjs.com/docs/apis/device — Device.getBatteryInfo, batteryLevel de 0 a 1, isCharging.
- https://www.w3.org/TR/battery-status/ — Battery Status API e eventos do navegador.

Esta versão é preparada e guardada sem deployment. A publicação anterior mantém-se na v0.1 até ser publicado um novo pacote.
