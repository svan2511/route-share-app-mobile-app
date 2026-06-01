import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Shadows } from '@/constants/theme';
import { loadsApi, type Load } from '@/services/loads';
import { matchesApi } from '@/services/matches';
import { formatDateTime } from '@/lib/format';

const { width } = Dimensions.get('window');

interface RouteStop {
  id: number;
  stop_name: string;
  stop_order: number;
}

export default function RouteMatchScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const primaryColor = useThemeColor({}, 'primary');
  const [load, setLoad] = useState<Load | null>(null);
  const [matches, setMatches] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const loadRes = await loadsApi.show(Number(id));
      setLoad(loadRes.data);

      const matchRes = await matchesApi.find(loadRes.data.from_city, loadRes.data.to_city, Number(id));
      setMatches(matchRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load matches.');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const renderRouteStops = (stops: RouteStop[] | undefined, fromCity: string, toCity: string) => {
    const chain: { name: string; isOrigin: boolean; isDest: boolean }[] = [
      { name: fromCity, isOrigin: true, isDest: false },
      ...(stops || []).map(s => ({ name: s.stop_name, isOrigin: false, isDest: false })),
      { name: toCity, isOrigin: false, isDest: true },
    ];

    if (chain.length < 2) return null;

    return (
      <View style={styles.routeChain}>
        {chain.map((item, idx) => (
          <View key={idx} style={styles.chainItem}>
            <View style={styles.chainLeft}>
              <View style={[styles.chainDot, { backgroundColor: item.isOrigin || item.isDest ? primaryColor : primaryColor + '40' }]} />
              {idx < chain.length - 1 && <View style={[styles.chainLine, { backgroundColor: primaryColor + '20' }]} />}
            </View>
            <ThemedText
              type="bodySm"
              style={[styles.chainStop, (item.isOrigin || item.isDest) && { color: '#1C1917', fontWeight: '700' }, !item.isOrigin && !item.isDest && { color: '#A8A29E' }]}
            >
              {item.name}
              {item.isOrigin ? ' (Pickup)' : ''}
              {item.isDest ? ' (Drop)' : ''}
            </ThemedText>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <LinearGradient colors={['#14B8A6', '#0D9488']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerGradient}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <IconSymbol name="arrow.left" size={20} color="#fff" />
            </TouchableOpacity>
            <ThemedText type="headlineLgMobile" style={styles.logo}>Route Matches</ThemedText>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <LinearGradient colors={['#14B8A6', '#0D9488']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerGradient}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <IconSymbol name="arrow.left" size={20} color="#fff" />
            </TouchableOpacity>
            <ThemedText type="headlineLgMobile" style={styles.logo}>Route Matches</ThemedText>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.centerState}>
          <IconSymbol name="exclamationmark.triangle.fill" size={32} color="#DC2626" />
          <ThemedText type="bodySm" style={{ color: '#A8A29E', marginTop: 8 }}>{error}</ThemedText>
          <TouchableOpacity onPress={fetchData} style={[styles.retryBtn, { backgroundColor: primaryColor, marginTop: 16 }]}>
            <ThemedText type="labelMd" style={{ color: '#fff', fontWeight: '700' }}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="arrow.left" size={20} color="#fff" />
          </TouchableOpacity>
          <ThemedText type="headlineLgMobile" style={styles.logo}>Route Matches</ThemedText>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Your Route Section */}
        <View style={styles.yourRouteCard}>
          <View style={styles.yourRouteHeader}>
            <IconSymbol name="location.fill" size={16} color={primaryColor} />
            <ThemedText type="titleMd" style={styles.yourRouteTitle}>Aapka Route</ThemedText>
          </View>
          <ThemedText type="bodyLg" style={styles.routeCities}>
            {load?.from_city} → {load?.to_city}
          </ThemedText>
          {load?.route?.stops && (
            <View style={styles.yourStops}>
              {renderRouteStops(load.route.stops, load.from_city, load.to_city)}
            </View>
          )}
        </View>

        {matches.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="truck.box.fill" size={40} color="#D6D3D1" />
            <ThemedText type="bodyLg" style={styles.emptyTitle}>No pickups found on this route</ThemedText>
            <ThemedText type="bodySm" style={styles.emptySub}>You can post a new ride or check back later.</ThemedText>
          </View>
        ) : (
          <>
            <View style={styles.matchHeader}>
              <View style={styles.matchBadge}>
                <IconSymbol name="bolt.fill" size={12} color={primaryColor} />
                <ThemedText type="labelMd" style={[styles.matchBadgeText, { color: primaryColor }]}>
                  {matches.length} Match{matches.length > 1 ? 'es' : ''} Found
                </ThemedText>
              </View>
            </View>

            {matches.map((match) => (
              <View key={match.id} style={styles.matchCard}>
                <LinearGradient
                  colors={['#1E3A8A', '#0060AC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.matchBanner}
                >
                  <IconSymbol name="truck.box.fill" size={14} color="#fff" />
                  <ThemedText type="labelMd" style={styles.bannerText}>
                    A pickup is already heading your way!
                  </ThemedText>
                </LinearGradient>

                <View style={styles.matchBody}>
                  <View style={styles.matchSender}>
                    <View style={[styles.senderAvatar, { backgroundColor: primaryColor + '15' }]}>
                      <ThemedText type="titleMd" style={{ color: primaryColor, fontWeight: '800' }}>
                        {(match.user?.business_name || match.user?.full_name || '?').charAt(0)}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="titleMd" style={styles.senderName}>
                        {match.user?.business_name || match.user?.full_name}
                      </ThemedText>
                      <ThemedText type="bodySm" style={styles.senderRoute}>
                        {match.from_city} → {match.to_city}
                      </ThemedText>
                    </View>
                  </View>

                  {match.route?.stops && (
                    <View style={styles.matchRouteStops}>
                      <ThemedText type="labelMd" style={styles.matchStopsLabel}>Is pickup ka route:</ThemedText>
                      {renderRouteStops(match.route.stops, load?.from_city || '', load?.to_city || '')}
                    </View>
                  )}

                  <View style={styles.matchDetails}>
                    <View style={styles.detailChip}>
                      <IconSymbol name="clock.fill" size={12} color="#78716C" />
                      <ThemedText type="bodySm" style={styles.detailText}>
                        {formatDateTime(match.departure_date, match.departure_time)}
                      </ThemedText>
                    </View>
                    <View style={styles.detailChip}>
                      <IconSymbol name="truck.box.fill" size={12} color="#78716C" />
                      <ThemedText type="bodySm" style={styles.detailText}>{match.vehicle_type}</ThemedText>
                    </View>
                    <View style={styles.detailChip}>
                      <IconSymbol name="square.split.bottomrightquarter.fill" size={12} color={primaryColor} />
                      <ThemedText type="bodySm" style={[styles.detailText, { color: primaryColor, fontWeight: '700' }]}>
                        {match.available_space}% space available
                      </ThemedText>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.callBtn, { backgroundColor: primaryColor }]}
                    onPress={() => handleCall(match.phone)}
                  >
                    <IconSymbol name="phone.fill" size={16} color="#fff" />
                    <ThemedText type="labelMd" style={styles.callText}>Call Now</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={styles.tipCard}>
          <IconSymbol name="lightbulb.fill" size={16} color="#14B8A6" />
          <ThemedText type="bodySm" style={styles.tipText}>
            Tip: Aap jitne zyada stops share karenge, utni better matching hogi. Apna exact route daalein!
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF9' },
  headerGradient: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  logo: { color: '#fff', fontSize: 18, fontWeight: '800' },
  scrollContent: { padding: 20, paddingBottom: 120 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  yourRouteCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, ...Shadows.md,
    borderLeftWidth: 4, borderLeftColor: '#0D9488',
  },
  yourRouteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  yourRouteTitle: { color: '#1C1917', fontWeight: '700' },
  routeCities: { color: '#1C1917', fontWeight: '800', fontSize: 18, marginBottom: 12 },
  yourStops: { backgroundColor: '#F5F5F4', borderRadius: 16, padding: 12 },
  routeChain: { paddingLeft: 4 },
  chainItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  chainLeft: { alignItems: 'center', width: 20, marginRight: 10 },
  chainDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D6D3D1' },
  chainLine: { width: 2, flex: 1, backgroundColor: '#E7E5E4', marginTop: 2, marginBottom: 2 },
  chainStop: { color: '#78716C', paddingVertical: 6, flex: 1, fontSize: 13 },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8, backgroundColor: '#fff', borderRadius: 24, padding: 32, ...Shadows.sm },
  emptyTitle: { color: '#1C1917', fontWeight: '700', textAlign: 'center', fontSize: 16 },
  emptySub: { color: '#A8A29E', textAlign: 'center', marginTop: 4 },
  matchHeader: { marginBottom: 16 },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F3FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start' },
  matchBadgeText: { fontSize: 11, fontWeight: '800' },
  matchCard: { backgroundColor: '#fff', borderRadius: 24, marginBottom: 16, overflow: 'hidden', ...Shadows.md },
  matchBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, paddingHorizontal: 18 },
  bannerText: { color: '#fff', fontWeight: '700', fontSize: 12, flex: 1 },
  matchBody: { padding: 20 },
  matchSender: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  senderAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  senderName: { color: '#1C1917', fontWeight: '700', fontSize: 16 },
  senderRoute: { color: '#78716C', marginTop: 2 },
  matchRouteStops: { backgroundColor: '#F5F5F4', borderRadius: 16, padding: 12, marginBottom: 16 },
  matchStopsLabel: { color: '#A8A29E', fontSize: 10, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  matchDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F5F4', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  detailText: { color: '#57534E', fontSize: 12, fontWeight: '600' },
  callBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 50, borderRadius: 14, ...Shadows.md, shadowColor: '#0D9488' },
  callText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  tipCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDFA', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#5EEAD4', marginTop: 8,
  },
  tipText: { color: '#134E4A', flex: 1, fontSize: 12, lineHeight: 18 },
});
