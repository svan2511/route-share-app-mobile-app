import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface TrustBadgeProps {
  type: 'phone_verified' | 'new_business' | 'active_business' | 'member_since';
  value?: string;
  size?: 'sm' | 'md';
}

const BADGE_CONFIG = {
  phone_verified: {
    label: 'Phone Verified',
    icon: 'checkmark.seal.fill' as const,
    color: '#059669',
    bg: '#ECFDF5',
  },
  new_business: {
    label: 'New Business',
    icon: 'star.fill' as const,
    color: '#D97706',
    bg: '#FEF3C7',
  },
  active_business: {
    label: 'Active Business',
    icon: 'bolt.fill' as const,
    color: '#0D9488',
    bg: '#F0FDFA',
  },
  member_since: {
    label: 'Member Since',
    icon: 'calendar' as const,
    color: '#78716C',
    bg: '#F5F5F4',
  },
};

export function TrustBadge({ type, value, size = 'sm' }: TrustBadgeProps) {
  const config = BADGE_CONFIG[type];
  const isSm = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, isSm ? styles.badgeSm : styles.badgeMd]}>
      <IconSymbol name={config.icon} size={isSm ? 10 : 13} color={config.color} />
      <ThemedText style={[styles.label, { color: config.color }, isSm ? styles.labelSm : styles.labelMd]}>
        {config.label}
      </ThemedText>
      {value && (
        <ThemedText style={[styles.value, { color: config.color }, isSm ? styles.valueSm : styles.valueMd]}>
          {value}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 6,
  },
  badgeSm: {
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeMd: {
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  label: {
    fontWeight: '700',
  },
  labelSm: {
    fontSize: 9,
    letterSpacing: 0.3,
  },
  labelMd: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  value: {
    fontWeight: '600',
  },
  valueSm: {
    fontSize: 9,
  },
  valueMd: {
    fontSize: 11,
  },
});
