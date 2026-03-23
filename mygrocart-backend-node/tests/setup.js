/**
 * Jest Test Setup
 * Runs before each test file
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://localhost:5432/mygrocart_test';

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
