import React, { useState, useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider, useNavigation } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppLoader } from '@/components/app-loader';
import { ToastProvider } from '@/components/toast';
import { useNotificationResponder, useForegroundSound } from '@/hooks/usePushNotifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }) as any,
});

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'real_truck_horn.wav',
      });
    }
  }, []);

  useForegroundSound();

  function getNotificationRoute(data: Record<string, any>) {
    const type = data.type || '';
    if (type === 'request_accepted' || type === 'request_rejected' || type === 'request_cancelled' || type === 'ride_cancelled') {
      return { pathname: '/(tabs)/my-bookings' as const };
    }
    if (type === 'request_sent') {
      return { pathname: '/(tabs)/my-posts' as const };
    }
    if (data.load_id) {
      return { pathname: '/load-details/[id]' as const, params: { id: String(data.load_id) } };
    }
    return null;
  }

  useNotificationResponder((data) => {
    const route = getNotificationRoute(data);
    if (route) router.push(route);
  });

  useEffect(() => {
    let minimumDisplayTimeout: number;
    let navigationFinishedTime: number = 0;
    let navigationStartedTime: number = 0;
    let isNavigationEnding = false;
    const unsubscribeFocus = navigation.addListener('focus', () => {
      // This event fires when the screen comes into focus.
      // If a navigation just ended, we will clear the timeout.
      if (isNavigationEnding && navigationStartedTime && Date.now() - navigationStartedTime < 3000) {
        const remainingTime = 3000 - (Date.now() - navigationStartedTime);
        minimumDisplayTimeout = setTimeout(() => {
          setIsLoading(false);
          isNavigationEnding = false;
          navigationStartedTime = 0;
        }, remainingTime);
      } else if (isNavigationEnding) {
        setIsLoading(false);
        isNavigationEnding = false;
        navigationStartedTime = 0;
      }

    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      // This event fires when the screen loses focus (i.e., navigation starts to a new screen).
      navigationStartedTime = Date.now();
      isNavigationEnding = false;
      setIsLoading(true);
    });

    // This event fires when a transition ends
    const unsubscribeTransitionEnd = navigation.addListener('transitionEnd' as any, () => {
      isNavigationEnding = true;
      navigationFinishedTime = Date.now();
      const elapsedTime = navigationFinishedTime - navigationStartedTime;
      if (elapsedTime < 3000) {
        // If less than 3 seconds have passed, keep the loader visible for the remaining time.
        minimumDisplayTimeout = setTimeout(() => {
          setIsLoading(false);
          isNavigationEnding = false;
          navigationStartedTime = 0;
        }, 3000 - elapsedTime);
      } else {
        // If 3 or more seconds have passed, hide the loader immediately.
        setIsLoading(false);
        isNavigationEnding = false;
        navigationStartedTime = 0;
      }
    });

    return () => {
      clearTimeout(minimumDisplayTimeout);
      unsubscribeFocus();
      unsubscribeBlur();
      unsubscribeTransitionEnd();
    };
  }, [navigation]);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="splash-2" />
            <Stack.Screen name="login" />
            <Stack.Screen name="business-details" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="load-details/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="route-match/[id]" options={{ presentation: 'card' }} />
          </Stack>
          <StatusBar style="light" />
          <AppLoader visible={isLoading} />
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
