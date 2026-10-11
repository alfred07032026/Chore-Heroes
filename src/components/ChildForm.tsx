import { useState } from 'react';
import { View } from 'react-native';

import { AVATARS, CHILD_COLOR_NAMES, CHILD_COLORS } from '@/domain/catalog';
import type { ChildInput } from '@/domain/types';
import { hasErrors, MAX_AGE, MIN_AGE, validateChild } from '@/domain/validation';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import { colors, radius, space } from '@/theme/tokens';

import { Avatar } from './Avatar';
import { Button } from './Button';
import { Field, Segmented } from './Form';
import { Icon } from './Icon';
import { Pressy } from './Pressy';
import { Txt } from './Txt';

export function ChildForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  busy,
}: {
  initial?: ChildInput;
  onSubmit: (input: ChildInput) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  busy?: boolean;
}) {
  const [input, setInput] = useState<ChildInput>(
    initial ?? { name: '', avatar: 'cat', age: 7, color: CHILD_COLORS[0] },
  );
  const [touched, setTouched] = useState(false);
  const guard = useSubmitGuard();
  const errors = validateChild(input);
  const set = <K extends keyof ChildInput>(k: K, v: ChildInput[K]) =>
    setInput((p) => ({ ...p, [k]: v }));

  return (
    <View>
      <View style={{ alignItems: 'center', marginBottom: space.md }}>
        <Avatar avatar={input.avatar} color={input.color} size={112} />
      </View>
      <Field
        label="Name"
        value={input.name}
        onChangeText={(t) => set('name', t)}
        placeholder="e.g. Maya"
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={20}
        error={errors.name}
        showError={touched}
        testID="child-name"
      />
      <Txt variant="label">Avatar</Txt>
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginVertical: space.xs }}
        accessibilityRole="radiogroup"
        accessibilityLabel="Avatar"
      >
        {AVATARS.map((a) => {
          const selected = a.id === input.avatar;
          return (
            <Pressy
              key={a.id}
              onPress={() => set('avatar', a.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={a.label}
              style={{
                padding: 4,
                borderRadius: radius.round,
                borderWidth: 3,
                borderColor: selected ? colors.hero : 'transparent',
              }}
            >
              <Avatar avatar={a.id} color={selected ? input.color : colors.locked} size={60} />
            </Pressy>
          );
        })}
      </View>
      <Txt variant="label" style={{ marginTop: space.sm }}>
        Hero color
      </Txt>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: space.sm,
          marginVertical: space.xs,
          marginBottom: space.md,
        }}
        accessibilityRole="radiogroup"
        accessibilityLabel="Hero color"
      >
        {CHILD_COLORS.map((c) => {
          const selected = c === input.color;
          return (
            <Pressy
              key={c}
              onPress={() => set('color', c)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={CHILD_COLOR_NAMES[c]}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: c,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: selected ? colors.ink : 'transparent',
              }}
            >
              {selected ? <Icon name="check-bold" size={26} color={colors.white} /> : null}
            </Pressy>
          );
        })}
      </View>
      <Segmented
        label="Age"
        value={input.age}
        onChange={(v) => set('age', v)}
        options={Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => ({
          value: MIN_AGE + i,
          label: String(MIN_AGE + i),
        }))}
      />
      <View
        style={{
          flexDirection: 'row',
          gap: space.sm,
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        {onCancel ? <Button label="Cancel" tone="secondary" onPress={onCancel} /> : null}
        <Button
          label={submitLabel}
          icon="check"
          busy={busy || guard.busy}
          testID="child-save"
          onPress={() => {
            setTouched(true);
            if (!hasErrors(errors))
              void guard.run(async () => onSubmit({ ...input, name: input.name.trim() }));
          }}
        />
      </View>
    </View>
  );
}
