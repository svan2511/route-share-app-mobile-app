import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

export function BackgroundGrid() {
  const gridColor = useThemeColor({ light: 'rgba(140, 144, 159, 0.05)', dark: 'rgba(140, 144, 159, 0.05)' }, 'outlineVariant');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.grid, { borderColor: gridColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flex: 1,
    borderWidth: 0.5,
    borderStyle: 'dashed',
    opacity: 0.2,
  },
});
