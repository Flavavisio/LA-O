# Controlo da localização de menores — v0.3

## Regra de produto implementada

- Menores não podem ativar nem desativar a sua partilha na Laço, incluindo localização e bateria.
- O controlo é exclusivo dos administradores adultos responsáveis da mesma família (principal ou segundo administrador).
- A conta do menor vê o estado com cadeado e a indicação de gestão pelos responsáveis. O interruptor e o botão de envio manual não aparecem.
- A regra também é aplicada nas definições e no detalhe do familiar.
- O servidor rejeita qualquer tentativa de a conta do menor alterar a partilha, mesmo que a chamada seja feita diretamente à API.
- Adultos continuam a gerir a própria autorização.

## Bloqueio nas definições do próprio telemóvel

A política acima controla a aplicação. Não altera automaticamente as definições globais do Android/iOS.

Android oferece `UserManager.DISALLOW_CONFIG_LOCATION`, que pode impedir ligar/desligar localização pelas Definições quando aplicado por um controlador com privilégios adequados, por exemplo device owner. Não equivale a uma permissão disponível para qualquer app instalada. Validar elegibilidade, configuração supervisionada e alcance por equipamento antes de o disponibilizar na Laço. Não usar `DISALLOW_SHARE_LOCATION` para este efeito: é uma restrição diferente que pode desativar a localização.

No iPhone, o Tempo de ecrã oferece restrições a alterações dos Serviços de localização; a configuração é parental e não uma capacidade garantida de qualquer app HTML/JavaScript. Validar separadamente as APIs oficiais de controlo parental e o processo de instalação.

Referências primárias:
- https://developer.android.com/reference/android/os/UserManager#DISALLOW_CONFIG_LOCATION
- https://support.apple.com/105121

Não afirmar “GPS bloqueado” apenas porque o interruptor foi retirado na Laço. A integração nativa/supervisão e os testes em equipamento ainda são necessários.

Esta versão é guardada sem deploy, mantendo a publicação anterior.
