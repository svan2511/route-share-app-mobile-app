import React, { useState, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TrustBadge } from '@/components/trust-badge';
import { Shadows, BorderRadii } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ConfirmModal } from '@/components/confirm-modal';
import { useToast } from '@/components/toast';
import { profileApi } from '@/services/profile';

const { width } = Dimensions.get('window');

function formatMemberSince(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const toast = useToast();

  useFocusEffect(
    useCallback(() => { refreshProfile(); }, [])
  );

  const refreshProfile = async () => {
    try {
      const res = await profileApi.get();
      if (res?.data) updateUser(res.data);
    } catch {}
  };

  const handleLogout = () => setShowLogout(true);

  const confirmLogout = async () => {
    setShowLogout(false);
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } catch {
      toast.show({ message: 'Failed to sign out. Please try again.', type: 'error' });
    } finally {
      setLoggingOut(false);
    }
  };

  const getInitial = (name: string) => name?.charAt(0)?.toUpperCase() || '?';

  const loadsCount = user?.loads_count || 0;
  const businessStatus = loadsCount > 0 ? 'active_business' : 'new_business';
  const memberSince = formatMemberSince(user?.created_at || '');

  const infoRows = [
    { label: 'Owner Name', value: user?.full_name || '—', icon: 'person.fill' },
    { label: 'Phone', value: user?.phone, icon: 'phone.fill' },
    { label: 'Business Type', value: user?.market_type || '—', icon: 'truck.box.fill' },
    { label: 'City', value: user?.city || '—', icon: 'mappin.and.ellipse' },
    { label: 'Address', value: user?.address || '—', icon: 'mappin.and.ellipse' },
  ];

  return (
    <ThemedView style={styles.container}>
      {/* Decorative background circles */}
      <View style={styles.bgDecor}>
        <View style={[styles.bgCircle, { top: -60, right: -80, width: 200, height: 200, backgroundColor: '#0D9488', opacity: 0.06 }]} />
        <View style={[styles.bgCircle, { top: 160, left: -60, width: 140, height: 140, backgroundColor: '#5EEAD4', opacity: 0.05 }]} />
        <View style={[styles.bgCircle, { bottom: 120, right: -40, width: 100, height: 100, backgroundColor: '#0F766E', opacity: 0.04 }]} />
      </View>

      {/* Header */}
      <LinearGradient
        colors={['#0F766E', '#14B8A6', '#5EEAD4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.header}>
          <ThemedText type="headlineLgMobile" style={styles.logo}>My Account</ThemedText>
          <TouchableOpacity onPress={() => router.push('/business-details')} style={styles.editBtn}>
            <IconSymbol name="pencil" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.profileTop}>
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarOuter}
          >
            <View style={styles.avatarInner}>
              <ThemedText style={styles.avatarText}>
                {getInitial(user?.business_name || user?.full_name || 'U')}
              </ThemedText>
            </View>
          </LinearGradient>
          <ThemedText style={styles.userName}>{user?.business_name || user?.full_name || 'User'}</ThemedText>
          <ThemedText style={styles.userMeta}>
            {user?.city}{user?.city && user?.market_type ? ' • ' : ''}{user?.market_type}
          </ThemedText>
          <View style={styles.trustBadges}>
            <TrustBadge type="phone_verified" size="sm" />
            <TrustBadge type={businessStatus} size="sm" />
            {memberSince !== '—' && (
              <TrustBadge type="member_since" value={memberSince} size="sm" />
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Stats card with glass effect */}
        <View style={styles.statsCard}>
          <View style={styles.statsGlow} />
          <View style={styles.statsInner}>
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <IconSymbol name="truck.box.fill" size={16} color="#0D9488" />
              </View>
              <ThemedText style={styles.statNum}>{loadsCount}</ThemedText>
              <ThemedText style={styles.statLabel}>Rides Posted</ThemedText>
            </View>
            <View style={styles.statVerticalDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIconWrap, { backgroundColor: loadsCount > 0 ? '#F0FDFA' : '#FEF3C7' }]}>
                <IconSymbol name={loadsCount > 0 ? 'bolt.fill' : 'star.fill'} size={16} color={loadsCount > 0 ? '#0D9488' : '#D97706'} />
              </View>
              <ThemedText style={styles.statNum}>{loadsCount > 0 ? 'Active' : 'New'}</ThemedText>
              <ThemedText style={styles.statLabel}>Business Status</ThemedText>
            </View>
          </View>
        </View>

        {/* Business Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <IconSymbol name="building.2.fill" size={14} color="#0D9488" />
            </View>
            <ThemedText style={styles.sectionTitle}>Business Information</ThemedText>
          </View>
          <View style={styles.infoCard}>
            {infoRows.map((row, idx) => (
              <View key={row.label} style={[styles.infoRow, idx < infoRows.length - 1 && styles.infoRowBorder]}>
                <View style={styles.infoIconWrap}>
                  <IconSymbol name={row.icon as any} size={14} color="#0D9488" />
                </View>
                <View style={styles.infoTextWrap}>
                  <ThemedText style={styles.infoLabel}>{row.label}</ThemedText>
                  <ThemedText style={styles.infoValue}>{row.value}</ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={12} color="#E7E5E4" />
              </View>
            ))}
          </View>
        </View>

        {/* Trust & Verification */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <IconSymbol name="shield.fill" size={14} color="#0D9488" />
            </View>
            <ThemedText style={styles.sectionTitle}>Trust & Verification</ThemedText>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.trustRow}>
              <LinearGradient
                colors={['#05966920', '#05966908']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.trustIconWrap}
              >
                <IconSymbol name="checkmark.seal.fill" size={16} color="#059669" />
              </LinearGradient>
              <View style={styles.trustTextWrap}>
                <ThemedText style={styles.trustLabel}>Phone Number</ThemedText>
                <ThemedText style={styles.trustValue}>Verified via OTP</ThemedText>
              </View>
              <View style={styles.trustCheckWrap}>
                <IconSymbol name="checkmark.circle.fill" size={18} color="#059669" />
              </View>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustRow}>
              <LinearGradient
                colors={loadsCount > 0 ? ['#0D948820', '#0D948808'] : ['#D9770620', '#D9770608']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.trustIconWrap}
              >
                <IconSymbol name={loadsCount > 0 ? 'bolt.fill' : 'star.fill'} size={16} color={loadsCount > 0 ? '#0D9488' : '#D97706'} />
              </LinearGradient>
              <View style={styles.trustTextWrap}>
                <ThemedText style={styles.trustLabel}>Business Status</ThemedText>
                <ThemedText style={styles.trustValue}>
                  {loadsCount > 0
                    ? `Active — ${loadsCount} ride${loadsCount > 1 ? 's' : ''} posted`
                    : 'New — post your first ride to become active'}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={loggingOut}>
          {loggingOut ? (
            <ActivityIndicator color="#DC2626" size="small" />
          ) : (
            <>
              <IconSymbol name="rectangle.portrait.and.arrow.right" size={18} color="#DC2626" />
              <ThemedText style={styles.logoutText}>Sign Out</ThemedText>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <ConfirmModal
        visible={showLogout}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out"
        confirmDestructive
        onConfirm={confirmLogout}
        onCancel={() => setShowLogout(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  bgDecor: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  bgCircle: { position: 'absolute', borderRadius: 999 },

  headerGradient: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: 'relative',
    zIndex: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { color: '#fff', fontSize: 20, fontWeight: '800' },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  profileTop: { alignItems: 'center', marginTop: 16 },
  avatarOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 16,
  },
  avatarInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#0F766E' },
  userName: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 0 },
  userMeta: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 4 },
  trustBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  scrollContent: { paddingBottom: 40, paddingHorizontal: 20 },

  /* Stats card with glass-like premium look */
  statsCard: {
    marginTop: -20,
    marginBottom: 4,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0EFEE',
    ...Shadows.md,
    shadowColor: '#0F766E',
    overflow: 'hidden',
  },
  statsGlow: {
    position: 'absolute',
    top: 0,
    left: '25%',
    width: '50%',
    height: 3,
    backgroundColor: '#14B8A6',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  statsInner: { flexDirection: 'row', paddingVertical: 20 },
  statItem: { flex: 1, alignItems: 'center', gap: 6 },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statNum: { fontSize: 22, fontWeight: '800', color: '#1C1917' },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A8A29E',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statVerticalDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#F0EFEE',
    alignSelf: 'center',
  },

  /* Sections */
  section: { marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginLeft: 2,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#44403C',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  /* Info card */
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0EFEE',
    ...Shadows.sm,
    shadowColor: '#0F766E',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F4' },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextWrap: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#A8A29E', fontWeight: '600', letterSpacing: 0.3 },
  infoValue: { fontSize: 15, color: '#1C1917', fontWeight: '600', marginTop: 2 },

  /* Trust rows */
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  trustIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trustTextWrap: { flex: 1 },
  trustLabel: { fontSize: 11, color: '#A8A29E', fontWeight: '600', letterSpacing: 0.3 },
  trustValue: { fontSize: 14, color: '#1C1917', fontWeight: '600', marginTop: 2 },
  trustCheckWrap: { marginLeft: 8 },
  trustDivider: { height: 1, backgroundColor: '#F5F5F4', marginHorizontal: 16 },

  /* Actions */
  editProfileBtn: { marginTop: 24, borderRadius: 16, overflow: 'hidden', ...Shadows.md, shadowColor: '#0D9488' },
  editProfileGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  editProfileText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
});