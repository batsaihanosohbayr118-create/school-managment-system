import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { LanguageProvider, useLanguage } from '@/lib/language-context';
import { LOCKED_ROLES, PaymentLockProvider, usePaymentLock } from '@/lib/payment-lock';
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
            <PaymentLockProvider>
              <RootLayoutNav />
            </PaymentLockProvider>
          </AuthProvider>
        </LanguageProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}

function useAuthGate() {
  const { session, loading } = useAuth();
  const { state: lockState } = usePaymentLock();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const currentTop = segments[0] as string | undefined;

    if (!session && currentTop !== 'login' && currentTop !== 'register') {
      router.replace('/login');
      return;
    }

    if (session?.role === 'admin' && currentTop !== 'admin-web-only') {
      router.replace('/admin-web-only');
      return;
    }

    if (session && LOCKED_ROLES.includes(session.role)) {
      if (lockState === 'unknown') return;
      if (lockState === 'locked') {
        if (currentTop !== 'payment-required' && currentTop !== 'qpay') router.replace('/payment-required');
        return;
      }
      if (currentTop === 'payment-required') {
        router.replace('/(tabs)');
        return;
      }
    }

    if (session && session.role !== 'admin' && (currentTop === 'login' || currentTop === 'register' || currentTop === 'admin-web-only')) {
      router.replace('/(tabs)');
    }
  }, [session, loading, lockState, segments, router]);
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { t } = useLanguage();
  const { session } = useAuth();
  const { state: lockState } = usePaymentLock();
  useAuthGate();
  // Cover the tabs while the lock check is in flight, so a locked user never
  // glimpses them before the payment screen.
  const checkingLock = !!session && LOCKED_ROLES.includes(session.role) && lockState === 'unknown';

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
       
          headerStyle: { backgroundColor: Colors[colorScheme].card },
          headerTintColor: Colors[colorScheme].text,
          contentStyle: { backgroundColor: Colors[colorScheme].background },
         
          headerBackButtonDisplayMode: 'minimal'
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="admin-web-only" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="attendance-entry" options={{ presentation: 'modal' }} />
        <Stack.Screen name="grade-entry" options={{ presentation: 'modal' }} />
        <Stack.Screen name="timetable-entry" options={{ presentation: 'modal' }} />
        <Stack.Screen name="payments" options={{ title: t.nav.payments.label }} />
        <Stack.Screen name="lunch" options={{ title: t.lunch.title }} />
        <Stack.Screen name="payment-required" options={{ headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="qpay" options={{ presentation: 'modal', title: t.qpay.title }} />
        <Stack.Screen name="subject-content" />
        <Stack.Screen name="subject-add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="placement" options={{ title: t.placement.title }} />
        <Stack.Screen name="placement-questions" options={{ title: t.placement.questions }} />
        <Stack.Screen name="placement-question-edit" options={{ presentation: 'modal' }} />
      </Stack>
      {checkingLock ? (
        <View style={[StyleSheet.absoluteFill, styles.lockCheck, { backgroundColor: Colors[colorScheme].background }]}>
          <ActivityIndicator color={Colors[colorScheme].tint} />
        </View>
      ) : null}
    </NavigationThemeProvider>
  );
}

const styles = StyleSheet.create({
  lockCheck: {
    alignItems: 'center',
    justifyContent: 'center'
  }
});
