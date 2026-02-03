# 🚀 Roadmap para Produção (Play Store Ready)

Este documento descreve as melhorias necessárias para transformar o **Productivy** em um produto escalável, robusto e pronto para a aprovação na Google Play Store.

## 🏗️ 1. Arquitetura e Organização de Código
- [x] **Refatorar `app/timer.tsx`**: Extrair lógica de timer para um hook customizado `hooks/useTimerLogic.ts`.
- [x] **Refatorar `app/(tabs)/settings.tsx`**: Quebrar o arquivo em componentes menores na pasta `components/settings/`.
- [ ] **Componentização UI**: Criar componentes de UI reutilizáveis (botões customizados, cards de ciclos) para evitar duplicação de estilos.
- [ ] **Hooks para API**: Mover chamadas do Supabase de dentro dos componentes para serviços ou hooks (ex: `useProfile(id)`).

## ⚡ 2. Performance e Estado
- [x] **Gerenciamento de Estado**: Migrado estado do timer para **Zustand** para evitar re-renders globais e permitir acesso síncrono app-wide.
- [x] **Otimização de Re-renders**: Usado `React.memo` em itens de lista (Ranking e Histórico) para garantir fluidez no scroll.
- [x] **Remover Realtime do Ranking**: Trocado por *Pull to Refresh* para economizar conexões simultâneas e melhorar estabilidade no plano Free.

## 🔌 3. Robustez e Offline-First
- [x] **Fila de Sincronização (Sync Queue)**: Implementar sistema que salva sessões localmente se a internet falhar e tenta re-sincronizar quando voltar.
- [ ] **Detecção de Conexão**: Usar `@react-native-community/netinfo` para avisar o usuário quando ele estiver offline.
- [x] **Cache de Perfil**: Estado do timer e perfil agora são restaurados globalmente via Zustand no startup.

## 📱 4. Google Play Store & Permissões
- [ ] **Justificativa de Acessibilidade**: Preparar texto e vídeo detalhando o uso da API de Acessibilidade (obrigatório para aprovação).
- [ ] **Justificativa de Foreground Service**: Garantir que o canal de notificação explique por que o serviço é necessário.
- [ ] **Política de Privacidade**: Criar documento MD com cláusulas claras sobre coleta de dados e uso de permissões sensíveis.
- [ ] **Build de Produção**: Configurar `eas.json` com chaves de produção reais (não usar debug keystore).

## 🎨 5. UI/UX e Polimento
- [x] **Substituir `Alert.alert`**: Implementar uma biblioteca de Toasts (ex: `react-native-toast-message`) para notificações não intrusivas.
- [x] **Feedback de Erro**: Melhoradas as telas de estado vazio e erro usando o novo componente `EmptyState`.
- [x] **Animações de Loading**: Implementados **Skeleton Loaders** no Ranking, Histórico e Perfil para uma experiência de carregamento suave.

## 📊 6. Banco de Dados (Supabase)
- [x] **Denormalização de Perfil**: Adicionar colunas `total_focus_minutes` e `total_cycles` na tabela `profiles` (atualizadas via trigger ou RPC) para evitar somas pesadas. (Scripts: `docs/SUPABASE_DENORMALIZE_STATS.sql` e `docs/UPDATE_RPCS_DENORMALIZED.sql`)
- [ ] **Segurança RLS**: Revisar todas as políticas para garantir que dados sensíveis (telefones) não vazem.

---
*Assinado: Gemini (Desenvolvedor Sênior)*
