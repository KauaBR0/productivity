import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';

export const OfflineNotice = () => {
  const netInfo = useNetInfo();

  if (netInfo.type !== 'unknown' && netInfo.isInternetReachable === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <WifiOff color="#FFF" size={16} />
          <Text style={styles.text}>Você está offline. Algumas funções podem não funcionar.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FF4545',
    width: '100%',
    position: 'absolute',
    top: 0,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 10,
    paddingTop: Platform.OS === 'android' ? 40 : 8,
  },
  text: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
