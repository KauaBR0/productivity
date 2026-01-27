import React, { useState, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Pressable, Animated, StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Lock, Mail, User as UserIcon, ArrowLeft, Phone } from 'lucide-react-native';
import { Theme } from '@/constants/theme';

const PressableScale = ({
  onPress,
  children,
  style,
  disabled,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, friction: 6, tension: 120 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled}>
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
};

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !phone) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      await signUp(name, email, password, phone);
      
      Alert.alert(
        "Bem-vindo ao Productivy!",
        "Sua conta foi criada com sucesso. Vamos focar?",
        [
          { 
            text: "Vamos!", 
            onPress: () => router.replace('/') 
          }
        ]
      );
      
    } catch (error: any) {
      Alert.alert('Erro no Cadastro', error.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.background}>
        <View style={styles.glowOrb} />
        <View style={styles.glowOrbSecondary} />
      </View>
      <View style={styles.content}>
        <PressableScale style={styles.backButton} onPress={handleBack}>
          <ArrowLeft color="#FFF" size={24} />
        </PressableScale>

        <View style={styles.header}>
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>Comece sua jornada de foco</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <UserIcon color="#A1A1AA" size={20} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Nome"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Mail color="#A1A1AA" size={20} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputContainer}>
            <Phone color="#A1A1AA" size={20} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Telefone"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(text) => setPhone(text.replace(/[^0-9+() -]/g, ''))}
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock color="#A1A1AA" size={20} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#666"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <PressableScale 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>CADASTRAR</Text>
            )}
          </PressableScale>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    bottom: -200,
    left: -160,
    backgroundColor: theme.colors.glowSecondary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    padding: 8,
    zIndex: 10,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textDim,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 56,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
  },
  button: {
    backgroundColor: theme.colors.accent,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    ...theme.shadow.accent,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: theme.colors.accentDark,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
