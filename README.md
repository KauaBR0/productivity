# Productivy

App de foco com cronometro, recompensas e bloqueio de apps no Android.

## Destaques

- Cronometro com ciclos configuraveis (foco, recompensa, descanso).
- Modo infinito com transicoes manuais entre fases.
- Roleta de recompensas com 1 giro extra no maximo.
- Bloqueio de apps no Android via Accessibility Service.

## Requisitos

- Node.js + npm.
- Android: para testar o bloqueio de apps, use **dev build** (Expo Go nao suporta modulos nativos).

## Como rodar

1. Instalar dependencias

```bash
npm install
```

2. Rodar no Android (dev build)

```bash
npm run android
```

3. Rodar no Expo (sem modulos nativos)

```bash
npx expo start
```

## Bloqueio de apps (Android)

1. Abra **Configuracoes > Bloqueio de apps** no app.
2. Ative a acessibilidade quando solicitado.
3. Selecione os apps que quer bloquear.

O bloqueio fica ativo automaticamente durante a fase de foco.

## Notas sobre o modo infinito

- O foco so entra no ranking quando o usuario vai para recompensa ou encerra o ciclo durante o foco.
- A fase de recompensa nao pode ser estendida.
- A fase de descanso pode ser estendida com +5, +10, +15 minutos.
