import { FullScreenLoader } from '@/components/full-screen-loader';
import { ThemedText } from '@/components/themed-text';
import { TrustBadge } from '@/components/trust-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime } from '@/lib/format';
import { loadsApi, type Load } from '@/services/loads';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, PanResponder, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '@/components/toast';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

const getInitial = (n: string) => n?.charAt(0)?.toUpperCase() || '?';
const getColor = (id: number) => ['#8B5CF6', '#0D9488', '#EC4899', '#059669', '#2563EB', '#DC2626'][id % 6];

function stopArrivalTime(departureTime: string, offsetMinutes: number): string {
  const [h, m] = departureTime.split(':').map(Number);
  const totalMin = h * 60 + m + offsetMinutes;
  const hours = Math.floor((totalMin % (24 * 60)) / 60);
  const mins = totalMin % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(mins).padStart(2, '0')} ${ampm}`;
}

export default function BrowseScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { from, to } = useLocalSearchParams<{ from: string; to: string }>();
  const toast = useToast();

  const [loads, setLoads] = useState<Load[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [swipedOut, setSwipedOut] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const pan = useRef(new Animated.ValueXY()).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const likeScale = useRef(new Animated.Value(0.5)).current;
  const nopeOpacity = useRef(new Animated.Value(0)).current;
  const nopeScale = useRef(new Animated.Value(0.5)).current;
  const hintOpacity = useRef(new Animated.Value(1)).current;
  const cardEnter = useRef(new Animated.Value(0)).current;
  const idxRef = useRef(0);
  const loadsRef = useRef(loads);
  loadsRef.current = loads;
  idxRef.current = currentIdx;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hintOpacity, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(hintOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    cardEnter.setValue(0);
    Animated.spring(cardEnter, { toValue: 1, useNativeDriver: true, friction: 10, tension: 40 }).start();
  }, [currentIdx]);

  useEffect(() => {
    fetchLoads();
  }, [from, to]);

  async function fetchLoads() {
    setLoading(true);
    setError('');
    setCurrentIdx(0);
    setSwipedOut([]);
    try {
      const params: Record<string, string> = {};
      if (user?.id) params.exclude_user_id = String(user.id);
      params.from_city = from;
      params.to_city = to;
      const res = await loadsApi.list(params);
      const now = new Date();
      const active = (res.data || []).filter((load: Load) => {
        if (load.from_city.toLowerCase() === from.toLowerCase()) {
          const dt = new Date(`${load.departure_date}T${load.departure_time}`);
          return dt > now;
        }
        if (load.route?.stops) {
          const stop = load.route.stops.find(s => s.stop_name.toLowerCase() === from.toLowerCase());
          if (stop) {
            const [h, m] = load.departure_time.split(':').map(Number);
            const dep = new Date(load.departure_date);
            dep.setHours(h, m + stop.time_offset_minutes, 0, 0);
            return dep > now;
          }
        }
        return true;
      });
      setLoads(active);
    } catch (err: any) {
      setError(err.message || 'Failed to load rides.');
    } finally {
      setLoading(false);
    }
  }

  const snapBack = () => {
    Animated.parallel([
      Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 8 }),
      Animated.timing(likeOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(nopeOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
    likeScale.setValue(0.5);
    nopeScale.setValue(0.5);
  };

  const swipeLeft = () => {
    const targetX = -SCREEN_WIDTH - 50;
    Animated.parallel([
      Animated.timing(pan, { toValue: { x: targetX, y: 0 }, duration: 250, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.8, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      const idx = idxRef.current;
      setSwipedOut(prev => [loadsRef.current[idx], ...prev]);
      setCurrentIdx(prev => prev + 1);
      pan.setValue({ x: 0, y: 0 });
      cardScale.setValue(1);
      likeOpacity.setValue(0);
      nopeOpacity.setValue(0);
    });
  };

  const swipeRight = () => {
    const idx = idxRef.current;
    const item = loadsRef.current[idx];
    if (!item) return;
    if (item.available_space === 0) { toast.show({ message: 'Ride is full — you can only skip this ride', type: 'info' }); snapBack(); return; }
    Animated.sequence([
      Animated.timing(pan, { toValue: { x: 40, y: 0 }, duration: 80, useNativeDriver: true }),
      Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 6 }),
    ]).start();
    likeOpacity.setValue(0);
    nopeOpacity.setValue(0);
    router.push({ pathname: '/load-details/[id]', params: { id: String(item.id), from, to } });
  };

  const handleUndo = () => {
    if (swipedOut.length === 0) return;
    setCurrentIdx(prev => prev - 1);
    setSwipedOut(prev => prev.slice(1));
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        pan.setValue({ x: g.dx, y: 0 });
        const progress = Math.abs(g.dx) / SCREEN_WIDTH;
        cardScale.setValue(1 - progress * 0.05);
        const likeProgress = Math.min(g.dx / 120, 1);
        const nopeProgress = Math.min(-g.dx / 120, 1);
        likeOpacity.setValue(likeProgress);
        likeScale.setValue(0.5 + likeProgress * 0.5);
        nopeOpacity.setValue(nopeProgress);
        nopeScale.setValue(0.5 + nopeProgress * 0.5);
      },
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) < 10 && Math.abs(g.dy) < 10) {
          const idx = idxRef.current;
          const item = loadsRef.current[idx];
          if (item && item.available_space > 0) {
            snapBack();
            router.push({ pathname: '/load-details/[id]', params: { id: String(item.id), from, to } });
          } else if (item) {
            toast.show({ message: 'Ride is full — you can only skip this ride', type: 'info' });
            snapBack();
          }
        } else if (g.dx > SWIPE_THRESHOLD) {
          swipeRight();
        } else if (g.dx < -SWIPE_THRESHOLD) {
          swipeLeft();
        } else {
          snapBack();
        }
      },
    })
  ).current;

  const CardContent = ({ item }: { item: Load }) => {
    const color = getColor(item.id);
    const isFull = item.available_space === 0;
    const isUrgent = item.available_space < 20 && item.available_space > 0;
    const ownerName = item.user?.business_name || item.user?.full_name || 'Unknown';
    const timeStr = formatDateTime(item.departure_date, item.departure_time);
    const [datePart, timePart] = timeStr.split(',');

    const routeStops = item.route_snapshot?.stops || item.route?.stops || [];
    const fromLower = from?.toLowerCase() || '';
    const toLower = to?.toLowerCase() || '';

    const pickupStop = routeStops.find(s => s.stop_name.toLowerCase().includes(fromLower));
    const pickupName = pickupStop?.stop_name || item.from_city;
    const pickupOffset = pickupStop ? pickupStop.time_offset_minutes : 0;

    const dropStop = routeStops.find(s => s.stop_name.toLowerCase().includes(toLower));
    const dropName = dropStop?.stop_name || item.to_city;

    const pickupTime = stopArrivalTime(item.departure_time, pickupOffset);

    // Final destination offset: use stop's cumulative offset if found, otherwise compute from last stop + destination_offset_minutes
    const toCityLower = (item.to_city || '').toLowerCase();
    const destInStops = routeStops.find(s => s.stop_name.toLowerCase() === toCityLower);
    const lastStopOffset = routeStops.length > 0 ? routeStops[routeStops.length - 1].time_offset_minutes : 0;
    const destOffset = destInStops
      ? destInStops.time_offset_minutes
      : (item.route_snapshot?.destination_offset_minutes
        ? lastStopOffset + item.route_snapshot.destination_offset_minutes
        : lastStopOffset + 60);
    const destTime = stopArrivalTime(item.departure_time, destOffset);

    const dropOffset = dropStop
      ? dropStop.time_offset_minutes
      : destOffset;
    const dropTime = stopArrivalTime(item.departure_time, dropOffset);
    return (
      <>
        {isFull && (
          <View style={styles.fullBadge}>
            <View style={styles.fullBadgeInner}>
              <ThemedText style={styles.fullBadgeText}>FULL</ThemedText>
            </View>
          </View>
        )}
        {/* Active Badge */}
        <View style={styles.liveBadge}>
          <LinearGradient colors={['#059669', '#047857']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.liveBadgeInner}>
            <View style={styles.liveBadgeDot} />
            <ThemedText style={styles.liveBadgeText}>ACTIVE</ThemedText>
          </LinearGradient>
        </View>
        <View style={isFull ? styles.cardBlurred : undefined}>
          {/* Animated Swipe Hint */}
          <Animated.View style={[styles.swipeHintTop, { opacity: hintOpacity }]}>
            <View style={styles.swipeHintSide}>
              <View style={[styles.swipeIcon, { borderColor: '#DC2626' }]}>
                <IconSymbol name="arrow.uturn.backward" size={14} color="#DC2626" />
              </View>
              <ThemedText style={styles.swipeHintTopSkip}>Skip this ride</ThemedText>
            </View>
            <View style={styles.swipeHintDividerV} />
            <View style={styles.swipeHintSide}>
              <ThemedText style={styles.swipeHintTopView}>View details</ThemedText>
              <View style={[styles.swipeIcon, { borderColor: '#0D9488' }]}>
                <IconSymbol name="arrow.uturn.forward" size={14} color="#0D9488" />
              </View>
            </View>
          </Animated.View>

        {/* Route Header */}
        <View style={styles.routeHeader}>
          <View style={[styles.routeAccent, { backgroundColor: color }]} />
          <View style={styles.routeBody}>
            <View style={styles.routeCities}>
              <View style={styles.routeCityBlock}>
                <View style={styles.routeCityRow}>
                  <View style={[styles.routeCityDot, { backgroundColor: '#0D9488' }]} />
                  <ThemedText style={styles.routeCityName}>{item.from_city}</ThemedText>
                </View>
                <ThemedText style={styles.routeTime}>{stopArrivalTime(item.departure_time, 0)}</ThemedText>
              </View>
              <View style={styles.routeArrow}>
                <View style={styles.routeArrowLine} />
                <IconSymbol name="arrow.right" size={12} color={color} />
                <View style={styles.routeArrowLine} />
              </View>
              <View style={styles.routeCityBlock}>
                <View style={styles.routeCityRow}>
                  <View style={[styles.routeCityDot, { backgroundColor: '#DC2626' }]} />
                  <ThemedText style={styles.routeCityName}>{item.to_city}</ThemedText>
                </View>
                <ThemedText style={styles.routeTime}>{destTime}</ThemedText>
              </View>
            </View>
            <View style={styles.routeMeta}>
              <View style={styles.routeMetaItem}>
                <IconSymbol name="calendar" size={11} color="#A8A29E" />
                <ThemedText style={styles.routeMetaText}>{datePart}</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Pickup & Drop Stops */}
        <View style={styles.stopInfoRow}>
          <View style={[styles.stopInfoBlock, { borderLeftColor: '#0D9488' }]}>
            <ThemedText style={styles.stopInfoLabel}>Pickup</ThemedText>
            <ThemedText style={styles.stopInfoCity} numberOfLines={1}>{pickupName}</ThemedText>
            <View style={styles.stopInfoTimeRow}>
              <IconSymbol name="clock.fill" size={9} color="#0D9488" />
              <ThemedText style={styles.stopInfoTime}>{pickupTime}</ThemedText>
            </View>
          </View>
          <View style={styles.stopInfoDivider} />
          <View style={[styles.stopInfoBlock, { borderLeftColor: '#DC2626' }]}>
            <ThemedText style={styles.stopInfoLabel}>Drop</ThemedText>
            <ThemedText style={styles.stopInfoCity} numberOfLines={1}>{dropName}</ThemedText>
            <View style={styles.stopInfoTimeRow}>
              <IconSymbol name="clock.fill" size={9} color="#DC2626" />
              <ThemedText style={[styles.stopInfoTime, { color: '#DC2626' }]}>{dropTime}</ThemedText>
            </View>
          </View>
        </View>

        {/* Badges */}
        {isUrgent && (
          <View style={styles.badgeRow}>
            {isUrgent && (
              <View style={styles.badgeUrgent}>
                <IconSymbol name="exclamationmark.triangle.fill" size={10} color="#fff" />
                <ThemedText style={styles.badgeText}>Filling Fast</ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Info Badges Horizontal Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoBadge}>
            <View style={[styles.infoBadgeIcon, { backgroundColor: '#F0FDFA' }]}>
              <IconSymbol name="truck.box.fill" size={14} color="#0D9488" />
            </View>
            <View style={styles.infoBadgeText}>
              <ThemedText style={styles.infoBadgeLabel}>Vehicle</ThemedText>
              <ThemedText style={styles.infoBadgeValue}>{item.vehicle_type}</ThemedText>
            </View>
          </View>
          <View style={[styles.infoBadge, { borderColor: isUrgent ? '#FECACA' : '#CCFBF1' }]}>
            <View style={[styles.infoBadgeIcon, { backgroundColor: isUrgent ? '#FEF2F2' : '#F0FDFA' }]}>
              <IconSymbol name="shippingbox.fill" size={14} color={isUrgent ? '#DC2626' : '#0D9488'} />
            </View>
            <View style={styles.infoBadgeText}>
              <ThemedText style={styles.infoBadgeLabel}>Capacity</ThemedText>
              <ThemedText style={[styles.infoBadgeValue, { color: isUrgent ? '#DC2626' : '#0D9488' }]}>{item.available_space}%</ThemedText>
            </View>
          </View>
        </View>

        {/* Space Bar */}
        <View style={styles.spaceSection}>
          <View style={styles.spaceHeader}>
            <ThemedText style={styles.spaceTitle}>Available space</ThemedText>
            <View style={[styles.spacePill, { backgroundColor: isUrgent ? '#FEF2F2' : '#F0FDFA' }]}>
              <View style={[styles.spacePillDot, { backgroundColor: isUrgent ? '#DC2626' : '#0D9488' }]} />
              <ThemedText style={[styles.spacePillText, { color: isUrgent ? '#DC2626' : '#0D9488' }]}>
                {item.available_space}% free
              </ThemedText>
            </View>
          </View>
          <View style={styles.spaceTrack}>
            <LinearGradient
              colors={isUrgent ? ['#F97316', '#DC2626'] : ['#0D9488', '#14B8A6']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.spaceFill, { width: `${item.available_space}%` }]}
            />
          </View>
        </View>

        {/* Owner Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <LinearGradient
              colors={[color + '20', color + '05']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.footerAvatar}
            >
              <ThemedText style={[styles.footerAvatarText, { color }]}>{getInitial(ownerName)}</ThemedText>
            </LinearGradient>
            <View style={styles.footerInfo}>
              <View style={styles.footerNameRow}>
                <ThemedText style={styles.footerName} numberOfLines={1}>{ownerName}</ThemedText>
                <TrustBadge type="phone_verified" size="sm" />
              </View>
              <ThemedText style={styles.footerMeta}>{item.user?.city || 'Verified shipper'}</ThemedText>
            </View>
          </View>
          <View style={[styles.footerArrow, { backgroundColor: color + '12' }]}>
            <IconSymbol name="chevron.right" size={12} color={color} />
          </View>
        </View>
        </View>
      </>
    );
  };

  if (loading) {
    return <FullScreenLoader visible origin={from} destination={to} />;
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <IconSymbol name="exclamationmark.triangle.fill" size={32} color="#DC2626" />
        <ThemedText type="bodySm" style={styles.loadingText}>{error}</ThemedText>
        <TouchableOpacity onPress={fetchLoads} style={styles.retryBtn}>
          <ThemedText type="labelMd" style={styles.retryBtnText}>Retry</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.changeRouteBtn}>
          <ThemedText type="labelMd" style={styles.changeRouteBtnText}>Change Route</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  if (loads.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.emptyIconBox}>
          <IconSymbol name="truck.box.fill" size={36} color="#D6D3D1" />
        </View>
        <ThemedText type="titleMd" style={styles.emptyTitle}>No rides found</ThemedText>
        <ThemedText type="bodySm" style={styles.loadingText}>
          No available rides for {from} → {to}
        </ThemedText>
        <TouchableOpacity onPress={() => router.back()} style={styles.changeRouteBtn}>
          <ThemedText type="labelMd" style={styles.changeRouteBtnText}>Try different route</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Subtle background pattern */}
      <View style={styles.bgPattern}>
        <View style={[styles.bgCircle, { top: '10%', left: '-20%', width: 250, height: 250, backgroundColor: '#0D9488', opacity: 0.07 }]} />
        <View style={[styles.bgCircle, { bottom: '15%', right: '-15%', width: 200, height: 200, backgroundColor: '#DC2626', opacity: 0.06 }]} />
        <View style={[styles.bgCircle, { top: '45%', right: '30%', width: 120, height: 120, backgroundColor: '#8B5CF6', opacity: 0.07 }]} />
      </View>

      {/* Top Bar */}
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <IconSymbol name="arrow.left" size={18} color="#1C1917" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.routePill} activeOpacity={0.8}>
            <ThemedText type="labelMd" style={styles.routePillFrom}>{from}</ThemedText>
            <IconSymbol name="arrow.right" size={10} color="#D6D3D1" />
            <ThemedText type="labelMd" style={styles.routePillTo}>{to}</ThemedText>
          </TouchableOpacity>
          <View style={styles.resultPill}>
            <ThemedText type="labelMd" style={styles.resultPillText}>
              {loads.length - currentIdx} of {loads.length}
            </ThemedText>
          </View>
        </View>
      </SafeAreaView>

      {/* Card Area */}
      <View style={styles.cardArea}>
        {currentIdx < loads.length ? (
          <View style={styles.cardStack}>
            {/* Stacked paper layers behind */}
            {loads.slice(currentIdx + 1, currentIdx + 6).reverse().map((item, idx) => {
              const totalBehind = loads.slice(currentIdx + 1, currentIdx + 6).length;
              const depth = totalBehind - idx - 1;
              const offsetY = (depth + 1) * 24;
              const offsetX = (depth + 1) * 4;
              return (
                <View key={item.id} style={[styles.paperLayer, { transform: [{ translateX: offsetX }, { translateY: offsetY }], zIndex: 10 - depth }]} />
              );
            })}

            {/* Top swipeable card */}
            <Animated.View
              style={[
                styles.card,
                {
                  transform: [
                    { translateX: pan.x },
                    { scale: Animated.multiply(cardEnter, cardScale) },
                    { rotate: pan.x.interpolate({ inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2], outputRange: ['-10deg', '0deg', '10deg'], extrapolate: 'clamp' }) },
                    { translateY: cardEnter.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
                  ],
                  opacity: cardEnter,
                  zIndex: 100,
                },
              ]}
              {...panResponder.panHandlers}
            >
              <CardContent item={loads[currentIdx]} />

              {swipedOut.length > 0 && (
                <View style={styles.cardUndoWrap}>
                  <TouchableOpacity style={styles.cardUndoBtn} onPress={handleUndo} activeOpacity={0.8}>
                    <IconSymbol name="arrow.uturn.backward" size={10} color="#0D9488" />
                    <ThemedText type="labelMd" style={styles.cardUndoText}>Undo</ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              <Animated.View style={[styles.swipeOverlay, styles.likeOverlay, { opacity: likeOpacity, transform: [{ scale: likeScale }] }]}>
                <View style={styles.swipeOverlayInner}>
                  <IconSymbol name="eye.fill" size={36} color="#0D9488" />
                  <ThemedText style={styles.swipeOverlayText}>DETAILS</ThemedText>
                  <ThemedText style={styles.swipeOverlaySub}>Tap or swipe right</ThemedText>
                </View>
              </Animated.View>
              <Animated.View style={[styles.swipeOverlay, styles.nopeOverlay, { opacity: nopeOpacity, transform: [{ scale: nopeScale }] }]}>
                <View style={styles.swipeOverlayInner}>
                  <IconSymbol name="xmark.circle.fill" size={36} color="#DC2626" />
                  <ThemedText style={[styles.swipeOverlayText, { color: '#DC2626' }]}>SKIP</ThemedText>
                  <ThemedText style={[styles.swipeOverlaySub, { color: '#DC2626' }]}>Swipe left to skip</ThemedText>
                </View>
              </Animated.View>
            </Animated.View>


          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <IconSymbol name="truck.box.fill" size={36} color="#D6D3D1" />
            </View>
            <ThemedText type="titleMd" style={styles.emptyTitle}>All caught up!</ThemedText>
            <ThemedText type="bodySm" style={styles.emptyDesc}>
              You have reviewed all rides for this route.
            </ThemedText>
            {swipedOut.length > 0 && (
              <View style={styles.emptyActions}>
                <TouchableOpacity style={styles.undoBtn} onPress={handleUndo}>
                  <IconSymbol name="arrow.uturn.backward" size={12} color="#0D9488" />
                  <ThemedText type="labelMd" style={styles.undoBtnText}>Undo Last ({swipedOut.length})</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.searchAgainBtn} onPress={() => router.back()}>
                  <IconSymbol name="magnifyingglass" size={12} color="#fff" />
                  <ThemedText type="labelMd" style={styles.searchAgainText}>Search Again</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Bottom Bar */}
      {currentIdx < loads.length && swipedOut.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.undoBtn} onPress={handleUndo} activeOpacity={0.7}>
            <IconSymbol name="arrow.uturn.backward" size={12} color="#0D9488" />
            <ThemedText type="labelMd" style={styles.undoBtnText}>Undo</ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  bgPattern: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  bgCircle: { position: 'absolute', borderRadius: 999 },
  safe: { backgroundColor: '#fff' },

  loadingContainer: { flex: 1, backgroundColor: '#FAFAF8', alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  loadingText: { color: '#A8A29E', textAlign: 'center', fontSize: 13, lineHeight: 20 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0EFEE',
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5F5F4', alignItems: 'center', justifyContent: 'center' },
  routePill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F5F4', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#F0EFEE',
  },
  routePillFrom: { color: '#1C1917', fontSize: 13, fontWeight: '700' },
  routePillTo: { color: '#DC2626', fontSize: 13, fontWeight: '700' },
  resultPill: { backgroundColor: '#0D948812', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  resultPillText: { color: '#0D9488', fontSize: 12, fontWeight: '800' },

  cardArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },

  cardStack: { position: 'relative' },
  paperLayer: { position: 'absolute', left: 0, right: 0, top: 0, height: '100%', backgroundColor: '#fff', borderRadius: 28, borderWidth: 1.5, borderColor: '#D6D3D1', ...Shadows.lg },

  card: { backgroundColor: '#fff', borderRadius: 28, padding: 20, ...Shadows.xl, borderWidth: 1.5, borderColor: '#E7E5E4' },
  cardBlurred: { opacity: 0.55 },
  fullBadge: { position: 'absolute', top: -6, left: -6, zIndex: 20 },
  fullBadgeInner: { backgroundColor: '#DC2626', paddingHorizontal: 10, paddingVertical: 5, borderTopRightRadius: 8, transform: [{ rotate: '-12deg' }] },
  fullBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

  // Diagonal LIVE Badge
  liveBadge: { position: 'absolute', top: -6, right: -6, zIndex: 20 },
  liveBadgeInner: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderBottomLeftRadius: 8, transform: [{ rotate: '12deg' }] },
  liveBadgeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  liveBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

  // Swipe Hint at top of card
  swipeHintTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginBottom: 14, paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: '#FAFAF8', borderRadius: 10,
  },
  swipeHintDividerV: { width: 1, height: 14, backgroundColor: '#E7E5E4', marginHorizontal: 4 },
  swipeHintSide: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' },
  swipeIcon: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 6, padding: 4 },
  swipeIconBar: { width: 10, height: 2, borderRadius: 1 },
  swipeHintTopSkip: { color: '#DC2626', fontSize: 11, fontWeight: '700' },
  swipeHintTopView: { color: '#0D9488', fontSize: 11, fontWeight: '700' },

  // Route Header
  routeHeader: {
    flexDirection: 'row', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F0EFEE',
    backgroundColor: '#fff', marginBottom: 12,
  },
  routeAccent: { width: 5 },
  routeBody: { flex: 1, padding: 16, gap: 6 },
  routeCities: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeCityBlock: { gap: 2 },
  routeCityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeCityDot: { width: 8, height: 8, borderRadius: 4 },
  routeCityName: { color: '#1C1917', fontSize: 17, fontWeight: '800' },
  routeTime: { color: '#A8A29E', fontSize: 10, fontWeight: '700', paddingLeft: 16 },
  routeArrow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  routeArrowLine: { flex: 1, height: 1.5, backgroundColor: '#F0EFEE' },
  routeMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routeMetaText: { color: '#A8A29E', fontSize: 11, fontWeight: '600' },
  routeMetaDivider: { width: 1, height: 10, backgroundColor: '#E7E5E4' },

  // Pickup & Drop Stops (compact)
  stopInfoRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  stopInfoBlock: {
    flex: 1, backgroundColor: '#FAFAF9', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#F0EFEE', borderLeftWidth: 3, gap: 2,
  },
  stopInfoLabel: { color: '#A8A29E', fontSize: 8, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  stopInfoCity: { color: '#1C1917', fontSize: 12, fontWeight: '700' },
  stopInfoTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  stopInfoTime: { color: '#0D9488', fontSize: 10, fontWeight: '700' },
  stopInfoDivider: { width: 1, backgroundColor: '#F0EFEE' },

  // Badges Row
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  badgeFull: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DC2626', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeUrgent: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EA580C', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  badgeNote: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDFA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#CCFBF1' },
  badgeNoteText: { color: '#0D9488', fontSize: 10, fontWeight: '700' },

  // Info Row (two badge cards)
  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  infoBadge: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F0EFEE',
    backgroundColor: '#FAFAF9',
  },
  infoBadgeIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoBadgeText: { gap: 2 },
  infoBadgeLabel: { color: '#A8A29E', fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  infoBadgeValue: { color: '#1C1917', fontSize: 13, fontWeight: '800' },

  // Space Section
  spaceSection: { marginBottom: 16 },
  spaceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  spaceTitle: { color: '#78716C', fontSize: 11, fontWeight: '600' },
  spacePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  spacePillDot: { width: 5, height: 5, borderRadius: 3 },
  spacePillText: { fontSize: 10, fontWeight: '800' },
  spaceTrack: { height: 6, borderRadius: 3, backgroundColor: '#F0FDFA', overflow: 'hidden' },
  spaceFill: { height: '100%', borderRadius: 3 },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F0EFEE',
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  footerAvatar: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  footerAvatarText: { fontSize: 15, fontWeight: '900' },
  footerInfo: { flex: 1 },
  footerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerName: { color: '#1C1917', fontSize: 13, fontWeight: '700', maxWidth: '90%' },
  footerMeta: { color: '#A8A29E', fontSize: 10, fontWeight: '500', marginTop: 1 },
  footerArrow: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  swipeOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28, zIndex: 50, elevation: 10, alignItems: 'center', justifyContent: 'center' },
  likeOverlay: { backgroundColor: 'rgba(240, 253, 244, 0.97)', borderWidth: 3, borderColor: '#0D9488' },
  nopeOverlay: { backgroundColor: 'rgba(254, 242, 242, 0.97)', borderWidth: 3, borderColor: '#DC2626' },
  swipeOverlayInner: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  swipeOverlayText: { fontSize: 36, fontWeight: '900', letterSpacing: 4, color: '#0D9488' },
  swipeOverlaySub: { fontSize: 13, fontWeight: '600', color: '#0D9488', letterSpacing: 0.5 },



  undoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0FDFA', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#CCFBF1' },
  undoBtnText: { color: '#0D9488', fontSize: 12, fontWeight: '700' },
  cardUndoWrap: { position: 'absolute', bottom: 6, left: 0, right: 0, alignItems: 'center', zIndex: 60 },
  cardUndoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDFA', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#CCFBF1' },
  cardUndoText: { color: '#0D9488', fontSize: 10, fontWeight: '700' },
  emptyActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  searchAgainBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#0D9488', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  searchAgainText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  bottomBar: { paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', backgroundColor: '#FAFAF8' },

  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 40 },
  emptyIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#0D948812', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { color: '#1C1917', fontWeight: '700', fontSize: 17 },
  emptyDesc: { color: '#A8A29E', textAlign: 'center', fontSize: 13, paddingHorizontal: 40, lineHeight: 20 },
  retryBtn: { marginTop: 4, backgroundColor: '#0D9488', paddingHorizontal: 28, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  changeRouteBtn: { marginTop: 4, paddingHorizontal: 28, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#0D9488' },
  changeRouteBtnText: { color: '#0D9488', fontWeight: '700', fontSize: 13 },
});
