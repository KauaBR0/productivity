import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, View, Animated, StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { SocialProfile, SocialService } from '@/services/SocialService';
import { normalizePhone } from '@/utils/phone';
import { ArrowLeft, Phone, UserPlus } from 'lucide-react-native';
import { Theme } from '@/constants/theme';

const PressableScale = ({
  onPress,
  children,
  style,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, friction: 6, tension: 120 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
};

const formatPhoneKey = (value?: string | null) => {
  if (!value) return '';
  return value.replace(/\D/g, '');
};

export default function ContactsSyncScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [syncing, setSyncing] = useState(false);
  const [matches, setMatches] = useState<SocialProfile[]>([]);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [contactNameByPhone, setContactNameByPhone] = useState<Record<string, string>>({});

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissao negada', 'Ative o acesso aos contatos para sincronizar.');
        return;
      }

      const phoneNameMap: Record<string, string> = {};
      const normalizedPhones: string[] = [];
      let hasNext = true;
      let offset = 0;
      const pageSize = 1000;

      while (hasNext) {
        const response = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
          pageOffset: offset,
          pageSize,
        });
        response.data.forEach((contact) => {
          if (!contact.phoneNumbers?.length) return;
          contact.phoneNumbers.forEach((phone) => {
            const normalized = phone.number ? normalizePhone(phone.number) : null;
            if (normalized) {
              normalizedPhones.push(normalized);
              const key = formatPhoneKey(normalized);
              if (!phoneNameMap[key]) {
                phoneNameMap[key] = contact.name || contact.firstName || 'Contato';
              }
            }
          });
        });
        hasNext = response.hasNextPage;
        const responseOffset =
          'pageOffset' in response
            ? (response as Contacts.ContactResponse & { pageOffset?: number }).pageOffset
            : undefined;
        offset = (responseOffset || 0) + pageSize;
      }

      const uniquePhones = Array.from(new Set(normalizedPhones));
      setContactNameByPhone(phoneNameMap);

      if (!uniquePhones.length) {
        setMatches([]);
        Alert.alert('Nenhum contato', 'Nao encontramos telefones para sincronizar.');
        return;
      }

      const [matchedUsers, followingIds] = await Promise.all([
        SocialService.matchContactsByPhones(user.id, uniquePhones),
        SocialService.getMyFollowingIds(user.id),
      ]);

      const followingSet = new Set(followingIds);
      const filtered = matchedUsers.filter((profile) => !followingSet.has(profile.id));

      setMatches(filtered);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao sincronizar contatos.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { status } = await Contacts.getPermissionsAsync();
      if (status === 'granted') {
        handleSync();
      }
    })();
  }, []);

  const handleAddFriend = async (profile: SocialProfile) => {
    if (!user) return;
    try {
      setAddedIds((prev) => ({ ...prev, [profile.id]: true }));
      await SocialService.followUser(user.id, profile.id);
    } catch (error) {
      console.error(error);
      setAddedIds((prev) => {
        const clone = { ...prev };
        delete clone[profile.id];
        return clone;
      });
      Alert.alert('Erro', 'Nao foi possivel adicionar.');
    }
  };

  const renderItem = ({ item }: { item: SocialProfile }) => {
    const key = formatPhoneKey(item.phone);
    const contactName = contactNameByPhone[key];
    const isAdded = addedIds[item.id];
    return (
      <View style={styles.matchCard}>
        <View style={styles.avatar}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{item.username?.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.matchInfo}>
          <Text style={styles.matchName}>{item.username}</Text>
          <Text style={styles.matchMeta}>{contactName ? `Contato: ${contactName}` : 'Contato no telefone'}</Text>
        </View>
        <Pressable
          style={[styles.addButton, isAdded && styles.addButtonDisabled]}
          onPress={() => handleAddFriend(item)}
          disabled={isAdded}
        >
          <UserPlus color={isAdded ? '#999' : theme.colors.accentDark} size={16} />
          <Text style={[styles.addButtonText, isAdded && styles.addButtonTextDisabled]}>
            {isAdded ? 'Solicitado' : 'Adicionar'}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.background}>
        <View style={styles.glowOrb} />
        <View style={styles.glowOrbSecondary} />
      </View>

      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#FFF" size={22} />
        </PressableScale>
        <View>
          <Text style={styles.title}>Sincronizar contatos</Text>
          <Text style={styles.subtitle}>Encontre amigos que ja usam o app</Text>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Phone color={theme.colors.accent} size={20} />
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.heroTitle}>Sincronizacao privada</Text>
          <Text style={styles.heroSubtitle}>Usamos apenas os telefones para encontrar quem ja esta aqui.</Text>
        </View>
        <PressableScale style={styles.syncButton} onPress={handleSync}>
          <Text style={styles.syncButtonText}>{syncing ? 'Sincronizando...' : 'Sincronizar'}</Text>
        </PressableScale>
      </View>

      {syncing ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={matches}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 24) + 60 }]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Nenhum contato encontrado</Text>
              <Text style={styles.emptySubtitle}>Tente sincronizar novamente ou convide seus amigos.</Text>
            </View>
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
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    top: -180,
    right: -140,
    backgroundColor: theme.colors.glowPrimary,
  },
  glowOrbSecondary: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    bottom: -220,
    left: -160,
    backgroundColor: theme.colors.glowSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
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
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  heroCard: {
    marginHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 18,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(231, 184, 74, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(231, 184, 74, 0.4)',
    marginBottom: 10,
  },
  heroInfo: {
    marginBottom: 12,
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  syncButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: theme.colors.accent,
  },
  syncButtonText: {
    color: theme.colors.accentDark,
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 20,
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    ...theme.shadow.card,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.surfaceSoftStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  matchMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addButtonText: {
    color: theme.colors.accentDark,
    fontSize: 12,
    fontWeight: '700',
  },
  addButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 10,
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
});
