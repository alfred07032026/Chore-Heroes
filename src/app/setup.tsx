import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChildForm } from '@/components/ChildForm';
import { Chip } from '@/components/Form';
import { Mascot } from '@/components/Mascot';
import { PinEntry } from '@/components/PinEntry';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { REWARD_TEMPLATES, TASK_TEMPLATES } from '@/domain/catalog';
import { MAX_CHILDREN } from '@/domain/validation';
import { isWeakPin } from '@/domain/security';
import { useQuery } from '@/hooks/useQuery';
import { createChild, listChildren } from '@/services/children';
import { createReward } from '@/services/rewards';
import { markSetupComplete, setPin } from '@/services/settings';
import { createTask } from '@/services/tasks';
import { mutate, useAppStore } from '@/state/appStore';
import { colors, space } from '@/theme/tokens';

type Step = 'welcome' | 'pin' | 'confirm' | 'children' | 'starter' | 'done';

const STARTER_TASKS = ['t_bed', 't_teeth_am', 't_teeth_pm', 't_toys', 't_table', 't_homework'];
const STARTER_REWARDS = ['r_screen15', 'r_movie', 'r_dessert', 'r_park', 'r_story'];

export default function Setup() {
  const [step, setStep] = useState<Step>('welcome');
  const [firstPin, setFirstPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tasks, setTasks] = useState<string[]>(STARTER_TASKS);
  const [rewards, setRewards] = useState<string[]>(STARTER_REWARDS);
  const today = useAppStore((s) => s.today);
  const children = useQuery((db) => listChildren(db), []);
  const kids = children.data ?? [];

  const onFirstPin = useCallback((pin: string) => {
    if (isWeakPin(pin)) {
      setPinError('That PIN is too easy for little heroes to guess. Try another.');
      return;
    }
    setPinError(null);
    setFirstPin(pin);
    setStep('confirm');
  }, []);

  const onConfirmPin = useCallback(
    async (pin: string) => {
      if (pin !== firstPin) {
        setPinError("Those PINs didn't match. Let's start again.");
        setFirstPin('');
        setStep('pin');
        return;
      }
      await mutate((db) => setPin(db, pin));
      setPinError(null);
      setStep('children');
    },
    [firstPin],
  );

  const finish = async (withStarter: boolean) => {
    setBusy(true);
    try {
      await mutate(async (db) => {
        if (withStarter) {
          const childIds = kids.map((k) => k.id);
          for (const t of TASK_TEMPLATES.filter((x) => tasks.includes(x.id))) {
            await createTask(db, {
              title: t.title,
              icon: t.icon,
              stars: t.stars,
              scheduleType: t.scheduleType,
              weekdays: t.weekdays,
              startDate: today,
              needsApproval: false,
              childIds,
            });
          }
          for (const r of REWARD_TEMPLATES.filter((x) => rewards.includes(x.id))) {
            await createReward(db, { ...r, needsApproval: true });
          }
        }
        await markSetupComplete(db);
      });
      useAppStore.getState().setSetupComplete(true);
      setStep('done');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen maxWidth={720} contentStyle={{ paddingTop: space.xl }}>
      {step === 'welcome' ? (
        <View style={{ alignItems: 'center', gap: space.lg }}>
          <Mascot size={200} mood="cheer" />
          <Txt variant="display" center>
            Welcome to Chore Heroes!
          </Txt>
          <Txt variant="body" center color={colors.inkSoft} style={{ maxWidth: 520 }}>
            Kids check off jobs to earn stars and trade them for rewards you choose. Everything
            stays on this device: no accounts, no ads, no internet.
          </Txt>
          <Txt variant="label" center>
            Grown-ups: this takes about 2 minutes.
          </Txt>
          <Button
            label="Let's start"
            icon="arrow-right"
            onPress={() => setStep('pin')}
            testID="setup-start"
          />
        </View>
      ) : null}

      {step === 'pin' ? (
        <PinEntry
          title="Create a parent PIN"
          subtitle="This 4-digit PIN keeps the grown-up area safe from little fingers."
          error={pinError}
          onComplete={onFirstPin}
        />
      ) : null}

      {step === 'confirm' ? (
        <PinEntry
          title="Type the PIN again"
          error={pinError}
          onComplete={(p) => void onConfirmPin(p)}
        />
      ) : null}

      {step === 'children' ? (
        <View style={{ gap: space.md }}>
          <Txt variant="title" accessibilityRole="header">
            Who are the heroes?
          </Txt>
          <Txt variant="body" color={colors.inkSoft}>
            Add 1 to {MAX_CHILDREN} children (ages 6–9). You can change these later.
          </Txt>
          {kids.map((k) => (
            <Card key={k.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Avatar avatar={k.avatar} color={k.color} size={64} />
              <View style={{ flex: 1 }}>
                <Txt variant="heading">{k.name}</Txt>
                <Txt variant="body" color={colors.inkSoft}>
                  Age {k.age}
                </Txt>
              </View>
            </Card>
          ))}
          {adding || kids.length === 0 ? (
            <Card>
              <ChildForm
                submitLabel="Add child"
                busy={busy}
                onCancel={kids.length > 0 ? () => setAdding(false) : undefined}
                onSubmit={async (input) => {
                  setBusy(true);
                  try {
                    await mutate((db) => createChild(db, input));
                    setAdding(false);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </Card>
          ) : (
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              {kids.length < MAX_CHILDREN ? (
                <Button
                  label="Add another child"
                  icon="plus"
                  tone="secondary"
                  onPress={() => setAdding(true)}
                />
              ) : null}
              <Button
                label="Next"
                icon="arrow-right"
                onPress={() => setStep('starter')}
                testID="setup-next"
              />
            </View>
          )}
        </View>
      ) : null}

      {step === 'starter' ? (
        <View style={{ gap: space.md }}>
          <Txt variant="title" accessibilityRole="header">
            Quick start
          </Txt>
          <Txt variant="body" color={colors.inkSoft}>
            Pick some ready-made jobs and rewards. They will be given to every child; you can edit
            them any time.
          </Txt>
          <Txt variant="heading">Jobs</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
            {TASK_TEMPLATES.slice(0, 14).map((t) => (
              <Chip
                key={t.id}
                label={t.title}
                icon={t.icon}
                selected={tasks.includes(t.id)}
                onPress={() =>
                  setTasks((s) => (s.includes(t.id) ? s.filter((x) => x !== t.id) : [...s, t.id]))
                }
              />
            ))}
          </View>
          <Txt variant="heading">Rewards</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
            {REWARD_TEMPLATES.slice(0, 10).map((r) => (
              <Chip
                key={r.id}
                label={`${r.title} · ${r.cost}★`}
                icon={r.icon}
                color={colors.success}
                selected={rewards.includes(r.id)}
                onPress={() =>
                  setRewards((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))
                }
              />
            ))}
          </View>
          <View
            style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginTop: space.md }}
          >
            <Button
              label="Skip for now"
              tone="secondary"
              onPress={() => void finish(false)}
              disabled={busy}
            />
            <Button
              label="Add these"
              icon="check"
              busy={busy}
              onPress={() => void finish(true)}
              testID="setup-finish"
            />
          </View>
        </View>
      ) : null}

      {step === 'done' ? (
        <View style={{ alignItems: 'center', gap: space.lg }}>
          <Mascot size={200} mood="cheer" />
          <Txt variant="display" center>
            All set, heroes!
          </Txt>
          <Txt variant="body" center color={colors.inkSoft} style={{ maxWidth: 520 }}>
            Hand the tablet to your kids. To get back to the grown-up area, tap the lock button on
            the hero picker screen and enter your PIN.
          </Txt>
          <Button
            label="Go to heroes"
            icon="arrow-right"
            onPress={() => router.replace('/kids')}
            testID="setup-done"
          />
        </View>
      ) : null}
    </Screen>
  );
}
