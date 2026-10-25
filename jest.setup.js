/* global jest */
// AsyncStorage has no native module under Jest; use the library's in-memory mock everywhere.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
