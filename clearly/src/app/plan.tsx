import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import { PillButton } from '../components/PillButton';
import { Splash } from '../components/Splash';
import { StepCard } from '../components/StepCard';
import { WarningCard } from '../components/WarningCard';
import { buildDosePlan, type DoseStep, type WaterStatus } from '../engine';
import { formatTestDate } from '../lib/dates';
import { followUpFor } from '../lib/followUps';
import { allDone, canUntick, formatClock, stepStates, tick, untick, type Ticks } from '../lib/planProgress';
import { cancelReminder, scheduleFollowUp } from '../notifications';
import { usePool } from '../state/PoolProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTests } from '../state/TestsProvider';
import { loadAnyProgress, loadProgress, saveProgress, type PlanProgress } from '../storage';
import { asyncStore } from '../storage/asyncStore';
import { fonts, makeStyles, radius, space, statusColours, TAP, useColours } from '../theme';

const HEADLINE: Record<WaterStatus, string> = {
  clear: 'Crystal clear, go jump in',
  tweak: 'Needs a tweak',
  act: 'Act now',
};

const DISCLAIMER =
  'Doses are guidance based on the readings entered. Always follow the product label, and check with a pool professional if unsure.';

/** Re-render often enough for countdowns to stay accurate to the minute. */
function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function finishedMessage(steps: DoseStep[]): string {
  if (steps.some((s) => s.kind === 'drain')) {
    return 'Once the pool is refilled and has run for a few hours, test again for a fresh plan.';
  }
  if (steps.some((s) => s.kind === 'raise-stabiliser')) {
    return 'Retest tomorrow to check everything has landed. Leave stabiliser for a week before testing it again.';
  }
  return 'Retest tomorrow to check everything has landed.';
}

export default function PlanScreen() {
  const styles = useStyles();
  const colours = useColours();
  const { testId } = useLocalSearchParams<{ testId?: string }>();
  const { pool, loading: poolLoading } = usePool();
  const { tests, loading: testsLoading } = useTests();
  const { settings } = useSettings();
  const now = useNow();

  const test = testId ? tests.find((t) => t.id === testId) : tests[0];
  const plan = useMemo(() => (pool && test ? buildDosePlan(pool, test.readings) : null), [pool, test]);

  const [progress, setProgress] = useState<PlanProgress | null>(null);
  const [reminderNote, setReminderNote] = useState<string | null>(null);
  const [justFinished, setJustFinished] = useState(false);
  const busy = useRef(false);

  // Load progress for this test. If the saved progress is for an older test, cancel its reminder.
  useEffect(() => {
    if (!test) return;
    let cancelled = false;
    (async () => {
      const previous = await loadAnyProgress(asyncStore).catch(() => null);
      if (previous && previous.testId !== test.id && previous.reminderId) {
        await cancelReminder(previous.reminderId);
        await saveProgress(asyncStore, { testId: previous.testId, ticks: previous.ticks }).catch(() => undefined);
      }
      const p = await loadProgress(asyncStore, test.id).catch(() => ({ testId: test.id, ticks: {} }));
      if (!cancelled) setProgress(p);
    })();
    return () => {
      cancelled = true;
    };
  }, [test]);

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);

  const applyTicks = useCallback(
    async (ticks: Ticks) => {
      if (!progress || !plan || busy.current) return;
      busy.current = true;
      try {
        await cancelReminder(progress.reminderId);
        const followUp = settings.reminders.doseFollowUps ? followUpFor(plan.steps, ticks, settings.quietHours) : null;
        const reminderId = followUp ? await scheduleFollowUp(followUp) : null;
        const next: PlanProgress = { testId: progress.testId, ticks };
        if (reminderId) next.reminderId = reminderId;
        setProgress(next);
        await saveProgress(asyncStore, next).catch(() => undefined);

        if (followUp && reminderId) {
          setReminderNote(`We'll remind you at ${formatClock(followUp.at, new Date())}.`);
        } else if (followUp && Platform.OS !== 'web') {
          setReminderNote('Turn on notifications for Clearly to get a reminder when the wait is up.');
        } else {
          setReminderNote(null);
        }
        setJustFinished(allDone(stepStates(plan.steps, ticks, new Date())));
      } finally {
        busy.current = false;
      }
    },
    [progress, plan, settings],
  );

  if (poolLoading || testsLoading) return null;
  if (!pool) return <Redirect href="/pool" />;
  if (!test || !plan) return <Redirect href="/" />;

  const status = { headline: HEADLINE[plan.status], ...statusColours(colours, plan.status) };
  const ticks = progress?.ticks ?? {};
  const states = stepStates(plan.steps, ticks, now);
  const finished = allDone(states);
  const hasSteps = plan.steps.length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Your plan</Text>
          <Pressable accessibilityRole="button" onPress={leave} hitSlop={12} style={styles.close}>
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
        </View>

        <View style={[styles.status, { backgroundColor: finished ? colours.success : status.bg }]}>
          <Text style={[styles.headline, { color: finished ? colours.successInk : status.ink }]}>
            {finished ? 'Clearly sorted' : status.headline}
          </Text>
          <Text style={styles.statusSub}>
            Test: {formatTestDate(test.takenAt, now)}
            {hasSteps && !finished ? `. ${plan.steps.length} ${plan.steps.length === 1 ? 'step' : 'steps'}, in this order.` : '.'}
          </Text>
        </View>

        {plan.warnings.map((w) => (
          <WarningCard key={w.code} warning={w} />
        ))}

        {!hasSteps && plan.status === 'clear' ? (
          <Card>
            <Text style={styles.body}>Nothing to add. Your water is balanced, so enjoy it.</Text>
          </Card>
        ) : null}

        {plan.steps.map((step, i) => (
          <StepCard
            key={step.kind}
            step={step}
            number={i + 1}
            state={states[i]!}
            now={now}
            canUndo={canUntick(states, i)}
            onTick={() => applyTicks(tick(ticks, step.kind, new Date()))}
            onUndo={() => applyTicks(untick(ticks, step.kind))}
          />
        ))}

        {reminderNote && !finished ? (
          <Text style={styles.reminder} accessibilityLiveRegion="polite">
            {reminderNote}
          </Text>
        ) : null}

        {finished ? (
          <View>
            {justFinished ? <Splash /> : null}
            <Card title="Clearly sorted">
              <Text style={styles.body}>{finishedMessage(plan.steps)}</Text>
              <PillButton label="Back to home" onPress={leave} />
            </Card>
          </View>
        ) : null}

        {test.notes ? (
          <Card title="Your notes">
            <Text style={styles.body}>{test.notes}</Text>
          </Card>
        ) : null}

        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colours) => ({
  screen: { flex: 1, backgroundColor: colours.background },
  content: { padding: space.md, gap: space.md, paddingBottom: space.xl * 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  title: { fontFamily: fonts.heading, fontSize: 30, color: colours.ink },
  close: { minHeight: TAP, justifyContent: 'center', paddingHorizontal: space.sm },
  closeText: { fontFamily: fonts.bodySemi, fontSize: 17, color: colours.primaryDark },
  status: { borderRadius: radius.card, padding: space.lg, gap: space.xs },
  headline: { fontFamily: fonts.heading, fontSize: 26 },
  statusSub: { fontFamily: fonts.body, fontSize: 15, color: colours.ink },
  body: { fontFamily: fonts.body, fontSize: 16, color: colours.ink, lineHeight: 22 },
  reminder: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colours.primaryDark, textAlign: 'center' },
  disclaimer: { fontFamily: fonts.body, fontSize: 13, color: colours.inkMuted, lineHeight: 18, marginTop: space.md },
}));
