import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { LanguageProvider, useLanguage } from '@/lib/language-context';
import { ThemeProvider as AppThemeProvider } from '@/lib/theme-context';
import Colors from '@/constants/Colors';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/settings` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </LanguageProvider>
    </AppThemeProvider>
  );
}

/**
 * Redirects between /login, the admin-only notice, and the (tabs) group
 * based on the resolved session. Runs on every session change, not just at
 * boot, so a sign-out from any screen bounces back to /login.
 */
function useAuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const currentTop = segments[0] as string | undefined;

    if (!session && currentTop !== 'login') {
      router.replace('/login');
      return;
    }

    if (session?.role === 'admin' && currentTop !== 'admin-web-only') {
      router.replace('/admin-web-only');
      return;
    }

    if (session && session.role !== 'admin' && (currentTop === 'login' || currentTop === 'admin-web-only')) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { language, t } = useLanguage();
  useAuthGate();

  // No web equivalent to borrow for "Home" — same fallback (tabs)/_layout.tsx
  // uses for the tab's own title.
  const homeLabel = language === 'mn' ? 'Нүүр' : 'Home';

  // React Navigation's own screen canvas defaults to DefaultTheme/DarkTheme's
  // background (#fff / #000), which does not match our own Colors.ts palette.
  // Any Themed <View> left without an explicit override paints our custom
  // background over that mismatched canvas — visible as a stray band. Aligning
  // the two here fixes every such spot at once instead of patching each one.
  const navigationTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: Colors[colorScheme].background,
      card: Colors[colorScheme].card,
      border: Colors[colorScheme].border,
      text: Colors[colorScheme].text,
      primary: Colors[colorScheme].tint
    }
  };

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="admin-web-only" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="attendance-entry" options={{ presentation: 'modal' }} />
        <Stack.Screen name="grade-entry" options={{ presentation: 'modal' }} />
        <Stack.Screen name="timetable-entry" options={{ presentation: 'modal' }} />
        <Stack.Screen name="payments" options={{ title: t.nav.payments.label, headerBackTitle: homeLabel }} />
      </Stack>
    </NavigationThemeProvider>
  );
}
