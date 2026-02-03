import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { PhoneCall } from 'lucide-react-native';
import { PressableScale } from '@/components/PressableScale';
import { Theme } from '@/constants/theme';

interface ContactSyncSettingsProps {
  styles: any;
  theme: Theme;
}

export const ContactSyncSettings: React.FC<ContactSyncSettingsProps> = ({ styles, theme }) => {
  const router = useRouter();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Sincronizar contatos</Text>
      <Text style={styles.sectionSubtitle}>Encontre amigos do seu telefone que usam o app</Text>

      <PressableScale style={styles.contactCard} onPress={() => router.push('/contacts-sync' as any)}>
        <View style={styles.contactCardInfo}>
          <View style={styles.contactIcon}>
            <PhoneCall color={theme.colors.accent} size={18} />
          </View>
          <View>
            <Text style={styles.contactTitle}>Conectar com seus contatos</Text>
            <Text style={styles.contactSubtitle}>Sincronizar agora</Text>
          </View>
        </View>
        <View style={styles.contactCta}>
          <Text style={styles.contactCtaText}>Abrir</Text>
        </View>
      </PressableScale>
    </View>
  );
};
