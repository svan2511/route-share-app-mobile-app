import React, { useState, useRef } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, StatusBar, ScrollView, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TrustBadge } from '@/components/trust-badge';
import { useAuth } from '@/context/AuthContext';
import { profileApi } from '@/services/profile';
import { useToast } from '@/components/toast';

const inputFields = [
  { key: 'name', label: 'Business Name', icon: 'shippingbox.fill' as const, placeholder: 'Your business name' },
  { key: 'ownerName', label: 'Owner Name', icon: 'person.fill' as const, placeholder: 'Your full name' },
  { key: 'city', label: 'City', icon: 'mappin.and.ellipse' as const, placeholder: 'Your city' },
  { key: 'type', label: 'Business Type', icon: 'truck.box.fill' as const, placeholder: 'e.g. Grocery, Logistics' },
] as const;

const totalFields = inputFields.length + 1;

interface FieldErrors {
  name?: string;
  ownerName?: string;
  city?: string;
  type?: string;
}

export default function BusinessDetailsScreen() {
  const router = useRouter();
  const { updateUser, user } = useAuth();
  const toast = useToast();
  const [details, setDetails] = useState({
    name: user?.business_name || '',
    ownerName: user?.full_name || '',
    city: user?.city || '',
    type: user?.market_type || '',
    address: user?.address || '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const fadeAnim = useRef(Array.from({ length: totalFields }, () => new Animated.Value(0))).current;

  React.useEffect(() => {
    Animated.stagger(100, fadeAnim.map(a =>
      Animated.timing(a, { toValue: 1, duration: 350, useNativeDriver: true })
    )).start();
  }, []);

  const setDetail = (key: string, value: string) => {
    setDetails(prev => ({ ...prev, [key]: value }));
    if (errors[key as keyof FieldErrors]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};
    if (!details.name.trim()) newErrors.name = 'Business name is required';
    if (!details.ownerName.trim()) newErrors.ownerName = 'Owner name is required';
    if (!details.city.trim()) newErrors.city = 'City is required';
    if (!details.type.trim()) newErrors.type = 'Business type is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const canSubmit = details.name.trim() && details.ownerName.trim() && details.city.trim() && details.type.trim();

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    if (user) {
      const localUser = {
        ...user,
        full_name: details.ownerName,
        business_name: details.name,
        city: details.city,
        market_type: details.type,
        ...(details.address ? { address: details.address } : {}),
      };
      try {
        const response = await profileApi.update({
          full_name: details.ownerName,
          business_name: details.name,
          city: details.city,
          market_type: details.type,
          ...(details.address ? { address: details.address } : {}),
        });
        updateUser(response?.data?.business_name ? response.data : localUser);
        toast.show({ message: 'Profile saved successfully!', type: 'success' });
      } catch {
        updateUser(localUser);
        toast.show({ message: 'Saved locally — will sync when online.', type: 'info' });
      }
    }
    setLoading(false);
    router.replace('/(tabs)');
  };

  const renderField = (field: typeof inputFields[number], idx: number) => {
    const key = field.key as keyof typeof details;
    const errorKey = field.key as keyof FieldErrors;
    const hasError = !!errors[errorKey];
    return (
      <Animated.View key={field.key} style={[styles.fieldWrap, { opacity: fadeAnim[idx], transform: [{ translateY: fadeAnim[idx].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
        <ThemedText style={styles.fieldLabel}>{field.label}</ThemedText>
        <View style={[
          styles.inputContainer,
          details[key] ? styles.inputContainerActive : null,
          hasError && styles.inputContainerError,
        ]}>
          <IconSymbol name={field.icon} size={16} color={hasError ? '#DC2626' : details[key] ? '#0D9488' : '#A8A29E'} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={field.placeholder}
            placeholderTextColor="#A8A29E"
            allowFontScaling={false}
            value={details[key]}
            onChangeText={(t) => setDetail(field.key, t)}
            autoCapitalize={field.key === 'ownerName' ? 'words' : 'sentences'}
          />
        </View>
        {hasError && (
          <View style={styles.errorRow}>
            <IconSymbol name="exclamationmark.triangle.fill" size={10} color="#DC2626" />
            <ThemedText style={styles.errorText}>{errors[errorKey]}</ThemedText>
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#0F766E', '#14B8A6', '#5EEAD4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.avatarCircle}>
                <IconSymbol name="shippingbox.fill" size={32} color="#fff" />
              </View>
              <ThemedText type="headlineLgMobile" style={styles.headerTitle}>
                {user?.business_name ? 'Edit Business' : 'Set Up Your Business'}
              </ThemedText>
              <ThemedText style={styles.headerSub}>
                {user?.business_name ? 'Update your business details' : 'Complete your profile to start using LoadApp'}
              </ThemedText>
              <View style={styles.trustBadgeRow}>
                <TrustBadge type="phone_verified" size="sm" />
              </View>
            </View>
          </LinearGradient>

          <View style={styles.formSection}>
            <View style={styles.formCard}>
              <View style={styles.formCardHeader}>
                <IconSymbol name="building.2.fill" size={18} color="#0D9488" />
                <ThemedText type="titleMd" style={styles.formCardTitle}>Business Information</ThemedText>
              </View>

              {inputFields.map((field, idx) => renderField(field, idx))}

              <Animated.View style={[styles.fieldWrap, { marginBottom: 8, opacity: fadeAnim[inputFields.length], transform: [{ translateY: fadeAnim[inputFields.length].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                <ThemedText style={styles.fieldLabel}>Address</ThemedText>
                <View style={[styles.inputContainer, styles.inputMultiline, details.address ? styles.inputContainerActive : null]}>
                  <IconSymbol name="mappin.and.ellipse" size={16} color={details.address ? '#0D9488' : '#A8A29E'} style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 14 }]} />
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder="Street, area, pincode..."
                    placeholderTextColor="#A8A29E"
                    allowFontScaling={false}
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
                      <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
                      <ThemedText style={styles.submitText}>{user?.business_name ? 'Update Profile' : 'Complete Profile'}</ThemedText>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.trustNote}>
              <IconSymbol name="shield.fill" size={14} color="#0D9488" />
              <ThemedText style={styles.trustNoteText}>
                Your phone is verified. Complete your business profile to start posting rides.
              </ThemedText>
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

  header: { paddingTop: 40, paddingBottom: 40, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerContent: { alignItems: 'center' },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center' },
  trustBadgeRow: { marginTop: 12 },

  formSection: { paddingHorizontal: 20, marginTop: -24 },
  formCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#0F766E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 6 },
  formCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0EFEE' },
  formCardTitle: { color: '#1C1917', fontSize: 16, fontWeight: '700' },
  fieldWrap: { marginBottom: 22 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#44403C', marginBottom: 8, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', height: 52, backgroundColor: '#FAFAF9', borderRadius: 14, borderWidth: 1.5, borderColor: '#E7E5E4', paddingHorizontal: 14 },
  inputContainerActive: { borderColor: '#14B8A6', backgroundColor: '#F0FDFA' },
  inputContainerError: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#1C1917' },
  inputMultiline: { minHeight: 88, alignItems: 'flex-start', paddingTop: 14 },
  textarea: { minHeight: 60, paddingTop: 0 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, marginLeft: 2 },
  errorText: { fontSize: 12, color: '#DC2626', fontWeight: '500' },

  submitBtn: { marginTop: 48, borderRadius: 14, overflow: 'hidden' },
  submitBtnDisabled: { opacity: 0.7 },
  submitGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  trustNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDFA', borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: '#CCFBF1' },
  trustNoteText: { color: '#115E59', fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 18 },

  footerNote: { textAlign: 'center', color: '#A8A29E', fontSize: 12, marginTop: 16 },
});
