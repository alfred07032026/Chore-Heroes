import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { addDays } from '@/domain/dates';
import { TASK_ICONS, TASK_TEMPLATES } from '@/domain/catalog';
import { describeSchedule, type ScheduleType } from '@/domain/recurrence';
import type { Child, Task, TaskInput } from '@/domain/types';
import { hasErrors, validateTask } from '@/domain/validation';
import { useQuery } from '@/hooks/useQuery';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import { listChildren } from '@/services/children';
import { archiveTask, createTask, getTask, restoreTask, updateTask } from '@/services/tasks';
import { mutate, useAppStore } from '@/state/appStore';
import { colors, space } from '@/theme/tokens';

import { Avatar } from '../Avatar';
import { Button } from '../Button';
import { Chip, Field, IconPicker, Segmented, Stepper, ToggleRow } from '../Form';
import { StarRow } from '../Stars';
import { Txt } from '../Txt';
import { Pressy } from '../Pressy';
import { Icon } from '../Icon';
import { ErrorText } from '../ErrorText';

const SCHEDULES: { value: ScheduleType; label: string; icon: string }[] = [
  { value: 'daily', label: 'Every day', icon: 'calendar-today' },
  { value: 'weekdays', label: 'Some days', icon: 'calendar-week' },
  { value: 'weekly', label: 'Once a week', icon: 'calendar-range' },
  { value: 'once', label: 'One time', icon: 'calendar-check' },
];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TaskEditor({ taskId, onDone }: { taskId: string | null; onDone: () => void }) {
  const today = useAppStore((s) => s.today);
  const q = useQuery(
    async (db) => ({
      kids: await listChildren(db),
      task: taskId ? await getTask(db, taskId) : null,
    }),
    [taskId],
  );
  if (!q.data) return null;
  const { kids, task } = q.data;
  const initial: TaskInput = task
    ? { ...task }
    : {
        title: '',
        icon: 'star',
        stars: 2,
        scheduleType: 'daily',
        weekdays: [1, 2, 3, 4, 5],
        startDate: today,
        needsApproval: false,
        childIds: kids.map((k) => k.id),
      };
  return (
    <TaskForm
      key={task?.updatedAt ?? 'new'}
      initial={initial}
      kids={kids}
      task={task}
      today={today}
      onDone={onDone}
    />
  );
}

