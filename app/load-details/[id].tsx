import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Linking, Modal, TextInput } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Shadows } from '@/constants/theme';
import { loadsApi, type Load } from '@/services/loads';
import { savedLoadsApi } from '@/services/saved-loads';
import { bookingsApi } from '@/services/bookings';
import { formatDate, formatTime } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/toast';

const { width } = Dimensions.get('window');

function stopArrivalTime(departureTime: string, offsetMinutes: number): string {
  const [h, m] = departureTime.split(':').map(Number);
  const totalMin = h * 60 + m + offsetMinutes;
  const hours = Math.floor((totalMin % (24 * 60)) / 60);
  const mins = totalMin % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(mins).padStart(2, '0')} ${ampm}`;
}

export default function LoadDetailsScreen() {
  const router = useRouter();
  const { id, from: searchFrom, to: searchTo } = useLocalSearchParams<{ id: string; from?: string; to?: string }>();
  const primaryColor = useThemeColor({}, 'primary');
  const { user } = useAuth();
  const [load, setLoad] = useState<Load | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [pickupStop, setPickupStop] = useState('');
  const [dropStop, setDropStop] = useState('');
  const [goodsDesc, setGoodsDesc] = useState('');
  const [bookLoading, setBookLoading] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchLoad();
  }, [id]);

  const fetchLoad = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await loadsApi.show(Number(id));
      setLoad(response.data);
      setHasRequested(response.has_requested || false);
    } catch (err: any) {
      setError(err.message || 'Failed to load ride details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!load || saving) return;
    setSaving(true);
    try {
      const response = await savedLoadsApi.toggle(load.id);
      setSaved(response.data.saved);
    } catch (err: any) {
      toast.show({ message: err.message || 'Failed to save ride.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCall = () => {
    if (load?.phone) {
      Linking.openURL(`tel:${load.phone}`);
    }
  };

  const isOwner = user?.id === load?.user?.id;

  const openBooking = () => {
    if (!load) return;
    setPickupStop(searchFrom || load.from_city);
    setDropStop(searchTo || load.to_city);
    setGoodsDesc('');
    setShowBooking(true);
  };

  const handleRequestBook = async () => {
    if (!load || !pickupStop || !dropStop) return;
    const stops = load.route?.stops || [];
    const pickupStopData = stops.find(s => s.stop_name === pickupStop);
    const offset = pickupStopData ? pickupStopData.time_offset_minutes : 0;
    setBookLoading(true);
    try {
      await bookingsApi.create({
        load_id: load.id,
        pickup_city: pickupStop,
        drop_city: dropStop,
        pickup_offset_minutes: offset,
        goods_description: goodsDesc || undefined,
      });
      setShowBooking(false);
      toast.show({ message: 'Request sent! Owner will review shortly.', type: 'success' });
    } catch (err: any) {
      toast.show({ message: err.message || 'Failed to send booking request.', type: 'error' });
    } finally {
      setBookLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <LinearGradient colors={['#14B8A6', '#0D9488']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerGradient}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <IconSymbol name="arrow.left" size={20} color="#fff" />
            </TouchableOpacity>
            <ThemedText type="headlineLgMobile" style={styles.logo}>Ride Details</ThemedText>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.centerState}>
          <View style={[styles.loaderIcon, { backgroundColor: primaryColor + '15' }]}>
            <IconSymbol name="truck.box.fill" size={32} color={primaryColor} />
          </View>
          <ThemedText type="bodyLg" style={{ color: '#78716C', marginTop: 12, fontWeight: '600' }}>Loading ride details...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error || !load) {
    return (
      <ThemedView style={styles.container}>
        <LinearGradient colors={['#14B8A6', '#0D9488']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerGradient}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <IconSymbol name="arrow.left" size={20} color="#fff" />
            </TouchableOpacity>
            <ThemedText type="headlineLgMobile" style={styles.logo}>Ride Details</ThemedText>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.centerState}>
          <IconSymbol name="exclamationmark.triangle.fill" size={32} color="#DC2626" />
          <ThemedText type="bodySm" style={{ color: '#A8A29E', marginTop: 8 }}>{error || 'Ride not found.'}</ThemedText>
          <TouchableOpacity onPress={fetchLoad} style={[styles.retryBtn, { backgroundColor: primaryColor, marginTop: 16 }]}>
            <ThemedText type="labelMd" style={{ color: '#fff', fontWeight: '700' }}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  const l = load!;
  const stops = l.route?.stops || [];
  const destIdx = l.destination_stop_id
    ? stops.findIndex(s => s.id === l.destination_stop_id)
    : -1;
  const midStops = destIdx >= 0
    ? stops.slice(0, destIdx)
    : stops;
  const destOffset = destIdx >= 0
    ? stops[destIdx].time_offset_minutes
    : (l.route?.destination_offset_minutes
      ? (stops.length > 0 ? stops[stops.length - 1].time_offset_minutes : 0) + l.route.destination_offset_minutes
      : (stops.length > 0 ? stops[stops.length - 1].time_offset_minutes + 60 : 60));

  const [h, m] = l.departure_time.split(':').map(Number);
  const [y, M, dd] = l.departure_date.split('-').map(Number);
  const depBase = new Date(y, M - 1, dd, h, m);
  const now = new Date();

  function getTime(offset: number): Date {
    return new Date(depBase.getTime() + offset * 60000);
  }

  function isPassed(offset: number): boolean {
    return getTime(offset) <= now;
  }

  function cityTime(city: string, offset: number): string {
    return stopArrivalTime(l.departure_time, offset);
  }

  function cityOffset(city: string): number {
    if (city === l.from_city) return 0;
    const s = stops.find(st => st.stop_name === city);
    return s ? s.time_offset_minutes : 0;
  }

  const allPoints = [
    { key: 'origin', offset: 0, name: l.from_city, arr24: l.departure_time, label: 'Origin', isOrigin: true, isDest: false },
    ...midStops.map(s => ({ key: `s-${s.id}`, offset: s.time_offset_minutes, name: s.stop_name, label: `Stop ${s.stop_order}`, isOrigin: false, isDest: false })),
    { key: 'dest', offset: destOffset, name: l.to_city, label: 'Destination', isOrigin: false, isDest: true },
  ];

  const segs = allPoints.slice(0, -1).map((p, i) => {
    const next = allPoints[i + 1];
    const pTime = getTime(p.offset);
    const nTime = getTime(next.offset);
    const passed = now >= nTime;
    const current = !passed && now >= pTime;
    const progress = current ? Math.min(1, (now.getTime() - pTime.getTime()) / (nTime.getTime() - pTime.getTime())) : 0;
    return { from: p, to: next, passed, current, progress };
  });

  const rows: { type: 'seg' | 'stop'; key: string; seg?: typeof segs[0]; point?: typeof allPoints[0] }[] = [];
  for (let i = 0; i < allPoints.length; i++) {
    if (i > 0) rows.push({ type: 'seg', key: `seg-${i}`, seg: segs[i - 1] });
    rows.push({ type: 'stop', key: allPoints[i].key, point: allPoints[i] });
  }

  const nowH = now.getHours(), nowM = now.getMinutes();
  const nowStr = `${nowH % 12 || 12}:${String(nowM).padStart(2, '0')} ${nowH >= 12 ? 'PM' : 'AM'}`;

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['#14B8A6', '#0D9488']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="arrow.left" size={20} color="#fff" />
          </TouchableOpacity>
          <ThemedText type="headlineLgMobile" style={styles.logo}>Ride Details</ThemedText>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroCities}>
              <ThemedText type="titleMd" style={styles.heroFrom} numberOfLines={1} ellipsizeMode="tail">{load.from_city}</ThemedText>
              <View style={styles.heroArrow}>
                <IconSymbol name="arrow.right" size={12} color="#0D9488" />
              </View>
              <ThemedText type="titleMd" style={styles.heroTo} numberOfLines={1} ellipsizeMode="tail">{load.to_city}</ThemedText>
            </View>
          </View>
          <View style={styles.heroMeta}>
            <View style={[styles.heroBadge, { backgroundColor: primaryColor + '12' }]}>
              <IconSymbol name="bolt.fill" size={10} color={primaryColor} />
              <ThemedText type="labelMd" style={[styles.heroBadgeText, { color: primaryColor }]}>
                {load.status.charAt(0).toUpperCase() + load.status.slice(1)}
              </ThemedText>
            </View>
            <ThemedText type="bodySm" style={styles.heroId}>#{load.id}</ThemedText>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: primaryColor + '12' }]}>
              <IconSymbol name="map.fill" size={15} color={primaryColor} />
            </View>
            <ThemedText type="titleMd" style={styles.sectionTitle}>Transit Route</ThemedText>
              <View style={[styles.sectionBadge, { backgroundColor: primaryColor + '10' }]}>
                <ThemedText type="labelMd" style={[styles.sectionBadgeText, { color: primaryColor }]}>
                  {allPoints.length} stops
                </ThemedText>
              </View>
          </View>

          <View style={styles.timeline}>
            {rows.map((row, ri) => {
              if (row.type === 'seg') {
                const seg = row.seg!;
                return (
                  <View key={row.key} style={[styles.segRow, seg.current && styles.segRowCurrent]}>
                    <View style={styles.segLineCol}>
                      {seg.current ? (
                        <View style={styles.segLineCurrent}>
                          <View style={[styles.segLineFill, { height: `${seg.progress * 100}%` }]} />
                          <View style={[styles.segDotWrap, { bottom: `${seg.progress * 100}%` }]}>
                            <View style={styles.segNowDot} />
                          </View>
                        </View>
                      ) : seg.passed ? (
                        <View style={styles.segLinePassed} />
                      ) : (
                        <View style={styles.segLineFuture} />
                      )}
                    </View>
                    {seg.current && (
                      <View style={styles.segLabelCol}>
                        <View style={styles.nowPill}>
                          <IconSymbol name="location.fill" size={8} color="#0D9488" />
                          <ThemedText style={styles.nowLabel}>Now {nowStr}</ThemedText>
                        </View>
                      </View>
                    )}
                  </View>
                );
              }

              const point = row.point!;
              const passed = isPassed(point.offset);

              if (point.isOrigin) {
                return (
                  <View key={row.key} style={[styles.stopItem, passed && styles.stopPassed]}>
                    <View style={[styles.stopDot, { backgroundColor: passed ? '#A8A29E' : primaryColor }, passed && styles.stopDotPassed]}>
                      {passed ? <IconSymbol name="checkmark" size={10} color="#fff" /> : <View style={[styles.stopDotInner, styles.stopDotCurrent, { backgroundColor: primaryColor }]} />}
                    </View>
                    <View style={styles.stopBody}>
                      <View style={styles.stopLabelRow}>
                        <ThemedText type="labelMd" style={[styles.stopLabel, { color: passed ? '#A8A29E' : primaryColor }]}>Origin</ThemedText>
                        <View style={[styles.timePill, { backgroundColor: passed ? '#F5F5F4' : primaryColor + '10' }]}>
                          <IconSymbol name="clock.fill" size={9} color={passed ? '#A8A29E' : primaryColor} />
                          <ThemedText type="labelMd" style={[styles.timePillText, { color: passed ? '#A8A29E' : primaryColor }]}>{formatTime(l.departure_time)}</ThemedText>
                        </View>
                      </View>
                      <ThemedText type="titleMd" style={[styles.stopCity, passed && styles.stopCityPassed]} numberOfLines={1} ellipsizeMode="tail">{point.name}</ThemedText>
                      <ThemedText type="bodySm" style={[styles.stopDate, passed && styles.stopDatePassed]}>{formatDate(l.departure_date)}</ThemedText>
                    </View>
                  </View>
                );
              }

              if (point.isDest) {
                return (
                  <View key={row.key} style={[styles.stopItem, passed && styles.stopPassed]}>
                    <View style={[styles.stopDot, { backgroundColor: passed ? '#A8A29E' : '#DC2626' }, passed && styles.stopDotPassed]}>
                      {passed ? <IconSymbol name="checkmark" size={10} color="#fff" /> : <View style={[styles.stopDotInner, styles.stopDotCurrent, { backgroundColor: '#DC2626' }]} />}
                    </View>
                    <View style={styles.stopBody}>
                      <View style={styles.stopLabelRow}>
                        <ThemedText type="labelMd" style={[styles.stopLabel, { color: passed ? '#A8A29E' : '#DC2626' }]}>Destination</ThemedText>
                        {destOffset > 0 && (
                          <View style={[styles.timePill, { backgroundColor: passed ? '#F5F5F4' : '#FEF2F2' }]}>
                            <IconSymbol name="clock.fill" size={9} color={passed ? '#A8A29E' : '#DC2626'} />
                            <ThemedText type="labelMd" style={[styles.timePillText, { color: passed ? '#A8A29E' : '#DC2626' }]}>{stopArrivalTime(l.departure_time, destOffset)}</ThemedText>
                          </View>
                        )}
                      </View>
                      <ThemedText type="titleMd" style={[styles.stopCity, passed && styles.stopCityPassed]} numberOfLines={1} ellipsizeMode="tail">{point.name}</ThemedText>
                    </View>
                  </View>
                );
              }

              const arrival = stopArrivalTime(l.departure_time, point.offset);
              return (
                <View key={row.key} style={[styles.stopItem, passed && styles.stopPassed]}>
                  <View style={[styles.stopDotMid, passed && styles.stopDotMidPassed]}>
                    {passed ? <IconSymbol name="checkmark" size={8} color="#fff" /> : null}
                  </View>
                  <View style={styles.stopBody}>
                    <View style={styles.stopLabelRow}>
                      <ThemedText type="labelMd" style={[styles.stopLabelMid, passed && styles.stopLabelPassed]}>{point.label}</ThemedText>
                      <View style={[styles.timePill, { backgroundColor: '#F5F5F4' }]}>
                        <IconSymbol name="clock.fill" size={9} color={passed ? '#A8A29E' : '#78716C'} />
                        <ThemedText type="labelMd" style={[passed ? styles.timePillPassed : styles.timePillTextMid]}>{arrival}</ThemedText>
                      </View>
                    </View>
                    <ThemedText type="titleMd" style={[styles.stopCity, passed && styles.stopCityPassed]} numberOfLines={1} ellipsizeMode="tail">{point.name}</ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: primaryColor }]}>
            <IconSymbol name="truck.box.fill" size={18} color={primaryColor} />
            <ThemedText type="titleMd" style={styles.statValue}>{load.vehicle_type}</ThemedText>
            <ThemedText type="bodySm" style={styles.statLabel}>Vehicle Type</ThemedText>
          </View>

          <View style={[styles.statCard, { borderLeftColor: load.available_space < 20 ? '#DC2626' : '#059669' }]}>
            <IconSymbol name="checkmark.seal.fill" size={18} color={load.available_space < 20 ? '#DC2626' : '#059669'} />
            <ThemedText type="titleMd" style={styles.statValue}>{load.available_space}%</ThemedText>
            <ThemedText type="bodySm" style={styles.statLabel}>Space Available</ThemedText>
            <View style={styles.statBar}>
              <View style={[styles.statBarFill, { width: `${load.available_space}%`, backgroundColor: load.available_space < 20 ? '#DC2626' : '#059669' }]} />
            </View>
          </View>
        </View>

        <View style={styles.posterCard}>
          <View style={[styles.posterAvatar, { backgroundColor: primaryColor + '12' }]}>
            <ThemedText type="titleMd" style={[styles.posterInitial, { color: primaryColor }]}>
              {(load.user?.business_name || load.user?.full_name || '?').charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.posterInfo}>
            <ThemedText type="titleMd" style={styles.posterName}>{load.user?.business_name || load.user?.full_name}</ThemedText>
            <ThemedText type="bodySm" style={styles.posterCity}>{load.user?.city}</ThemedText>
          </View>
          <View style={[styles.verifiedBadge, { backgroundColor: '#05966912' }]}>
            <IconSymbol name="checkmark.seal.fill" size={12} color="#059669" />
            <ThemedText type="labelMd" style={styles.verifiedText}>Verified</ThemedText>
          </View>
        </View>

        {load.notes ? (
          <View style={styles.notesCard}>
            <IconSymbol name="pencil" size={14} color="#A8A29E" />
            <ThemedText type="bodySm" style={styles.notesText}>{load.notes}</ThemedText>
          </View>
        ) : null}
      </ScrollView>

      {!isOwner && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.bookBtn, { backgroundColor: hasRequested ? '#A8A29E' : primaryColor }, hasRequested && { opacity: 0.7 }]}
            onPress={openBooking}
            activeOpacity={0.9}
            disabled={hasRequested}
          >
            <IconSymbol name={hasRequested ? 'checkmark.circle.fill' : 'shippingbox.fill'} size={16} color="#fff" />
            <ThemedText type="titleMd" style={styles.bookText}>{hasRequested ? 'Already Requested' : 'Request for Booking'}</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showBooking} transparent animationType="slide" onRequestClose={() => setShowBooking(false)}>
        <View style={styles.modalMask}>
          <View style={styles.modalSheet}>
            <View style={styles.modalBar} />
            <View style={styles.modalHead}>
              <ThemedText type="titleMd" style={styles.modalTitle}>Request to Book</ThemedText>
              <TouchableOpacity onPress={() => setShowBooking(false)}>
                <IconSymbol name="xmark.circle.fill" size={22} color="#D6D3D1" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.routeDisplay}>
                <View style={styles.routeItem}>
                  <View style={[styles.routeDot, { backgroundColor: primaryColor }]} />
                  <View style={styles.routeCol}>
                    <ThemedText type="labelMd" style={styles.routeLabel}>Pickup</ThemedText>
                    <ThemedText type="titleMd" style={styles.routeCity}>{pickupStop}</ThemedText>
                  </View>
                  <ThemedText type="bodySm" style={styles.routeTime}>{cityTime(pickupStop, cityOffset(pickupStop))}</ThemedText>
                </View>
                <View style={styles.routeConnector}>
                  <View style={styles.routeLine} />
                  <IconSymbol name="arrow.down" size={12} color="#D6D3D1" />
                </View>
                <View style={styles.routeItem}>
                  <View style={[styles.routeDot, { backgroundColor: '#DC2626' }]} />
                  <View style={styles.routeCol}>
                    <ThemedText type="labelMd" style={styles.routeLabel}>Drop</ThemedText>
                    <ThemedText type="titleMd" style={styles.routeCity}>{dropStop}</ThemedText>
                  </View>
                  <ThemedText type="bodySm" style={styles.routeTime}>{cityTime(dropStop, cityOffset(dropStop))}</ThemedText>
                </View>
              </View>

              <ThemedText type="bodySm" style={styles.modalSectionLabel}>Goods Description (optional)</ThemedText>
              <TextInput
                style={styles.goodsInput}
                placeholder="What are you shipping?"
                placeholderTextColor="#A8A29E"
                value={goodsDesc}
                onChangeText={setGoodsDesc}
                multiline
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: primaryColor }, (!pickupStop || !dropStop || pickupStop === dropStop || bookLoading) && { opacity: 0.45 }]}
                onPress={handleRequestBook}
                disabled={!pickupStop || !dropStop || pickupStop === dropStop || bookLoading}
                activeOpacity={0.9}
              >
                {bookLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <IconSymbol name="paperplane.fill" size={15} color="#fff" />
                    <ThemedText type="titleMd" style={styles.submitLabel}>Send Booking Request</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F0' },
  headerGradient: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  logo: { color: '#fff', fontSize: 18, fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },

  heroCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, paddingBottom: 16, marginBottom: 14, ...Shadows.md },
  heroTop: { marginBottom: 12 },
  heroCities: { flexDirection: 'row', alignItems: 'center' },
  heroFrom: { color: '#1C1917', fontSize: 16, fontWeight: '800', flexShrink: 1 },
  heroArrow: { alignItems: 'center', flex: 1, flexDirection: 'row', justifyContent: 'center' },

  heroTo: { color: '#1C1917', fontSize: 16, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  heroMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  heroBadgeText: { fontSize: 10, fontWeight: '800' },
  heroId: { color: '#A8A29E', fontWeight: '700', fontSize: 12 },

  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 14, ...Shadows.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  sectionIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: '#1C1917', fontWeight: '700', flex: 1 },
  sectionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sectionBadgeText: { fontSize: 9, fontWeight: '800' },

  timeline: { paddingLeft: 4 },
  stopItem: { flexDirection: 'row', gap: 14, paddingBottom: 0 },
  stopDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stopDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  stopDotCurrent: { width: 8, height: 8, borderRadius: 4 },
  stopDotMid: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#D6D3D1', marginTop: 8, marginLeft: 7, alignItems: 'center', justifyContent: 'center' },
  stopDotMidPassed: { backgroundColor: '#059669' },
  stopPassed: { opacity: 0.55 },
  stopDotPassed: { backgroundColor: '#A8A29E' },
  stopCityPassed: { color: '#A8A29E', textDecorationLine: 'line-through' },
  stopDatePassed: { color: '#D6D3D1' },
  stopLabelPassed: { color: '#A8A29E' },
  timePillPassed: { fontSize: 10, color: '#A8A29E', fontWeight: '500' },
  stopBody: { flex: 1, marginTop: 0 },
  stopLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  stopLabel: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  stopLabelMid: { fontSize: 9, color: '#A8A29E', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  stopCity: { color: '#1C1917', fontSize: 16, fontWeight: '700', marginTop: 1 },
  stopDate: { color: '#A8A29E', fontSize: 11, marginTop: 2 },
  timePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  timePillText: { fontSize: 10, fontWeight: '800' },
  timePillTextMid: { fontSize: 10, color: '#78716C', fontWeight: '600' },

  segRow: { flexDirection: 'row', marginLeft: 4, marginVertical: 0 },
  segRowCurrent: { marginBottom: 2 },
  segLineCol: { width: 26, alignItems: 'center', paddingVertical: 2 },
  segLineFuture: { width: 2, height: 20, backgroundColor: '#E7E5E4', borderRadius: 1 },
  segLinePassed: { width: 2, height: 20, backgroundColor: '#059669', borderRadius: 1 },
  segLineCurrent: { width: 2, height: 26, backgroundColor: '#E7E5E4', borderRadius: 1, position: 'relative', overflow: 'visible' },
  segLineFill: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#0D9488', borderRadius: 1 },
  segDotWrap: { position: 'absolute', left: -5, width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  segNowDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0D9488', borderWidth: 2, borderColor: '#fff' },
  segLabelCol: { flex: 1, justifyContent: 'center' },
  nowPill: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', backgroundColor: '#0D948815', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  nowLabel: { fontSize: 10, color: '#0D9488', fontWeight: '800' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, borderLeftWidth: 3, ...Shadows.sm },
  statValue: { color: '#1C1917', marginTop: 8, fontWeight: '700', fontSize: 18 },
  statLabel: { color: '#A8A29E', marginTop: 2, fontSize: 11 },
  statBar: { height: 4, borderRadius: 2, backgroundColor: '#F5F5F4', marginTop: 8, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 2 },

  posterCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, ...Shadows.sm },
  posterAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  posterInitial: { fontSize: 18, fontWeight: '800' },
  posterInfo: { flex: 1 },
  posterName: { color: '#1C1917', fontWeight: '700', fontSize: 15 },
  posterCity: { color: '#78716C', marginTop: 2, fontSize: 12 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  verifiedText: { color: '#059669', fontSize: 9, fontWeight: '800' },

  notesCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', gap: 8, marginBottom: 14, ...Shadows.sm },
  notesText: { color: '#57534E', flex: 1, fontSize: 12 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 16, paddingBottom: 32, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0EFEE', gap: 12 },
  bookBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, height: 56, ...Shadows.md },
  bookText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  modalMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 12, maxHeight: '76%' },
  modalBar: { width: 40, height: 4, backgroundColor: '#E7E5E4', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#1C1917', fontWeight: '700', fontSize: 18 },
  modalSectionLabel: { color: '#A8A29E', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 6 },
  routeDisplay: { backgroundColor: '#FAFAF9', borderRadius: 16, padding: 16, marginBottom: 16 },
  routeItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeCol: { flex: 1 },
  routeLabel: { color: '#A8A29E', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  routeCity: { color: '#1C1917', fontSize: 16, fontWeight: '700', marginTop: 1 },
  routeTime: { color: '#78716C', fontSize: 11, fontWeight: '600' },
  routeConnector: { alignItems: 'center', paddingVertical: 6, marginLeft: 4 },
  routeLine: { width: 1.5, height: 20, backgroundColor: '#E7E5E4' },
  goodsInput: { backgroundColor: '#F5F5F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: '#1C1917', fontSize: 15, fontWeight: '500', minHeight: 72, textAlignVertical: 'top', marginBottom: 20 },
  submitBtn: { borderRadius: 16, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20, ...Shadows.md },
  submitLabel: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
