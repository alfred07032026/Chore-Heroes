import { useState, type ReactNode } from 'react';
import { Switch, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, space, touch } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useAppStore } from '@/state/appStore';

import { ErrorText } from './ErrorText';
import { Icon } from './Icon';
import { Pressy } from './Pressy';
import { Txt } from './Txt';

/**
 * Labeled text input. `error` is shown once the field has been left (validate on blur) or
 * when `showError` is set (e.g. after a submit attempt), and is announced to screen readers.
 */
export function Field({
  label,
  error,
  hint,
  showError,
  onBlur,
  ...input
}: TextInputProps & { label: string; error?: string; hint?: string; showError?: boolean }) {
  const dyslexic = useAppStore((s) => s.settings.dyslexicFont);
  const [blurred, setBlurred] = useState(false);
  const visibleError = error && (showError || blurred) ? error : undefined;
  return (
    <View style={{ gap: space.xxs, marginBottom: space.md }}>
      <Txt variant="label">{label}</Txt>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={visibleError ?? hint}
        placeholderTextColor={colors.inkSoft}
        maxFontSizeMultiplier={2}
        {...input}
        onBlur={(e) => {
          setBlurred(true);
          onBlur?.(e);
        }}
        style={{
          minHeight: touch.parent + 4,
          borderWidth: 2,
          borderColor: visibleError ? colors.danger : colors.control,
          borderRadius: radius.md,
          paddingHorizontal: space.md,
          backgroundColor: colors.surface,
          fontFamily: fontFamily('regular', dyslexic),
          fontSize: 18,
          color: colors.ink,
        }}
      />
      {hint && !visibleError ? (
        <Txt variant="caption" color={colors.inkSoft}>
          {hint}
        </Txt>
      ) : null}
      <ErrorText variant="caption">{visibleError}</ErrorText>
    </View>
  );
}

export function ToggleRow({
  label,
  description,
  value,
  onChange,
  icon,
  testID,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: string;
  testID?: string;
}) {
  // The whole row is the touch target (the native switch alone is ~51×31pt).
  return (
    <Pressy
      testID={testID}
      onPress={() => onChange(!value)}
      scaleTo={0.99}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        minHeight: touch.child,
        paddingVertical: space.xs,
      }}
    >
      {icon ? <Icon name={icon} size={28} color={colors.hero} /> : null}
      <View style={{ flex: 1 }}>
        <Txt variant="label">{label}</Txt>
        {description ? (
          <Txt variant="caption" color={colors.inkSoft}>
            {description}
          </Txt>
        ) : null}
      </View>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Switch
          value={value}
          trackColor={{ true: colors.hero, false: colors.control }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.control}
        />
      </View>
    </Pressy>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; icon?: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <View style={{ marginBottom: space.md, gap: space.xxs }}>
      <Txt variant="label">{label}</Txt>
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
      >
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressy
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              accessibilityLabel={o.label}
              style={{
                minHeight: touch.parent,
                paddingHorizontal: space.md,
                borderRadius: radius.round,
                borderWidth: 2,
                borderColor: selected ? colors.hero : colors.control,
                backgroundColor: selected ? colors.hero : colors.surface,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.xxs,
              }}
            >
              {o.icon ? (
                <Icon name={o.icon} size={20} color={selected ? colors.white : colors.hero} />
              ) : null}
              <Txt variant="label" color={selected ? colors.white : colors.ink}>
                {o.label}
              </Txt>
            </Pressy>
          );
        })}
      </View>
    </View>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  bigStep,
  render,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  bigStep?: number;
  render?: (v: number) => ReactNode;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const btn = (delta: number, icon: string, a11y: string) => (
    <Pressy
      onPress={() => onChange(clamp(value + delta))}
      disabled={delta < 0 ? value <= min : value >= max}
      accessibilityLabel={a11y}
      style={{
        width: touch.parent,
        height: touch.parent,
        borderRadius: touch.parent / 2,
        backgroundColor: colors.heroLight,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: (delta < 0 ? value <= min : value >= max) ? 0.4 : 1,
      }}
    >
      <Icon name={icon} size={24} color={colors.hero} />
    </Pressy>
  );
  return (
    <View style={{ marginBottom: space.md, gap: space.xxs }}>
      <Txt variant="label">{label}</Txt>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}
        accessible={false}
      >
        {bigStep ? btn(-bigStep, 'chevron-double-left', `${label}: minus ${bigStep}`) : null}
        {btn(-step, 'minus', `${label}: minus ${step}`)}
        <View
          style={{ minWidth: 64, alignItems: 'center' }}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: value }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) =>
            onChange(clamp(value + (e.nativeEvent.actionName === 'increment' ? step : -step)))
          }
        >
          {render ? render(value) : <Txt variant="title">{value}</Txt>}
        </View>
        {btn(step, 'plus', `${label}: plus ${step}`)}
        {bigStep ? btn(bigStep, 'chevron-double-right', `${label}: plus ${bigStep}`) : null}
      </View>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  color = colors.hero,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: string;
  color?: string;
}) {
  return (
    <Pressy
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!selected }}
      accessibilityLabel={label}
      style={{
        minHeight: touch.parent,
        paddingHorizontal: space.md,
        borderRadius: radius.round,
        borderWidth: 2,
        borderColor: selected ? color : colors.control,
        backgroundColor: selected ? color : colors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xs,
      }}
    >
      {icon ? <Icon name={icon} size={22} color={selected ? colors.white : color} /> : null}
      <Txt variant="label" color={selected ? colors.white : colors.ink}>
        {label}
      </Txt>
      {selected ? <Icon name="check" size={20} color={colors.white} /> : null}
    </Pressy>
  );
}

/** Grid of icons to pick from (task/reward editors). */
export function IconPicker({
  icons,
  value,
  onChange,
  label = 'Icon',
}: {
  icons: readonly string[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <View style={{ marginBottom: space.md, gap: space.xxs }}>
      <Txt variant="label">{label}</Txt>
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
      >
        {icons.map((name) => {
          const selected = name === value;
          return (
            <Pressy
              key={name}
              onPress={() => onChange(name)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={name.replace(/-/g, ' ')}
              style={{
                width: 56,
                height: 56,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected ? colors.hero : colors.surfaceAlt,
                borderWidth: 2,
                borderColor: selected ? colors.heroDark : 'transparent',
              }}
            >
              <Icon name={name} size={30} color={selected ? colors.white : colors.hero} />
            </Pressy>
          );
        })}
      </View>
    </View>
  );
}
