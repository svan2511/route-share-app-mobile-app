import React, { useEffect } from 'react';
import { StyleSheet, Image, View, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';

const { width } = Dimensions.get('window');

export default function SplashScreen2() {
  const router = useRouter();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const logoScale = React.useRef(new Animated.Value(0.9)).current;

  const primaryColor = useThemeColor({}, 'primary');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['#14B8A6', '#0D9488', '#134E4A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <View style={[styles.logoContainer, { backgroundColor: primaryColor }]}>
          <View style={styles.truckIconsContainer}>
            <IconSymbol name="truck.box.fill" size={30} color="#fff" style={{ position: 'absolute', top: 5, left: 5 }} />
            <IconSymbol name="truck.box.fill" size={30} color="#fff" style={{ position: 'absolute', bottom: 5, right: 5 }} />
            <IconSymbol name="truck.box.fill" size={30} color="#fff" style={{ position: 'absolute', transform: [{ translateX: -15 }, { translateY: -15 }] }} />
          </View>
        </View>

        <ThemedText type="displayLg" style={styles.title}>RouteShare</ThemedText>
        <ThemedText type="labelMd" style={styles.subtitle}>Efficiency through Connectivity</ThemedText>
      </Animated.View>

      <View style={styles.footer}>
        <LinearGradient
          colors={[primaryColor, '#134E4A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bar}
        />
        <ThemedText type="labelMd" style={styles.footerText}>SECURE LOGISTICS NETWORK</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50, // Making it a perfect circle
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    overflow: 'hidden', // Ensure icons stay within the circle
  },
  truckIconsContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 60,
    height: 60,
  },
  title: {
    color: '#fff',
    marginBottom: 8,
    fontWeight: '900',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  bar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
  },
});
