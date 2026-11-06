import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import { PillButton } from '../components/PillButton';
import { RepeatButton } from '../components/RepeatButton';
import { Segmented, type SegmentOption } from '../components/Segmented';
import { ToggleRow } from '../components/ToggleRow';
import { formatHour, stepHour } from '../lib/dates';
import { formatLitres } from '../lib/number';
import { hasPermission } from '../notifications';
import { usePool } from '../state/PoolProvider';
import { useReminders } from '../state/RemindersProvider';
import { useSettings } from '../state/SettingsProvider';
import type { AppSettings, ReminderTime, TimesPerWeek } from '../storage';
import { fonts, makeStyles, radius, space, TAP } from '../theme';

const PER_WEEK: SegmentOption<'1' | '2' | '3'>[] = [
  { value: '1', label: 'Once' },
  { value: '2', label: 'Twice' },
  { value: '3', label: '3 times' },
];

const TIMES: SegmentOption<ReminderTime>[] = [
  { value: 'morning', label: 'Morning, 8 am' },
  { value: 'evening', label: 'Evening, 6 pm' },
];

const SANITISER_LABEL = { liquid: 'liquid chlorine', granular: 'granular chlorine', salt: 'salt chlorinator' } as const;

const DISCLAIMER =
  'Doses are guidance based on the readings entered. Always follow the product label, and check with a pool professional if unsure.';

function scheduleSummary(s: AppSettings['testSchedule']): string {
  const words = { 1: 'once', 2: 'twice', 3: '3 times' } as const;
  return `${words[s.summer]} a week in summer, ${words[s.winter]} a week in winter`;
}

