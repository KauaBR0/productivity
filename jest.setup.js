jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true });

// Silence the warning: SafeAreaView has been deprecated
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes('SafeAreaView has been deprecated')) return;
  originalWarn(...args);
};

// Silence the warning: An update to ... inside a test was not wrapped in act
const originalError = console.error;
console.error = (...args) => {
  if (args[0]?.includes('was not wrapped in act')) return;
  originalError(...args);
};
