import { View } from 'react-native';

import { avatarIcon } from '@/domain/catalog';
import { colors } from '@/theme/tokens';

import { Icon } from './Icon';

/** Child avatar: animal hero in their color, with a little star "badge" on the cape. */
export function Avatar({
  avatar,
  color,
  size = 96,
  ring,
}: {
  avatar: string;
  color: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: ring ? Math.max(3, size * 0.05) : 0,
        borderColor: colors.star,
      }}
    >
      <Icon name={avatarIcon(avatar)} size={size * 0.6} color={colors.white} />
      <View
        style={{
          position: 'absolute',
          right: size * 0.02,
          bottom: size * 0.02,
          width: size * 0.32,
          height: size * 0.32,
          borderRadius: size * 0.16,
          backgroundColor: colors.star,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colors.white,
        }}
      >
        <Icon name="star" size={size * 0.2} color={colors.white} />
      </View>
    </View>
  );
}
