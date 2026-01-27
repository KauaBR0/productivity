import React, { useState, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Pressable, Animated, StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Lock, Mail } from 'lucide-react-native';
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

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();
  const { theme } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      // Navigation is handled by AuthContext useEffect
    } catch (error: any) {
      Alert.alert('Erro no Login', error.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      setGoogleLoading(true);
      try {
          await signInWithGoogle();
      } catch (error: any) {
          Alert.alert('Erro no Google Login', error.message || 'Não foi possível conectar com o Google.');
      } finally {
          setGoogleLoading(false);
      }
  };

  const handleRegister = () => {
    router.push('/register');
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
        <View style={styles.header}>
          <Text style={styles.title}>Bem-vindo</Text>
          <Text style={styles.subtitle}>Faça login para continuar</Text>
        </View>

        <View style={styles.form}>
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
            onPress={handleLogin}
            disabled={loading || googleLoading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>ENTRAR</Text>
            )}
          </PressableScale>

          <View style={styles.dividerContainer}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>OU</Text>
              <View style={styles.line} />
          </View>

          <PressableScale 
            style={[styles.googleButton, googleLoading && styles.buttonDisabled]} 
            onPress={handleGoogleLogin}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.googleButtonText}>Continuar com Google</Text>
            )}
          </PressableScale>

          <PressableScale style={styles.linkButton} onPress={handleRegister}>
            <Text style={styles.linkText}>
              Não tem conta? <Text style={styles.linkTextBold}>Registre-se</Text>
            </Text>
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
    left: -140,
    backgroundColor: theme.colors.glowPrimary,
  },
  glowOrbSecondary: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    bottom: -200,
    right: -160,
    backgroundColor: theme.colors.glowSecondary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
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
  dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 10,
  },
  line: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
  },
  dividerText: {
      color: theme.colors.textMuted,
      paddingHorizontal: 10,
      fontSize: 12,
      fontWeight: 'bold',
  },
  googleButton: {
      backgroundColor: 'transparent',
      height: 56,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
  },
  googleButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    padding: 12,
  },
  linkText: {
    color: theme.colors.textDim,
    fontSize: 14,
  },
  linkTextBold: {
    color: theme.colors.accent,
    fontWeight: 'bold',
  },
});
