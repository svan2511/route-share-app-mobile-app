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
      allowFontScaling={false}
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
    fontFamily: 'Inter_800ExtraBold',
    lineHeight: 48,
    letterSpacing: -1,
  },
  headlineLg: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  headlineLgMobile: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    lineHeight: 32,
  },
  titleMd: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 26,
  },
  bodyLg: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
  },
  bodySm: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  labelMd: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  link: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
});


