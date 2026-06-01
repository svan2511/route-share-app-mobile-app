import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ActivityIndicator, StatusBar, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const refs = useRef<(TextInput | null)[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [step]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleSendOtp = async () => {
    if (phone.length < 10) return;
    setLoading(true);
    setError('');
    try {
      await sendOtp(phone);
      setStep('otp');
      setResendTimer(30);
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      await sendOtp(phone);
      setResendTimer(30);
      setOtp(['', '', '', '']);
      refs.current[0]?.focus();
    } catch (e: any) {
      setError(e.message || 'Failed to resend OTP');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const otpStr = otp.join('');
      const loggedInUser = await verifyOtp(phone, otpStr);
      if (!loggedInUser.business_name) {
        router.replace('/business-details');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      setError(e.message || 'Invalid OTP');
      shake();
      setOtp(['', '', '', '']);
      refs.current[0]?.focus();
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
          
          <ThemedText type="subtitle" style={styles.header}>
            {step === 'phone' ? 'Welcome Back' : 'Enter Verification Code'}
          </ThemedText>
          <ThemedText style={styles.subHeader}>
            {step === 'phone' ? 'Enter mobile number' : `Code sent to +91 ${phone}`}
          </ThemedText>

          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
          
          {step === 'phone' ? (
            <View style={styles.form}>
              <View style={styles.phoneInputContainer}>
                <ThemedText style={styles.countryCode}>+91</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Mobile Number"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  maxLength={10}
                />
              </View>
              <TouchableOpacity 
                style={[styles.button, phone.length < 10 && styles.buttonDisabled]} 
                onPress={handleSendOtp} 
                disabled={loading || phone.length < 10}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Continue</ThemedText>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.otpContainer}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={r => refs.current[i] = r}
                    style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(t) => {
                      const next = [...otp]; next[i] = t; setOtp(next);
                      if (t && i < 3) refs.current[i + 1]?.focus();
                    }}
                  />
                ))}
              </View>
              <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Verify</ThemedText>}
              </TouchableOpacity>
              <View style={styles.resendRow}>
                {resendTimer > 0 ? (
                  <ThemedText style={styles.resendTimer}>Resend in {resendTimer}s</ThemedText>
                ) : (
                  <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                    <ThemedText style={styles.resendText}>Resend OTP</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 4 },
  logo: { width: 80, height: 80, alignSelf: 'center', marginBottom: 24, borderRadius: 20 },
  header: { fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subHeader: { fontSize: 14, color: '#666', marginBottom: 24, textAlign: 'center' },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 16, fontSize: 14 },
  form: { gap: 16 },
  phoneInputContainer: { flexDirection: 'row', alignItems: 'center', height: 50, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#EEE', paddingHorizontal: 16 },
  countryCode: { fontSize: 16, fontWeight: '600', marginRight: 10, color: '#333' },
  input: { flex: 1, fontSize: 16 },
  button: { height: 50, backgroundColor: '#000', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#CCC' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  otpInput: { width: 55, height: 55, backgroundColor: '#F9FAFB', borderRadius: 12, textAlign: 'center', fontSize: 20, fontWeight: '700', borderWidth: 1, borderColor: '#EEE' },
  otpInputFilled: { borderColor: '#000' },
  resendRow: { alignItems: 'center', marginTop: 4 },
  resendTimer: { fontSize: 14, color: '#A8A29E' },
  resendText: { fontSize: 14, color: '#0D9488', fontWeight: '600' },
});
