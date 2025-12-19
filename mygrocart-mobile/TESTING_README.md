# MyGroCart Mobile - Testing Guide

## Quick Start

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (auto-rerun on file changes)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

## Test Structure

```
mygrocart-mobile/
├── src/
│   ├── __tests__/          # General tests
│   │   └── smoke.test.ts
│   ├── context/
│   │   └── __tests__/      # Context-specific tests
│   ├── screens/
│   │   └── __tests__/      # Screen-specific tests
│   └── graphql/
│       └── __tests__/      # GraphQL-specific tests
├── __mocks__/              # Manual mocks
├── jest.config.js          # Jest configuration
├── jest.setup.js           # Test setup and global mocks
└── babel.config.js         # Babel configuration
```

## Test Naming Convention

- Test files: `*.test.ts` or `*.test.tsx`
- Test suites: Describe the component/function being tested
- Test cases: Should be descriptive and start with "should"

Example:
```typescript
describe('AuthContext', () => {
  it('should login user successfully', () => {
    // Test implementation
  });
});
```

## Writing Tests

### Testing React Components

```typescript
import { render, fireEvent, waitFor } from '@testing-library/react-native';

describe('LoginScreen', () => {
  it('should render login form', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    expect(getByPlaceholderText('Email')).toBeTruthy();
  });
});
```

### Testing with Apollo Client

```typescript
import { MockedProvider } from '@apollo/client/testing';
import { LOGIN_MUTATION } from '../graphql/mutations';

const mocks = [
  {
    request: {
      query: LOGIN_MUTATION,
      variables: { email: 'test@example.com', password: 'password' },
    },
    result: {
      data: {
        login: { token: 'fake-token', user: { id: '1', email: 'test@example.com' } },
      },
    },
  },
];

it('should login successfully', async () => {
  const { getByText } = render(
    <MockedProvider mocks={mocks}>
      <LoginScreen />
    </MockedProvider>
  );

  fireEvent.press(getByText('Login'));

  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });
});
```

### Testing Context

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';

it('should login user', async () => {
  const { result } = renderHook(() => useAuth(), {
    wrapper: AuthProvider,
  });

  await act(async () => {
    await result.current.login('token', { id: '1', email: 'test@test.com' });
  });

  expect(result.current.user).toBeTruthy();
});
```

## Mocked Modules

The following modules are automatically mocked in `jest.setup.js`:

- `expo-secure-store` - Token storage
- `expo-camera` - Camera permissions
- `expo-barcode-scanner` - Barcode scanning
- `react-native-maps` - Map components
- `@react-navigation/native` - Navigation hooks
- `@react-navigation/native-stack` - Stack navigator
- `@react-navigation/bottom-tabs` - Tab navigator

### Overriding Mocks

To override a mock in a specific test:

```typescript
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store');

beforeEach(() => {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('fake-token');
});
```

## Coverage Goals

Target coverage by module:
- **AuthContext:** 90%+
- **GraphQL Client:** 80%+
- **Login/Signup Screens:** 80%+
- **Price Comparison:** 75%+
- **Shopping List:** 70%+
- **Other screens:** 60%+

### Viewing Coverage

```bash
pnpm test:coverage
```

Coverage report will be displayed in terminal and saved to `coverage/` directory.

View HTML report:
```bash
open coverage/lcov-report/index.html
```

## Common Testing Patterns

### Async Testing

```typescript
it('should fetch data', async () => {
  const { getByText } = render(<Component />);

  await waitFor(() => {
    expect(getByText('Data loaded')).toBeTruthy();
  });
});
```

### User Interactions

```typescript
it('should handle button press', () => {
  const { getByText } = render(<Component />);

  fireEvent.press(getByText('Submit'));

  expect(mockFunction).toHaveBeenCalled();
});
```

### Form Input

```typescript
it('should update input value', () => {
  const { getByPlaceholderText } = render(<Component />);
  const input = getByPlaceholderText('Email');

  fireEvent.changeText(input, 'test@example.com');

  expect(input.props.value).toBe('test@example.com');
});
```

## Debugging Tests

### Run Single Test File

```bash
pnpm test src/screens/__tests__/LoginScreen.test.tsx
```

### Run Tests Matching Pattern

```bash
pnpm test --testNamePattern="should login"
```

### Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome and attach to the Node process.

## CI/CD Integration

Tests will automatically run in CI/CD pipeline. Ensure:
1. All tests pass locally before pushing
2. Coverage thresholds are met
3. No console errors in test output

## Troubleshooting

### Tests Not Running

1. Clear Jest cache: `pnpm test --clearCache`
2. Reinstall dependencies: `rm -rf node_modules && pnpm install`
3. Check Node version: `node --version` (should be v18+)

### Mock Not Working

1. Ensure mock is defined in `jest.setup.js` or at top of test file
2. Check mock is called before component renders
3. Use `jest.clearAllMocks()` in `beforeEach`

### TypeScript Errors

1. Update `jest.config.js` tsconfig options
2. Ensure `@types/*` packages are installed
3. Check `tsconfig.json` is valid

## Best Practices

1. **Test behavior, not implementation** - Test what the user sees/does
2. **Keep tests simple** - One assertion per test when possible
3. **Use descriptive names** - Test names should read like documentation
4. **Avoid test interdependence** - Each test should run independently
5. **Mock external dependencies** - Don't make real API calls in tests
6. **Clean up after tests** - Use `afterEach` to reset mocks and state
7. **Test error cases** - Don't just test the happy path

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Apollo Client Testing](https://www.apollographql.com/docs/react/development-testing/testing/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
