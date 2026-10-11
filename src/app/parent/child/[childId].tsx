import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BarChart } from '@/components/BarChart';
import { Button } from '@/components/Button';
import { Card, SectionTitle } from '@/components/Card';
import { Chip, Field, Segmented, Stepper } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { Grid, TwoPane, useGridColumns } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { Toast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import { Txt } from '@/components/Txt';
import { dayOfWeek, WEEKDAY_LONG, WEEKDAY_SHORT } from '@/domain/dates';
import { useQuery } from '@/hooks/useQuery';
import { getChild } from '@/services/children';
import { backfillAll } from '@/services/instances';
import { adjustStars, getLedger } from '@/services/ledger';
import { getChildDashboard } from '@/services/stats';
import { mutate, useAppStore } from '@/state/appStore';
import { colors, space } from '@/theme/tokens';

const QUICK_REASONS = ['Extra helping', 'Kind to others', 'Correction', 'Broke a house rule'];
const ADJ_ERRORS: Record<string, string> = {
  reason_required: 'Please add a short reason.',
  would_go_negative: "That would make the balance negative — stars can't go below zero.",
  zero_delta: 'Pick an amount.',
  too_large: 'That amount is too large.',
};

export default function ChildDashboardScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const today = useAppStore((s) => s.today);
  const statCols = useGridColumns(180, 4);
  const [direction, setDirection] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const q = useQuery(
    async (db) => {
      await backfillAll(db, today);
      return {
        child: await getChild(db, childId),
        dash: await getChildDashboard(db, childId, today),
        ledger: await getLedger(db, childId, 30),
      };
    },
    [childId, today],
  );
  const data = q.data;
  if (!data?.child) return <Screen>{null}</Screen>;
  const { child, dash, ledger } = data;

  const submit = async () => {
    setError(null);
    const delta = direction === 'add' ? amount : -amount;
    try {
      await mutate((db) => adjustStars(db, childId, delta, reason));
      setReason('');
      setAmount(1);
      setToast(`${delta > 0 ? 'Added' : 'Removed'} ${Math.abs(delta)} ★`);
    } catch (e) {
      const code = (e as { code?: string }).code;
      setError((code && ADJ_ERRORS[code]) ?? (e instanceof Error ? e.message : String(e)));
    }
  };

  const stats = [
    { icon: 'star-circle', label: 'Balance', value: `${dash.balance} ★` },
    { icon: 'star-plus', label: 'Earned this week', value: `${dash.starsThisWeek} ★` },
    {
      icon: 'check-circle',
      label: 'Jobs done this week',
      value: dash.completionRate === null ? '–' : `${Math.round(dash.completionRate * 100)}%`,
      sub: `${dash.doneThisWeek} of ${dash.dueThisWeek}`,
    },
    {
      icon: 'fire',
      label: 'Streak',
      value: `${dash.streak.current} ${dash.streak.current === 1 ? 'day' : 'days'}`,
      sub: `Best ${dash.streak.best}`,
    },
  ];

  const adjust = (
    <Card>
      <SectionTitle>Adjust stars</SectionTitle>
      <Segmented
        label="Action"
        value={direction}
        onChange={setDirection}
        options={[
          { value: 'add', label: 'Add', icon: 'plus' },
          { value: 'remove', label: 'Remove', icon: 'minus' },
        ]}
      />
      <Stepper label="Amount" value={amount} min={1} max={100} bigStep={5} onChange={setAmount} />
      <Field
        label="Reason (required)"
        value={reason}
        onChangeText={setReason}
        placeholder="Why?"
        maxLength={60}
        testID="adjust-reason"
      />
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginBottom: space.md }}
      >
        {QUICK_REASONS.map((r) => (
          <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      {error ? (
        <Txt variant="body" color={colors.danger} style={{ marginBottom: space.sm }}>
          {error}
        </Txt>
      ) : null}
      <Button
        label={`${direction === 'add' ? 'Add' : 'Remove'} ${amount} ★`}
        icon={direction === 'add' ? 'plus' : 'minus'}
        tone={direction === 'add' ? 'success' : 'danger'}
        onPress={() => void submit()}
        disabled={reason.trim().length < 3}
        testID="adjust-submit"
      />
    </Card>
  );

  const history = (
    <Card>
      <SectionTitle>Star history</SectionTitle>
      {ledger.length === 0 ? (
        <Txt variant="body" color={colors.inkSoft}>
          No stars yet.
        </Txt>
      ) : (
        ledger.map((l) => (
          <View
            key={l.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              paddingVertical: space.xs,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Icon
              name={l.delta > 0 ? 'arrow-up-circle' : 'arrow-down-circle'}
              size={24}
              color={l.delta > 0 ? colors.success : colors.danger}
            />
            <View style={{ flex: 1 }}>
              <Txt variant="body" numberOfLines={2}>
                {l.reason}
              </Txt>
              <Txt variant="caption" color={colors.inkSoft}>
                {new Date(l.createdAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Txt>
            </View>
            <Txt variant="label" color={l.delta > 0 ? colors.success : colors.danger}>
              {l.delta > 0 ? `+${l.delta}` : l.delta}
            </Txt>
          </View>
        ))
      )}
    </Card>
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen
        header={
          <TopBar
            title={child.name}
            subtitle={`Age ${child.age}`}
            onBack={() => router.back()}
            right={<Avatar avatar={child.avatar} color={child.color} size={56} />}
          />
        }
      >
        <Grid columns={statCols}>
          {stats.map((s) => (
            <Card key={s.label} style={{ gap: 4 }}>
              <Icon name={s.icon} size={28} color={colors.hero} />
              <Txt variant="caption" color={colors.inkSoft}>
                {s.label}
              </Txt>
              <Txt variant="title">{s.value}</Txt>
              {s.sub ? (
                <Txt variant="caption" color={colors.inkSoft}>
                  {s.sub}
                </Txt>
              ) : null}
            </Card>
          ))}
        </Grid>
        <SectionTitle>Stars earned this week</SectionTitle>
        <Card>
          <BarChart
            highlight={today}
            data={dash.week.map((d) => ({
              key: d.date,
              label: WEEKDAY_SHORT[dayOfWeek(d.date)]!,
              longLabel: WEEKDAY_LONG[dayOfWeek(d.date)],
              value: d.stars,
            }))}
          />
        </Card>
        <View style={{ height: space.md }} />
        <TwoPane main={history} side={adjust} sideWidth={400} />
      </Screen>
      <Toast message={toast} icon="star" onHide={() => setToast(null)} />
    </View>
  );
}
