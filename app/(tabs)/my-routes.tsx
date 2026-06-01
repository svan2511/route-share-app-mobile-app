import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { AppLoader } from '@/components/app-loader';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Shadows } from '@/constants/theme';
import { routesApi, type Route } from '@/services/routes';
import { ConfirmModal } from '@/components/confirm-modal';

export default function MyRoutesScreen() {
  const router = useRouter();
  const primaryColor = useThemeColor({}, 'primary');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Route | null>(null);

  const fetchRoutes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await routesApi.myRoutes();
      setRoutes(res.data);
    } catch {
      if (!silent) setRoutes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchRoutes(); }, [fetchRoutes]));

  const handleDelete = (route: Route) => {
    setDeleteTarget(route);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await routesApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRoutes();
    } catch {}
  };

  return (
    <ThemedView style={styles.container}>
      <LinearGradient colors={['#14B8A6', '#0D9488']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <IconSymbol name="map.fill" size={18} color="#fff" />
            </View>
            <View>
              <ThemedText type="headlineLgMobile" style={styles.headerTitle}>My Routes</ThemedText>
              <ThemedText type="bodySm" style={styles.headerSub}>Manage your regular routes</ThemedText>
            </View>
          </View>
          <TouchableOpacity style={styles.headerAddBtn} onPress={() => router.push('/create-route')} activeOpacity={0.7}>
            <IconSymbol name="plus" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <AppLoader visible={loading} message="Loading routes..." />

      {routes.length === 0 ? (
        <View style={styles.centerState}>
          <View style={styles.emptyIconWrap}>
            <IconSymbol name="map.fill" size={44} color="#D6D3D1" />
          </View>
          <ThemedText type="bodyLg" style={styles.emptyTitle}>No routes yet</ThemedText>
          <ThemedText type="bodySm" style={styles.emptyDesc}>
            Create your first route to start sharing rides
          </ThemedText>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={() => router.push('/create-route')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#14B8A6', '#0D9488']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyCtaGrad}>
              <IconSymbol name="plus" size={16} color="#fff" />
              <ThemedText type="titleMd" style={styles.emptyCtaText}>Create Route</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRoutes(); }} tintColor={primaryColor} colors={[primaryColor]} />}
          >
            <View style={styles.infoBanner}>
              <IconSymbol name="lightbulb.fill" size={14} color="#0D9488" />
              <ThemedText type="bodySm" style={styles.infoBannerText}>
                Add stops so other users can search along your route
              </ThemedText>
            </View>

            {routes.map(route => (
              <TouchableOpacity
                key={route.id}
                style={styles.card}
                activeOpacity={0.94}
                onPress={() => router.push(`/create-route?id=${route.id}`)}
              >
                {/* Card header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.routeBadge, { backgroundColor: primaryColor + '12' }]}>
                      <IconSymbol name="map.fill" size={10} color={primaryColor} />
                      <ThemedText type="labelMd" style={[styles.routeBadgeText, { color: primaryColor }]}>{route.route_name}</ThemedText>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(route)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <IconSymbol name="trash.fill" size={12} color="#DC2626" />
                  </TouchableOpacity>
                </View>

                {/* Visual route timeline */}
                <View style={styles.routeTimeline}>
                  <View style={styles.timelineStop}>
                    <View style={[styles.timelineDot, { backgroundColor: '#0D9488' }]} />
                    <ThemedText type="bodySm" style={styles.timelineCity}>{route.from_city}</ThemedText>
                  </View>
                  {route.stops.slice(0, 3).map((stop, idx) => (
                    <View key={stop.id} style={styles.timelineMidStop}>
                      <View style={styles.timelineMidLine} />
                      <View style={[styles.timelineMidDot, { backgroundColor: primaryColor + '30' }]} />
                      <ThemedText type="labelMd" style={styles.timelineMidCity}>{stop.stop_name}</ThemedText>
                    </View>
                  ))}
                  {route.stops.length > 3 && (
                    <View style={styles.timelineMidStop}>
                      <View style={styles.timelineMidLine} />
                      <View style={[styles.timelineMidDot, { backgroundColor: '#D6D3D1' }]}>
                        <ThemedText type="labelMd" style={styles.timelineMoreText}>+{route.stops.length - 3}</ThemedText>
                      </View>
                    </View>
                  )}
                  <View style={styles.timelineStop}>
                    <View style={[styles.timelineDot, { backgroundColor: '#DC2626' }]} />
                    <ThemedText type="bodySm" style={styles.timelineCity}>{route.to_city}</ThemedText>
                  </View>
                </View>

                {/* Footer stats */}
                <View style={styles.cardFooter}>
                  <View style={styles.footerStat}>
                    <IconSymbol name="mappin.and.ellipse" size={11} color="#A8A29E" />
                    <ThemedText type="labelMd" style={styles.footerStatText}>{route.stops.length + 2} stops</ThemedText>
                  </View>
                  <View style={styles.footerArrow}>
                    <ThemedText type="labelMd" style={styles.footerEditText}>Edit</ThemedText>
                    <IconSymbol name="chevron.right" size={12} color="#A8A29E" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push('/create-route')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#14B8A6', '#0D9488']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGrad}>
              <IconSymbol name="plus" size={22} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete Route"
        message={deleteTarget ? `Are you sure you want to delete "${deleteTarget.route_name}"?` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmDestructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },

  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 },
  headerAddBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: 16, paddingBottom: 100 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { color: '#1C1917', marginTop: 12, fontSize: 17, fontWeight: '700' },
  emptyDesc: { color: '#A8A29E', marginTop: 4, fontSize: 13, textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 },
  emptyCta: { marginTop: 24, borderRadius: 14, overflow: 'hidden', ...Shadows.md },
  emptyCtaGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14 },
  emptyCtaText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDFA', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#CCFBF1' },
  infoBannerText: { color: '#0D9488', fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 18 },

  card: { backgroundColor: '#fff', borderRadius: 24, padding: 18, marginBottom: 14, ...Shadows.md, borderWidth: 1, borderColor: '#F0EFEE' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardHeaderLeft: { flex: 1 },
  routeBadge: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  routeBadgeText: { fontSize: 10, fontWeight: '800' },
  deleteBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },

  routeTimeline: { gap: 2, marginBottom: 16 },
  timelineStop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineCity: { color: '#1C1917', fontSize: 14, fontWeight: '700' },
  timelineMidStop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4 },
  timelineMidLine: { width: 2, height: 18, backgroundColor: '#E7E5E4', marginLeft: 4 },
  timelineMidDot: { width: 8, height: 8, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  timelineMidCity: { color: '#78716C', fontSize: 12, fontWeight: '500' },
  timelineMoreText: { color: '#A8A29E', fontSize: 7, fontWeight: '800' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0EFEE' },
  footerStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerStatText: { color: '#A8A29E', fontSize: 11, fontWeight: '600' },
  footerArrow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerEditText: { color: '#A8A29E', fontSize: 11, fontWeight: '600' },

  fab: { position: 'absolute', bottom: 24, right: 20, zIndex: 10, ...Shadows.lg, shadowColor: '#0D9488', borderRadius: 28 },
  fabGrad: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
