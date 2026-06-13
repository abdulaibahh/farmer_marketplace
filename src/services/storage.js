import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const tokenKey = 'farmer-marketplace.session-token';

function canUseWebStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage;
}

export async function loadToken() {
  try {
    if (canUseWebStorage()) {
      return window.localStorage.getItem(tokenKey);
    }

    return await SecureStore.getItemAsync(tokenKey);
  } catch {
    return null;
  }
}

export async function saveToken(token) {
  try {
    if (!token) {
      await clearToken();
      return;
    }

    if (canUseWebStorage()) {
      window.localStorage.setItem(tokenKey, token);
      return;
    }

    await SecureStore.setItemAsync(tokenKey, token);
  } catch {
    return;
  }
}

export async function clearToken() {
  try {
    if (canUseWebStorage()) {
      window.localStorage.removeItem(tokenKey);
      return;
    }

    await SecureStore.deleteItemAsync(tokenKey);
  } catch {
    return;
  }
}
