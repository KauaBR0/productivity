describe('ForegroundTimerService', () => {
  const loadService = (os: 'android' | 'ios', isRunning: boolean) => {
    const mockStart = jest.fn(async () => {});
    const mockUpdate = jest.fn(async () => {});
    const mockStop = jest.fn(async () => {});
    const mockIsRunning = jest.fn(() => isRunning);

    jest.resetModules();
    jest.doMock('react-native', () => ({
      Platform: { OS: os },
      NativeModules: os === 'android' ? { RNBackgroundActions: {} } : {},
    }));
    jest.doMock('react-native-background-actions', () => ({
      __esModule: true,
      default: {
        start: mockStart,
        updateNotification: mockUpdate,
        stop: mockStop,
        isRunning: mockIsRunning,
      },
    }));

    let service: typeof import('../services/ForegroundTimerService');
    jest.isolateModules(() => {
      service = require('../services/ForegroundTimerService');
    });

    return { service: service!, mockStart, mockUpdate, mockStop, mockIsRunning };
  };

  it('starts foreground service on Android when not running', async () => {
    const { service, mockStart, mockUpdate } = loadService('android', false);

    await service.startForegroundTimer('Foco ativo', 'Tempo restante: 05:00');

    expect(mockStart).toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updates notification when already running on Android', async () => {
    const { service, mockStart, mockUpdate } = loadService('android', true);

    await service.startForegroundTimer('Foco ativo', 'Tempo restante: 05:00');

    expect(mockUpdate).toHaveBeenCalledWith({
      taskTitle: 'Foco ativo',
      taskDesc: 'Tempo restante: 05:00',
    });
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('updates only when running', async () => {
    const { service, mockUpdate } = loadService('android', false);
    await service.updateForegroundTimer('Recompensa ativa', 'Tempo restante: 02:00');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('stops only when running', async () => {
    const { service, mockStop } = loadService('android', false);
    await service.stopForegroundTimer();
    expect(mockStop).not.toHaveBeenCalled();
  });

  it('no-ops on iOS', async () => {
    const { service, mockStart, mockUpdate, mockStop } = loadService('ios', false);

    await service.startForegroundTimer('Foco ativo', 'Tempo restante: 05:00');
    await service.updateForegroundTimer('Foco ativo', 'Tempo restante: 05:00');
    await service.stopForegroundTimer();

    expect(mockStart).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockStop).not.toHaveBeenCalled();
  });
});
