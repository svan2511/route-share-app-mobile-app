import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Dimensions, Modal, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TRUCK_SIZE = 56;

interface Props {
  visible: boolean;
  origin?: string;
  destination?: string;
}

export function FullScreenLoader({ visible, origin, destination }: Props) {
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
          withTiming(-8, { duration: 350, easing: Easing.inOut(Easing.ease) }),
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

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <LinearGradient
          colors={['#0A0A0F', '#1C1C2E']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <View style={styles.glowRing}>
            <View style={styles.innerRing} >
              <IconSymbol name="truck.box.fill" size={32} color="#14B8A6" style={{ opacity: 0.3 }} />

            </View>
            
          </View>

          <View style={styles.trackWrap}>
            <View style={styles.road}>
              <View style={styles.roadLine} />
            </View>
            <Animated.View style={[styles.truck, truckStyle]}>
              <IconSymbol name="truck.box.fill" size={TRUCK_SIZE} color="#14B8A6" />
            </Animated.View>
          </View>

          <ThemedText type="headlineLgMobile" style={styles.title}>
            Searching Rides
          </ThemedText>

          {origin && destination && (
            <View style={styles.routeRow}>
              <ThemedText type="bodySm" style={styles.routeText}>
                {origin}
              </ThemedText>
              <IconSymbol name="arrow.right" size={12} color="#A8A29E" />
              <ThemedText type="bodySm" style={styles.routeText}>
                {destination}
              </ThemedText>
            </View>
          )}

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
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 40,
  },
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
    width: SCREEN_WIDTH - 100,
    height: TRUCK_SIZE + 20,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  road: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: TRUCK_SIZE / 2 + 10,
  },
  roadLine: {
    width: '100%',
    height: 2,
    borderStyle: 'dashed',
    borderBottomWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  truck: {
    position: 'absolute',
    top: 2,
    left: 0,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  routeText: {
    color: '#D6D3D1',
    fontSize: 13,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#14B8A6',
  },
});