export default function SettingsScreen() {
  const styles = useStyles();
  const { pool, loading } = usePool();
  const { settings, update } = useSettings();
  const { requestAndSync } = useReminders();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const checkPermission = useCallback(() => {
    hasPermission().then(setAllowed).catch(() => setAllowed(false));
  }, []);

  // Re-check when coming back from the phone's settings app.
  useEffect(() => {
    checkPermission();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkPermission();
    });
    return () => sub.remove();
  }, [checkPermission]);

  if (loading) return null;
  if (!pool) return <Redirect href="/pool" />;

  const anyReminders = settings.reminders.test || settings.reminders.doseFollowUps || settings.reminders.overdue;

  async function setReminder(key: keyof AppSettings['reminders'], value: boolean) {
    await update((s) => ({ ...s, reminders: { ...s.reminders, [key]: value } }));
    if (value) {
      await requestAndSync().catch(() => 0);
      checkPermission();
    }
  }

  function setSchedule(patch: Partial<AppSettings['testSchedule']>) {
    update((s) => ({ ...s, testSchedule: { ...s.testSchedule, ...patch } }));
  }

  function setQuiet(key: 'startHour' | 'endHour', by: number) {
    update((s) => ({ ...s, quietHours: { ...s.quietHours, [key]: stepHour(s.quietHours[key], by) } }));
  }

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Pressable accessibilityRole="button" onPress={leave} hitSlop={12} style={styles.close}>
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
        </View>

        <Card title={pool.name || 'Your pool'}>
          <Text style={styles.body}>
            {formatLitres(pool.volumeLitres)} L, {SANITISER_LABEL[pool.sanitiser]}, {pool.location}
          </Text>
          <PillButton label="Edit pool and products" variant="secondary" onPress={() => router.push('/pool')} />
        </Card>

        <Card title="Reminders">
          {Platform.OS === 'web' ? (
            <Text style={styles.notice}>Reminders work in the app on your phone, not in a browser.</Text>
          ) : allowed === false && anyReminders ? (
            <View style={styles.noticeBox}>
              <Text style={styles.notice}>
                Notifications are off for Clearly, so reminders can{'’'}t reach you. Turn them on in your phone{'’'}s
                settings.
              </Text>
              <PillButton
                label="Allow notifications"
                variant="secondary"
                onPress={() => requestAndSync().finally(checkPermission)}
              />
            </View>
          ) : null}

          <ToggleRow
            label="Test reminders"
            description={settings.reminders.test ? `Currently ${scheduleSummary(settings.testSchedule)}.` : 'Off'}
            value={settings.reminders.test}
            onChange={(v) => setReminder('test', v)}
          />
          {settings.reminders.test ? (
            <View style={styles.indent}>
              <Text style={styles.label}>Summer (November to March)</Text>
              <Segmented
                options={PER_WEEK}
                value={String(settings.testSchedule.summer) as '1' | '2' | '3'}
                onChange={(v) => setSchedule({ summer: Number(v) as TimesPerWeek })}
                accessibilityLabel="Summer tests per week"
              />
              <Text style={styles.label}>Winter (April to October)</Text>
              <Segmented
                options={PER_WEEK}
                value={String(settings.testSchedule.winter) as '1' | '2' | '3'}
                onChange={(v) => setSchedule({ winter: Number(v) as TimesPerWeek })}
                accessibilityLabel="Winter tests per week"
              />
              <Text style={styles.label}>Remind me in the</Text>
              <Segmented
                options={TIMES}
                value={settings.testSchedule.time}
                onChange={(v) => setSchedule({ time: v })}
                accessibilityLabel="Reminder time"
              />
            </View>
          ) : null}

          <View style={styles.divider} />
          <ToggleRow
            label="Dose follow-ups"
            description="When a step's wait is up, e.g. 4 hours after acid, ready for the chlorine."
            value={settings.reminders.doseFollowUps}
            onChange={(v) => setReminder('doseFollowUps', v)}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="Overdue check-in"
            description="One nudge if it's been 10 days since your last test."
            value={settings.reminders.overdue}
            onChange={(v) => setReminder('overdue', v)}
          />
        </Card>

        <Card title="Quiet hours">
          <Text style={styles.body}>No reminders between these times. Anything due then waits until they end.</Text>
          <HourRow
            label="From"
            hour={settings.quietHours.startHour}
            onStep={(by) => setQuiet('startHour', by)}
          />
          <HourRow label="Until" hour={settings.quietHours.endHour} onStep={(by) => setQuiet('endHour', by)} />
        </Card>

        <Card title="Display">
          <ToggleRow
            label="Sun mode"
            description="Higher contrast, for reading at the pool in bright sun."
            value={settings.sunMode}
            onChange={(v) => update((s) => ({ ...s, sunMode: v }))}
          />
        </Card>

        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function HourRow({ label, hour, onStep }: { label: string; hour: number; onStep(by: number): void }) {
  const styles = useStyles();
  return (
    <View style={styles.hourRow}>
      <Text style={styles.hourLabel}>{label}</Text>
      <RepeatButton symbol="−" accessibilityLabel={`${label} earlier`} onStep={() => onStep(-1)} size={TAP} />
      <Text style={styles.hourValue} accessibilityLiveRegion="polite">
        {formatHour(hour)}
      </Text>
      <RepeatButton symbol="+" accessibilityLabel={`${label} later`} onStep={() => onStep(1)} size={TAP} />
    </View>
  );
}

const useStyles = makeStyles((colours) => ({
  screen: { flex: 1, backgroundColor: colours.background },
  content: { padding: space.md, gap: space.md, paddingBottom: space.xl * 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  title: { fontFamily: fonts.heading, fontSize: 30, color: colours.ink },
  close: { minHeight: TAP, justifyContent: 'center', paddingHorizontal: space.sm },
  closeText: { fontFamily: fonts.bodySemi, fontSize: 17, color: colours.primaryDark },
  body: { fontFamily: fonts.body, fontSize: 16, color: colours.ink, lineHeight: 22 },
  label: { fontFamily: fonts.bodySemi, fontSize: 15, color: colours.ink, marginTop: space.xs },
  indent: { gap: space.sm },
  divider: { height: 1, backgroundColor: colours.muted },
  noticeBox: { gap: space.sm, backgroundColor: colours.warningSoft, borderRadius: radius.input, padding: space.md },
  notice: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colours.ink, lineHeight: 21 },
  hourRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  hourLabel: { fontFamily: fonts.bodySemi, fontSize: 17, color: colours.ink, width: 56 },
  hourValue: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.bodySemi,
    fontSize: 24,
    color: colours.ink,
    fontVariant: ['tabular-nums'],
  },
  disclaimer: { fontFamily: fonts.body, fontSize: 13, color: colours.inkMuted, lineHeight: 18, marginTop: space.md },
}));
