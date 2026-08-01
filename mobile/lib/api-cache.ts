import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'mobile_api_cache:';

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T): void {
  AsyncStorage.setItem(PREFIX + key, JSON.stringify(value)).catch(() => {});
}
