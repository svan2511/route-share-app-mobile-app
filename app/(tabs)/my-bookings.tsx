import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Linking, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppLoader } from '@/components/app-loader';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Shadows } from '@/constants/theme';
import { bookingsApi, type BookingRequest } from '@/services/bookings';
import { ConfirmModal } from '@/components/confirm-modal';
import { useToast } from '@/components/toast';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#D97706', bg: '#FEF3C7' },
  accepted: { label: 'Accepted', color: '#059669', bg: '#D1FAE5' },
  rejected: { label: 'Rejected', color: '#DC2626', bg: '#FEE2E2' },
  cancelled: { label: 'Cancelled', color: '#78716C', bg: '#F5F5F4' },
  completed: { label: 'Completed', color: '#2563EB', bg: '#DBEAFE' },
  running: { label: 'Running', color: '#2563EB', bg: '#DBEAFE' },
  ride_cancelled: { label: 'Ride Cancelled', color: '#DC2626', bg: '#FEE2E2' },
};

function isRideRunning(load: any): boolean {
  if (!load?.departure_date || !load?.departure_time) return false;
  const departure = new Date(`${load.departure_date}T${load.departure_time}`);
  return departure < new Date();
}

function stopArrivalTime(departureTime: string, offsetMinutes: number): string {
  const [h, m] = departureTime.split(':').map(Number);
  const totalMin = h * 60 + m + offsetMinutes;
  const hours = Math.floor((totalMin % (24 * 60)) / 60);
  const mins = totalMin % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(mins).padStart(2, '0')} ${ampm}`;
}

function getStopOffset(routeSnapshot: any, stopName: string, toCity?: string): number {
  if (!routeSnapshot?.stops) return 0;
  const match = routeSnapshot.stops.find(
    (s: any) => s.stop_name.toLowerCase() === stopName.toLowerCase()
  );
  if (match) return match.time_offset_minutes ?? 0;
  if (toCity && stopName.toLowerCase() === toCity.toLowerCase()) {
    const lastStopOffset = routeSnapshot.stops.length > 0
      ? routeSnapshot.stops[routeSnapshot.stops.length - 1].time_offset_minutes
      : 0;
    return routeSnapshot.destination_offset_minutes
      ? lastStopOffset + routeSnapshot.destination_offset_minutes
      : lastStopOffset + 60;
  }
  return 0;
}

export default function MyBookingsScreen() {
  const primaryColor = useThemeColor({}, 'primary');
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'rejected'>('pending');
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toast = useToast();

  const fetchRequests = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await bookingsApi.myRequests();
      setRequests(res.data);
    } catch {
      if (!silent) setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
      intervalRef.current = setInterval(() => fetchRequests(true), 12000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [fetchRequests])
  );

  const handleCancel = (id: number) => {
    setCancelTarget(id);
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await bookingsApi.cancel(cancelTarget);
      setCancelTarget(null);
      fetchRequests();
    } catch (err: any) {
      toast.show({ message: err.message || 'Failed to cancel.', type: 'error' });
    }
  };

  const filteredRequests = requests.filter(r => {
    if (activeTab === 'pending') return r.status === 'pending';
    if (activeTab === 'accepted') return r.status === 'accepted';
    return r.status === 'rejected';
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const acceptedCount = requests.filter(r => r.status === 'accepted').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  return (
    <ThemedView style={styles.container}>
      <LinearGradient colors={['#14B8A6', '#0D9488']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerIcon}>
            <IconSymbol name="shippingbox.fill" size={18} color="#fff" />
          </View>
          <View>
            <ThemedText type="headlineLgMobile" style={styles.headerTitle}>My Bookings</ThemedText>
            <ThemedText type="bodySm" style={styles.headerSub}>Track your booking requests</ThemedText>
          </View>
        </View>
        <View style={styles.headerCount}>
          <ThemedText type="titleMd" style={styles.headerCountNum}>{requests.length}</ThemedText>
          <ThemedText type="labelMd" style={styles.headerCountLabel}>Total</ThemedText>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabRowOuter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRowContent}>
          <TouchableOpacity
            onPress={() => setActiveTab('pending')}
            style={[styles.tabChip, activeTab === 'pending' && { backgroundColor: primaryColor + '12', borderColor: primaryColor }]}
          >
            <ThemedText type="labelMd" style={[styles.tabText, activeTab === 'pending' && { color: primaryColor }]}>
              Pending ({pendingCount})
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('accepted')}
            style={[styles.tabChip, activeTab === 'accepted' && { backgroundColor: primaryColor + '12', borderColor: primaryColor }]}
          >
            <ThemedText type="labelMd" style={[styles.tabText, activeTab === 'accepted' && { color: primaryColor }]}>
              Accepted ({acceptedCount})
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('rejected')}
            style={[styles.tabChip, activeTab === 'rejected' && { backgroundColor: primaryColor + '12', borderColor: primaryColor }]}
          >
            <ThemedText type="labelMd" style={[styles.tabText, activeTab === 'rejected' && { color: primaryColor }]}>
              Rejected ({rejectedCount})
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <AppLoader visible={loading} message="Loading bookings..." />

      {filteredRequests.length === 0 ? (
        <View style={styles.centerState}>
          <View style={styles.emptyIconWrap}>
            <IconSymbol name="shippingbox.fill" size={40} color="#D6D3D1" />
          </View>
          <ThemedText type="bodyLg" style={styles.emptyText}>
            {activeTab === 'pending' ? 'No pending bookings' : activeTab === 'accepted' ? 'No accepted bookings' : 'No rejected bookings'}
          </ThemedText>
          <ThemedText type="bodySm" style={styles.emptySub}>
            {activeTab === 'pending' ? 'Your pending requests will appear here' : activeTab === 'accepted' ? 'Your accepted bookings will appear here' : 'Rejected requests will appear here'}
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRequests(); }} tintColor={primaryColor} colors={[primaryColor]} />}
        >
          {filteredRequests.map(req => {
            const load = req.load as any;
            const rideRunning = !['rejected', 'cancelled', 'completed'].includes(req.status) && isRideRunning(load);
            const isRideCancelled = load?.status === 'cancelled';
            const st = isRideCancelled ? STATUS_MAP.ride_cancelled : (rideRunning ? STATUS_MAP.running : (STATUS_MAP[req.status] || STATUS_MAP.pending));
            return (
              <View key={req.id} style={styles.card}>
                {/* Card Header - Status + Load Badge + Owner */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                      <View style={[styles.statusPillDot, { backgroundColor: st.color }]} />
                      <ThemedText type="labelMd" style={[styles.statusPillText, { color: st.color }]}>{st.label}</ThemedText>
                    </View>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    {load?.user?.business_name && (
                      <View style={styles.ownerChip}>
                        <View style={[styles.ownerChipDot, { backgroundColor: '#8B5CF6' }]} />
                        <ThemedText type="labelMd" style={styles.ownerChipText} numberOfLines={1}>{load.user.business_name}</ThemedText>
                      </View>
                    )}
                    {load && (
                      <View style={styles.loadBadge}>
                        <IconSymbol name="truck.box.fill" size={10} color="#A8A29E" />
                        <ThemedText type="labelMd" style={styles.loadBadgeText}>{load.vehicle_type || 'Truck'}</ThemedText>
                      </View>
                    )}
                  </View>
                </View>

                {/* Load Route + Booking Route Combined */}
                {load && (
                  <View style={styles.loadRouteRow}>
                    <View style={styles.loadRouteStop}>
                      <ThemedText type="labelMd" style={styles.loadRouteLabel}>Origin</ThemedText>
                      <ThemedText type="bodySm" style={styles.loadRouteCity}>{load.from_city}</ThemedText>
                      {load.departure_time && (
                        <ThemedText type="labelMd" style={styles.loadRouteTime}>
                          {stopArrivalTime(load.departure_time, 0)}
                        </ThemedText>
                      )}
                    </View>
                    <View style={styles.loadRouteArrow}>
                      <View style={[styles.loadRouteLine, { backgroundColor: primaryColor + '20' }]} />
                      <IconSymbol name="arrow.right" size={12} color={primaryColor} />
                      <View style={[styles.loadRouteLine, { backgroundColor: primaryColor + '20' }]} />
                    </View>
                    <View style={styles.loadRouteStop}>
                      <ThemedText type="labelMd" style={styles.loadRouteLabel}>Final Destination</ThemedText>
                      <ThemedText type="bodySm" style={styles.loadRouteCity}>{load.to_city}</ThemedText>
                      {load.departure_time && (
                        <ThemedText type="labelMd" style={styles.loadRouteTime}>
                          {stopArrivalTime(load.departure_time, getStopOffset(load.route_snapshot, load.to_city, load.to_city))}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                )}

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <View style={[styles.dividerBadge, { backgroundColor: primaryColor + '10' }]}>
                    <IconSymbol name="arrow.down" size={10} color={primaryColor} />
                  </View>
                  <View style={styles.dividerLine} />
                </View>

                {/* Your Booking */}
                <View style={styles.bookingSection}>
                  <View style={styles.bookingRow}>
                    <View style={styles.bookingStop}>
                      <ThemedText type="labelMd" style={styles.bookingStopLabel}>Pickup</ThemedText>
                      <ThemedText type="titleMd" style={[styles.bookingStopCity, { color: primaryColor }]}>{req.pickup_city}</ThemedText>
                      {load?.departure_time && (
                        <ThemedText type="labelMd" style={styles.bookingStopTime}>
                          {stopArrivalTime(load.departure_time, getStopOffset(load.route_snapshot, req.pickup_city))}
                        </ThemedText>
                      )}
                    </View>
                    <View style={styles.bookingArrow}>
                      <View style={[styles.bookingLine, { backgroundColor: primaryColor + '20' }]} />
                      <IconSymbol name="arrow.right" size={12} color={primaryColor} />
                      <View style={[styles.bookingLine, { backgroundColor: primaryColor + '20' }]} />
                    </View>
                    <View style={styles.bookingStop}>
                      <ThemedText type="labelMd" style={styles.bookingStopLabel}>Drop</ThemedText>
                      <ThemedText type="titleMd" style={[styles.bookingStopCity, { color: '#DC2626' }]}>{req.drop_city}</ThemedText>
                      {load?.departure_time && (
                        <ThemedText type="labelMd" style={styles.bookingStopTime}>
                          {stopArrivalTime(load.departure_time, getStopOffset(load.route_snapshot, req.drop_city, load.to_city))}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                </View>

                {/* Meta */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <IconSymbol name="calendar" size={11} color="#A8A29E" />
                    <ThemedText type="labelMd" style={styles.metaText}>
                      {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </ThemedText>
                  </View>
                  {req.goods_description && (
                    <View style={styles.metaItem}>
                      <IconSymbol name="shippingbox.fill" size={11} color="#A8A29E" />
                      <ThemedText type="labelMd" style={styles.metaText} numberOfLines={1}>{req.goods_description}</ThemedText>
                    </View>
                  )}
                </View>

                {/* Actions */}
                {!rideRunning && !isRideCancelled && (
                  <View style={styles.actions}>
                    {req.status === 'accepted' && (
                      <>
                        <View style={styles.confirmedRow}>
                          <View style={[styles.confirmedBadge, { backgroundColor: '#D1FAE5' }]}>
                            <IconSymbol name="checkmark.seal.fill" size={14} color="#059669" />
                            <ThemedText type="labelMd" style={styles.confirmedText}>Space Booked</ThemedText>
                          </View>
                          <TouchableOpacity style={styles.callIconBtn} onPress={() => Linking.openURL(`tel:${load?.phone || ''}`)}>
                            <IconSymbol name="phone.fill" size={16} color="#059669" />
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                    {req.status === 'pending' && (
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(req.id)}>
                        <IconSymbol name="xmark.circle.fill" size={14} color="#DC2626" />
                        <ThemedText type="labelMd" style={styles.cancelText}>Cancel Request</ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <ConfirmModal
        visible={cancelTarget !== null}
        title="Cancel Request"
        message="Are you sure you want to cancel this request?"
        confirmLabel="Yes, Cancel"
        confirmDestructive
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F0' },

  header: { paddingBottom: 20, paddingHorizontal: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 },
  headerCount: { alignItems: 'center' },
  headerCountNum: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerCountLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  scroll: { padding: 16, paddingBottom: 40 },
  tabRowOuter: { paddingHorizontal: 16, paddingTop: 16 },
  tabRowContent: { flexDirection: 'row', gap: 8 },
  tabChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E7E5E4' },
  tabText: { color: '#78716C', fontWeight: '700', fontSize: 12 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F5F5F0', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyText: { color: '#A8A29E', marginTop: 12, fontSize: 16, fontWeight: '600' },
  emptySub: { color: '#D6D3D1', marginTop: 4, fontSize: 13 },

  card: { backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 14, ...Shadows.md },
  cardExpired: { opacity: 0.9 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, justifyContent: 'flex-end' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusPillDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  ownerChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F5F3FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, maxWidth: 130 },
  ownerChipDot: { width: 6, height: 6, borderRadius: 3 },
  ownerChipText: { color: '#8B5CF6', fontSize: 9, fontWeight: '700' },
  loadBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F5F5F4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  loadBadgeText: { color: '#78716C', fontSize: 9, fontWeight: '700' },

  loadRouteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 6 },
  loadRouteStop: { alignItems: 'center', gap: 2, flexShrink: 1 },
  loadRouteLabel: { color: '#A8A29E', fontSize: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  loadRouteCity: { color: '#78716C', fontSize: 12, fontWeight: '600' },
  loadRouteTime: { color: '#D6D3D1', fontSize: 9, fontWeight: '700' },
  loadRouteArrow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, marginHorizontal: 10 },
  loadRouteLine: { flex: 1, height: 1 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F0EFEE' },
  dividerBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  bookingSection: { marginBottom: 6 },
  bookingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  bookingStop: { alignItems: 'center', gap: 1, flexShrink: 1 },
  bookingStopLabel: { color: '#A8A29E', fontSize: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  bookingStopCity: { fontSize: 15, fontWeight: '800' },
  bookingStopTime: { color: '#D6D3D1', fontSize: 9, fontWeight: '700' },
  bookingArrow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, marginHorizontal: 10 },
  bookingLine: { flex: 1, height: 1 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: '#78716C', fontSize: 10, fontWeight: '600' },

  actions: { paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F5F5F4' },
  confirmedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  confirmedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  confirmedText: { color: '#059669', fontWeight: '800', fontSize: 12 },
  callIconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },

  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, borderRadius: 14, borderWidth: 1.5, borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  cancelText: { color: '#DC2626', fontWeight: '800', fontSize: 13 },

});
