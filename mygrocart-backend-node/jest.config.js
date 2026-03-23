/**
 * Jest Configuration for MyGroCart Backend Tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'services/**/*.js',
    'models/**/*.js',
    'resolvers/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/__tests__/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Transform files
  transform: {},

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/archive/'
  ],

  // Coverage directory
  coverageDirectory: 'coverage',

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html']
};
