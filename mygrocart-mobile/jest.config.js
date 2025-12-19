module.exports = {
  preset: 'jest-expo',

  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?((jest-)?react-native(-.*)?|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@apollo/client|@testing-library/react-native))',
  ],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/navigation/**',
    '!src/**/index.ts',
    '!src/__tests__/**',
  ],

  coverageThreshold: {
    global: {
      branches: 0, // Start at 0%, will increase as we add tests
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },

  testMatch: ['**/__tests__/**/*.test.(ts|tsx)', '**/*.test.(ts|tsx)'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(jpg|jpeg|png|gif|svg|ttf|woff|woff2)$': '<rootDir>/__mocks__/fileMock.js',
  },

  globals: {
    __DEV__: true,
  },

  testEnvironment: 'node',
};
