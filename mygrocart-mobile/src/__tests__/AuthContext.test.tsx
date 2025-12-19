import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Type the mocked functions
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('AuthContext', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should start with null user', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('should start with null token', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.token).toBeNull();
    });

    it('should start with isLoading: true', () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Login Flow', () => {
    it('should set user and token on successful login', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const testToken = 'test-jwt-token-123';
      const testUser = {
        userId: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        zipCode: '12345',
      };

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.login(testToken, testUser);

      expect(result.current.token).toBe(testToken);
      expect(result.current.user).toEqual(testUser);
    });

    it('should store token in SecureStore', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const testToken = 'test-jwt-token-123';
      const testUser = {
        userId: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      };

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.login(testToken, testUser);

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('token', testToken);
    });

    it('should store user in AsyncStorage', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const testToken = 'test-jwt-token-123';
      const testUser = {
        userId: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      };

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.login(testToken, testUser);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(testUser)
      );
    });

    it('should handle login errors gracefully', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockSecureStore.setItemAsync.mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      const testToken = 'test-jwt-token-123';
      const testUser = {
        userId: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      };

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(result.current.login(testToken, testUser)).rejects.toThrow(
        'Storage error'
      );
    });
  });

  describe('Logout Flow', () => {
    it('should clear user and token', async () => {
      const testToken = 'test-jwt-token-123';
      const testUser = {
        userId: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      };

      mockSecureStore.getItemAsync.mockResolvedValue(testToken);
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(testUser));
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
      mockAsyncStorage.removeItem.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify user is logged in
      expect(result.current.user).toEqual(testUser);
      expect(result.current.token).toBe(testToken);

      // Logout
      await result.current.logout();

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it('should remove token from SecureStore', async () => {
      const testToken = 'test-jwt-token-123';
      const testUser = {
        userId: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      };

      mockSecureStore.getItemAsync.mockResolvedValue(testToken);
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(testUser));
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
      mockAsyncStorage.removeItem.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.logout();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('token');
    });

    it('should remove user from AsyncStorage', async () => {
      const testToken = 'test-jwt-token-123';
      const testUser = {
        userId: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      };

      mockSecureStore.getItemAsync.mockResolvedValue(testToken);
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(testUser));
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
      mockAsyncStorage.removeItem.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.logout();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('should handle logout errors gracefully', async () => {
      const testToken = 'test-jwt-token-123';
      const testUser = {
        userId: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      };

      mockSecureStore.getItemAsync.mockResolvedValue(testToken);
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(testUser));
      mockSecureStore.deleteItemAsync.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(result.current.logout()).rejects.toThrow('Delete failed');
    });
  });

  describe('Token Persistence', () => {
    it('should load stored token on mount', async () => {
      const testToken = 'stored-token-abc';
      const testUser = {
        userId: 'user-456',
        name: 'Stored User',
        email: 'stored@example.com',
      };

      mockSecureStore.getItemAsync.mockResolvedValue(testToken);
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(testUser));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.token).toBe(testToken);
    });

    it('should load stored user on mount', async () => {
      const testToken = 'stored-token-abc';
      const testUser = {
        userId: 'user-456',
        name: 'Stored User',
        email: 'stored@example.com',
      };

      mockSecureStore.getItemAsync.mockResolvedValue(testToken);
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(testUser));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(testUser);
    });

    it('should handle missing stored token', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('should handle missing stored user', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('some-token');
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Both should be null if user data is missing
      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle SecureStore errors', async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(new Error('SecureStore error'));
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should fail silently and show login screen
      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('should handle AsyncStorage errors', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      mockAsyncStorage.getItem.mockRejectedValue(new Error('AsyncStorage error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should fail silently and show login screen
      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('should set isLoading to false after load attempts', async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(new Error('Error'));
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Should start as true
      expect(result.current.isLoading).toBe(true);

      // Should become false after error handling
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      console.error = originalError;
    });
  });
});
