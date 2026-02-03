# 🚀 Roadmap para Produção (Play Store Ready)

Este documento descreve as melhorias necessárias para transformar o **Productivy** em um produto escalável, robusto e pronto para a aprovação na Google Play Store.

## 🏗️ 1. Arquitetura e Organização de Código
- [x] **Refatorar `app/timer.tsx`**: Extrair lógica de timer para um hook customizado `hooks/useTimerLogic.ts`.
- [x] **Refatorar `app/(tabs)/settings.tsx`**: Quebrar o arquivo em componentes menores na pasta `components/settings/`.
- [x] **Componentização UI**: Concluído — `PressableScale` centralizado e `CycleCard` reutilizável para ciclos fixos.
- [x] **Hooks para API**: Criados `useProfile` e `useRanking` para abstrair carregamento, erros e loading do Supabase.

## ⚡ 2. Performance e Estado
- [x] **Gerenciamento de Estado**: Migrado estado do timer para **Zustand** para evitar re-renders globais e permitir acesso síncrono app-wide.
- [x] **Otimização de Re-renders**: Usado `React.memo` em itens de lista (Ranking e Histórico) para garantir fluidez no scroll (inclui `displayName` no RankItem).
- [x] **Remover Realtime do Ranking**: Trocado por *Pull to Refresh* para economizar conexões simultâneas e melhorar estabilidade no plano Free.

## 🔌 3. Robustez e Offline-First
- [x] **Fila de Sincronização (Sync Queue)**: Implementar sistema que salva sessões localmente se a internet falhar e tenta re-sincronizar quando voltar.
- [x] **Detecção de Conexão**: Implementado componente global `OfflineNotice` que avisa quando a internet cai.
- [x] **Cache de Perfil**: Zustand com persistência (AsyncStorage), invalidação por viewer e `useProfile` usando o store.

## 📱 4. Google Play Store & Permissões
- [ ] **Justificativa de Acessibilidade**: Parcial — textos e roteiro de vídeo estão em `docs/GOOGLE_PLAY_JUSTIFICATION.md` e `docs/VIDEO_DEMO_SCRIPT.md` (vídeo ainda pendente).
- [ ] **Justificativa de Foreground Service**: Parcial — texto em `docs/GOOGLE_PLAY_JUSTIFICATION.md`; canal no app não descreve o motivo.
- [x] **Política de Privacidade**: Documento em `docs/PRIVACY_POLICY.md`.
- [ ] **Build de Produção**: Configurar `eas.json` com chaves de produção reais (não usar debug keystore).

## 🎨 5. UI/UX e Polimento
- [x] **Substituir `Alert.alert`**: Concluído — diálogos customizados via `useActionDialog` em telas e hooks.
- [x] **Feedback de Erro**: Concluído — padrão com `EmptyState` aplicado a telas principais com estados de erro/empty.
- [x] **Animações de Loading**: Implementados **Skeleton Loaders** no Ranking, Histórico e Perfil para uma experiência de carregamento suave.

## 📊 6. Banco de Dados (Supabase)
- [x] **Denormalização de Perfil**: Colunas e RPCs definidos nos scripts e já aplicados no Supabase. (Scripts: `docs/SUPABASE_DENORMALIZE_STATS.sql` e `docs/UPDATE_RPCS_DENORMALIZED.sql`)
- [x] **Segurança RLS**: Políticas revisadas e script aplicado no Supabase. (Script: `docs/SUPABASE_RLS_SECURITY_AUDIT.sql`)

---
*Assinado: Codex (verificação de código em 03/02/2026)*
