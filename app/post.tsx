import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, FlatList, PanResponder, Animated } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Shadows } from '@/constants/theme';
import { loadsApi } from '@/services/loads';
import { routesApi, type Route, type RouteStop } from '@/services/routes';
import { useAuth } from '@/context/AuthContext';

type DropdownKind = 'origin' | 'dest' | null;

const VEHICLE_TYPES = ['Truck', 'Mini Truck', 'Container', 'Pickup', 'Tempo', 'Trailer'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function generateDateRange(days = 60) {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date: Date): string {
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

interface ChainItem { name: string; isOrigin?: boolean; isDest?: boolean; isMore?: boolean; }

function RouteStopChain({ stops, fromCity, toCity, color, compact }: { stops: RouteStop[]; fromCity: string; toCity: string; color: string; compact?: boolean }) {
  const chainStops: ChainItem[] = [
    { name: fromCity, isOrigin: true },
    ...stops.map(s => ({ name: s.stop_name })),
    { name: toCity, isDest: true },
  ];
  const display: ChainItem[] = compact && chainStops.length > 2
    ? [
        chainStops[0],
        { name: `${chainStops.length - 2} stop${chainStops.length - 2 > 1 ? 's' : ''} in between`, isMore: true },
        chainStops[chainStops.length - 1],
      ]
    : chainStops;

  return (
    <View style={styles.chainWrap}>
      {display.map((item, idx) => {
        const isLast = idx === display.length - 1;
        return (
          <View key={idx} style={styles.chainRow}>
            <View style={styles.chainTrack}>
              <View style={[
                styles.chainDot,
                (item.isOrigin || item.isDest) && styles.chainDotHighlight,
                { backgroundColor: item.isMore ? '#D4D4D4' : (item.isOrigin || item.isDest ? color : color + '40') }
              ]} />
              {!isLast && <View style={[styles.chainLine, { backgroundColor: color + '20' }]} />}
            </View>
            <View style={styles.chainLabelWrap}>
              {item.isMore ? (
                <ThemedText type="bodySm" style={[styles.chainLabel, { color: '#A8A29E' }]}>{item.name}</ThemedText>
              ) : (
                <>
                  <ThemedText
                    type={item.isOrigin || item.isDest ? 'titleMd' : 'bodySm'}
                    style={[
                      styles.chainLabel,
                      { color: item.isOrigin || item.isDest ? '#1C1917' : '#A8A29E' },
                      (item.isOrigin || item.isDest) && { fontWeight: '700' },
                    ]}
                  >
                    {item.name}
                  </ThemedText>
                  {(item.isOrigin || item.isDest) && (
                    <View style={[styles.chainTag, { backgroundColor: item.isOrigin ? color + '15' : '#FEF2F2' }]}>
                      <ThemedText type="labelMd" style={[styles.chainTagText, { color: item.isOrigin ? color : '#DC2626' }]}>
                        {item.isOrigin ? 'Pickup' : 'Drop'}
                      </ThemedText>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function PostLoadScreen() {
  const router = useRouter();
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const editingId = editId ? Number(editId) : null;
  const { user } = useAuth();
  const primaryColor = useThemeColor({}, 'primary');

  const [loadingForm, setLoadingForm] = useState(!!editingId);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [rideToStopId, setRideToStopId] = useState<number | null>(null);
  const [rideToCity, setRideToCity] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [space, setSpace] = useState(50);
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [departureTime, setDepartureTime] = useState(() => {
    const now = new Date();
    let h = now.getHours();
    const m = Math.ceil(now.getMinutes() / 5) * 5;
    const period = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return { hour: String(h).padStart(2, '0'), minute: String(Math.min(m, 55)).padStart(2, '0'), period };
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [editingTimeExpired, setEditingTimeExpired] = useState(false);

  // Load existing ride for editing
  useEffect(() => {
    if (!editingId) return;
    (async () => {
      try {
        const res = await loadsApi.show(editingId);
        const ride = res.data;
        setOrigin(ride.from_city);
        setOriginLocked(true);
        setDestination(ride.to_city);
        setDestLocked(true);
        setRideToCity(ride.to_city);
        if (ride.destination_stop_id) setRideToStopId(ride.destination_stop_id);
        setVehicleType(ride.vehicle_type);
        setSpace(ride.available_space);
        if (ride.departure_date) setDepartureDate(new Date(ride.departure_date + 'T00:00:00'));
        if (ride.departure_time) {
          const [h24, m] = ride.departure_time.split(':').map(Number);
          const period = h24 >= 12 ? 'PM' : 'AM';
          let h = h24 % 12 || 12;
          setDepartureTime({ hour: String(h).padStart(2, '0'), minute: String(m).padStart(2, '0'), period });
          const rideDt = new Date(ride.departure_date + 'T' + ride.departure_time);
          setEditingTimeExpired(rideDt <= new Date());
        }
        setNotes(ride.notes || '');
        // Load routes and find the matching one
        if (ride.route) {
          const routesRes = await routesApi.myRoutes();
          const match = routesRes.data.find(r => r.id === ride.route!.id);
          if (match) {
            setSelectedRoute(match);
            if (ride.destination_stop_id) {
              const s = match.stops.find(st => st.id === ride.destination_stop_id);
              if (s) setRideToCity(s.stop_name);
            }
          }
        }
      } catch {} finally {
        setLoadingForm(false);
      }
    })();
  }, [editingId]);

  const now = new Date();
  const isToday = departureDate ? formatDate(departureDate) === formatDate(now) : false;
  const currentHour24 = now.getHours();
  const currentMin = now.getMinutes();

  // When user changes date to today, ensure selected time isn't in the past
  useEffect(() => {
    if (!isToday || editingTimeExpired) return;
    setDepartureTime(prev => {
      const n = new Date();
      let h24 = parseInt(prev.hour, 10);
      if (prev.period === 'PM' && h24 !== 12) h24 += 12;
      if (prev.period === 'AM' && h24 === 12) h24 = 0;
      const selectedMin = h24 * 60 + parseInt(prev.minute, 10);
      const currentMin = n.getHours() * 60 + n.getMinutes();
      if (selectedMin > currentMin) return prev;
      let next = currentMin + 1;
      next = Math.ceil(next / 5) * 5;
      let h = Math.floor(next / 60) % 24;
      let m = next % 60;
      if (m > 55) { m = 0; h = (h + 1) % 24; }
      const period = h >= 12 ? 'PM' : 'AM';
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return { hour: String(h).padStart(2, '0'), minute: String(m).padStart(2, '0'), period };
    });
  }, [departureDate]);

  const isHourDisabled = (h: string, period: string) => {
    if (!isToday) return false;
    let h24 = parseInt(h, 10);
    if (period === 'PM' && h24 !== 12) h24 += 12;
    if (period === 'AM' && h24 === 12) h24 = 0;
    return h24 < currentHour24;
  };

  const isMinDisabled = (m: string) => {
    if (!isToday) return false;
    let h24 = parseInt(departureTime.hour, 10);
    if (departureTime.period === 'PM' && h24 !== 12) h24 += 12;
    if (departureTime.period === 'AM' && h24 === 12) h24 = 0;
    if (h24 < currentHour24) return true;
    if (h24 === currentHour24) return parseInt(m, 10) <= currentMin;
    return false;
  };

  const isPeriodDisabled = (p: string) => {
    if (!isToday) return false;
    return p === 'AM' && currentHour24 >= 12;
  };
  const [origins, setOrigins] = useState<string[]>([]);
  const [dests, setDests] = useState<string[]>([]);
  const [originLocked, setOriginLocked] = useState(false);
  const [destLocked, setDestLocked] = useState(false);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [searchingDest, setSearchingDest] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<DropdownKind>(null);
  const originRef = useRef<TextInput>(null);
  const destRef = useRef<TextInput>(null);
  const originTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const destTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeDropdownRef = useRef<DropdownKind>(null);

  const flatListKey = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(useCallback(() => { setRefreshKey(k => k + 1); }, []));

  useEffect(() => {
    let cancelled = false;
    if (origin && destination && origin !== destination) {
      setRoutesLoading(true);
      setShowRoutes(true);
      routesApi.myRoutes()
        .then(res => {
          if (!cancelled) {
            const matching = res.data.filter(r => {
              const stops = [r.from_city, ...r.stops.map(s => s.stop_name), r.to_city];
              const fromIdx = stops.findIndex(s => s.toLowerCase() === origin.toLowerCase());
              const toIdx = stops.findIndex(s => s.toLowerCase() === destination.toLowerCase());
              return fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx;
            });
            setRoutes(matching);
            if (matching.length === 0) setSelectedRoute(null);
          }
        })
        .catch(() => { if (!cancelled) setRoutes([]); })
        .finally(() => { if (!cancelled) setRoutesLoading(false); });
    } else {
      setRoutes([]);
      setShowRoutes(false);
      setSelectedRoute(null);
    }
    return () => { cancelled = true; };
  }, [origin, destination, refreshKey]);

  const canSubmit = originLocked && destLocked && origin && destination && selectedRoute && vehicleType && departureDate;

  async function searchCities(q: string): Promise<string[]> {
    if (q.trim().length < 2) return [];
    try {
      const res = await routesApi.searchCities(q);
      return res.data;
    } catch {
      return [];
    }
  }

  function showDropdown(kind: 'origin' | 'dest') {
    setActiveDropdown(kind);
    activeDropdownRef.current = kind;
  }

  function dismissDropdown() {
    setActiveDropdown(null);
    activeDropdownRef.current = null;
    flatListKey.current += 1;
  }

  function onOriginChange(v: string) {
    setOrigin(v);
    setOriginLocked(false);
    setSelectedRoute(null);
    if (originTimer.current) clearTimeout(originTimer.current);
    if (v.trim().length < 2) {
      setActiveDropdown(null);
      activeDropdownRef.current = null;
      setSearchingOrigin(false);
      setOrigins([]);
      return;
    }
    setSearchingOrigin(true);
    setOrigins([]);
    showDropdown('origin');
    originTimer.current = setTimeout(async () => {
      const results = await searchCities(v);
      setOrigins(results);
      setSearchingOrigin(false);
      if (results.length === 0) {
        setActiveDropdown(null);
        activeDropdownRef.current = null;
      }
    }, 250);
  }

  function onDestChange(v: string) {
    setDestination(v);
    setDestLocked(false);
    setSelectedRoute(null);
    if (destTimer.current) clearTimeout(destTimer.current);
    if (v.trim().length < 2) {
      setActiveDropdown(null);
      activeDropdownRef.current = null;
      setSearchingDest(false);
      setDests([]);
      return;
    }
    setSearchingDest(true);
    setDests([]);
    showDropdown('dest');
    destTimer.current = setTimeout(async () => {
      const results = await searchCities(v);
      setDests(results);
      setSearchingDest(false);
      if (results.length === 0) {
        setActiveDropdown(null);
        activeDropdownRef.current = null;
      }
    }, 250);
  }

  function pickOrigin(v: string) {
    setOrigin(v.split(',')[0]);
    setOriginLocked(true);
    dismissDropdown();
    destRef.current?.focus();
  }

  function pickDest(v: string) {
    setDestination(v.split(',')[0]);
    setDestLocked(true);
    dismissDropdown();
  }

  function handleClearOrigin() {
    setOrigin('');
    setOriginLocked(false);
    setSelectedRoute(null);
    setActiveDropdown(null);
    activeDropdownRef.current = null;
  }

  function handleClearDest() {
    setDestination('');
    setDestLocked(false);
    setSelectedRoute(null);
    setActiveDropdown(null);
    activeDropdownRef.current = null;
  }

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      const time24 = convertTo24(departureTime.hour, departureTime.minute, departureTime.period);
      const payload = {
        from_city: origin,
        to_city: rideToCity || destination,
        vehicle_type: vehicleType,
        available_space: space,
        departure_date: formatDate(departureDate!),
        departure_time: time24,
        notes: notes || undefined,
        phone: user?.phone || '',
        route_id: selectedRoute?.id,
        destination_stop_id: rideToStopId ?? undefined,
      };
      if (editingId) {
        await loadsApi.update(editingId, payload);
      } else {
        await loadsApi.create(payload);
      }
      router.replace('/(tabs)/my-posts');
    } catch (err: any) {
      setError(err.message || 'Failed to create ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  function convertTo24(hour: string, min: string, period: string) {
    let h = parseInt(hour, 10);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${min}`;
  }

  function handleSelectRoute(route: Route) {
    if (selectedRoute?.id === route.id) {
      setSelectedRoute(null);
      setRideToStopId(null);
      setRideToCity('');
    } else {
      setSelectedRoute(route);
      setRideToStopId(null);
      setRideToCity(route.to_city);
    }
  }

  const items = activeDropdown === 'origin' ? origins : dests;
  const isSearching = activeDropdown === 'origin' ? searchingOrigin : searchingDest;

  const dropdownContent = () => {
    if (isSearching) {
      return <SearchingLoader />;
    }
    const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
    if (safeItems.length === 0) {
      return (
        <View style={styles.dropdownLoading}>
          <ThemedText type="bodySm" style={styles.dropdownLoadingText}>No cities found</ThemedText>
        </View>
      );
    }
    return safeItems.map((item, i) => {
      const parts = item.split(', ');
      return (
        <TouchableOpacity key={i} style={styles.dropdownItem} onPress={() => {
          const fn = activeDropdown === 'origin' ? pickOrigin : pickDest;
          fn(item);
        }} activeOpacity={0.6}>
          <View style={styles.dropIcon}>
            <IconSymbol name="location.fill" size={11} color="#0D9488" />
          </View>
          <View style={styles.dropdownItemContent}>
            <ThemedText type="bodyLg" style={styles.dropdownText}>{parts[0]}</ThemedText>
            {parts[1] ? <ThemedText type="labelMd" style={styles.dropdownState}>{parts[1]}</ThemedText> : null}
          </View>
        </TouchableOpacity>
      );
    });
  };

  function SearchingLoader() {
    const pulse = useRef(new Animated.Value(0.4)).current;
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseLoop.start();

      const makeDotAnim = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
          ])
        );
      makeDotAnim(dot1, 0).start();
      makeDotAnim(dot2, 200).start();
      makeDotAnim(dot3, 400).start();

      return () => { pulseLoop.stop(); };
    }, []);

    return (
      <View style={styles.searchingContainer}>
        <View style={styles.searchingIconWrap}>
          <Animated.View style={[styles.searchingRing, { opacity: pulse, transform: [{ scale: pulse }] }]} />
          <IconSymbol name="magnifyingglass" size={18} color="#0D9488" />
        </View>
        <View style={styles.searchingTextRow}>
          <ThemedText type="bodySm" style={styles.searchingText}>Searching cities</ThemedText>
          <View style={styles.searchingDots}>
            <Animated.View style={[styles.searchingDot, { opacity: dot1 }]} />
            <Animated.View style={[styles.searchingDot, { opacity: dot2 }]} />
            <Animated.View style={[styles.searchingDot, { opacity: dot3 }]} />
          </View>
        </View>
        <ThemedText type="labelMd" style={styles.searchingHint}>type at least 2 characters</ThemedText>
      </View>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      {loadingForm ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : (
      <>
      <LinearGradient colors={['#14B8A6', '#0D9488']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="arrow.left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInner}>
            <ThemedText type="headlineLgMobile" style={styles.headerTitle}>{editingId ? 'Edit Ride' : 'Post a Ride'}</ThemedText>
            <ThemedText type="bodySm" style={styles.headerSub}>{editingId ? 'Edit your ride' : 'Share empty space on your truck'}</ThemedText>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {error ? (
            <View style={styles.errorBar}>
              <IconSymbol name="exclamationmark.triangle.fill" size={14} color="#DC2626" />
              <ThemedText type="bodySm" style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : null}

          {/* --- ROUTE CARD --- */}
          <View style={styles.routeCard}>
            <View style={styles.routeCardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: primaryColor + '12' }]}>
                <IconSymbol name="map.fill" size={15} color={primaryColor} />
              </View>
              <ThemedText type="titleMd" style={styles.cardTitle}>Route</ThemedText>
            </View>

            <View style={styles.searchCard}>
              <View style={styles.fieldBlock}>
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldDot, { backgroundColor: '#0D9488' }]} />
                  <View style={styles.fieldContent}>
                    <ThemedText type="labelMd" style={styles.fieldLabel}>FROM</ThemedText>
                    {originLocked ? (
                      <View style={styles.lockedRow}>
                        <ThemedText type="bodyLg" style={styles.lockedText}>{origin}</ThemedText>
                        <TouchableOpacity style={styles.changePill} onPress={handleClearOrigin}>
                          <IconSymbol name="xmark.circle.fill" size={12} color="#0D9488" />
                          <ThemedText type="labelMd" style={styles.changePillText}>Change</ThemedText>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TextInput
                        ref={originRef}
                        style={styles.fieldInput}
                        placeholder=""
                        placeholderTextColor="#A8A29E"
                        value={origin}
                        onChangeText={onOriginChange}
                        autoCorrect={false}
                      />
                    )}
                  </View>
                </View>
              </View>

              {activeDropdown === 'origin' && (
                <View style={styles.dropdownInline}>
                  <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.dropdownScroll}>
                    {dropdownContent()}
                  </ScrollView>
                </View>
              )}

              <View style={styles.timelineConnector}>
                <View style={styles.timelineLine} />
                <View style={styles.timelineDot} />
                <View style={styles.timelineLine} />
              </View>

              <View style={styles.fieldBlock}>
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldDot, { backgroundColor: '#DC2626' }]} />
                  <View style={styles.fieldContent}>
                    <ThemedText type="labelMd" style={styles.fieldLabel}>TO</ThemedText>
                    {destLocked ? (
                      <View style={styles.lockedRow}>
                        <ThemedText type="bodyLg" style={styles.lockedText}>{destination}</ThemedText>
                        <TouchableOpacity style={[styles.changePill, { borderColor: '#DC262630' }]} onPress={handleClearDest}>
                          <IconSymbol name="xmark.circle.fill" size={12} color="#DC2626" />
                          <ThemedText type="labelMd" style={[styles.changePillText, { color: '#DC2626' }]}>Change</ThemedText>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TextInput
                        ref={destRef}
                        style={styles.fieldInput}
                        placeholder=""
                        placeholderTextColor="#A8A29E"
                        value={destination}
                        onChangeText={onDestChange}
                        autoCorrect={false}
                      />
                    )}
                  </View>
                </View>
              </View>

              {activeDropdown === 'dest' && (
                <View style={styles.dropdownInline}>
                  <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.dropdownScroll}>
                    {dropdownContent()}
                  </ScrollView>
                </View>
              )}

              <View style={styles.timelineConnector}>
                <View style={styles.timelineLine} />
                <View style={[styles.timelineDot, { backgroundColor: '#DC2626' }]} />
                <View style={styles.timelineLine} />
              </View>
            </View>

            {/* Routes section */}
            {showRoutes && (
              <View style={styles.routesSection}>
                <View style={styles.routesHeader}>
                  <ThemedText type="labelMd" style={styles.routesTitle}>
                    {routes.length > 0 ? `${routes.length} route${routes.length > 1 ? 's' : ''} available` : 'Available routes'}
                  </ThemedText>
                  {selectedRoute && (
                    <TouchableOpacity onPress={() => setSelectedRoute(null)}>
                      <ThemedText type="bodySm" style={[styles.changeRoute, { color: primaryColor }]}>Change</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>

                {routesLoading ? (
                  <View style={styles.routesLoading}>
                    <ActivityIndicator size="small" color={primaryColor} />
                  </View>
                ) : routes.length === 0 ? (
                  <View style={styles.noRoutesCard}>
                    <View style={styles.noRoutesIcon}>
                      <IconSymbol name="map.fill" size={28} color="#D6D3D1" />
                    </View>
                    <ThemedText type="bodyLg" style={styles.noRoutesTitle}>No route found</ThemedText>
                    <ThemedText type="bodySm" style={styles.noRoutesDesc}>
                      No route found from "{origin}" to "{destination}". Create a route first.
                    </ThemedText>
                    <TouchableOpacity
                      style={styles.createRouteBtn}
                      onPress={() => router.push('/create-route')}
                      activeOpacity={0.8}
                    >
                      <IconSymbol name="plus" size={14} color="#fff" />
                      <ThemedText type="titleMd" style={styles.createRouteBtnText}>Create Route</ThemedText>
                    </TouchableOpacity>
                  </View>
                ) : selectedRoute ? (
                  /* Selected route - expanded view */
                  <View style={[styles.selectedRouteCard, { borderColor: primaryColor + '30', backgroundColor: primaryColor + '06' }]}>
                    <View style={styles.selectedRouteTop}>
                      <View style={[styles.selectedBadge, { backgroundColor: primaryColor }]}>
                        <IconSymbol name="checkmark" size={12} color="#fff" />
                      </View>
                      <View style={styles.selectedRouteInfo}>
                        <ThemedText type="titleMd" style={styles.selectedRouteName}>{selectedRoute.route_name}</ThemedText>
                        <ThemedText type="bodySm" style={styles.selectedRouteMeta}>{selectedRoute.stops.length} stops</ThemedText>
                      </View>
                    </View>
                    <View style={styles.selectedRouteStops}>
                      <RouteStopChain stops={selectedRoute.stops} fromCity={origin} toCity={destination} color={primaryColor} />
                    </View>
                    {/* Actual destination picker */}
                    <View style={styles.destStopPicker}>
                      <ThemedText type="labelMd" style={styles.destStopLabel}>Actual Destination</ThemedText>
                      <View style={styles.destStopChips}>
                        {selectedRoute.stops.map(s => {
                          const sel = rideToStopId === s.id;
                          return (
                            <TouchableOpacity
                              key={s.id}
                              style={[styles.destStopChip, sel && { backgroundColor: primaryColor, borderColor: primaryColor }]}
                              onPress={() => { setRideToStopId(s.id); setRideToCity(s.stop_name); }}
                            >
                              <ThemedText type="bodySm" style={[styles.destStopChipText, sel && { color: '#fff' }]}>{s.stop_name}</ThemedText>
                            </TouchableOpacity>
                          );
                        })}
                        <TouchableOpacity
                          key="final-dest"
                          style={[styles.destStopChip, rideToStopId === null && { backgroundColor: primaryColor, borderColor: primaryColor }]}
                          onPress={() => { setRideToStopId(null); setRideToCity(selectedRoute.to_city); }}
                        >
                          <ThemedText type="bodySm" style={[styles.destStopChipText, rideToStopId === null && { color: '#fff' }]}>
                            {selectedRoute.to_city}
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  /* Route list */
                  <View style={styles.routeList}>
                    {routes.map((route) => (
                      <TouchableOpacity
                        key={route.id}
                        style={styles.routeItem}
                        onPress={() => handleSelectRoute(route)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.routeItemLeft}>
                          <View style={[styles.routeRadio, { borderColor: primaryColor + '40' }]}>
                            <View style={[styles.routeRadioInner, { backgroundColor: primaryColor }]} />
                          </View>
                        </View>
                        <View style={styles.routeItemBody}>
                          <ThemedText type="titleMd" style={styles.routeItemName}>{route.route_name}</ThemedText>
                          <RouteStopChain stops={route.stops} fromCity={origin} toCity={destination} color={primaryColor} compact />
                        </View>
                        <IconSymbol name="chevron.right" size={14} color="#D6D3D1" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* --- SCHEDULE CARD --- */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: primaryColor + '12' }]}>
                <IconSymbol name="clock.fill" size={15} color={primaryColor} />
              </View>
              <ThemedText type="titleMd" style={styles.cardTitle}>Schedule</ThemedText>
            </View>

            <View>
              <View>
                <ThemedText type="labelMd" style={styles.fieldLabel}>Date</ThemedText>
                <TouchableOpacity style={styles.fieldBtn} onPress={() => setShowDatePicker(true)}>
                  <IconSymbol name="calendar" size={16} color={primaryColor} />
                  <ThemedText type="bodyLg" style={[styles.fieldValue, !departureDate && { color: '#A8A29E' }]}>
                    {departureDate ? formatDisplayDate(departureDate) : 'Select'}
                  </ThemedText>
                  <IconSymbol name="chevron.down" size={14} color="#A8A29E" />
                </TouchableOpacity>
              </View>
              <View style={styles.fieldVertGap}>
                <ThemedText type="labelMd" style={styles.fieldLabel}>Time {editingTimeExpired ? '(locked)' : ''}</ThemedText>
                <TouchableOpacity style={[styles.fieldBtn, editingTimeExpired ? styles.fieldBtnDisabled : null]} onPress={() => !editingTimeExpired && setShowTimePicker(true)} activeOpacity={editingTimeExpired ? 1 : 0.7}>
                  <IconSymbol name="clock.fill" size={16} color={editingTimeExpired ? '#D6D3D1' : primaryColor} />
                  <ThemedText type="bodyLg" style={[styles.fieldValue, !departureTime.hour ? { color: '#A8A29E' } : null, editingTimeExpired ? { color: '#A8A29E' } : null]}>
                    {departureTime.hour ? `${departureTime.hour}:${departureTime.minute} ${departureTime.period}` : 'Select'}
                  </ThemedText>
                  {!editingTimeExpired && <IconSymbol name="chevron.down" size={14} color="#A8A29E" />}
                  {editingTimeExpired && <IconSymbol name="lock.fill" size={12} color="#D6D3D1" />}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* --- VEHICLE CARD --- */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#0D948812' }]}>
                <IconSymbol name="truck.box.fill" size={15} color="#0D9488" />
              </View>
              <ThemedText type="titleMd" style={styles.cardTitle}>Vehicle</ThemedText>
            </View>

            <View>
              <View>
                <ThemedText type="labelMd" style={styles.fieldLabel}>Type</ThemedText>
                <TouchableOpacity style={styles.fieldBtn} onPress={() => setShowVehiclePicker(true)}>
                  <IconSymbol name="truck.box.fill" size={16} color="#0D9488" />
                  <ThemedText type="bodyLg" style={[styles.fieldValue, !vehicleType && { color: '#A8A29E' }]} numberOfLines={1}>
                    {vehicleType || 'Select'}
                  </ThemedText>
                  <IconSymbol name="chevron.down" size={14} color="#A8A29E" />
                </TouchableOpacity>
              </View>
              <View style={styles.fieldVertGap}>
                <ThemedText type="labelMd" style={styles.fieldLabel}>Space</ThemedText>
                <View style={[styles.fieldBtn, styles.spaceFieldBtn, { backgroundColor: 'transparent' }]}>
                  <IconSymbol name="cube.box.fill" size={15} color="#0D9488" />
                  <SpaceSlider value={space} onChange={setSpace} color={primaryColor} />
                </View>
              </View>
            </View>
          </View>

          {/* --- NOTES --- */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: '#78716C12' }]}>
                <IconSymbol name="note.text" size={15} color="#78716C" />
              </View>
              <ThemedText type="titleMd" style={styles.cardTitle}>Notes</ThemedText>
            </View>
            <View style={styles.notesField}>
              <TextInput
                style={styles.notesInput}
                placeholder="Koi special instructions..."
                placeholderTextColor="#A8A29E"
                value={notes}
                onChangeText={setNotes}
                multiline
                editable={!loading}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: primaryColor }, (!canSubmit || loading) && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <IconSymbol name="paperplane.fill" size={16} color="#fff" />
                <ThemedText type="titleMd" style={styles.submitLabel}>{editingId ? 'Update Ride' : 'Post Ride'}</ThemedText>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
        <TouchableOpacity style={styles.modalMask} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalSheet}>
              <View style={styles.modalBar} />
              <View style={styles.modalHead}>
                <ThemedText type="titleMd" style={styles.modalTitle}>Select Date</ThemedText>
                <TouchableOpacity onPress={() => setShowDatePicker(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <IconSymbol name="xmark.circle.fill" size={22} color="#D6D3D1" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={generateDateRange(60)}
                keyExtractor={(_, i) => String(i)}
                numColumns={5}
                columnWrapperStyle={styles.dateGrid}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const sel = departureDate && formatDate(item) === formatDate(departureDate);
                  const today = formatDate(item) === formatDate(new Date());
                  return (
                    <TouchableOpacity style={[styles.dateCell, sel && { backgroundColor: primaryColor + '12' }]} onPress={() => { setDepartureDate(item); setShowDatePicker(false); }}>
                      <ThemedText type="labelMd" style={[styles.dateDay, today && { color: primaryColor }]}>{DAYS[item.getDay()]}</ThemedText>
                      <ThemedText type="headlineLgMobile" style={[styles.dateNum, sel && { color: primaryColor }]}>{item.getDate()}</ThemedText>
                      <ThemedText type="labelMd" style={styles.dateMonth}>{MONTHS[item.getMonth()]}</ThemedText>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Time Picker Modal */}
      <Modal visible={showTimePicker} transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
        <View style={styles.modalMask}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowTimePicker(false)} />
          <ScrollView style={styles.modalSheet} bounces={false} contentContainerStyle={styles.modalSheetInner} keyboardShouldPersistTaps="handled">
            <View style={styles.modalBar} />
            <View style={styles.modalHead}>
              <ThemedText type="titleMd" style={styles.modalTitle}>Select Time</ThemedText>
              <TouchableOpacity onPress={() => setShowTimePicker(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <IconSymbol name="xmark.circle.fill" size={22} color="#D6D3D1" />
              </TouchableOpacity>
            </View>

            {/* Selected time display */}
            <View style={styles.timeDisplay}>
              <ThemedText style={[styles.timeDisplayText, { color: primaryColor }]}>
                {departureTime.hour}:{departureTime.minute} {departureTime.period}
              </ThemedText>
            </View>

            {/* Period toggle */}
            <View style={styles.periodRow}>
              {['AM', 'PM'].map(p => {
                const disabled = isPeriodDisabled(p);
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.periodChip, departureTime.period === p && { backgroundColor: primaryColor, borderColor: primaryColor }, disabled && styles.periodChipDisabled]}
                    onPress={() => !disabled && setDepartureTime(prev => ({ ...prev, period: p }))}
                  >
                    <ThemedText type="titleMd" style={[styles.periodChipText, departureTime.period === p && { color: '#fff' }, disabled && { opacity: 0.3 }]}>{p}</ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Hour selector */}
            <ThemedText type="labelMd" style={styles.timeSectionLabel}>Hour</ThemedText>
            <View style={styles.timeGrid}>
              {[['01','02','03'],['04','05','06'],['07','08','09'],['10','11','12']].map((row, ri) => (
                <View key={ri} style={styles.timeGridRow}>
                  {row.map(h => {
                    const disabled = isHourDisabled(h, departureTime.period);
                    const selected = departureTime.hour === h;
                    return (
                      <TouchableOpacity
                        key={h}
                        style={[styles.timeGridOpt, selected && { backgroundColor: primaryColor, borderColor: primaryColor }, disabled && styles.timeGridOptDisabled]}
                        onPress={() => !disabled && setDepartureTime(p => ({ ...p, hour: h }))}
                      >
                        <ThemedText type="bodyLg" style={[styles.timeGridOptText, selected && { color: '#fff' }, disabled && { opacity: 0.25 }]}>{h}</ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Minute selector */}
            <ThemedText type="labelMd" style={styles.timeSectionLabel}>Minute</ThemedText>
            <View style={styles.timeGrid}>
              {[['00','05','10'],['15','20','25'],['30','35','40'],['45','50','55']].map((row, ri) => (
                <View key={ri} style={styles.timeGridRow}>
                  {row.map(m => {
                    const disabled = isMinDisabled(m);
                    const selected = departureTime.minute === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.timeGridOpt, selected && { backgroundColor: primaryColor, borderColor: primaryColor }, disabled && styles.timeGridOptDisabled]}
                        onPress={() => !disabled && setDepartureTime(p => ({ ...p, minute: m }))}
                      >
                        <ThemedText type="bodyLg" style={[styles.timeGridOptText, selected && { color: '#fff' }, disabled && { opacity: 0.25 }]}>{m}</ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            <TouchableOpacity style={[styles.modalDone, { backgroundColor: primaryColor }]} onPress={() => setShowTimePicker(false)}>
              <ThemedText type="titleMd" style={styles.modalDoneLabel}>Done</ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Vehicle Picker Modal */}
      <Modal visible={showVehiclePicker} transparent animationType="slide" onRequestClose={() => setShowVehiclePicker(false)}>
        <TouchableOpacity style={styles.modalMask} activeOpacity={1} onPress={() => setShowVehiclePicker(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[styles.modalSheet, { padding: 24, paddingTop: 12 }]}>
              <View style={styles.modalBar} />
              <View style={styles.modalHead}>
                <ThemedText type="titleMd" style={styles.modalTitle}>Vehicle Type</ThemedText>
                <TouchableOpacity onPress={() => setShowVehiclePicker(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <IconSymbol name="xmark.circle.fill" size={22} color="#D6D3D1" />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {VEHICLE_TYPES.map(vt => (
                  <TouchableOpacity key={vt} style={[styles.vehicleRow, vehicleType === vt && { backgroundColor: primaryColor + '08' }]} onPress={() => { setVehicleType(vt); setShowVehiclePicker(false); }}>
                    <View style={[styles.vehicleRadio, { borderColor: vehicleType === vt ? primaryColor : '#D6D3D1' }]}>
                      {vehicleType === vt && <View style={[styles.vehicleRadioInner, { backgroundColor: primaryColor }]} />}
                    </View>
                    <ThemedText type="bodyLg" style={[styles.vehicleRowText, vehicleType === vt && { color: primaryColor, fontWeight: '700' }]}>{vt}</ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      </>
      )}
    </ThemedView>
  );
}

function SpaceSlider({ value, onChange, color }: { value: number; onChange: (v: number) => void; color: string }) {
  const trackRef = useRef<View>(null);
  const trackPos = useRef({ x: 0, width: 0 });

  const computePct = (pageX: number) => {
    if (trackPos.current.width <= 0) return value;
    const relX = pageX - trackPos.current.x;
    return Math.max(1, Math.min(100, Math.round((relX / trackPos.current.width) * 100)));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        trackRef.current?.measureInWindow((x, y, w) => {
          trackPos.current = { x, width: w };
          onChange(computePct(evt.nativeEvent.pageX));
        });
      },
      onPanResponderMove: (evt) => {
        onChange(computePct(evt.nativeEvent.pageX));
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  return (
    <View style={styles.sliderWrap}>
      <View ref={trackRef} style={styles.sliderTrackOuter} {...panResponder.panHandlers}>
        <View style={[styles.sliderFill, { width: `${value}%`, backgroundColor: color }]} />
        <View style={[styles.sliderThumb, { left: `${value}%`, borderColor: color, backgroundColor: '#fff' }]} />
      </View>
      <View style={styles.sliderValueRow}>
        <ThemedText type="labelMd" style={styles.sliderMinMax}>0%</ThemedText>
        <ThemedText type="titleMd" style={[styles.sliderValue, { color }]}>{value}%</ThemedText>
        <ThemedText type="labelMd" style={styles.sliderMinMax}>100%</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F0' },
  flex: { flex: 1 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerInner: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 40 },

  errorBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { color: '#DC2626', flex: 1, fontSize: 13 },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14, ...Shadows.sm },
  routeCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14, ...Shadows.sm },
  routeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#1C1917', fontWeight: '700', fontSize: 16 },

  // City search fields (home screen style)
  searchCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: '#F0EFEE', ...Shadows.lg,
  },
  fieldBlock: {},
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  fieldDot: { width: 12, height: 12, borderRadius: 6, marginTop: 2, alignSelf: 'flex-start' },
  fieldContent: { flex: 1 },
  fieldLabel: { color: '#A8A29E', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  fieldInput: { color: '#1C1917', fontSize: 17, fontWeight: '600', paddingVertical: 4, paddingHorizontal: 0, height: 34 },
  lockedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 34 },
  lockedText: { color: '#1C1917', fontSize: 17, fontWeight: '700', flex: 1 },
  changePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#0D948830', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  changePillText: { color: '#0D9488', fontSize: 11, fontWeight: '700' },
  timelineConnector: { flexDirection: 'row', alignItems: 'center', marginVertical: 2, marginLeft: 5, height: 16 },
  timelineLine: { flex: 1, height: 1.5, backgroundColor: '#E7E5E4' },
  timelineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0D9488', marginHorizontal: 8 },
  dropdownInline: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F0EFEE',
    maxHeight: 300, ...Shadows.lg, overflow: 'hidden',
  },
  dropdownScroll: { maxHeight: 300 },
  dropdownLoading: { paddingVertical: 24, alignItems: 'center' },
  dropdownLoadingText: { color: '#A8A29E', fontSize: 13 },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F4',
  },
  dropdownItemContent: { flex: 1 },
  dropIcon: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#0D948812', alignItems: 'center', justifyContent: 'center' },
  dropdownText: { color: '#1C1917', fontSize: 15, fontWeight: '600' },
  dropdownState: { color: '#A8A29E', fontSize: 11, fontWeight: '500', marginTop: 1 },
  searchingContainer: { paddingVertical: 28, alignItems: 'center', gap: 10 },
  searchingIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0D948812', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  searchingRing: { position: 'absolute', width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#0D9488' },
  searchingTextRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  searchingText: { color: '#1C1917', fontSize: 14, fontWeight: '600' },
  searchingDots: { flexDirection: 'row', gap: 3 },
  searchingDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#0D9488' },
  searchingHint: { color: '#A8A29E', fontSize: 10, fontWeight: '500' },

  // Routes
  routesSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#F0EFED', paddingTop: 14 },
  routesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  routesTitle: { color: '#A8A29E', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  changeRoute: { fontWeight: '700', fontSize: 13 },
  routesLoading: { paddingVertical: 24, alignItems: 'center' },
  noRoutesCard: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16, gap: 8 },
  noRoutesIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F5F5F4', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  noRoutesTitle: { color: '#1C1917', fontWeight: '700', fontSize: 15 },
  noRoutesDesc: { color: '#A8A29E', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  createRouteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#8B5CF6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  createRouteBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  routeList: { gap: 8 },
  routeItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FAFAF9', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#F0EFED',
  },
  routeItemLeft: {},
  routeRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  routeRadioInner: { width: 10, height: 10, borderRadius: 5 },
  routeItemBody: { flex: 1 },
  routeItemName: { color: '#1C1917', fontWeight: '700', fontSize: 14, marginBottom: 6 },

  // Selected route
  selectedRouteCard: { borderRadius: 16, borderWidth: 1.5, padding: 16 },
  selectedRouteTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  selectedBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  selectedRouteInfo: { flex: 1 },
  selectedRouteName: { color: '#1C1917', fontWeight: '700', fontSize: 15 },
  selectedRouteMeta: { color: '#A8A29E', fontSize: 12, marginTop: 1 },
  selectedRouteStops: {},

  // Actual destination picker
  destStopPicker: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#F0EFEE', paddingTop: 12 },
  destStopLabel: { color: '#A8A29E', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  destStopChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  destStopChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#E7E5E4', backgroundColor: '#F5F5F0' },
  destStopChipText: { color: '#1C1917', fontWeight: '600', fontSize: 12 },

  // Stop chain
  chainWrap: { gap: 0 },
  chainRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  chainTrack: { alignItems: 'center', width: 20, marginRight: 10 },
  chainDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D6D3D1', marginTop: 4 },
  chainDotHighlight: { width: 12, height: 12, borderRadius: 6, marginTop: 2 },
  chainLine: { width: 2, flex: 1, backgroundColor: '#E7E5E4', marginVertical: 2, minHeight: 18 },
  chainLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, flex: 1 },
  chainLabel: { color: '#57534E', fontSize: 14 },
  chainTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  chainTagText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  chainMore: { marginLeft: 30, marginTop: 4 },
  chainMoreText: { color: '#A8A29E', fontSize: 11, fontWeight: '600' },

  // Schedule
  fieldVertGap: { marginTop: 14 },
  scheduleFieldLabel: { fontSize: 10, color: '#A8A29E', fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 2 },
  fieldBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F5F5F0', borderRadius: 14, paddingHorizontal: 14, height: 50 },
  fieldBtnDisabled: { opacity: 0.6, backgroundColor: '#F0EFEE' },
  fieldValue: { flex: 1, color: '#1C1917', fontSize: 15, fontWeight: '600' },
  spaceFieldBtn: { paddingHorizontal: 12, paddingVertical: 6, height: 50, justifyContent: 'center' },

  // Slider
  sliderWrap: { width: '100%', paddingVertical: 4 },
  sliderTrackOuter: { height: 32, justifyContent: 'center', position: 'relative' },
  sliderFill: { height: 6, borderRadius: 3, position: 'absolute', left: 0, top: 13 },
  sliderThumb: { position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 3.5, marginLeft: -11, top: 5, ...Shadows.md, elevation: 5 },
  sliderValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sliderMinMax: { color: '#A8A29E', fontSize: 9, fontWeight: '700' },
  sliderValue: { fontWeight: '800', fontSize: 14 },

  // Notes
  notesField: { backgroundColor: '#F5F5F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, minHeight: 70 },
  notesInput: { color: '#1C1917', fontSize: 15, fontWeight: '500', minHeight: 48, textAlignVertical: 'top' },

  // Submit
  submitBtn: { borderRadius: 16, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4, ...Shadows.lg, shadowColor: '#0D9488' },
  submitDisabled: { opacity: 0.45 },
  submitLabel: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },
  spacer: { height: 60 },

  // Modals
  modalMask: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' },
  modalSheetInner: { padding: 24, paddingTop: 12 },
  modalBar: { width: 40, height: 4, backgroundColor: '#E7E5E4', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#1C1917', fontWeight: '700', fontSize: 17 },
  modalDone: { borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  modalDoneLabel: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Date picker
  dateGrid: { justifyContent: 'space-between', marginBottom: 8, gap: 4 },
  dateCell: { borderRadius: 14, paddingVertical: 8, paddingHorizontal: 2, alignItems: 'center', flex: 1, marginBottom: 4 },
  dateDay: { color: '#A8A29E', fontSize: 9, fontWeight: '700', marginBottom: 1 },
  dateNum: { color: '#1C1917', fontSize: 17, fontWeight: '800', marginBottom: 1 },
  dateMonth: { color: '#A8A29E', fontSize: 9, fontWeight: '600' },

  // Time picker
  timeDisplay: { alignItems: 'center', paddingVertical: 2, marginBottom: 6 },
  timeDisplayText: { fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  periodRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 10 },
  periodChip: { paddingHorizontal: 24, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5, borderColor: '#D6D3D1', backgroundColor: '#F5F5F0' },
  periodChipText: { color: '#1C1917', fontWeight: '700', fontSize: 12 },
  periodChipDisabled: { opacity: 0.35 },
  timeSectionLabel: { color: '#A8A29E', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginLeft: 2 },
  timeGrid: { gap: 5, marginBottom: 8 },
  timeGridRow: { flexDirection: 'row', gap: 5 },
  timeGridOpt: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#F0EFEE', backgroundColor: '#FAFAF9', alignItems: 'center' },
  timeGridOptDisabled: { opacity: 0.35 },
  timeGridOptText: { color: '#1C1917', fontWeight: '600', fontSize: 12 },

  // Vehicle picker
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 6, borderRadius: 14, marginBottom: 2 },
  vehicleRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  vehicleRadioInner: { width: 10, height: 10, borderRadius: 5 },
  vehicleRowText: { color: '#1C1917', fontSize: 16 },
});
