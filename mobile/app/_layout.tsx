import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
    Baloo2_800ExtraBold,
    Caveat_700Bold,
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </LanguageProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
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
  const { t } = useLanguage();
  useAuthGate();

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
      <Stack
        screenOptions={{
          // On iOS, native-stack renders the header as a native UINavigationBar
          // and the screen content in its own native container — neither
          // picks up NavigationThemeProvider's colors on its own, so both
          // stay the native light chrome/background regardless of the app's
          // own dark-mode override unless set explicitly here.
          headerStyle: { backgroundColor: Colors[colorScheme].card },
          headerTintColor: Colors[colorScheme].text,
          contentStyle: { backgroundColor: Colors[colorScheme].background },
          // The previous screen's title as back-button text crowds a long
          // current title (e.g. "Хичээлүүд" next to "Математик") — just the
          // chevron reads cleaner and is the more common iOS pattern anyway.
          headerBackButtonDisplayMode: 'minimal'
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="admin-web-only" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="attendance-entry" options={{ presentation: 'modal' }} />
        <Stack.Screen name="grade-entry" options={{ presentation: 'modal' }} />
        <Stack.Screen name="timetable-entry" options={{ presentation: 'modal' }} />
        <Stack.Screen name="payments" options={{ title: t.nav.payments.label }} />
        <Stack.Screen name="subject-content" />
        <Stack.Screen name="subject-add" options={{ presentation: 'modal' }} />
      </Stack>
    </NavigationThemeProvider>
  );
}
