import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Vibration,
  Easing,
  Platform,
  StatusBar
} from 'react-native';
import { RefreshCcw, Check } from 'lucide-react-native';
import type { Theme } from '@/constants/theme';

// --- TEMA DOURADO (LUXURY) ---
const THEME = {
  colors: {
    bg: '#09090A',           // Fundo bem escuro para o dourado estourar
    surface: '#121214',      // Fundo da roleta
    surfaceHighlight: '#1A1A1E',
    
    // Tons de Dourado
    goldMain: '#FFD700',     // Ouro brilhante
    goldDark: '#B8860B',     // Ouro escuro
    goldDim: '#635118',      // Ouro apagado (texto não selecionado)
    
    text: '#FFFFFF',
    textMuted: '#71717A',
    success: '#04D361',
  },
  radius: { md: 8, lg: 12, xl: 24 },
};

interface RewardRouletteProps {
  rewards: string[];
  rewardDuration?: number;
  onComplete: (reward: string) => void;
  recentRewards?: string[];
  extraSpins?: number;
  theme?: Theme;
}

const { width } = Dimensions.get('window');
const ITEM_HEIGHT = 70; // Aumentei a altura para caber fontes maiores
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const REPEAT_COUNT = 40;

const WheelItem = React.memo(
  ({
    item,
    index,
    scrollY,
  }: {
    item: string;
    index: number;
    scrollY: Animated.Value;
  }) => {
    const inputRange = [
      (index - 2) * ITEM_HEIGHT,
      (index - 1) * ITEM_HEIGHT,
      index * ITEM_HEIGHT,
      (index + 1) * ITEM_HEIGHT,
      (index + 2) * ITEM_HEIGHT,
    ];

    const scale = scrollY.interpolate({
      inputRange,
      outputRange: [0.7, 0.85, 1.2, 0.85, 0.7],
      extrapolate: 'clamp',
    });

    const opacity = scrollY.interpolate({
      inputRange,
      outputRange: [0.2, 0.45, 1, 0.45, 0.2],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.itemContainer, { height: ITEM_HEIGHT, opacity, transform: [{ scale }] }]}>
        <Animated.Text style={[styles.itemText]}>
          {item}
        </Animated.Text>
      </Animated.View>
    );
  }
);

