import React, { useState, useRef } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, StatusBar, ScrollView, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { profileApi } from '@/services/profile';

const inputFields = [
  { key: 'name', label: 'Business Name', icon: 'shippingbox.fill' as const, placeholder: 'Your business name' },
  { key: 'city', label: 'City', icon: 'mappin.and.ellipse' as const, placeholder: 'Your city' },
  { key: 'type', label: 'Business Type', icon: 'truck.box.fill' as const, placeholder: 'e.g. Grocery, Logistics' },
] as const;

const totalFields = inputFields.length + 1; // +1 for address

export default function BusinessDetailsScreen() {
  const router = useRouter();
  const { updateUser, user } = useAuth();
  const [details, setDetails] = useState({ name: user?.business_name || '', city: user?.city || '', type: user?.market_type || '', address: user?.address || '' });
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(Array.from({ length: totalFields }, () => new Animated.Value(0))).current;

  React.useEffect(() => {
    Animated.stagger(120, fadeAnim.map(a =>
      Animated.timing(a, { toValue: 1, duration: 400, useNativeDriver: true })
    )).start();
  }, []);

  const setDetail = (key: string, value: string) => setDetails(prev => ({ ...prev, [key]: value }));

  const canSubmit = details.name.trim() && details.city.trim() && details.type.trim();

  const handleSave = async () => {
    if (!canSubmit) return;
    setLoading(true);
    if (user) {
      try {
        const response = await profileApi.update({
          business_name: details.name,
          city: details.city,
          market_type: details.type,
          address: details.address || undefined,
        });
        updateUser(response.data);
      } catch {
        updateUser({ ...user, business_name: details.name, city: details.city, market_type: details.type, address: details.address });
      }
    }
    setLoading(false);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <LinearGradient colors={['#0F766E', '#14B8A6', '#5EEAD4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.avatarCircle}>
                <IconSymbol name="shippingbox.fill" size={32} color="#fff" />
              </View>
              <ThemedText type="headlineLgMobile" style={styles.headerTitle}>{user?.business_name ? 'Edit Business' : 'Set Up Your Business'}</ThemedText>
              <ThemedText style={styles.headerSub}>{user?.business_name ? 'Update your business details' : 'Complete your profile to start using LoadApp'}</ThemedText>
            </View>
          </LinearGradient>

          {/* Form */}
          <View style={styles.formSection}>
            <View style={styles.formCard}>
              {inputFields.map((field, idx) => (
                <Animated.View key={field.key} style={[styles.fieldWrap, { opacity: fadeAnim[idx], transform: [{ translateY: fadeAnim[idx].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                  <ThemedText style={styles.fieldLabel}>{field.label}</ThemedText>
                  <View style={[styles.inputContainer, details[field.key as keyof typeof details] ? styles.inputContainerActive : null]}>
                    <IconSymbol name={field.icon} size={16} color={details[field.key as keyof typeof details] ? '#0D9488' : '#A8A29E'} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={field.placeholder}
                      placeholderTextColor="#A8A29E"
                      value={details[field.key as keyof typeof details]}
                      onChangeText={(t) => setDetail(field.key, t)}
                    />
                  </View>
                </Animated.View>
              ))}

              <Animated.View style={[styles.fieldWrap, { marginBottom: 8, opacity: fadeAnim[inputFields.length], transform: [{ translateY: fadeAnim[inputFields.length].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                <ThemedText style={styles.fieldLabel}>Address</ThemedText>
                <View style={[styles.inputContainer, styles.inputMultiline, details.address ? styles.inputContainerActive : null]}>
                  <IconSymbol name="mappin.and.ellipse" size={16} color={details.address ? '#0D9488' : '#A8A29E'} style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 14 }]} />
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder="Street, area, pincode..."
                    placeholderTextColor="#A8A29E"
                    value={details.address}
                    onChangeText={(t) => setDetail('address', t)}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </Animated.View>

              <TouchableOpacity
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                onPress={handleSave}
                disabled={loading || !canSubmit}
                activeOpacity={0.85}
              >
                <LinearGradient colors={canSubmit ? ['#0F766E', '#14B8A6'] : ['#D4D4D4', '#D4D4D4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGradient}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={styles.submitInner}>
                      <ThemedText style={styles.submitText}>{user?.business_name ? 'Update Profile' : 'Complete Profile'}</ThemedText>
                      <IconSymbol name="arrow.right" size={18} color="#fff" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.footerNote}>You can update these details later from your profile.</ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },

  header: { paddingTop: 40, paddingBottom: 48, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerContent: { alignItems: 'center' },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center' },

  formSection: { paddingHorizontal: 20, marginTop: -24 },
  formCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#0F766E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 6 },
  fieldWrap: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#44403C', marginBottom: 8, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', height: 52, backgroundColor: '#FAFAF9', borderRadius: 14, borderWidth: 1.5, borderColor: '#E7E5E4', paddingHorizontal: 14 },
  inputContainerActive: { borderColor: '#14B8A6', backgroundColor: '#F0FDFA' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#1C1917' },
  inputMultiline: { minHeight: 88, alignItems: 'flex-start', paddingTop: 14 },
  textarea: { minHeight: 60, paddingTop: 0 },

  submitBtn: { marginTop: 45, borderRadius: 14, overflow: 'hidden' },
  submitBtnDisabled: { opacity: 0.7 },
  submitGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  footerNote: { textAlign: 'center', color: '#A8A29E', fontSize: 12, marginTop: 16 },
});
