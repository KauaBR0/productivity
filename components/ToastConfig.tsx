import React from 'react';
import { BaseToast, ErrorToast } from 'react-native-toast-message';
import { View, Text } from 'react-native';

export const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#00FF94', backgroundColor: '#1E1E24', borderLeftWidth: 5, borderRadius: 8, height: 70 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: 'bold',
        color: '#FFF'
      }}
      text2Style={{
        fontSize: 13,
        color: '#A1A1AA'
      }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#FF4545', backgroundColor: '#1E1E24', borderLeftWidth: 5, borderRadius: 8, height: 70 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: 'bold',
        color: '#FFF'
      }}
      text2Style={{
        fontSize: 13,
        color: '#A1A1AA'
      }}
    />
  ),
  info: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#00D4FF', backgroundColor: '#1E1E24', borderLeftWidth: 5, borderRadius: 8, height: 70 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: 'bold',
        color: '#FFF'
      }}
      text2Style={{
        fontSize: 13,
        color: '#A1A1AA'
      }}
    />
  ),
  // Custom Achievement Toast
  achievement: ({ text1, text2 }: any) => (
    <View style={{ 
        height: 70, 
        width: '90%', 
        backgroundColor: '#1E1E24', 
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFD700',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    }}>
        <Text style={{ fontSize: 24, marginRight: 12 }}>🏆</Text>
        <View>
            <Text style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 16 }}>{text1}</Text>
            <Text style={{ color: '#FFF', fontSize: 13 }}>{text2}</Text>
        </View>
    </View>
  )
};