export default function RewardRoulette({
  rewards = [],
  rewardDuration = 30,
  onComplete,
  recentRewards = [],
  extraSpins = 0,
  theme,
}: RewardRouletteProps) {
  const [selectedReward, setSelectedReward] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinsLeft, setSpinsLeft] = useState(() => Math.max(1, 1 + extraSpins));
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<Animated.FlatList<any>>(null);
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const palette = theme ?? THEME;

  // --- Dados ---
  const data = useMemo(() => {
    if (!rewards.length) return Array(REPEAT_COUNT).fill('Tempo Livre');
    let list: string[] = [];
    for (let i = 0; i < REPEAT_COUNT; i++) {
      list = [...list, ...rewards];
    }
    return list;
  }, [rewards]);

  const startOffset = useMemo(() => (data.length / 2) * ITEM_HEIGHT, [data.length]);

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: startOffset, animated: false });
      scrollAnim.setValue(startOffset);
    }, 100);
  }, [startOffset]);

  useEffect(() => {
    setSpinsLeft(Math.max(1, 1 + extraSpins));
  }, [extraSpins]);

  // --- Lógica de Girar ---
  const handleSpin = () => {
    if (isSpinning) return;
    if (selectedReward && spinsLeft <= 0) return;
    setIsSpinning(true);
    setSelectedReward(null);

    if (selectedReward) {
      setSpinsLeft((prev) => Math.max(prev - 1, 0));
    }

    const currentOffset = (scrollAnim as any)._value;
    const currentIndex = Math.floor(currentOffset / ITEM_HEIGHT);
    
    const cycles = 5; 
    const randomJump = Math.floor(Math.random() * rewards.length);
    const targetIndex = currentIndex + (rewards.length * cycles) + randomJump;
    const targetOffset = targetIndex * ITEM_HEIGHT;

    Animated.timing(scrollAnim, {
      toValue: targetOffset,
      duration: 4000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsSpinning(false);
        const finalIndex = Math.round(targetOffset / ITEM_HEIGHT);
        setSelectedReward(data[finalIndex]);
        if (Platform.OS !== 'web') Vibration.vibrate(50);
      }
    });
  };

  useEffect(() => {
    const listener = scrollAnim.addListener(({ value }) => {
      flatListRef.current?.scrollToOffset({ offset: value, animated: false });
    });
    return () => scrollAnim.removeListener(listener);
  }, []);

  const handleAccept = () => {
    if (selectedReward) onComplete(selectedReward);
  };

  // --- Renderização do Item (O Segredo do Brilho) ---
  const renderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => (
      <WheelItem item={item} index={index} scrollY={scrollY} />
    ),
    [scrollY]
  );

  const isSpinDisabled = isSpinning || (!!selectedReward && spinsLeft <= 0);

  return (
    <View style={[styles.container, theme && { backgroundColor: palette.colors.bg }]}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Sorteio Premium</Text>
        </View>
        <Text style={styles.subtitle}>Recompensa de {rewardDuration} minutos</Text>
      </View>

      {/* Roda Dourada Sem Bordas */}
      <View style={styles.wheelContainer}>
        {/* Overlay Central (Apenas linhas finas douradas) */}
        <View style={styles.selectionLines} pointerEvents="none">
           <View style={styles.line} />
           <View style={[styles.line, { marginTop: ITEM_HEIGHT }]} />
        </View>

        {/* Gradientes para suavizar o corte */}
        <View style={[styles.gradientCover, styles.gradientTop]} pointerEvents="none" />
        <View style={[styles.gradientCover, styles.gradientBottom]} pointerEvents="none" />

        <Animated.FlatList
          ref={flatListRef}
          data={data}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderItem}
          getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          scrollEnabled={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          windowSize={5}
          initialNumToRender={VISIBLE_ITEMS + 2}
          maxToRenderPerBatch={VISIBLE_ITEMS + 2}
          updateCellsBatchingPeriod={50}
          style={{ height: WHEEL_HEIGHT, flexGrow: 0 }}
          contentContainerStyle={{ paddingVertical: (WHEEL_HEIGHT - ITEM_HEIGHT) / 2 }}
        />
      </View>

      <Text style={styles.resultText}>
        {isSpinning ? "Sorteando..." : selectedReward || "Toque para girar"}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.spinButton, isSpinDisabled && styles.disabledButton]}
          onPress={handleSpin}
          disabled={isSpinDisabled}
          activeOpacity={0.8}
        >
          <RefreshCcw color={palette.colors.bg} size={20} />
          <Text style={styles.spinButtonText}>
            {selectedReward
              ? spinsLeft > 0
                ? `GIRAR NOVAMENTE (${spinsLeft})`
                : 'SEM GIRO EXTRA'
              : 'GIRAR ROLETA'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.acceptButton, (!selectedReward || isSpinning) && styles.disabledButton]}
          onPress={handleAccept}
          disabled={!selectedReward || isSpinning}
          activeOpacity={0.8}
        >
          <Check color="#FFF" size={20} />
          <Text style={styles.acceptButtonText}>Confirmar</Text>
        </TouchableOpacity>
      </View>

      {recentRewards.length > 0 && (
        <View style={styles.recentRewards}>
          <Text style={styles.recentTitle}>Ultimas recompensas</Text>
          <View style={styles.recentList}>
            {recentRewards.map((reward, index) => (
              <View key={`${reward}-${index}`} style={styles.recentPill}>
                <Text style={styles.recentText}>{reward}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    color: THEME.colors.goldMain,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // --- ROLETA ---
  wheelContainer: {
    height: WHEEL_HEIGHT,
    width: '100%',
    // Sem bordas (borderWidth removido)
    backgroundColor: 'transparent', 
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  itemContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 26, // Fonte bem maior
    fontWeight: '700',
    textAlign: 'center',
    color: THEME.colors.goldMain,
  },
  
  // Linhas douradas finas no centro
  selectionLines: {
    position: 'absolute',
    top: (WHEEL_HEIGHT - ITEM_HEIGHT) / 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    justifyContent: 'space-between', // Uma linha no topo, uma em baixo
    zIndex: 5,
  },
  line: {
    height: 1,
    width: '60%', // Linha não ocupa tudo para ficar elegante
    alignSelf: 'center',
    backgroundColor: THEME.colors.goldMain,
    opacity: 0.5,
    shadowColor: THEME.colors.goldMain,
    shadowOpacity: 1,
    shadowRadius: 5,
  },

  gradientCover: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2, // Gradiente maior
    zIndex: 10,
  },
  gradientTop: { 
    top: 0, 
    backgroundColor: THEME.colors.bg, // Usa a cor do fundo para "apagar" os itens
    opacity: 0.85,
  },
  gradientBottom: { 
    bottom: 0, 
    backgroundColor: THEME.colors.bg,
    opacity: 0.85,
  },

  resultText: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: '500',
    marginTop: 30,
    height: 30,
    textAlign: 'center',
    opacity: 0.8,
  },

  // --- BOTÕES ---
  actions: {
    width: '100%',
    gap: 16,
    marginTop: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: THEME.radius.lg,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  spinButton: {
    backgroundColor: THEME.colors.goldMain, // Botão Dourado
  },
  spinButtonText: {
    color: '#000', // Texto preto no dourado dá contraste "rico"
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  acceptButton: {
    backgroundColor: THEME.colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: '#333',
  },
  acceptButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  recentRewards: {
    marginTop: 28,
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  recentTitle: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  recentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  recentPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
  },
  recentText: {
    color: THEME.colors.goldMain,
    fontSize: 12,
    fontWeight: '700',
  },
});
