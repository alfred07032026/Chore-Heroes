import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card, SectionTitle } from '@/components/Card';
import { Field, Segmented, ToggleRow } from '@/components/Form';
import { MathGate } from '@/components/MathGate';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Toast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import { Txt } from '@/components/Txt';
import { cancelDailyReminder, scheduleDailyReminder } from '@/platform/notifications';
import { shareJsonFile } from '@/platform/share';
import { speak } from '@/platform/speech';
import { exportData, exportFileName, resetAllData } from '@/services/backup';
import { DEFAULT_SETTINGS } from '@/services/settings';
import { requireDb, useAppStore } from '@/state/appStore';
import { colors, space } from '@/theme/tokens';

const REMINDER_TIMES = [
  { value: '7:00', label: '7:00' },
  { value: '8:00', label: '8:00' },
  { value: '15:30', label: '3:30 pm' },
  { value: '17:00', label: '5:00 pm' },
  { value: '18:30', label: '6:30 pm' },
  { value: '19:30', label: '7:30 pm' },
];

export default function Settings() {
  const gatePassed = useAppStore((s) => s.settingsGatePassed);
  const passGate = useAppStore((s) => s.passSettingsGate);
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSetting);
  const [toast, setToast] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState('');
  const [busy, setBusy] = useState(false);

  if (!gatePassed) {
    return (
      <Screen header={<TopBar title="Settings" onBack={() => router.back()} />} maxWidth={560}>
        <Card>
          <MathGate onPass={passGate} onCancel={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  const reminderValue = `${settings.reminderHour}:${String(settings.reminderMinute).padStart(2, '0')}`;
  const setReminder = async (on: boolean, value = reminderValue) => {
    const [h, m] = value.split(':').map(Number);
    if (!on) {
      await cancelDailyReminder();
      await update('reminderOn', false);
      return;
    }
    const ok = await scheduleDailyReminder(h ?? 17, m ?? 0);
    if (!ok) {
      setToast(
        Platform.OS === 'web'
          ? 'Reminders work in the iPad/Android app.'
          : 'Please allow notifications in system Settings.',
      );
      await update('reminderOn', false);
      return;
    }
    await update('reminderHour', h ?? 17);
    await update('reminderMinute', m ?? 0);
    await update('reminderOn', true);
  };

  const doExport = async () => {
    setBusy(true);
    try {
      const data = await exportData(requireDb());
      const r = await shareJsonFile(exportFileName(), data);
      setToast(r === 'unavailable' ? 'Sharing is not available on this device.' : 'Export ready.');
    } catch (e) {
      setToast(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const doReset = async () => {
    setBusy(true);
    try {
      await cancelDailyReminder();
      await resetAllData(requireDb());
      const s = useAppStore.getState();
      s.replaceSettings(DEFAULT_SETTINGS);
      s.setSetupComplete(false);
      s.lockParent();
      s.bump();
      router.replace('/setup');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen header={<TopBar title="Settings" onBack={() => router.back()} />} maxWidth={820}>
        <SectionTitle>Sound & voice</SectionTitle>
        <Card>
          <ToggleRow
            icon="music-note"
            label="Sounds & vibration"
            description="Cheers, chimes and gentle taps."
            value={settings.soundOn}
            onChange={(v) => void update('soundOn', v)}
            testID="setting-sound"
          />
          <ToggleRow
            icon="account-voice"
            label="Read aloud"
            description="Speaks job names and messages for kids who are still learning to read."
            value={settings.voiceOn}
            onChange={(v) => {
              void update('voiceOn', v).then(() => v && speak('Read aloud is on!'));
            }}
            testID="setting-voice"
          />
        </Card>

        <SectionTitle>Comfort & accessibility</SectionTitle>
        <Card>
          <ToggleRow
            icon="motion-pause"
            label="Reduce motion"
            description="Turns off bouncing and flying stars. The device's own Reduce Motion setting is always respected too."
            value={settings.reduceMotion}
            onChange={(v) => void update('reduceMotion', v)}
            testID="setting-motion"
          />
          <ToggleRow
            icon="format-font"
            label="Dyslexia-friendly font"
            description="Uses OpenDyslexic for all text."
            value={settings.dyslexicFont}
            onChange={(v) => void update('dyslexicFont', v)}
            testID="setting-font"
          />
        </Card>

        <SectionTitle>Daily reminder</SectionTitle>
        <Card>
          <ToggleRow
            icon="bell-outline"
            label="Remind us each day"
            description="A local notification on this device. Nothing is sent anywhere."
            value={settings.reminderOn}
            onChange={(v) => void setReminder(v)}
          />
          {settings.reminderOn ? (
            <Segmented
              label="Time"
              value={reminderValue}
              options={REMINDER_TIMES}
              onChange={(v) => void setReminder(true, v)}
            />
          ) : null}
        </Card>

        <SectionTitle>Security</SectionTitle>
        <Card>
          <Button
            label="Change PIN"
            icon="lock-reset"
            tone="secondary"
            onPress={() => router.push('/parent/change-pin')}
          />
        </Card>

        <SectionTitle>Your data</SectionTitle>
        <Card style={{ gap: space.md }}>
          <Txt variant="body" color={colors.inkSoft}>
            All Chore Heroes data lives only on this device. Export a copy as a JSON file (via
            AirDrop, Files, email…), or erase everything.
          </Txt>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Button
              label="Export data"
              icon="export-variant"
              tone="secondary"
              onPress={() => void doExport()}
              busy={busy}
              testID="export"
            />
            <Button
              label="Erase all data"
              icon="delete-forever"
              tone="danger"
              onPress={() => setResetOpen(true)}
              testID="reset"
            />
          </View>
        </Card>

        <SectionTitle>Privacy</SectionTitle>
        <Card>
          <Txt variant="body">
            Chore Heroes has no ads, no analytics, no tracking, no accounts and makes no internet
            connections. Children&apos;s names and progress never leave this device unless you
            export them yourself.
          </Txt>
        </Card>
      </Screen>

      <Sheet visible={resetOpen} onClose={() => setResetOpen(false)}>
        <View style={{ gap: space.md }}>
          <Txt variant="title">Erase everything?</Txt>
          <Txt variant="body">
            This permanently deletes all children, jobs, rewards, stars, badges and your PIN from
            this device. It cannot be undone. Consider exporting first.
          </Txt>
          <Field
            label='Type "ERASE" to confirm'
            value={resetText}
            onChangeText={setResetText}
            autoCapitalize="characters"
            testID="reset-confirm"
          />
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Button label="Cancel" tone="secondary" onPress={() => setResetOpen(false)} />
            <Button
              label="Erase all data"
              tone="danger"
              icon="delete-forever"
              disabled={resetText.trim().toUpperCase() !== 'ERASE'}
              busy={busy}
              onPress={() => void doReset()}
              testID="reset-go"
            />
          </View>
        </View>
      </Sheet>
      <Toast message={toast} onHide={() => setToast(null)} />
    </View>
  );
}
