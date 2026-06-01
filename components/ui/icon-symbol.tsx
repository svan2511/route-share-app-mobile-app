// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Tabs
  'house.fill': 'home',
  'plus.circle.fill': 'add-circle',
  'list.bullet.rectangle.fill': 'view-list',
  'person.fill': 'person',
  
  // Auth & General
  'paperplane.fill': 'send',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'arrow.right': 'arrow-forward',
  'arrow.left': 'arrow-back',
  'phone.fill': 'phone',
  'lock.fill': 'lock',
  'eye.fill': 'visibility',
  'eye.slash.fill': 'visibility-off',
  'checkmark.seal.fill': 'verified',
  'truck.box.fill': 'local-shipping',
  'clock.fill': 'schedule',
  'line.3.horizontal': 'menu',
  'magnifyingglass': 'search',
  'map.fill': 'map',
  'location.fill': 'my-location',
  'mappin.and.ellipse': 'location-on',
  'chevron.down': 'expand-more',
  'calendar': 'today',
  'plus': 'add',
  'minus': 'remove',
  'arrow.uturn.backward': 'undo',
  'pencil': 'edit',
  'checkmark.circle.fill': 'check-circle',
  'trash.fill': 'delete',
  'bell.fill': 'notifications',
  'shield.fill': 'shield',
  'rectangle.portrait.and.arrow.right': 'logout',
  'bolt.fill': 'bolt',
  'slider.horizontal.3': 'tune',
  'star.fill': 'star',
  'shippingbox.fill': 'inventory-2',
  'xmark.circle.fill': 'cancel',
  'exclamationmark.triangle.fill': 'warning',
  'arrow.left.to.line': 'exit-to-app',
  'arrow.right.to.line': 'keyboard-tab',
} as IconMapping;


/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
