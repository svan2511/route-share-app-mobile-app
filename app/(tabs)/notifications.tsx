import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLoader } from '@/components/app-loader';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { notificationsApi, type AppNotification } from '@/services/notifications';
import { Shadows } from '@/constants/theme';

function getNotifIcon(type: string) {
  switch (type) {
    case 'request_sent': return 'paperplane.fill';
    case 'request_accepted': return 'checkmark.circle.fill';
    case 'request_rejected': return 'xmark.circle.fill';
    case 'request_cancelled': return 'xmark.circle.fill';
    case 'ride_cancelled': return 'exclamationmark.triangle.fill';
    default: return 'bell.fill';
  }
}

function getNotifColor(type: string) {
  switch (type) {
    case 'request_sent': return '#0D9488';
    case 'request_accepted': return '#059669';
    case 'request_rejected': return '#DC2626';
    case 'request_cancelled': return '#A8A29E';
    case 'ride_cancelled': return '#DC2626';
    default: return '#0D9488';
  }
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, Math.floor((now - then) / 1000));
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    fetchNotifications();
  }, []));

  async function fetchNotifications() {
    try {
      const res = await notificationsApi.list();
      setNotifications(res.data || []);
    } catch {
      //
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    fetchNotifications();
  }

  async function handlePress(item: AppNotification) {
    if (!item.is_read) {
      try {
        await notificationsApi.markRead(item.id);
        setNotifications(prev =>
          prev.map(n => n.id === item.id ? { ...n, is_read: true } : n)
        );
      } catch {}
    }
    const type = item.type;
    if (type === 'request_accepted' || type === 'request_rejected' || type === 'request_cancelled' || type === 'ride_cancelled') {
      router.push({ pathname: '/(tabs)/my-bookings' });
    } else if (type === 'request_sent') {
      router.push({ pathname: '/(tabs)/my-posts' });
    } else if (item.load_id) {
      router.push({ pathname: '/load-details/[id]', params: { id: String(item.load_id) } });
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={['top']} style={styles.safe}>
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
          </View>
        </SafeAreaView>
        <AppLoader visible message="Loading notifications..." />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
          {notifications.some(n => !n.is_read) && (
            <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
              <ThemedText style={styles.markAllBtn}>Mark all read</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <FlatList
        data={notifications}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0D9488" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconBox}>
              <IconSymbol name="bell.fill" size={32} color="#D6D3D1" />
            </View>
            <ThemedText style={styles.emptyTitle}>No notifications yet</ThemedText>
            <ThemedText style={styles.emptyDesc}>
              You'll see notifications here when someone requests your ride or responds to your booking.
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => {
          const icon = getNotifIcon(item.type);
          const color = getNotifColor(item.type);
          return (
            <TouchableOpacity
              style={[styles.notifItem, !item.is_read && styles.notifItemUnread]}
              onPress={() => handlePress(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.notifIcon, { backgroundColor: color + '15' }]}>
                <IconSymbol name={icon} size={18} color={color} />
              </View>
              <View style={styles.notifBody}>
                <ThemedText style={[styles.notifTitle, !item.is_read && styles.notifTitleUnread]}>
                  {item.title}
                </ThemedText>
                <ThemedText style={styles.notifMessage} numberOfLines={2}>
                  {item.message}
                </ThemedText>
                <ThemedText style={styles.notifTime}>{formatRelativeTime(item.created_at)}</ThemedText>
              </View>
              {!item.is_read && <View style={[styles.notifDot, { backgroundColor: color }]} />}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAF8' },
  safe: { backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0EFEE',
  },
  headerTitle: { color: '#1C1917', fontSize: 18, fontWeight: '800' },
  markAllBtn: { color: '#0D9488', fontSize: 12, fontWeight: '700' },
  list: { paddingVertical: 8, paddingHorizontal: 16 },
  notifItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, borderRadius: 14, marginBottom: 8,
    backgroundColor: '#fff', ...Shadows.sm,
  },
  notifItemUnread: { backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1' },
  notifIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  notifBody: { flex: 1, gap: 2 },
  notifTitle: { color: '#1C1917', fontSize: 13, fontWeight: '600' },
  notifTitleUnread: { fontWeight: '800' },
  notifMessage: { color: '#78716C', fontSize: 12, lineHeight: 17 },
  notifTime: { color: '#A8A29E', fontSize: 10, fontWeight: '500', marginTop: 3 },
  notifDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F5F5F4', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#1C1917', fontSize: 16, fontWeight: '700' },
  emptyDesc: { color: '#A8A29E', fontSize: 13, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
});
