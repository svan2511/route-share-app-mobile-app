import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { notificationsApi } from '@/services/notifications';
import { useAuth } from '@/context/AuthContext';

export function usePushNotifications() {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!user) return;
    registerForPushNotifications();
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user]);

  async function registerForPushNotifications() {
    if (!Device.isDevice) {
      console.warn('Push notifications: not a physical device');
      return;
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Push notifications: permission not granted');
      return;
    }
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
        console.warn('Push notifications: projectId not found');
        return;
      }
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;
      setExpoPushToken(token);
      const device = Platform.OS === 'ios' ? 'ios' : 'android';
      await notificationsApi.registerPushToken(token, device);
    } catch (e) {
      console.warn('Push notifications: registration failed', e);
    }
  }

  return { expoPushToken };
}

export function useNotificationResponder(handler: (data: Record<string, any>) => void) {
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data || {};
      handler(data);
    });
    return () => {
      responseListenerRef.current?.remove();
    };
  }, [handler]);
}

export function useForegroundSound() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = Notifications.addNotificationReceivedListener(async (notification) => {
      if (notification.request.content.data?.__soundOnly) {
        const id = notification.request.identifier;
        setTimeout(async () => {
          try { await Notifications.dismissNotificationAsync(id); } catch {}
        }, 1500);
        return;
      }
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '',
            body: '',
            sound: 'real_truck_horn.wav',
            data: { __soundOnly: true },
          },
          trigger: null,
        });
      } catch {}
    });
    return () => subscription.remove();
  }, []);
}
