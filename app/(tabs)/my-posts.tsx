import React, { useState, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { AppLoader } from '@/components/app-loader';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Shadows } from '@/constants/theme';
import { loadsApi, type Load } from '@/services/loads';
import { bookingsApi, type BookingRequest } from '@/services/bookings';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime } from '@/lib/format';
import { ConfirmModal } from '@/components/confirm-modal';
import { useToast } from '@/components/toast';

function isRideRunning(load: Load): boolean {
  if (!load.departure_date || !load.departure_time) return false;
  const departure = new Date(`${load.departure_date}T${load.departure_time}`);
  return departure < new Date();
}

export default function MyPostsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const primaryColor = useThemeColor({}, 'primary');

  const [activeTab, setActiveTab] = useState<'active' | 'running' | 'completed'>('active');
  const [activeLoads, setActiveLoads] = useState<Load[]>([]);
  const [completedLoads, setCompletedLoads] = useState<Load[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedLoads, setExpandedLoads] = useState<Set<number>>(new Set());
  const [closeTarget, setCloseTarget] = useState<number | null>(null);
  const [cancelRideTarget, setCancelRideTarget] = useState<number | null>(null);
  const [cancelBookingTarget, setCancelBookingTarget] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const toast = useToast();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [loadsRes, bookingsRes] = await Promise.all([
        loadsApi.myLoads(),
        bookingsApi.received(),
      ]);
      setActiveLoads(loadsRes.data.active);
      setCompletedLoads(loadsRes.data.completed);
      setReceivedRequests(bookingsRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load rides.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [fetchPosts])
  );

  const toggleExpand = (loadId: number) => {
    setExpandedLoads(prev => {
      const next = new Set(prev);
      if (next.has(loadId)) next.delete(loadId);
      else next.add(loadId);
      return next;
    });
  };

  const handleClose = (loadId: number) => {
    setCloseTarget(loadId);
  };

  const confirmClose = async () => {
    if (!closeTarget) return;
    try {
      await loadsApi.complete(closeTarget);
      setCloseTarget(null);
      fetchPosts();
    } catch (err: any) {
      toast.show({ message: err.message || 'Failed to close ride.', type: 'error' });
    }
  };

  const handleCancelRide = (loadId: number) => {
    setCancelRideTarget(loadId);
  };

  const confirmCancelRide = async () => {
    if (!cancelRideTarget) return;
    try {
      await loadsApi.cancel(cancelRideTarget);
      const bookingsToCancel = receivedRequests.filter(
        r => r.load_id === cancelRideTarget && (r.status === 'accepted' || r.status === 'pending')
      );
      await Promise.allSettled(bookingsToCancel.map(r => bookingsApi.cancel(r.id)));
      setCancelRideTarget(null);
      fetchPosts();
    } catch (err: any) {
      toast.show({ message: err.message || 'Failed to cancel ride.', type: 'error' });
    }
  };

  const handleAccept = async (id: number) => {
    setActionLoading('accept-' + id);
    try {
      await bookingsApi.accept(id);
      fetchPosts();
    } catch (err: any) {
      toast.show({ message: err.message || 'Failed to accept request.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading('reject-' + id);
    try {
      await bookingsApi.reject(id);
      fetchPosts();
    } catch (err: any) {
      toast.show({ message: err.message || 'Failed to reject request.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelBooking = (id: number) => {
    setCancelBookingTarget(id);
  };

  const confirmCancelBooking = async () => {
    if (!cancelBookingTarget) return;
    try {
      await bookingsApi.cancel(cancelBookingTarget);
      setCancelBookingTarget(null);
      fetchPosts();
    } catch (err: any) {
      toast.show({ message: err.message || 'Failed to cancel booking.', type: 'error' });
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      active: { label: 'Active', color: '#059669', bg: '#ECFDF5' },
      running: { label: 'Running', color: '#2563EB', bg: '#DBEAFE' },
      completed: { label: 'Completed', color: '#78716C', bg: '#F5F5F4' },
    };
    return map[status] || map.active;
  };

  const reqBadge = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: 'Pending', color: '#D97706', bg: '#FEF3C7' },
      accepted: { label: 'Accepted', color: '#059669', bg: '#D1FAE5' },
      rejected: { label: 'Rejected', color: '#DC2626', bg: '#FEE2E2' },
      cancelled: { label: 'Cancelled', color: '#78716C', bg: '#F5F5F4' },
    };
    return map[status] || map.pending;
  };

  const getInitial = (name: string) => (user?.business_name?.charAt(0) || name?.charAt(0) || 'U')?.toUpperCase();

  const runningLoads = activeLoads.filter(isRideRunning);
  const actualActiveLoads = activeLoads.filter(l => !isRideRunning(l));

  const currentList = activeTab === 'active' ? actualActiveLoads
    : activeTab === 'running' ? runningLoads
    : completedLoads;

  const tabs = [
    { key: 'active' as const, label: `Active (${actualActiveLoads.length})` },
    { key: 'running' as const, label: `Running (${runningLoads.length})` },
    { key: 'completed' as const, label: `Completed (${completedLoads.length})` },
  ];

  const requestsByLoad: Record<number, BookingRequest[]> = {};
  for (const req of receivedRequests) {
    const lid = req.load_id;
    if (!requestsByLoad[lid]) requestsByLoad[lid] = [];
    requestsByLoad[lid].push(req);
  }

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['#14B8A6', '#0D9488']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <ThemedText type="headlineLgMobile" style={styles.logo}>My Rides</ThemedText>
          <View style={styles.profilePlaceholder}>
            <ThemedText type="titleMd" style={{ color: '#fff', fontWeight: '800' }}>{getInitial(user?.full_name || 'U')}</ThemedText>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tabChip,
                activeTab === tab.key && { backgroundColor: primaryColor + '12', borderColor: primaryColor },
              ]}
            >
              <ThemedText type="labelMd" style={[styles.tabText, activeTab === tab.key && { color: primaryColor }]}>
                {tab.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <AppLoader visible={loading} message="Loading your rides..." />

        {error ? (
          <View style={styles.emptyState}>
            <IconSymbol name="exclamationmark.triangle.fill" size={32} color="#DC2626" />
            <ThemedText type="bodySm" style={styles.emptyText}>{error}</ThemedText>
            <TouchableOpacity onPress={fetchPosts} style={[styles.retryBtn, { backgroundColor: primaryColor }]}>
              <ThemedText type="labelMd" style={{ color: '#fff', fontWeight: '700' }}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        ) : currentList.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="truck.box.fill" size={32} color="#D6D3D1" />
            <ThemedText type="bodySm" style={styles.emptyText}>No {activeTab} rides found.</ThemedText>
          </View>
        ) : (
          <View style={styles.postsList}>
            {currentList.map(post => {
              const displayStatus = post.status === 'active' && isRideRunning(post) ? 'running' : post.status;
              const sb = statusBadge(displayStatus);
              const reqs = (requestsByLoad[post.id] || [])
                .filter(r => r.status !== 'cancelled' && r.status !== 'rejected')
                .sort(
                  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
              const pendingCount = reqs.filter(r => r.status === 'pending').length;
              const expanded = expandedLoads.has(post.id);
              return (
                <View key={post.id} style={styles.postCard}>
                  {/* Header */}
                  <View style={styles.postHeader}>
                    <View style={styles.postRouteRow}>
                      <ThemedText type="titleMd" style={styles.postFrom}>{post.from_city}</ThemedText>
                      <View style={styles.postArrowWrap}>
                        <View style={[styles.postArrowLine, { backgroundColor: primaryColor + '30' }]} />
                        <IconSymbol name="arrow.right" size={12} color={primaryColor} />
                      </View>
                      <ThemedText type="titleMd" style={styles.postTo}>{post.to_city}</ThemedText>
                    </View>
                    <View style={[styles.postStatusBadge, { backgroundColor: sb.bg }]}>
                      <View style={[styles.postStatusDot, { backgroundColor: sb.color }]} />
                      <ThemedText type="labelMd" style={[styles.postStatusText, { color: sb.color }]}>{sb.label}</ThemedText>
                    </View>
                  </View>

                  {/* Details */}
                  <View style={styles.postMeta}>
                    <View style={styles.postMetaItem}>
                      <IconSymbol name="calendar" size={12} color="#78716C" />
                      <ThemedText type="bodySm" style={styles.postMetaText}>{formatDateTime(post.departure_date, post.departure_time)}</ThemedText>
                    </View>
                    <View style={styles.postMetaItem}>
                      <IconSymbol name="truck.box.fill" size={12} color="#78716C" />
                      <ThemedText type="bodySm" style={styles.postMetaText}>{post.vehicle_type}</ThemedText>
                    </View>
                    <View style={styles.postMetaItem}>
                      <IconSymbol name="bolt.fill" size={12} color={primaryColor} />
                      <ThemedText type="bodySm" style={[styles.postMetaText, { color: primaryColor }]}>{post.available_space}% space</ThemedText>
                    </View>
                  </View>

                  {/* Actions */}
                  {post.status !== 'completed' && (
                    <View style={styles.postActions}>
                      {!isRideRunning(post) && (
                        <>
                          <TouchableOpacity style={styles.editBtn} onPress={() => router.push({ pathname: '/post', params: { id: String(post.id) } })}>
                            <IconSymbol name="pencil" size={13} color={primaryColor} />
                            <ThemedText type="labelMd" style={[styles.actionLabel, { color: primaryColor }]}>Edit</ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.delBtn} onPress={() => handleCancelRide(post.id)}>
                            <ThemedText type="labelMd" style={[styles.actionLabel, { color: '#DC2626' }]}>Cancel</ThemedText>
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity style={styles.completeBtn} onPress={() => handleClose(post.id)}>
                        <ThemedText type="labelMd" style={styles.actionLabel}>Mark Done</ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Requests Section */}
                  {reqs.length > 0 && (
                    <>
                      <TouchableOpacity style={styles.reqToggle} onPress={() => toggleExpand(post.id)} activeOpacity={0.7}>
                        <View style={styles.reqToggleLeft}>
                          <IconSymbol name="shippingbox.fill" size={13} color={primaryColor} />
                          <ThemedText type="labelMd" style={styles.reqToggleTitle}>
                            Requests ({reqs.length})
                          </ThemedText>
                          {pendingCount > 0 && (
                            <View style={styles.pendingBadge}>
                              <ThemedText type="labelMd" style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{pendingCount} New</ThemedText>
                            </View>
                          )}
                        </View>
                        <IconSymbol name={expanded ? 'chevron.up' : 'chevron.down'} size={16} color="#A8A29E" />
                      </TouchableOpacity>

                      {expanded && (
                        <View style={styles.reqsList}>
                          {reqs.map(req => {
                            const rb = reqBadge(req.status);
                            const reqLoad = req.load as any;
                            return (
                              <View key={req.id} style={styles.reqCard}>
                                <View style={styles.reqCardTop}>
                                  <View style={styles.reqUserInfo}>
                                    <View style={[styles.reqAvatar, { backgroundColor: primaryColor + '12' }]}>
                                      <ThemedText type="titleMd" style={[styles.reqAvatarText, { color: primaryColor }]}>
                                        {(req.user?.business_name || req.user?.full_name || '?').charAt(0).toUpperCase()}
                                      </ThemedText>
                                    </View>
                                    <View style={styles.reqUserDetails}>
                                      <ThemedText type="bodySm" style={styles.reqUserName}>{req.user?.business_name || req.user?.full_name}</ThemedText>
                                      <ThemedText type="labelMd" style={styles.reqUserCity}>{req.user?.city || ''}</ThemedText>
                                    </View>
                                    {req.status === 'accepted' && req.user?.phone ? (
                                      <TouchableOpacity style={styles.reqCallBtn} onPress={() => Linking.openURL(`tel:${req.user.phone}`)}>
                                        <IconSymbol name="phone.fill" size={14} color={primaryColor} />
                                      </TouchableOpacity>
                                    ) : null}
                                  </View>
                                  <View style={[styles.reqStatusBadge, { backgroundColor: rb.bg }]}>
                                    <ThemedText type="labelMd" style={[styles.reqStatusText, { color: rb.color }]}>{rb.label}</ThemedText>
                                  </View>
                                </View>

                                <View style={styles.reqRouteRow}>
                                  <View style={styles.reqRouteItem}>
                                    <View style={[styles.reqRouteDot, { backgroundColor: primaryColor }]} />
                                    <ThemedText type="bodySm" style={styles.reqRouteLabel}>Pickup</ThemedText>
                                    <ThemedText type="titleMd" style={styles.reqRouteCity}>{req.pickup_city}</ThemedText>
                                  </View>
                                  <View style={styles.reqConnector}>
                                    <View style={styles.reqConnLine} />
                                    <IconSymbol name="arrow.down" size={9} color="#D6D3D1" />
                                  </View>
                                  <View style={styles.reqRouteItem}>
                                    <View style={[styles.reqRouteDot, { backgroundColor: '#DC2626' }]} />
                                    <ThemedText type="bodySm" style={styles.reqRouteLabel}>Drop</ThemedText>
                                    <ThemedText type="titleMd" style={styles.reqRouteCity}>{req.drop_city}</ThemedText>
                                  </View>
                                </View>

                                {req.goods_description && (
                                  <View style={styles.reqGoodsRow}>
                                    <IconSymbol name="shippingbox.fill" size={11} color="#A8A29E" />
                                    <ThemedText type="bodySm" style={styles.reqGoodsText}>{req.goods_description}</ThemedText>
                                  </View>
                                )}

                                <ThemedText type="labelMd" style={styles.reqDate}>
                                  {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </ThemedText>

                                {req.status === 'pending' && (
                                  <View style={styles.reqActions}>
                                    <TouchableOpacity
                                      style={[styles.acceptBtn, { backgroundColor: '#059669' }, actionLoading === 'accept-' + req.id && { opacity: 0.6 }]}
                                      onPress={() => handleAccept(req.id)}
                                      disabled={actionLoading !== null}
                                    >
                                      {actionLoading === 'accept-' + req.id ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                      ) : (
                                        <>
                                          <IconSymbol name="checkmark" size={14} color="#fff" />
                                          <ThemedText type="labelMd" style={styles.btnLabel}>Accept</ThemedText>
                                        </>
                                      )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      style={[styles.rejectBtn, actionLoading === 'reject-' + req.id && { opacity: 0.6 }]}
                                      onPress={() => handleReject(req.id)}
                                      disabled={actionLoading !== null}
                                    >
                                      {actionLoading === 'reject-' + req.id ? (
                                        <ActivityIndicator color="#DC2626" size="small" />
                                      ) : (
                                        <ThemedText type="labelMd" style={styles.rejectLabel}>Reject</ThemedText>
                                      )}
                                    </TouchableOpacity>
                                  </View>
                                )}

                                {req.status === 'accepted' && (
                                  <TouchableOpacity style={styles.cancelBookingBtn} onPress={() => handleCancelBooking(req.id)}>
                                    <IconSymbol name="xmark" size={12} color="#DC2626" />
                                    <ThemedText type="labelMd" style={{ color: '#DC2626', fontWeight: '600' }}>Undo Accept</ThemedText>
                                  </TouchableOpacity>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: primaryColor }]} onPress={() => router.push('/post')} activeOpacity={0.85}>
        <IconSymbol name="plus" size={22} color="#fff" />
      </TouchableOpacity>

      <ConfirmModal
        visible={closeTarget !== null}
        title="Close Ride"
        message="Are you sure you want to mark this ride as completed?"
        confirmLabel="Close"
        confirmDestructive
        onConfirm={confirmClose}
        onCancel={() => setCloseTarget(null)}
      />

      <ConfirmModal
        visible={cancelRideTarget !== null}
        title="Cancel Ride"
        message="Are you sure you want to cancel this ride? It will be hidden from search."
        confirmLabel="Yes, Cancel"
        confirmDestructive
        onConfirm={confirmCancelRide}
        onCancel={() => setCancelRideTarget(null)}
      />

      <ConfirmModal
        visible={cancelBookingTarget !== null}
        title="Undo Accept"
        message="This will revert the request back to pending and free up the space."
        confirmLabel="Yes, Revert"
        confirmDestructive
        onConfirm={confirmCancelBooking}
        onCancel={() => setCancelBookingTarget(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF9' },
  headerGradient: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { color: '#fff', fontSize: 20, fontWeight: '800' },
  profilePlaceholder: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  scrollContent: { padding: 20, paddingBottom: 120 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', ...Shadows.lg, shadowColor: '#0D9488', elevation: 8 },
  tabRow: { marginBottom: 20 },
  tabChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E7E5E4', marginRight: 10 },
  tabText: { color: '#78716C', fontWeight: '700', fontSize: 12 },
  postsList: { gap: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: '#A8A29E', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },

  postCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, ...Shadows.md },
  postHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  postRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  postFrom: { color: '#1C1917', fontWeight: '800', fontSize: 16 },
  postArrowWrap: { alignItems: 'center', gap: 2 },
  postArrowLine: { width: 16, height: 1.5 },
  postTo: { color: '#1C1917', fontWeight: '800', fontSize: 16 },
  postStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  postStatusDot: { width: 5, height: 5, borderRadius: 2.5 },
  postStatusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },

  postMeta: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  postMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  postMetaText: { color: '#78716C', fontSize: 11, fontWeight: '600' },

  postActions: { flexDirection: 'row', gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F5F5F4', marginBottom: 0 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#F5F3FF', height: 40, borderRadius: 10 },
  completeBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F4', height: 40, borderRadius: 10 },
  delBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', height: 40, borderRadius: 10, paddingHorizontal: 12 },
  actionLabel: { color: '#1C1917', fontWeight: '700', fontSize: 12 },

  reqToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F5F5F4' },
  reqToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reqToggleTitle: { color: '#1C1917', fontWeight: '700', fontSize: 12 },

  reqsList: { gap: 10, marginTop: 12 },
  reqCard: { backgroundColor: '#FAFAF9', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F0EFEE' },
  reqCardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  reqUserInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  reqAvatar: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reqAvatarText: { fontSize: 13, fontWeight: '800' },
  reqUserDetails: { flex: 1 },
  reqUserName: { color: '#1C1917', fontWeight: '700', fontSize: 12 },
  reqUserCity: { color: '#A8A29E', fontSize: 10, marginTop: 1 },
  reqCallBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E7E5E4' },
  reqStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 6 },
  reqStatusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },

  reqRouteRow: { marginBottom: 8 },
  reqRouteItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqRouteDot: { width: 7, height: 7, borderRadius: 3.5 },
  reqRouteLabel: { color: '#A8A29E', fontSize: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, width: 40 },
  reqRouteCity: { color: '#1C1917', fontSize: 14, fontWeight: '700', flex: 1 },
  reqConnector: { alignItems: 'center', paddingVertical: 4, marginLeft: 3 },
  reqConnLine: { width: 1.5, height: 12, backgroundColor: '#E7E5E4' },

  reqGoodsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  reqGoodsText: { color: '#57534E', fontSize: 11, flex: 1 },
  reqDate: { color: '#A8A29E', fontSize: 9 },

  reqActions: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0EFEE' },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 38, borderRadius: 10, ...Shadows.sm },
  btnLabel: { color: '#fff', fontWeight: '800', fontSize: 12 },
  rejectBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#FECACA' },
  rejectLabel: { color: '#DC2626', fontWeight: '800', fontSize: 12 },
  pendingBadge: { backgroundColor: '#DC2626', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 4 },
  cancelBookingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0EFEE', height: 38 },
});
