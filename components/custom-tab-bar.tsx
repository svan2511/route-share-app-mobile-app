import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, Animated, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

const MAX_VISIBLE = 4;
const GRID_COLS = 4;

export function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [showMore, setShowMore] = useState(false);
  const springAnim = useRef(new Animated.Value(0)).current;
  const staggerAnims = useRef<Animated.Value[]>([]).current;

  const preferredOrder = ['index', 'my-bookings', 'my-routes', 'my-posts', 'notifications', 'profile'];

  const orderedRoutes = [...state.routes].sort(
    (a, b) => preferredOrder.indexOf(a.name) - preferredOrder.indexOf(b.name)
  );

  const visibleRoutes = orderedRoutes.slice(0, MAX_VISIBLE);
  const moreRoutes = orderedRoutes.slice(MAX_VISIBLE);

  useEffect(() => {
    while (staggerAnims.length < moreRoutes.length) {
      staggerAnims.push(new Animated.Value(0));
    }
    staggerAnims.length = moreRoutes.length;
  }, [moreRoutes.length]);

  const openMore = () => {
    setShowMore(true);
    springAnim.setValue(0);
    staggerAnims.forEach(a => a.setValue(0));
    setTimeout(() => {
      const items = moreRoutes.map((_, i) =>
        Animated.spring(staggerAnims[i], {
          toValue: 1, useNativeDriver: true, damping: 10, stiffness: 130, delay: 60 * (i + 1),
        })
      );
      Animated.parallel([
        Animated.spring(springAnim, { toValue: 1, useNativeDriver: true, damping: 24, stiffness: 220 }),
        ...items,
      ]).start();
    }, 50);
  };

  const closeMore = () => {
    Animated.timing(springAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => setShowMore(false));
  };

  const handlePress = (route: any) => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) navigation.navigate(route.name);
  };

  const getRouteIndex = (route: any) => orderedRoutes.indexOf(route);

  return (
    <>
      <View style={[styles.bar, { height: 56 + insets.bottom, paddingBottom: insets.bottom + 6, paddingTop: 6 }]}>
        {visibleRoutes.map((route: any) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === getRouteIndex(route);
          const color = isFocused ? '#0D9488' : '#A8A29E';
          return (
            <TouchableOpacity key={route.key} onPress={() => handlePress(route)} style={styles.tabItem}>
              {options.tabBarIcon ? options.tabBarIcon({ focused: isFocused, color }) : null}
              <Text allowFontScaling={false} style={[styles.label, { color }]} numberOfLines={1}>
                {options.title || route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
        {moreRoutes.length > 0 && (
          <TouchableOpacity onPress={openMore} style={styles.tabItem}>
            <IconSymbol size={22} name="ellipsis.circle.fill" color={showMore ? '#0D9488' : '#A8A29E'} />
            <Text allowFontScaling={false} style={[styles.label, { color: showMore ? '#0D9488' : '#A8A29E' }]}>More</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={showMore} transparent onRequestClose={closeMore}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeMore}>
          <Animated.View
            style={[
              styles.panel,
              {
                paddingBottom: 20 + insets.bottom,
                opacity: springAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
                transform: [{
                  translateY: springAnim.interpolate({ inputRange: [0, 1], outputRange: [250, 0] }),
                }],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.handle} />
              <View style={styles.grid}>
                {moreRoutes.map((route: any, index: number) => {
                  const { options } = descriptors[route.key];
                  const anim = staggerAnims[index];
                  if (!anim) return null;
                  return (
                    <Animated.View
                      key={route.key}
                      style={[
                        styles.gridItemWrap,
                        {
                          opacity: anim,
                          transform: [
                            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
                          ],
                        },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => { closeMore(); setTimeout(() => handlePress(route), 200); }}
                        style={styles.gridItem}
                        activeOpacity={0.7}
                      >
                        <View style={styles.gridIcon}>
                          {options.tabBarIcon ? options.tabBarIcon({ focused: false, color: '#0D9488' }) : null}
                        </View>
                        <Text allowFontScaling={false} style={styles.gridLabel} numberOfLines={1}>
                          {options.title || route.name}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E7E5E4',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 11,
    marginTop: 2,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: '#D6D3D1',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItemWrap: {
    width: `${100 / GRID_COLS}%` as any,
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  gridItem: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
    borderRadius: 16,
    backgroundColor: '#FAFAF8',
  },
  gridIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    fontSize: 12,
    color: '#44403C',
    textAlign: 'center',
    fontWeight: '600',
  },
});