function TaskForm({
  initial,
  kids,
  task,
  today,
  onDone,
}: {
  initial: TaskInput;
  kids: Child[];
  task: Task | null;
  today: string;
  onDone: () => void;
}) {
  const taskId = task?.id ?? null;
  const [input, setInput] = useState<TaskInput>(initial);
  const [touched, setTouched] = useState(false);
  const { busy, run } = useSubmitGuard();
  const [error, setError] = useState<string | null>(null);

  const errors = validateTask(input);
  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) =>
    setInput((p) => (p ? { ...p, [k]: v } : p));

  const save = () =>
    run(async () => {
      setTouched(true);
      if (hasErrors(errors)) return;
      setError(null);
      try {
        await mutate((db) => (taskId ? updateTask(db, taskId, input) : createTask(db, input)));
        useAppStore.getState().showFlash(taskId ? 'Job saved' : `Job added: ${input.title.trim()}`);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  const setArchived = (archived: boolean) =>
    run(async () => {
      if (!task) return;
      await mutate((db) => (archived ? archiveTask(db, task.id) : restoreTask(db, task.id)));
      useAppStore
        .getState()
        .showFlash(
          archived ? 'Job archived — turn on "Show archived" to restore it' : 'Job restored',
        );
      onDone();
    });

  return (
    <View>
      {!taskId ? (
        <View style={{ marginBottom: space.md }}>
          <Txt variant="label">Start from a template</Txt>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space.xs, paddingVertical: space.xs }}
          >
            {TASK_TEMPLATES.map((t) => (
              <Chip
                key={t.id}
                label={t.title}
                icon={t.icon}
                selected={input.title === t.title}
                onPress={() =>
                  setInput((p) =>
                    p
                      ? {
                          ...p,
                          title: t.title,
                          icon: t.icon,
                          stars: t.stars,
                          scheduleType: t.scheduleType,
                          weekdays: t.weekdays.length ? t.weekdays : p.weekdays,
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
        label="Job name"
        value={input.title}
        onChangeText={(t) => set('title', t)}
        placeholder="e.g. Feed the dog"
        maxLength={40}
        error={errors.title}
        showError={touched}
        hint="Short and simple — it's read aloud to your child."
        testID="task-title"
      />
      <IconPicker icons={TASK_ICONS} value={input.icon} onChange={(v) => set('icon', v)} />
      <Stepper
        label="Stars"
        value={input.stars}
        min={1}
        max={5}
        onChange={(v) => set('stars', v)}
        render={(v) => <StarRow count={v} size={26} />}
      />

      <Txt variant="label">For</Txt>
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginVertical: space.xs }}
      >
        {kids.map((k) => {
          const on = input.childIds.includes(k.id);
          return (
            <Pressy
              key={k.id}
              onPress={() =>
                set(
                  'childIds',
                  on ? input.childIds.filter((x) => x !== k.id) : [...input.childIds, k.id],
                )
              }
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={k.name}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.xs,
                padding: space.xxs,
                paddingRight: space.md,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: on ? k.color : colors.border,
                backgroundColor: on ? colors.surface : colors.surfaceAlt,
                minHeight: 48,
              }}
            >
              <Avatar avatar={k.avatar} color={on ? k.color : colors.locked} size={40} />
              <Txt variant="label">{k.name}</Txt>
              {on ? <Icon name="check" size={20} color={k.color} /> : null}
            </Pressy>
          );
        })}
      </View>
      {touched && errors.childIds ? (
        <ErrorText variant="caption">{errors.childIds}</ErrorText>
      ) : null}

      <View style={{ height: space.md }} />
      <Segmented
        label="How often"
        options={SCHEDULES}
        value={input.scheduleType}
        onChange={(v) =>
          setInput((p) => ({
            ...p,
            scheduleType: v,
            startDate: v === 'once' ? today : p.startDate,
          }))
        }
      />
      {input.scheduleType === 'weekdays' ? (
        <View style={{ marginBottom: space.md }}>
          <View style={{ flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' }}>
            {DAYS.map((d, i) => {
              const on = input.weekdays.includes(i);
              return (
                <Pressy
                  key={i}
                  onPress={() =>
                    set(
                      'weekdays',
                      on ? input.weekdays.filter((x) => x !== i) : [...input.weekdays, i],
                    )
                  }
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={DAY_NAMES[i]}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: on ? colors.hero : colors.surface,
                    borderWidth: 2,
                    borderColor: on ? colors.hero : colors.border,
                  }}
                >
                  <Txt variant="label" color={on ? colors.white : colors.ink}>
                    {d}
                  </Txt>
                </Pressy>
              );
            })}
          </View>
          {touched && errors.weekdays ? (
            <ErrorText variant="caption">{errors.weekdays}</ErrorText>
          ) : null}
        </View>
      ) : null}
      {input.scheduleType === 'once' ? (
        <Segmented
          label="When"
          value={
            input.startDate === today
              ? 'today'
              : input.startDate === addDays(today, 1)
                ? 'tomorrow'
                : 'other'
          }
          onChange={(v) => set('startDate', v === 'tomorrow' ? addDays(today, 1) : today)}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'tomorrow', label: 'Tomorrow' },
          ]}
        />
      ) : null}
      <Txt variant="caption" color={colors.inkSoft} style={{ marginBottom: space.sm }}>
        {describeSchedule({
          type: input.scheduleType,
          weekdays: input.weekdays,
          startDate: input.startDate,
        })}
        {input.scheduleType === 'once' ? ' — stays on the list until done.' : ''}
        {input.scheduleType === 'weekly' ? ' — can be done any day, once per week (Mon–Sun).' : ''}
      </Txt>

      <ToggleRow
        icon="account-check"
        label="Needs my approval"
        description="Stars are given after you check the job in Approvals."
        value={input.needsApproval}
        onChange={(v) => set('needsApproval', v)}
        testID="task-approval"
      />

      {error ? <ErrorText variant="body">{error}</ErrorText> : null}
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginTop: space.md }}>
        <Button
          label={taskId ? 'Save changes' : 'Add job'}
          icon="check"
          onPress={() => void save()}
          busy={busy}
          testID="task-save"
        />
        {task && !task.archivedAt ? (
          <Button
            label="Archive"
            icon="archive"
            tone="secondary"
            onPress={() => void setArchived(true)}
            disabled={busy}
          />
        ) : null}
        {task?.archivedAt ? (
          <Button
            label="Restore"
            icon="archive-arrow-up"
            tone="secondary"
            onPress={() => void setArchived(false)}
            disabled={busy}
          />
        ) : null}
      </View>
      {task ? (
        <Txt variant="caption" color={colors.inkSoft} style={{ marginTop: space.sm }}>
          Changes apply from today. Finished jobs in history keep their original name and stars.
        </Txt>
      ) : null}
    </View>
  );
}
