import React, { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Shadows } from '@/constants/theme';

type ToastType = 'success' | 'error' | 'info';

interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  show: (config: ToastConfig) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primaryColor = useThemeColor({}, 'primary');

  const hide = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setToast(null));
  }, [slideAnim]);

  const show = useCallback((config: ToastConfig) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(config);
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 200,
    }).start();
    timerRef.current = setTimeout(hide, config.duration || 3000);
  }, [slideAnim, hide]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  const iconColor = toast?.type === 'error' ? '#DC2626' : toast?.type === 'success' ? '#059669' : primaryColor;
  const borderColor = toast?.type === 'error' ? '#FECACA' : toast?.type === 'success' ? '#A7F3D0' : primaryColor + '30';
  const iconName = toast?.type === 'error' ? 'xmark.circle.fill' : toast?.type === 'success' ? 'checkmark.circle.fill' : 'info.circle.fill';

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View style={[styles.toast, { borderColor, transform: [{ translateY }] }]}>
          <IconSymbol name={iconName} size={18} color={iconColor} />
          <Text style={styles.toastText} numberOfLines={2}>{toast.message}</Text>
          <TouchableOpacity onPress={hide} style={styles.toastClose}>
            <IconSymbol name="xmark" size={14} color="#A8A29E" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    ...Shadows.lg,
    shadowColor: '#000',
    elevation: 10,
    maxWidth: width - 32,
  },
  toastText: {
    flex: 1,
    color: '#1C1917',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  toastClose: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
