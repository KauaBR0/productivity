import React, { useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Audio } from 'expo-av';
import { useSettings } from '@/context/SettingsContext';
import { Volume2, Music2 } from 'lucide-react-native';
import { PressableScale } from '../PressableScale';
import { Theme } from '@/constants/theme';

interface SoundSettingsProps {
  styles: any;
  theme: Theme;
}

export const SoundSettings: React.FC<SoundSettingsProps> = ({ styles, theme }) => {
  const { alarmSound, setAlarmSound, lofiTrack, setLofiTrack } = useSettings();
  const previewSoundRef = useRef<Audio.Sound | null>(null);

  const playAlarmPreview = async () => {
    try {
      if (previewSoundRef.current) {
        await previewSoundRef.current.unloadAsync();
        previewSoundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/alarm.mp3')
      );
      previewSoundRef.current = sound;
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await sound.unloadAsync();
          previewSoundRef.current = null;
        }
      });
    } catch (error) {
      console.log('Error playing preview', error);
    }
  };

  const playLofiPreview = async (track: 'lofi1' | 'lofi2') => {
    try {
      if (previewSoundRef.current) {
        await previewSoundRef.current.unloadAsync();
        previewSoundRef.current = null;
      }
      const source = track === 'lofi1'
        ? require('../../assets/sounds/lofi1.mp3')
        : require('../../assets/sounds/lofi2.mp3');
      const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true, isLooping: false, volume: 0.5 });
      previewSoundRef.current = sound;
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await sound.unloadAsync();
          previewSoundRef.current = null;
        }
      });
    } catch (error) {
      console.log('Error playing lofi preview', error);
    }
  };

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Som do alarme</Text>
        <Text style={styles.sectionSubtitle}>Escolha como o app alerta no fim do ciclo</Text>

        <View style={styles.soundOptions}>
          {[
            { id: 'alarm', label: 'Alarmes do app', description: 'Som personalizado' },
            { id: 'silent', label: 'Silencioso', description: 'Sem som (apenas visual)' },
          ].map((option) => {
            const selected = alarmSound === option.id;
            return (
              <PressableScale
                key={option.id}
                style={[styles.soundCard, selected && styles.soundCardActive]}
                onPress={() => setAlarmSound(option.id as 'alarm' | 'silent')}
              >
                <View>
                  <Text style={styles.soundTitle}>{option.label}</Text>
                  <Text style={styles.soundSubtitle}>{option.description}</Text>
                </View>
                <View style={styles.soundRight}>
                  {option.id === 'alarm' && (
                    <Pressable onPress={playAlarmPreview} style={styles.soundPreview}>
                      <Volume2 color={theme.colors.accent} size={16} />
                    </Pressable>
                  )}
                  <View style={[styles.soundDot, selected && styles.soundDotActive]} />
                </View>
              </PressableScale>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Música Lo‑fi</Text>
        <Text style={styles.sectionSubtitle}>Escolha a faixa para tocar durante o foco</Text>

        <View style={styles.soundOptions}>
          {[
            { id: 'random', label: 'Aleatório', description: 'Alterna entre as faixas' },
            { id: 'lofi1', label: 'Lo‑fi 1', description: 'Faixa 1' },
            { id: 'lofi2', label: 'Lo‑fi 2', description: 'Faixa 2' },
            { id: 'off', label: 'Desligado', description: 'Sem música' },
          ].map((option) => {
            const selected = lofiTrack === option.id;
            return (
              <PressableScale
                key={option.id}
                style={[styles.soundCard, selected && styles.soundCardActive]}
                onPress={() => setLofiTrack(option.id as 'random' | 'lofi1' | 'lofi2' | 'off')}
              >
                <View>
                  <Text style={styles.soundTitle}>{option.label}</Text>
                  <Text style={styles.soundSubtitle}>{option.description}</Text>
                </View>
                <View style={styles.soundRight}>
                  {option.id === 'lofi1' && (
                    <Pressable onPress={() => playLofiPreview('lofi1')} style={styles.soundPreview}>
                      <Music2 color={theme.colors.accent} size={16} />
                    </Pressable>
                  )}
                  {option.id === 'lofi2' && (
                    <Pressable onPress={() => playLofiPreview('lofi2')} style={styles.soundPreview}>
                      <Music2 color={theme.colors.accent} size={16} />
                    </Pressable>
                  )}
                  <View style={[styles.soundDot, selected && styles.soundDotActive]} />
                </View>
              </PressableScale>
            );
          })}
        </View>
      </View>
    </>
  );
};
