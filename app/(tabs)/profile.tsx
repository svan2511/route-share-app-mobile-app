import React, { useState, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { ConfirmModal } from '@/components/confirm-modal';
import { useToast } from '@/components/toast';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const toast = useToast();

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

  const infoRows = [
    { label: 'Phone', value: user?.phone, icon: 'phone.fill' },
    { label: 'Business Type', value: user?.market_type || '—', icon: 'truck.box.fill' },
    { label: 'City', value: user?.city || '—', icon: 'mappin.and.ellipse' },
    { label: 'Address', value: user?.address || '—', icon: 'mappin.and.ellipse' },
  ];

  return (
    <ThemedView style={styles.container}>
      <LinearGradient colors={['#0F766E', '#14B8A6', '#5EEAD4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
        <View style={styles.header}>
          <ThemedText type="headlineLgMobile" style={styles.logo}>My Account</ThemedText>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.profileTop}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatarInner}>
              <ThemedText style={styles.avatarText}>{getInitial(user?.business_name || user?.full_name || 'U')}</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.userName}>{user?.business_name || user?.full_name || 'User'}</ThemedText>
          <ThemedText style={styles.userMeta}>{user?.city}{user?.city && user?.market_type ? ' • ' : ''}{user?.market_type}</ThemedText>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNum}>{user?.loads_count || 0}</ThemedText>
            <ThemedText style={styles.statLabel}>Loads Posted</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statNum}>{user?.business_name ? '1' : '0'}</ThemedText>
            <ThemedText style={styles.statLabel}>Business</ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Business Information</ThemedText>
          <View style={styles.infoCard}>
            {infoRows.map((row, idx) => (
              <View key={row.label} style={[styles.infoRow, idx < infoRows.length - 1 && styles.infoRowBorder]}>
                <View style={styles.infoIconWrap}>
                  <IconSymbol name={row.icon as any} size={15} color="#0D9488" />
                </View>
                <View style={styles.infoTextWrap}>
                  <ThemedText style={styles.infoLabel}>{row.label}</ThemedText>
                  <ThemedText style={styles.infoValue}>{row.value}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.editProfileBtn} onPress={() => router.push('/business-details')} activeOpacity={0.85}>
          <LinearGradient colors={['#0F766E', '#14B8A6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.editProfileGradient}>
            <IconSymbol name="pencil" size={16} color="#fff" />
            <ThemedText style={styles.editProfileText}>Update Profile</ThemedText>
          </LinearGradient>
        </TouchableOpacity>

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

  headerGradient: { paddingTop: 52, paddingBottom: 36, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { color: '#fff', fontSize: 20, fontWeight: '800' },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  profileTop: { alignItems: 'center', marginTop: 16 },
  avatarOuter: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarInner: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#0F766E' },
  userName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 12 },
  userMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 2 },

  scrollContent: { paddingBottom: 40, paddingHorizontal: 20 },

  statsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, marginTop: -12, shadowColor: '#0F766E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: '#1C1917' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#A8A29E', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  statDivider: { width: 1, height: 28, backgroundColor: '#E7E5E4', alignSelf: 'center' },

  section: { marginTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#78716C', marginBottom: 10, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  infoCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#0F766E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F4' },
  infoIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F0FDFA', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoTextWrap: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#A8A29E', fontWeight: '600' },
  infoValue: { fontSize: 15, color: '#1C1917', fontWeight: '600', marginTop: 1 },

  editProfileBtn: { marginTop: 20, borderRadius: 14, overflow: 'hidden' },
  editProfileGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  editProfileText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, height: 52, borderRadius: 14, backgroundColor: '#FEF2F2', gap: 8 },
  logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
});
