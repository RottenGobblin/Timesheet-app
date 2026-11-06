import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DoseStep } from '../engine';
import { formatClock, formatDuration, type StepState } from '../lib/planProgress';
import { colours, fonts, radius, space } from '../theme';
import { TickBox } from './TickBox';

interface Props {
  step: DoseStep;
  number: number;
  state: StepState;
  now: Date;
  canUndo: boolean;
  onTick(): void;
  onUndo(): void;
}

function amountText(step: DoseStep): string {
  if (step.kind === 'drain') return `Drain about ${step.drainPercent}%`;
  return step.amount?.display ?? '';
}

function waitText(step: DoseStep): string | null {
  if (step.waitHours > 0) return `Then wait ${step.waitHours} hours before the next step.`;
  return null;
}

export function StepCard({ step, number, state, now, canUndo, onTick, onUndo }: Props) {
  const done = state.status === 'done';
  const locked = state.status === 'locked';

  return (
    <View style={[styles.card, done && styles.cardDone, locked && styles.cardLocked]}>
      <View style={styles.top}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{number}</Text>
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.chemical}>{step.chemical}</Text>
          <Text style={styles.amount}>{amountText(step)}</Text>
        </View>
        <TickBox
          checked={done}
          disabled={done ? !canUndo : state.status !== 'ready'}
          onPress={done ? onUndo : onTick}
          accessibilityLabel={`Step ${number}: ${step.chemical}, ${amountText(step)}`}
        />
      </View>

      {state.status === 'waiting' ? (
        <View style={styles.timer} accessibilityLiveRegion="polite">
          <Text style={styles.timerText}>
            Ready at {formatClock(state.readyAt, now)} ({formatDuration(state.readyAt.getTime() - now.getTime())} to go)
          </Text>
        </View>
      ) : null}

      {state.status === 'ready' && state.eveningHint ? (
        <View style={styles.hint}>
          <Text style={styles.hintText}>Best done this evening, when the sun won’t burn it off.</Text>
        </View>
      ) : null}

      {done ? (
        <View style={styles.doneRow}>
          <Text style={styles.doneText}>Done at {formatClock(state.doneAt, now)}</Text>
          {canUndo ? (
            <Pressable accessibilityRole="button" onPress={onUndo} hitSlop={12}>
              <Text style={styles.undo}>Undo</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={styles.why}>{step.why}</Text>
          <Text style={styles.howLabel}>How</Text>
          <Text style={styles.how}>{step.how}</Text>
          {step.notes.map((n) => (
            <Text key={n} style={styles.note}>
              {n}
            </Text>
          ))}
          {waitText(step) ? <Text style={styles.wait}>{waitText(step)}</Text> : null}
          {locked ? <Text style={styles.lockedText}>Finish step {number - 1} first.</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colours.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colours.border,
    padding: space.md,
    gap: space.md,
  },
  cardDone: { backgroundColor: '#F4FBE6', borderColor: colours.success },
  cardLocked: { opacity: 0.6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colours.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.heading, fontSize: 16, color: colours.primaryDark },
  titleWrap: { flex: 1, gap: 2 },
  chemical: { fontFamily: fonts.bodySemi, fontSize: 16, color: colours.ink },
  amount: { fontFamily: fonts.heading, fontSize: 28, color: colours.ink },
  timer: { backgroundColor: colours.primarySoft, borderRadius: radius.input, padding: space.md },
  timerText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colours.primaryDark },
  hint: { backgroundColor: colours.background, borderRadius: radius.input, padding: space.md },
  hintText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colours.ink },
  body: { gap: space.sm },
  why: { fontFamily: fonts.body, fontSize: 16, color: colours.ink, lineHeight: 22 },
  howLabel: { fontFamily: fonts.heading, fontSize: 15, color: colours.ink, marginTop: space.xs },
  how: { fontFamily: fonts.body, fontSize: 15, color: colours.inkMuted, lineHeight: 21 },
  note: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colours.ink, lineHeight: 20 },
  wait: { fontFamily: fonts.bodySemi, fontSize: 14, color: colours.primaryDark },
  lockedText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colours.inkMuted },
  doneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  doneText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colours.successInk },
  undo: { fontFamily: fonts.bodySemi, fontSize: 15, color: colours.primaryDark, textDecorationLine: 'underline' },
});
