import { Tabs } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { notificationsApi } from '@/services/notifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  usePushNotifications();

  useEffect(() => {
    if (!user) return;
    fetchUnread();
    pollRef.current = setInterval(fetchUnread, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user]);

  async function fetchUnread() {
    try {
      const res = await notificationsApi.unreadCount();
      setUnreadCount(res.data?.count || 0);
    } catch {}
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarInactiveTintColor: Colors[colorScheme].icon,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme].surface,
          borderTopWidth: 1,
          borderTopColor: Colors[colorScheme].outlineVariant,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 6,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="shippingbox.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-routes"
        options={{
          title: 'Routes',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="map.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => (
            <View>
              <IconSymbol size={22} name="bell.fill" color={color} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <View style={styles.badgeInner} />
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="my-posts"
        options={{
          title: 'My Rides',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="list.bullet.rectangle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: { position: 'absolute', top: -2, right: -4 },
  badgeInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },
});
