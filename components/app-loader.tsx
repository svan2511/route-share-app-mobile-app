import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, Modal, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from './ui/icon-symbol';
import { ThemedText } from './themed-text';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TRUCK_SIZE = 48;

interface Props {
  visible: boolean;
  message?: string;
}

export function AppLoader({ visible, message }: Props) {
  const truckX = useSharedValue(-TRUCK_SIZE - 20);
  const bounce = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      truckX.value = -TRUCK_SIZE - 20;
      truckX.value = withRepeat(
        withTiming(SCREEN_WIDTH + TRUCK_SIZE, { duration: 3000, easing: Easing.linear }),
        -1,
        false,
      );
      bounce.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 350, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 350, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      truckX.value = -TRUCK_SIZE - 20;
      bounce.value = 0;
    }
  }, [visible]);

  const truckStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: truckX.value },
      { translateY: bounce.value },
    ],
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <LinearGradient colors={['#0A0A0F', '#1C1C2E']} style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <View style={styles.glowRing}>
            <View style={styles.innerRing}>
              <IconSymbol name="truck.box.fill" size={32} color="#14B8A6" style={{ opacity: 0.3 }} />
            </View>
          </View>

          <View style={styles.trackWrap}>
            <View style={styles.road} />
            <Animated.View style={[styles.truck, truckStyle]}>
              <IconSymbol name="truck.box.fill" size={TRUCK_SIZE} color="#14B8A6" />
            </Animated.View>
          </View>

          <ThemedText style={styles.title}>{message || 'Loading...'}</ThemedText>

          <View style={styles.dotsRow}>
            {[0, 1, 2].map((i) => (
              <AnimatedDot key={i} index={i} visible={visible} />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AnimatedDot({ index, visible }: { index: number; visible: boolean }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (visible) {
      opacity.value = 0.3;
      opacity.value = withDelay(
        index * 300,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 400, easing: Easing.ease }),
            withTiming(0.3, { duration: 400, easing: Easing.ease }),
          ),
          -1,
          true,
        ),
      );
    } else {
      opacity.value = 0.3;
    }
  }, [visible]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, dotStyle]} />;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', gap: 20, paddingHorizontal: 40 },
  glowRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(20, 184, 166, 0.06)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  innerRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  trackWrap: {
    width: SCREEN_WIDTH - 100, height: TRUCK_SIZE + 20,
    justifyContent: 'center', overflow: 'hidden',
  },
  road: {
    position: 'absolute', left: 0, right: 0, height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: TRUCK_SIZE / 2 + 10,
    borderStyle: 'dashed',
    borderBottomWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  truck: { position: 'absolute', top: 2, left: 0 },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#14B8A6' },
});
