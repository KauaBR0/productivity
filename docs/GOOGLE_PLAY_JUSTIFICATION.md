# Guia de Aprovação na Google Play Store

Este documento contém os textos exatos que você deve usar nos formulários de "Conteúdo do App" (App Content) no Google Play Console para justificar as permissões sensíveis.

---

## 1. Permissão de Acessibilidade (`BIND_ACCESSIBILITY_SERVICE`)

**Pergunta do Formulário:** "Qual é a funcionalidade principal do seu app que requer essa permissão?"

**Sua Resposta:**
> O Productivy é um aplicativo de foco e produtividade (Pomodoro) que ajuda usuários a reduzir o tempo de tela e evitar distrações. A funcionalidade principal "Modo de Foco Profundo" permite que o usuário selecione aplicativos distrativos (ex: redes sociais, jogos) para serem bloqueados temporariamente enquanto o cronômetro de foco está rodando.

**Pergunta:** "Como seu app usa a API de Acessibilidade?"

**Sua Resposta:**
> Usamos a API `AccessibilityService` exclusivamente para detectar o pacote do aplicativo que está atualmente em primeiro plano (`AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED`). Comparamos o nome do pacote (ex: com.instagram.android) com a lista de bloqueio definida pelo próprio usuário. Se houver correspondência e uma sessão de foco estiver ativa, o Productivy exibe uma sobreposição (Overlay) bloqueando o acesso ao app distrativo. Não lemos conteúdo da tela, não coletamos textos digitados e não modificamos configurações do usuário.

---

## 2. Permissão de Serviço em Primeiro Plano (`FOREGROUND_SERVICE`)

**Tipo de Serviço:** `dataSync` ou `specialUse` (dependendo do Android 14+). Recomenda-se marcar "Timer" ou "Clock" se disponível, ou `dataSync` se justificar pela sincronização do timer.

**Pergunta:** "Descreva por que seu app precisa executar um serviço em primeiro plano."

**Sua Resposta:**
> O Productivy precisa de um Foreground Service para manter o cronômetro de foco rodando com precisão quando o usuário bloqueia a tela ou navega para outros aplicativos. Sem esse serviço, o sistema Android mata o processo do cronômetro para economizar bateria, fazendo com que o alarme não toque no final da sessão e o usuário perca seu progresso de produtividade. O serviço também é responsável por monitorar (via módulo nativo leve) se apps bloqueados estão sendo abertos durante a sessão.

**Vídeo de Demonstração (Requisito):**
Você precisará enviar um link de vídeo (YouTube/Drive). Veja o roteiro no arquivo `docs/VIDEO_DEMO_SCRIPT.md`.

---

## 3. Acesso a Contatos (`READ_CONTACTS`)

**Pergunta:** "Por que seu app precisa ler os contatos?"

**Sua Resposta:**
> O acesso aos contatos é usado exclusivamente para a funcionalidade opcional "Encontrar Amigos". Isso permite que o usuário descubra quais de seus contatos já utilizam o Productivy para que possam se seguir e comparar tempos de foco no Ranking. Os dados dos contatos não são armazenados permanentemente; são enviados via hash para correspondência e descartados imediatamente após o processo.
