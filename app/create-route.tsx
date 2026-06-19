import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Animated, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Shadows } from '@/constants/theme';
import { routesApi, RouteCreateInput } from '@/services/routes';

interface StopItem {
  id: string;
  name: string;
  locked: boolean;
  durationMinutes: number;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function parseDurationInput(value: string): number {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return 0;

  // "1:30" or "1h30m" or "1h 30m" or "90"
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);

  const hourMatch = trimmed.match(/^(\d+)\s*h(?:\s*(\d+)\s*m?)?$/);
  if (hourMatch) return parseInt(hourMatch[1]) * 60 + (parseInt(hourMatch[2] || '0'));

  const minMatch = trimmed.match(/^(\d+)\s*m$/);
  if (minMatch) return parseInt(minMatch[1]);

  const justNum = parseInt(trimmed);
  if (!isNaN(justNum) && justNum > 0) return justNum;

  return 0;
}

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
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]));
    makeDotAnim(dot1, 0).start();
    makeDotAnim(dot2, 200).start();
    makeDotAnim(dot3, 400).start();

    return () => pulseLoop.stop();
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
    </View>
  );
}

export default function CreateRouteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : null;
  const insets = useSafeAreaInsets();

  const [loadingForm, setLoadingForm] = useState(!!editingId);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [routeName, setRouteName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [originLocked, setOriginLocked] = useState(false);
  const [destLocked, setDestLocked] = useState(false);
  const [originResults, setOriginResults] = useState<string[]>([]);
  const [destResults, setDestResults] = useState<string[]>([]);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [searchingDest, setSearchingDest] = useState(false);
  const [showOriginDrop, setShowOriginDrop] = useState(false);
  const [showDestDrop, setShowDestDrop] = useState(false);

  const [stops, setStops] = useState<StopItem[]>([]);
  const [stopInputs, setStopInputs] = useState<Record<string, string>>({});
  const [stopResults, setStopResults] = useState<Record<string, string[]>>({});
  const [stopSearching, setStopSearching] = useState<Record<string, boolean>>({});
  const [activeStopDrop, setActiveStopDrop] = useState<string | null>(null);
  const [destinationDuration, setDestinationDuration] = useState(60);
  const [editingDuration, setEditingDuration] = useState<string | null>(null);
  const [durationInputs, setDurationInputs] = useState<Record<string, string>>({});

  const originRef = useRef<TextInput>(null);
  const destRef = useRef<TextInput>(null);
  const originTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const inputRefs = useRef<Record<string, TextInput>>({});

  useEffect(() => {
    if (originLocked && destLocked) {
      const suggested = `${origin} to ${destination}`;
      if (!routeName || routeName === `${origin} to ${destination}`) {
        setRouteName(suggested);
      }
    }
  }, [origin, destination, originLocked, destLocked]);

  // Load existing route for editing
  useEffect(() => {
    if (!editingId) return;
    (async () => {
      try {
        const res = await routesApi.show(editingId);
        const route = res.data;
        setOrigin(route.from_city);
        setOriginLocked(true);
        setDestination(route.to_city);
        setDestLocked(true);
        setRouteName(route.route_name);
        setDestinationDuration(route.destination_offset_minutes ?? 60);
        // Stops are everything between origin and destination
        const mid = route.stops.filter(s => s.stop_name !== route.from_city && s.stop_name !== route.to_city);
        let prevOffset = 0;
        const stopItems: StopItem[] = mid.map(s => {
          const currentOffset = s.time_offset_minutes ?? 60;
          const duration = currentOffset - prevOffset;
          prevOffset = currentOffset;
          return { id: `existing-${s.id}`, name: s.stop_name, locked: true, durationMinutes: Math.max(duration, 10) };
        });
        setStops(stopItems);
        setStopInputs(Object.fromEntries(stopItems.map(s => [s.id, s.name])));
      } catch {} finally {
        setLoadingForm(false);
      }
    })();
  }, [editingId]);

  const searchCities = async (q: string): Promise<string[]> => {
    if (q.trim().length < 2) return [];
    try {
      const res = await routesApi.searchCities(q);
      return res.data;
    } catch {
      return [];
    }
  };

  const dismissStopDrop = () => setActiveStopDrop(null);

  const handleOriginChange = (v: string) => {
    setOrigin(v);
    setOriginLocked(false);
    if (originTimer.current) clearTimeout(originTimer.current);
    if (v.trim().length < 2) {
      setShowOriginDrop(false); setSearchingOrigin(false); setOriginResults([]);
      return;
    }
    setSearchingOrigin(true); setOriginResults([]); setShowOriginDrop(true);
    originTimer.current = setTimeout(async () => {
      const results = await searchCities(v);
      setOriginResults(results);
      setSearchingOrigin(false);
      if (results.length === 0) setShowOriginDrop(false);
    }, 250);
  };

  const handleDestChange = (v: string) => {
    setDestination(v);
    setDestLocked(false);
    if (destTimer.current) clearTimeout(destTimer.current);
    if (v.trim().length < 2) {
      setShowDestDrop(false); setSearchingDest(false); setDestResults([]);
      return;
    }
    setSearchingDest(true); setDestResults([]); setShowDestDrop(true);
    destTimer.current = setTimeout(async () => {
      const results = await searchCities(v);
      setDestResults(results);
      setSearchingDest(false);
      if (results.length === 0) setShowDestDrop(false);
    }, 250);
  };

  const handleStopChange = (stopId: string, v: string) => {
    setStopInputs(prev => ({ ...prev, [stopId]: v }));
    setStops(prev => prev.map(s => s.id === stopId ? { ...s, name: v, locked: false } : s));
    if (stopTimers.current[stopId]) clearTimeout(stopTimers.current[stopId]);
    if (v.trim().length < 2) {
      dismissStopDrop(); setStopSearching(prev => ({ ...prev, [stopId]: false })); setStopResults(prev => ({ ...prev, [stopId]: [] }));
      return;
    }
    setStopSearching(prev => ({ ...prev, [stopId]: true })); setStopResults(prev => ({ ...prev, [stopId]: [] }));
    setActiveStopDrop(stopId);
    stopTimers.current[stopId] = setTimeout(async () => {
      const results = await searchCities(v);
      setStopResults(prev => ({ ...prev, [stopId]: results }));
      setStopSearching(prev => ({ ...prev, [stopId]: false }));
      if (results.length === 0) dismissStopDrop();
    }, 250);
  };

  const pickOrigin = (v: string) => {
    setOrigin(v.split(',')[0]);
    setOriginLocked(true);
    setShowOriginDrop(false); setOriginResults([]);
    if (!destLocked) destRef.current?.focus();
  };

  const pickDest = (v: string) => {
    setDestination(v.split(',')[0]);
    setDestLocked(true);
    setShowDestDrop(false); setDestResults([]);
  };

  const pickStop = (stopId: string, v: string) => {
    const name = v.split(',')[0];
    setStops(prev => prev.map(s => s.id === stopId ? { ...s, name, locked: true } : s));
    setStopInputs(prev => ({ ...prev, [stopId]: name }));
    dismissStopDrop(); setStopResults(prev => ({ ...prev, [stopId]: [] }));
  };

  const addStop = () => {
    const id = `stop_${Date.now()}`;
    setStops(prev => [...prev, { id, name: '', locked: false, durationMinutes: 60 }]);
    setStopInputs(prev => ({ ...prev, [id]: '' }));
  };

  const adjustDuration = (stopId: string, delta: number) => {
    setStops(prev => prev.map(s =>
      s.id === stopId
        ? { ...s, durationMinutes: Math.max(10, Math.min(480, s.durationMinutes + delta)) }
        : s
    ));
  };

  const startDurationEdit = (stopId: string, currentMinutes: number) => {
    setDurationInputs(prev => ({ ...prev, [stopId]: formatDuration(currentMinutes) }));
    setEditingDuration(stopId);
  };

  const commitDurationEdit = (stopId: string) => {
    const raw = durationInputs[stopId] || '';
    const parsed = parseDurationInput(raw);
    if (parsed > 0) {
      const clamped = Math.max(10, Math.min(480, parsed));
      if (stopId === '__dest__') {
        setDestinationDuration(clamped);
      } else {
        setStops(prev => prev.map(s => s.id === stopId ? { ...s, durationMinutes: clamped } : s));
      }
    }
    setEditingDuration(null);
    setDurationInputs(prev => { const p = { ...prev }; delete p[stopId]; return p; });
  };

  const removeStop = (id: string) => {
    setStops(prev => prev.filter(s => s.id !== id));
    setStopInputs(prev => { const p = { ...prev }; delete p[id]; return p; });
    if (activeStopDrop === id) dismissStopDrop();
  };

  const canSubmit = originLocked && destLocked && stops.every(s => s.locked) && routeName.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true); setError('');
    try {
      const allStops = stops.map(s => ({ stop_name: s.name, duration_minutes: s.durationMinutes }));
      const payload: RouteCreateInput = {
        route_name: routeName.trim(),
        from_city: origin,
        to_city: destination,
        stops: allStops,
        destination_offset_minutes: destinationDuration,
      };
      if (editingId) {
        await routesApi.update(editingId, payload);
      } else {
        await routesApi.create(payload);
      }
      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to create route');
    } finally {
      setLoading(false);
    }
  };

  const renderDropdown = (results: string[], searching: boolean, onPick: (v: string) => void) => {
    if (searching) return <SearchingLoader />;
    const safeResults = Array.isArray(results) ? results.filter(Boolean) : [];
    if (safeResults.length === 0) return null;
    return (
      <View style={styles.dropdownInline}>
        <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.dropdownScroll}>
          {safeResults.map((item, i) => {
            const parts = item.split(', ');
            return (
              <TouchableOpacity key={i} style={styles.dropdownItem} onPress={() => onPick(item)} activeOpacity={0.6}>
                <View style={styles.dropdownIcon}>
                  <IconSymbol name="location.fill" size={11} color="#0D9488" />
                </View>
                <View style={styles.dropdownItemContent}>
                  <ThemedText type="bodyLg" style={styles.dropdownText}>{parts[0]}</ThemedText>
                  {parts[1] ? <ThemedText type="labelMd" style={styles.dropdownState}>{parts[1]}</ThemedText> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {loadingForm ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : (
      <>
      <LinearGradient colors={['#14B8A6', '#0D9488']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="arrow.left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInner}>
            <ThemedText type="headlineLgMobile" style={styles.headerTitle}>{editingId ? 'Edit Route' : 'Create Route'}</ThemedText>
            <ThemedText type="bodySm" style={styles.headerSub}>{editingId ? 'Edit your route' : 'Add your regular route'}</ThemedText>
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

          {/* Info Banner */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconWrap}>
              <IconSymbol name="lightbulb.fill" size={20} color="#0D9488" />
            </View>
            <View style={styles.infoContent}>
              <ThemedText type="titleMd" style={styles.infoTitle}>Why add stops?</ThemedText>
              <ThemedText type="bodySm" style={styles.infoDesc}>
                Cities between your route will also show up in searches. More stops = better matches!
              </ThemedText>
            </View>
          </View>

          {/* Route Card */}
          <View style={styles.card}>
            {/* Origin Field */}
            <View style={styles.fieldBlock}>
              <View style={styles.fieldRow}>
                <View style={[styles.fieldDot, { backgroundColor: '#0D9488' }]} />
                <View style={styles.fieldContent}>
                  <ThemedText type="labelMd" style={styles.fieldLabel}>FROM</ThemedText>
                  {originLocked ? (
                    <View style={styles.lockedRow}>
                      <ThemedText type="bodyLg" style={styles.lockedText}>{origin}</ThemedText>
                      <TouchableOpacity style={styles.removeStopBtn} onPress={() => { setOriginLocked(false); setOrigin(''); }}>
                        <IconSymbol name="xmark.circle.fill" size={14} color="#0D9488" />
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
                      onChangeText={handleOriginChange}
                      autoCorrect={false}
                    />
                  )}
                </View>
              </View>
            </View>
            {showOriginDrop && renderDropdown(originResults, searchingOrigin, pickOrigin)}

            {/* Steps connector */}
            <View style={styles.stepConnector}>
              <View style={styles.stepLine} />
              <View style={[styles.stepDot, { backgroundColor: '#0D9488' }]} />
              <View style={styles.stepLine} />
            </View>

            {/* Stops section */}
            {stops.map((stop, idx) => (
              <View key={stop.id}>
                <View style={styles.fieldBlock}>
                  <View style={styles.fieldRow}>
                    <View style={[styles.fieldDot, { backgroundColor: '#A8A29E' }]} />
                    <View style={styles.fieldContent}>
                      <ThemedText type="labelMd" style={styles.fieldLabel}>STOP {idx + 1}</ThemedText>
                      {stop.locked ? (
                        <View style={styles.lockedRow}>
                          <ThemedText type="bodyLg" style={styles.lockedText} numberOfLines={1}>{stop.name}</ThemedText>
                          <View style={styles.durationGroup}>
                            <TouchableOpacity style={styles.durationBtn} onPress={() => adjustDuration(stop.id, -15)} activeOpacity={0.6}>
                              <IconSymbol name="minus" size={14} color="#0D9488" />
                            </TouchableOpacity>
                            {editingDuration === stop.id ? (
                        <TextInput
                          style={styles.durationInput}
                          value={durationInputs[stop.id] || ''}
                          onChangeText={(v) => setDurationInputs(prev => ({ ...prev, [stop.id]: v }))}
                          onBlur={() => commitDurationEdit(stop.id)}
                          onSubmitEditing={() => commitDurationEdit(stop.id)}
                          allowFontScaling={false}
                          autoFocus
                          selectTextOnFocus
                          keyboardType="default"
                        />
                            ) : (
                              <TouchableOpacity style={styles.durationCapsule} onPress={() => startDurationEdit(stop.id, stop.durationMinutes)} activeOpacity={0.7}>
                                <IconSymbol name="clock.fill" size={13} color="#0D9488" />
                                <ThemedText type="titleMd" style={styles.durationLabel}>{formatDuration(stop.durationMinutes)}</ThemedText>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.durationBtn} onPress={() => adjustDuration(stop.id, 15)} activeOpacity={0.6}>
                              <IconSymbol name="plus" size={14} color="#0D9488" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.removeStopBtn} onPress={() => removeStop(stop.id)}>
                              <IconSymbol name="xmark.circle.fill" size={14} color="#DC2626" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TextInput
                          style={styles.fieldInput}
                          placeholder={`Stop ${idx + 1} name`}
                          placeholderTextColor="#A8A29E"
                          allowFontScaling={false}
                          value={stopInputs[stop.id] || ''}
                          onChangeText={(v) => handleStopChange(stop.id, v)}
                          autoCorrect={false}
                        />
                      )}
                    </View>
                  </View>
                </View>
                {activeStopDrop === stop.id && renderDropdown(stopResults[stop.id] || [], stopSearching[stop.id] || false, (v) => pickStop(stop.id, v))}
                <View style={styles.stepConnector}>
                  <View style={styles.stepLine} />
                  <View style={[styles.stepDot, { backgroundColor: '#A8A29E' }]} />
                  <View style={styles.stepLine} />
                </View>
              </View>
            ))}

            {/* Add Stop Button */}
            {originLocked && (
              <TouchableOpacity style={styles.addStopBtn} onPress={addStop} activeOpacity={0.7}>
                <View style={styles.addStopIcon}>
                  <IconSymbol name="plus" size={14} color="#0D9488" />
                </View>
                <ThemedText type="bodyLg" style={styles.addStopText}>Add Stop</ThemedText>
              </TouchableOpacity>
            )}

            {/* Destination Field */}
            <View style={styles.fieldBlock}>
              <View style={styles.fieldRow}>
                <View style={[styles.fieldDot, { backgroundColor: '#DC2626' }]} />
                <View style={styles.fieldContent}>
                  <ThemedText type="labelMd" style={styles.fieldLabel}>TO</ThemedText>
                  {destLocked ? (
                    <View style={styles.lockedRow}>
                      <ThemedText type="bodyLg" style={styles.lockedText} numberOfLines={1}>{destination}</ThemedText>
                      <View style={styles.durationGroup}>
                        <TouchableOpacity style={styles.durationBtn} onPress={() => setDestinationDuration(Math.max(10, Math.min(480, destinationDuration - 15)))} activeOpacity={0.6}>
                          <IconSymbol name="minus" size={14} color="#0D9488" />
                        </TouchableOpacity>
                        {editingDuration === '__dest__' ? (
                          <TextInput
                            style={styles.durationInput}
                            value={durationInputs['__dest__'] || ''}
                            onChangeText={(v) => setDurationInputs(prev => ({ ...prev, '__dest__': v }))}
                            onBlur={() => commitDurationEdit('__dest__')}
                            onSubmitEditing={() => commitDurationEdit('__dest__')}
                            allowFontScaling={false}
                            autoFocus
                            selectTextOnFocus
                            keyboardType="default"
                          />
                        ) : (
                          <TouchableOpacity style={styles.durationCapsule} onPress={() => startDurationEdit('__dest__', destinationDuration)} activeOpacity={0.7}>
                            <IconSymbol name="clock.fill" size={13} color="#0D9488" />
                            <ThemedText type="titleMd" style={styles.durationLabel}>{formatDuration(destinationDuration)}</ThemedText>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.durationBtn} onPress={() => setDestinationDuration(Math.max(10, Math.min(480, destinationDuration + 15)))} activeOpacity={0.6}>
                          <IconSymbol name="plus" size={14} color="#0D9488" />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity style={styles.removeStopBtn} onPress={() => { setDestLocked(false); setDestination(''); }}>
                        <IconSymbol name="xmark.circle.fill" size={14} color="#DC2626" />
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
                      onChangeText={handleDestChange}
                      autoCorrect={false}
                    />
                  )}
                </View>
              </View>
            </View>
            {showDestDrop && renderDropdown(destResults, searchingDest, pickDest)}

            <View style={styles.stepConnector}>
              <View style={styles.stepLine} />
              <View style={[styles.stepDot, { backgroundColor: '#DC2626' }]} />
              <View style={styles.stepLine} />
            </View>
          </View>

          {/* Route Name Card */}
          <View style={styles.nameCard}>
            <View style={styles.nameCardHeader}>
              <View style={[styles.nameCardIcon, { backgroundColor: '#0D948812' }]}>
                <IconSymbol name="signature" size={15} color="#0D9488" />
              </View>
              <ThemedText type="titleMd" style={styles.nameCardTitle}>Route Name</ThemedText>
            </View>
            <TextInput
              style={styles.nameInput}
              placeholder="e.g. Saharanpur to Delhi Highway"
              placeholderTextColor="#A8A29E"
              allowFontScaling={false}
              value={routeName}
              onChangeText={setRouteName}
              autoCorrect={false}
            />
          </View>

          {/* Route Preview */}
          {originLocked && destLocked && stops.filter(s => s.locked).length === stops.length && stops.length > 0 && (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <IconSymbol name="map.fill" size={13} color="#0D9488" />
                <ThemedText type="labelMd" style={styles.previewHeaderText}>Route Preview</ThemedText>
              </View>
              <View style={styles.previewChain}>
                <View style={styles.previewItem}>
                  <View style={[styles.previewDot, { backgroundColor: '#0D9488' }]} />
                  <ThemedText type="bodySm" style={styles.previewCity}>{origin}</ThemedText>
                  <View style={[styles.previewTag, { backgroundColor: '#0D948812' }]}>
                    <ThemedText type="labelMd" style={[styles.previewTagText, { color: '#0D9488' }]}>Start</ThemedText>
                  </View>
                  <ThemedText type="labelMd" style={styles.previewTime}>0h</ThemedText>
                </View>
                {stops.map((stop, idx) => {
                  const cumTime = stops.slice(0, idx + 1).reduce((sum, s) => sum + s.durationMinutes, 0);
                  return (
                    <View key={stop.id} style={styles.previewItem}>
                      <View style={styles.previewLine} />
                      <View style={[styles.previewDotSmall, { backgroundColor: '#D6D3D1' }]} />
                      <ThemedText type="bodySm" style={[styles.previewCity, { color: '#78716C' }]}>{stop.name}</ThemedText>
                      <View style={[styles.previewTag, { backgroundColor: '#F5F5F4' }]}>
                        <ThemedText type="labelMd" style={[styles.previewTagText, { color: '#A8A29E' }]}>Stop {idx + 1}</ThemedText>
                      </View>
                      <ThemedText type="labelMd" style={styles.previewTime}>{formatDuration(cumTime)}</ThemedText>
                    </View>
                  );
                })}
                <View style={styles.previewItem}>
                  <View style={styles.previewLine} />
                  <View style={[styles.previewDotSmall, { backgroundColor: '#FCA5A5' }]} />
                  <ThemedText type="bodySm" style={[styles.previewCity, { color: '#B91C1C' }]}>{destination}</ThemedText>
                  <View style={[styles.previewTag, { backgroundColor: '#FEF2F2' }]}>
                    <ThemedText type="labelMd" style={[styles.previewTagText, { color: '#DC2626' }]}>End</ThemedText>
                  </View>
                  <ThemedText type="labelMd" style={styles.previewTime}>
                    {formatDuration(stops.reduce((sum, s) => sum + s.durationMinutes, 0) + destinationDuration)}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.previewFooter}>
                <IconSymbol name="mappin.and.ellipse" size={12} color="#A8A29E" />
                <ThemedText type="labelMd" style={styles.previewFooterText}>
                  {stops.reduce((sum, s) => sum + s.durationMinutes, 0) + destinationDuration} min total
                </ThemedText>
              </View>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={canSubmit && !loading ? ['#14B8A6', '#0D9488'] : ['#E7E5E4', '#D6D3D1']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.submitGrad}
            >
              {loading ? (
                <IconSymbol name="circle.dotted" size={18} color="#fff" />
              ) : (
                <>
                  <IconSymbol name="checkmark.circle.fill" size={18} color={canSubmit ? '#fff' : '#A8A29E'} />
                  <ThemedText type="titleMd" style={[styles.submitLabel, { color: canSubmit ? '#fff' : '#A8A29E' }]}>{editingId ? 'Update Route' : 'Create Route'}</ThemedText>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>
      </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  flex: { flex: 1 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingBottom: 20, paddingHorizontal: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerInner: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 40 },

  errorBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { color: '#DC2626', flex: 1, fontSize: 13 },

  infoCard: { flexDirection: 'row', backgroundColor: '#F0FDFA', borderRadius: 20, padding: 16, marginBottom: 16, gap: 14, borderWidth: 1, borderColor: '#CCFBF1' },
  infoIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  infoContent: { flex: 1 },
  infoTitle: { color: '#0D9488', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  infoDesc: { color: '#115E59', fontSize: 12, lineHeight: 18, fontWeight: '500' },

  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 14, ...Shadows.md, borderWidth: 1, borderColor: '#F0EFEE' },

  fieldBlock: {},
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  fieldDot: { width: 12, height: 12, borderRadius: 6, marginTop: 2, alignSelf: 'flex-start' },
  fieldContent: { flex: 1 },
  fieldLabel: { color: '#A8A29E', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  fieldInput: { color: '#1C1917', fontSize: 17, fontWeight: '600', paddingVertical: 4, paddingHorizontal: 0, height: 34 },
  lockedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 34 },
  lockedText: { color: '#1C1917', fontSize: 17, fontWeight: '700', flex: 1 },
  durationGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  durationBtn: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CCFBF1' },
  durationCapsule: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0FDFA', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#CCFBF1' },
  durationLabel: { color: '#0D9488', fontSize: 12, fontWeight: '800' },
  durationInput: { backgroundColor: '#F0FDFA', borderRadius: 10, borderWidth: 1, borderColor: '#0D9488', paddingHorizontal: 8, paddingVertical: 4, color: '#0D9488', fontSize: 13, fontWeight: '700', width: 80, textAlign: 'center' },
  removeStopBtn: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FECACA' },

  stepConnector: { flexDirection: 'row', alignItems: 'center', marginVertical: 2, gap: 8, marginLeft: 5 },
  stepLine: { flex: 1, height: 1.5, backgroundColor: '#E7E5E4' },
  stepDot: { width: 8, height: 8, borderRadius: 4 },

  addStopBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4, paddingVertical: 8, paddingHorizontal: 4 },
  addStopIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CCFBF1' },
  addStopText: { color: '#0D9488', fontSize: 15, fontWeight: '700' },

  dropdownInline: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F0EFEE', maxHeight: 300, ...Shadows.lg, overflow: 'hidden' },
  dropdownScroll: { maxHeight: 300 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F4' },
  dropdownItemContent: { flex: 1 },
  dropdownIcon: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#0D948812', alignItems: 'center', justifyContent: 'center' },
  dropdownText: { color: '#1C1917', fontSize: 15, fontWeight: '600' },
  dropdownState: { color: '#A8A29E', fontSize: 11, fontWeight: '500', marginTop: 1 },

  searchingContainer: { paddingVertical: 28, alignItems: 'center', gap: 10 },
  searchingIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0D948812', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  searchingRing: { position: 'absolute', width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#0D9488' },
  searchingTextRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  searchingText: { color: '#1C1917', fontSize: 14, fontWeight: '600' },
  searchingDots: { flexDirection: 'row', gap: 3 },
  searchingDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#0D9488' },

  nameCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 14, ...Shadows.sm, borderWidth: 1, borderColor: '#F0EFEE' },
  nameCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  nameCardIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  nameCardTitle: { color: '#1C1917', fontWeight: '700', fontSize: 16 },
  nameInput: { backgroundColor: '#F5F5F0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, color: '#1C1917', fontSize: 16, fontWeight: '600' },

  previewCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#F0EFEE', ...Shadows.sm },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  previewHeaderText: { color: '#0D9488', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  previewChain: { gap: 0, paddingLeft: 4 },
  previewItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 0, paddingVertical: 4 },
  previewDot: { width: 10, height: 10, borderRadius: 5 },
  previewDotSmall: { width: 6, height: 6, borderRadius: 3, marginLeft: 2 },
  previewLine: { width: 2, height: 20, backgroundColor: '#E7E5E4' },
  previewCity: { color: '#1C1917', fontSize: 13, fontWeight: '600', flex: 1 },
  previewTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  previewTagText: { fontSize: 9, fontWeight: '700' },
  previewTime: { color: '#0D9488', fontSize: 10, fontWeight: '700', minWidth: 44, textAlign: 'right' },
  previewFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0EFEE' },
  previewFooterText: { color: '#A8A29E', fontSize: 10, fontWeight: '600' },

  submitBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4, ...Shadows.lg, shadowColor: '#0D9488' },
  submitGrad: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitLabel: { fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },

  spacer: { height: 60 },
});
