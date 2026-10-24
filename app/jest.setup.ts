// Jest setup for the app. AsyncStorage is replaced by its official in-memory mock.
// jest.mock factories run before imports, so the mock module has to be loaded with require().
jest.mock('@react-native-async-storage/async-storage', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage/jest/async-storage-mock');
});
