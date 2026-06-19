import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { routesApi } from '@/services/routes';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const getInitial = (n: string) => n?.charAt(0)?.toUpperCase() || '?';

type DropdownKind = 'origin' | 'dest' | null;

export default function HomeFeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [origins, setOrigins] = useState<string[]>([]);
  const [dests, setDests] = useState<string[]>([]);
  const [originLocked, setOriginLocked] = useState(false);
  const [destLocked, setDestLocked] = useState(false);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [searchingDest, setSearchingDest] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<DropdownKind>(null);
  const [flatListKey, setFlatListKey] = useState(0);

  const originRef = useRef<TextInput>(null);
  const destRef = useRef<TextInput>(null);
  const originTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const destTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleSearch = useCallback(() => {
    if (!origin || !destination) return;
    router.push({ pathname: '/browse', params: { from: origin, to: destination } });
  }, [origin, destination]);

  async function searchCities(q: string): Promise<string[]> {
    if (q.trim().length < 2) return [];
    try {
      const res = await routesApi.searchCities(q);
      return res.data;
    } catch {
      return [];
    }
  }

  const activeDropdownRef = useRef<DropdownKind>(null);

  function showDropdown(kind: 'origin' | 'dest') {
    setActiveDropdown(kind);
    activeDropdownRef.current = kind;
  }

  function onOriginChange(v: string) {
    setOrigin(v);
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
  function dismissDropdown() {
    setActiveDropdown(null);
    activeDropdownRef.current = null;
    setFlatListKey(k => k + 1);
  }

  useEffect(() => {
    if (originLocked && destLocked) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [originLocked, destLocked, pulseAnim]);

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
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <ThemedText type="labelMd" style={styles.topBarLabel}>Ride Search</ThemedText>
            <ThemedText type="headlineLgMobile" style={styles.topBarTitle}>Where to?</ThemedText>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.avatarBtn}>
            <LinearGradient colors={['#0D9488', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarBadge}>
              <ThemedText type="titleMd" style={styles.avatarBadgeText}>{getInitial(user?.business_name || user?.full_name || 'U')}</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.searchSection}>
        <View style={styles.searchCard}>
          <View style={styles.fieldBlock}>
            <View style={styles.fieldRow}>
              <View style={[styles.fieldDot, { backgroundColor: '#0D9488' }]} />
              <View style={styles.fieldContent}>
                <ThemedText type="labelMd" style={styles.fieldLabel}>FROM</ThemedText>
                {originLocked ? (
                  <View style={styles.lockedRow}>
                    <ThemedText type="bodyLg" style={styles.lockedText}>{origin}</ThemedText>
                    <TouchableOpacity style={styles.changePill} onPress={() => { setOriginLocked(false); setOrigin(''); }}>
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
                    allowFontScaling={false}
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
                    <TouchableOpacity style={[styles.changePill, { borderColor: '#DC262630' }]} onPress={() => { setDestLocked(false); setDestination(''); }}>
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
                    allowFontScaling={false}
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

          <Animated.View style={[
            { transform: [{ scale: originLocked && destLocked ? pulseAnim : 1 }] },
            originLocked && destLocked && { shadowColor: '#0D9488', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
          ]}>
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => {
              if (origin && destination) {
                dismissDropdown();
                handleSearch();
              }
            }}
            disabled={!(originLocked && destLocked)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={originLocked && destLocked ? ['#0D9488', '#059669'] : ['#F5F5F4', '#E7E5E4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.searchBtnGradient}
            >
              <ThemedText type="titleMd" style={[styles.searchBtnText, { color: originLocked && destLocked ? '#fff' : '#A8A29E' }]}>Find Rides</ThemedText>
              <View style={[styles.searchArrow, { backgroundColor: originLocked && destLocked ? 'rgba(255,255,255,0.2)' : 'transparent' }]}>
                <IconSymbol name="arrow.right" size={12} color={originLocked && destLocked ? '#fff' : '#D6D3D1'} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {activeDropdown && (
        <TouchableOpacity style={styles.backdropArea} activeOpacity={1} onPress={dismissDropdown} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  safe: { backgroundColor: '#fff' },

  topBar: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0EFEE',
  },
  topBarLeft: { flex: 1 },
  topBarLabel: { color: '#A8A29E', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  topBarTitle: { color: '#1C1917', fontSize: 26, fontWeight: '800', marginTop: 2 },
  avatarBtn: { borderRadius: 14, overflow: 'hidden' },
  avatarBadge: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarBadgeText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  searchSection: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    backgroundColor: '#FAFAF8',
  },
  searchCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20,
    ...Shadows.lg, borderWidth: 1, borderColor: '#F0EFEE',
  },

  fieldBlock: {},
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  fieldDot: { width: 12, height: 12, borderRadius: 6, marginTop: 2, alignSelf: 'flex-start' },
  fieldContent: { flex: 1 },
  fieldLabel: { color: '#A8A29E', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  fieldInput: { color: '#1C1917', fontSize: 17, fontWeight: '600', paddingVertical: 4, paddingHorizontal: 0, height: 34 },

  lockedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 32 },
  lockedText: { color: '#1C1917', fontSize: 16, fontWeight: '700', flex: 1 },
  changePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#0D948830', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  changePillText: { color: '#0D9488', fontSize: 11, fontWeight: '700' },

  timelineConnector: { flexDirection: 'row', alignItems: 'center', marginVertical: 2, marginLeft: 5, height: 16 },
  timelineLine: { flex: 1, height: 1.5, backgroundColor: '#E7E5E4' },
  timelineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0D9488', marginHorizontal: 8 },

  searchBtn: { marginTop: 16, borderRadius: 20, overflow: 'hidden' },
  searchBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 54, borderRadius: 20, paddingHorizontal: 20 },
  searchBtnText: { fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  searchArrow: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  backdropArea: {
    flex: 1, backgroundColor: 'transparent',
  },
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

});
