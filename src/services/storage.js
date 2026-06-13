import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const tokenKey = 'farmer-marketplace.session-token';
const cartKey = 'farmer-marketplace.cart-items';

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

export async function loadCart() {
  try {
    const rawValue = canUseWebStorage()
      ? window.localStorage.getItem(cartKey)
      : await SecureStore.getItemAsync(cartKey);

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCart(items) {
  try {
    const serialized = JSON.stringify(Array.isArray(items) ? items : []);

    if (canUseWebStorage()) {
      window.localStorage.setItem(cartKey, serialized);
      return;
    }

    await SecureStore.setItemAsync(cartKey, serialized);
  } catch {
    return;
  }
}

export async function clearCart() {
  try {
    if (canUseWebStorage()) {
      window.localStorage.removeItem(cartKey);
      return;
    }

    await SecureStore.deleteItemAsync(cartKey);
  } catch {
    return;
  }
}
