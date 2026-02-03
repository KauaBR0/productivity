import React from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useActionDialog } from '../hooks/useActionDialog';
import { theme } from '../constants/theme';

const DialogHarness = ({
  onResolved,
  allowBackdropClose,
}: {
  onResolved: (key: string) => void;
  allowBackdropClose?: boolean;
}) => {
  const { openDialog, dialog } = useActionDialog(theme);

  return (
    <>
      <Pressable
        onPress={() => {
          openDialog({
            title: 'Confirmar ação',
            message: 'Deseja continuar?',
            actions: [
              { key: 'cancel', label: 'Cancelar', tone: 'cancel' },
              { key: 'confirm', label: 'Confirmar' },
            ],
            allowBackdropClose,
          }).then(onResolved);
        }}
      >
        <Text>Abrir</Text>
      </Pressable>
      {dialog}
    </>
  );
};

describe('useActionDialog', () => {
  it('resolves with action key when pressed', async () => {
    const onResolved = jest.fn();
    const { getByText } = render(<DialogHarness onResolved={onResolved} />);

    fireEvent.press(getByText('Abrir'));
    fireEvent.press(getByText('Confirmar'));

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledWith('confirm');
    });
  });

  it('resolves cancel action when pressed', async () => {
    const onResolved = jest.fn();
    const { getByText } = render(<DialogHarness onResolved={onResolved} />);

    fireEvent.press(getByText('Abrir'));
    fireEvent.press(getByText('Cancelar'));

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledWith('cancel');
    });
  });
});
