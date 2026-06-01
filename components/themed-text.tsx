import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'displayLg' | 'headlineLg' | 'headlineLgMobile' | 'titleMd' | 'bodyLg' | 'bodySm' | 'labelMd';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const tintColor = useThemeColor({}, 'tint');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.bodyLg : undefined,
        type === 'title' ? styles.headlineLg : undefined,
        type === 'defaultSemiBold' ? styles.titleMd : undefined,
        type === 'subtitle' ? styles.headlineLgMobile : undefined,
        type === 'link' ? [styles.link, { color: tintColor }] : undefined,
        type === 'displayLg' ? styles.displayLg : undefined,
        type === 'headlineLg' ? styles.headlineLg : undefined,
        type === 'headlineLgMobile' ? styles.headlineLgMobile : undefined,
        type === 'titleMd' ? styles.titleMd : undefined,
        type === 'bodyLg' ? styles.bodyLg : undefined,
        type === 'bodySm' ? styles.bodySm : undefined,
        type === 'labelMd' ? styles.labelMd : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  displayLg: {
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 48,
    letterSpacing: -1,
  },
  headlineLg: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  headlineLgMobile: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  titleMd: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },
  bodyLg: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodySm: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  labelMd: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  link: {
    fontSize: 14,
    fontWeight: '700',
  },
});


