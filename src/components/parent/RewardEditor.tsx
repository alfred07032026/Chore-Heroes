import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { REWARD_ICONS, REWARD_TEMPLATES } from '@/domain/catalog';
import type { Reward, RewardInput } from '@/domain/types';
import { hasErrors, validateReward } from '@/domain/validation';
import { useQuery } from '@/hooks/useQuery';
import {
  archiveReward,
  createReward,
  getReward,
  restoreReward,
  updateReward,
} from '@/services/rewards';
import { mutate } from '@/state/appStore';
import { colors, space } from '@/theme/tokens';

import { Button } from '../Button';
import { Chip, Field, IconPicker, Stepper, ToggleRow } from '../Form';
import { Icon } from '../Icon';
import { Txt } from '../Txt';

export function RewardEditor({
  rewardId,
  onDone,
}: {
  rewardId: string | null;
  onDone: () => void;
}) {
  const q = useQuery(
    (db) => (rewardId ? getReward(db, rewardId) : Promise.resolve(null)),
    [rewardId],
  );
  if (q.loading) return null;
  const reward = q.data ?? null;
  const initial: RewardInput = reward
    ? { ...reward }
    : { title: '', icon: 'gift', cost: 10, weeklyLimit: null, needsApproval: true };
  return (
    <RewardForm
      key={reward?.updatedAt ?? 'new'}
      initial={initial}
      reward={reward}
      onDone={onDone}
    />
  );
}

function RewardForm({
  initial,
  reward,
  onDone,
}: {
  initial: RewardInput;
  reward: Reward | null;
  onDone: () => void;
}) {
  const rewardId = reward?.id ?? null;
  const [input, setInput] = useState<RewardInput>(initial);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = validateReward(input);
  const set = <K extends keyof RewardInput>(k: K, v: RewardInput[K]) =>
    setInput((p) => (p ? { ...p, [k]: v } : p));

  const save = async () => {
    setTouched(true);
    if (hasErrors(errors)) return;
    setBusy(true);
    setError(null);
    try {
      await mutate(async (db) => {
        if (rewardId) await updateReward(db, rewardId, input);
        else await createReward(db, input);
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      {!rewardId ? (
        <View style={{ marginBottom: space.md }}>
          <Txt variant="label">Start from a template</Txt>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space.xs, paddingVertical: space.xs }}
          >
            {REWARD_TEMPLATES.map((r) => (
              <Chip
                key={r.id}
                label={r.title}
                icon={r.icon}
                color={colors.success}
                selected={input.title === r.title}
                onPress={() =>
                  setInput((p) =>
                    p
                      ? {
                          ...p,
                          title: r.title,
                          icon: r.icon,
                          cost: r.cost,
                          weeklyLimit: r.weeklyLimit,
                        }
                      : p,
                  )
                }
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
      <Field
        label="Reward name"
        value={input.title}
        onChangeText={(t) => set('title', t)}
        placeholder="e.g. Pick the movie"
        maxLength={40}
        error={touched ? errors.title : undefined}
        testID="reward-title"
      />
      <IconPicker icons={REWARD_ICONS} value={input.icon} onChange={(v) => set('icon', v)} />
      <Stepper
        label="Cost in stars"
        value={input.cost}
        min={1}
        max={500}
        bigStep={5}
        onChange={(v) => set('cost', v)}
        render={(v) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="star" size={26} color={colors.star} />
            <Txt variant="title">{v}</Txt>
          </View>
        )}
      />
      <ToggleRow
        icon="calendar-lock"
        label="Limit per week"
        description="How many times each child can get this per week (Mon–Sun)."
        value={input.weeklyLimit !== null}
        onChange={(on) => set('weeklyLimit', on ? 1 : null)}
      />
      {input.weeklyLimit !== null ? (
        <Stepper
          label="Times per week"
          value={input.weeklyLimit}
          min={1}
          max={21}
          onChange={(v) => set('weeklyLimit', v)}
        />
      ) : null}
      <ToggleRow
        icon="account-check"
        label="Needs my approval"
        description="Off = your child gets it right away and the stars are spent instantly."
        value={input.needsApproval}
        onChange={(v) => set('needsApproval', v)}
      />
      {error ? (
        <Txt variant="body" color={colors.danger}>
          {error}
        </Txt>
      ) : null}
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginTop: space.md }}>
        <Button
          label={rewardId ? 'Save changes' : 'Add reward'}
          icon="check"
          onPress={() => void save()}
          busy={busy}
          testID="reward-save"
        />
        {reward && !reward.archivedAt ? (
          <Button
            label="Archive"
            icon="archive"
            tone="secondary"
            onPress={() => void mutate((db) => archiveReward(db, reward.id)).then(onDone)}
          />
        ) : null}
        {reward?.archivedAt ? (
          <Button
            label="Restore"
            icon="archive-arrow-up"
            tone="secondary"
            onPress={() => void mutate((db) => restoreReward(db, reward.id)).then(onDone)}
          />
        ) : null}
      </View>
    </View>
  );
}
