import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert, Text, TouchableOpacity } from 'react-native';
import RewardRoulette from '../components/RewardRoulette';
import { theme } from '../constants/theme';

jest.mock('lucide-react-native', () => ({
  RefreshCcw: () => null,
  Check: () => null,
}));

describe('RewardRoulette', () => {
  it('renders recent rewards history when provided', async () => {
    let tree: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(
        <RewardRoulette
          rewards={['A', 'B']}
          rewardDuration={10}
          recentRewards={['Leitura', 'Café']}
          onComplete={jest.fn()}
          theme={theme}
        />
      );
    });

    const textNodes = tree!.root.findAllByType(Text);
    const flattened: string[] = [];
    textNodes.forEach((node: any) => {
      const value = node.props.children as React.ReactNode;
      if (Array.isArray(value)) {
        value.forEach((child) => {
          if (child !== null && child !== undefined) flattened.push(String(child));
        });
      } else if (value !== null && value !== undefined) {
        flattened.push(String(value));
      }
    });
    expect(flattened).toContain('Ultimas recompensas');
    expect(flattened).toContain('Leitura');
    expect(flattened).toContain('Café');
  });

  it('falls back to Tempo Livre when rewards list is empty', async () => {
    const onComplete = jest.fn();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    let tree: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(
        <RewardRoulette
          rewards={[]}
          rewardDuration={10}
          onComplete={onComplete}
          theme={theme}
        />
      );
    });

    const button = tree!.root.findAllByType(TouchableOpacity)[0];
    act(() => {
      button.props.onPress();
    });

    expect(onComplete).toHaveBeenCalledWith('Tempo Livre');
  });
});
