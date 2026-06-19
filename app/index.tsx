import React, { useEffect } from 'react';
import { Animated, Dimensions, Easing, Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

export default function SplashScreen1() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Animation Values
  const logoScale = React.useRef(new Animated.Value(0.3)).current;
  const logoOpacity = React.useRef(new Animated.Value(0)).current;
  const logoRotate = React.useRef(new Animated.Value(0)).current;
  const textOpacity = React.useRef(new Animated.Value(0)).current;
  const textTranslateY = React.useRef(new Animated.Value(20)).current;
  const backgroundScale = React.useRef(new Animated.Value(1)).current;
  const circleScale = React.useRef(new Animated.Value(0)).current;
  const circleOpacity = React.useRef(new Animated.Value(0)).current;

  const primaryColor = useThemeColor({}, 'primary');
  const backgroundColor = '#171717'; // Neutral dark - no blue tint

  useEffect(() => {
    // 1. Logo gradually grows from small to large
    Animated.delay(400).start(() => {
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 2500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 2. After logo finishes, reveal RouteShare + tagline
        Animated.parallel([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(textTranslateY, {
            toValue: 0,
            duration: 1200,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true,
          }),
        ]).start();
      });
    });

    // 3. Ripple/Circle Expansion (runs in background)
    Animated.parallel([
      Animated.timing(circleScale, {
        toValue: 4,
        duration: 3000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(circleOpacity, {
        toValue: 0.15,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();

    // 4. Subtle Background Zoom
    Animated.timing(backgroundScale, {
      toValue: 1.1,
      duration: 6000,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      if (!isLoading) {
        if (isAuthenticated) {
          if (!user?.business_name) {
            router.replace('/business-details');
          } else {
            router.replace('/(tabs)');
          }
        } else {
          router.replace('/login');
        }
      }
    }, 7000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, user]);

  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '0deg'],
  });

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <StatusBar style="light" />
      
      {/* Animated Background Layer */}
      <Animated.View style={[styles.backgroundFill, { transform: [{ scale: backgroundScale }] }]}>
        {/* Decorative Circle (Hotstar style ripple) */}
        <Animated.View 
          style={[
            styles.ripple, 
            { 
              borderColor: primaryColor,
              opacity: circleOpacity,
              transform: [{ scale: circleScale }]
            }
          ]} 
        />
      </Animated.View>

      <View style={styles.content}>
        {/* Logo Container */}
        <Animated.View 
          style={[
            styles.logoWrapper, 
            { 
              opacity: logoOpacity,
              transform: [
                { scale: logoScale },
                { rotate: spin }
              ]
            }
          ]}
        >
          <View style={styles.logoShadow} />
          <Image 
            source={require('@/assets/images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Text Container */}
        <Animated.View 
          style={[
            styles.textWrapper, 
            { 
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }]
            }
          ]}
        >
          <ThemedText type="displayLg" style={styles.title}>RouteShare</ThemedText>
          <View style={[styles.underline, { backgroundColor: primaryColor }]} />
          <ThemedText type="labelMd" style={styles.subtitle}>Share Route, Save Cost, Grow Together</ThemedText>
        </Animated.View>
      </View>

      {/* Loading Indicator */}
      <View style={[styles.footer, { bottom: insets.bottom + 30 }]}>
        <View style={styles.progressContainer}>
           <Animated.View style={[styles.progressBar, { backgroundColor: primaryColor }]} />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  backgroundFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    position: 'absolute',
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
  },
  logoWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  logoShadow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#000',
    opacity: 0.15,
    transform: [{ translateY: 10 }],
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 35,
  },
  textWrapper: {
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1,
  },
  underline: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginVertical: 12,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 2,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
  },
  progressContainer: {
    width: 120,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBar: {
    width: '30%',
    height: '100%',
    borderRadius: 1,
  },
});
