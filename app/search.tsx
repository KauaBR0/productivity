import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, FlatList, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { SocialService, SocialProfile } from '@/services/SocialService';
import { AlertTriangle, ArrowLeft, Search as SearchIcon, UserPlus } from 'lucide-react-native';
import { Theme } from '@/constants/theme';
import { PressableScale } from '@/components/PressableScale';
import { EmptyState } from '@/components/ui/EmptyState';

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SocialProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim() || !user) return;
    setError(null);
    setLoading(true);
    try {
      const users = await SocialService.searchUsers(query, user.id);
      setResults(users);
    } catch (error) {
      console.error(error);
      setError('Não foi possível buscar usuários.');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: SocialProfile }) => (
    <PressableScale 
      style={styles.userCard}
      onPress={() => router.push(`/user/${item.id}` as any)}
    >
      <View style={styles.avatar}>
        {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
        ) : (
            <Text style={styles.avatarText}>{item.username?.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.username}</Text>
        {item.is_focusing && (
            <Text style={styles.focusingText}>🔥 Focando agora</Text>
        )}
      </View>
    </PressableScale>
  );

  return (
    <View style={styles.container}>
      <View style={styles.background}>
        <View style={styles.glowOrb} />
        <View style={styles.glowOrbSecondary} />
      </View>
      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#FFF" size={24} />
        </PressableScale>
        <Text style={styles.title}>Explorar</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.inputWrapper}>
            <SearchIcon color="#666" size={20} />
            <TextInput
                style={styles.input}
                placeholder="Buscar usuário..."
                placeholderTextColor="#666"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                autoCapitalize="none"
            />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 20 }} />
      ) : error && results.length === 0 ? (
        <EmptyState
          theme={theme}
          icon={AlertTriangle}
          title="Erro ao buscar"
          description={error}
          actionLabel="Tentar novamente"
          onAction={handleSearch}
        />
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            query.length > 0 ? (
              <EmptyState
                theme={theme}
                icon={SearchIcon}
                title="Nada por aqui"
                description="Tente outro termo ou convide pessoas para seu ranking."
                actionLabel="Ver ranking"
                onAction={() => router.push('/ranking' as any)}
              />
            ) : (
              <EmptyState
                theme={theme}
                icon={UserPlus}
                title="Encontre pessoas"
                description="Busque usuários pelo nome para acompanhar o desempenho."
              />
            )
          }
        />
      )}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingTop: 50,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -160,
    right: -120,
    backgroundColor: theme.colors.glowPrimary,
  },
  glowOrbSecondary: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    bottom: -200,
    left: -140,
    backgroundColor: theme.colors.glowSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 16,
  },
  backButton: {
    padding: 8,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    color: theme.colors.text,
    ...theme.typography.title,
  },
  searchContainer: {
      paddingHorizontal: 20,
      marginBottom: 20,
  },
  inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      paddingHorizontal: 16,
      height: 50,
      gap: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.card,
  },
  input: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 16,
  },
  list: {
      paddingHorizontal: 20,
  },
  userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      padding: 12,
      borderRadius: theme.radius.md,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.card,
  },
  avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.colors.surfaceSoftStrong,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
  },
  avatarImage: {
      width: 50,
      height: 50,
      borderRadius: 25,
  },
  avatarText: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '700',
  },
  userInfo: {
      flex: 1,
  },
  userName: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '700',
  },
  focusingText: {
      color: theme.colors.accent,
      fontSize: 12,
      marginTop: 4,
  },
  emptyText: {
      color: theme.colors.textMuted,
      textAlign: 'center',
      marginTop: 20,
  }
  ,
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(231, 184, 74, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(231, 184, 74, 0.4)',
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyCta: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  emptyCtaText: {
    color: theme.colors.accentDark,
    fontWeight: '700',
  },
});
