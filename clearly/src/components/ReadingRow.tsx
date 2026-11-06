import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ReadingKey, Targets } from '../engine';
import { parseNumber } from '../lib/number';
import {
  bandScale,
  clampReading,
  formatReading,
  markerPosition,
  READING_CONFIG,
  stepReading,
  verdict,
  type Severity,
} from '../lib/readings';
import { colours, fonts, radius, space, TAP } from '../theme';
import { BandBar } from './BandBar';
import { RepeatButton } from './RepeatButton';

const MESSAGE_COLOUR: Record<Severity, string> = {
  good: colours.successInk,
  adjust: colours.warningInk,
  danger: colours.danger,
};

interface Props {
  reading: ReadingKey;
  value: number | undefined;
  onChange(value: number | undefined): void;
  targets: Targets;
  /** Where the value starts when the owner adds this reading. */
  startValue: number;
}

export function ReadingRow({ reading, value, onChange, targets, startValue }: Props) {
  const cfg = READING_CONFIG[reading];
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');

  if (value === undefined) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.label}>{cfg.label}</Text>
          <Text style={styles.untested}>Not tested</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${cfg.label} reading`}
          onPress={() => onChange(startValue)}
          style={({ pressed }) => [styles.add, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.addText}>+ Add reading</Text>
        </Pressable>
      </View>
    );
  }

  const v = verdict(reading, value, targets);
  const scale = bandScale(reading, targets);
  const shown = formatReading(reading, value);

  function commitDraft() {
    const parsed = parseNumber(draft);
    if (parsed !== undefined) onChange(clampReading(reading, parsed));
    setTyping(false);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>{cfg.label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Clear ${cfg.label}`}
          onPress={() => onChange(undefined)}
          hitSlop={12}
          style={styles.clear}
        >
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <RepeatButton
          symbol="−"
          accessibilityLabel={`Lower ${cfg.label}`}
          onStep={() => onChange(stepReading(reading, value, -1))}
        />
        {typing ? (
          <TextInput
            autoFocus
            value={draft}
            onChangeText={setDraft}
            onBlur={commitDraft}
            onSubmitEditing={commitDraft}
            keyboardType="decimal-pad"
            inputMode="decimal"
            returnKeyType="done"
            selectTextOnFocus
            accessibilityLabel={`${cfg.label} value`}
            style={[styles.value, styles.valueInput]}
          />
        ) : (
          <Pressable
            accessibilityRole="adjustable"
            accessibilityLabel={`${cfg.label}, ${[shown, cfg.unit].filter(Boolean).join(' ')}. ${v.message}. Tap to type a value.`}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) =>
              onChange(stepReading(reading, value, e.nativeEvent.actionName === 'increment' ? 1 : -1))
            }
            onPress={() => {
              setDraft(shown);
              setTyping(true);
            }}
            style={styles.valueWrap}
          >
            <Text style={styles.value}>{shown}</Text>
            {cfg.unit ? <Text style={styles.unit}>{cfg.unit}</Text> : null}
          </Pressable>
        )}
        <RepeatButton
          symbol="+"
          accessibilityLabel={`Raise ${cfg.label}`}
          onStep={() => onChange(stepReading(reading, value, 1))}
        />
      </View>

      <BandBar scale={scale} position={markerPosition(value, scale)} severity={v.severity} />
      <Text style={[styles.message, { color: MESSAGE_COLOUR[v.severity] }]}>{v.message}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 },
  label: { fontFamily: fonts.heading, fontSize: 20, color: colours.ink },
  untested: { fontFamily: fonts.body, fontSize: 15, color: colours.inkMuted },
  clear: { paddingHorizontal: space.sm },
  clearText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colours.inkMuted },
  add: {
    minHeight: TAP,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colours.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontFamily: fonts.headingSemi, fontSize: 18, color: colours.primaryDark },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  valueWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: TAP },
  value: {
    fontFamily: fonts.bodySemi,
    fontSize: 44,
    color: colours.ink,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  valueInput: {
    flex: 1,
    minWidth: 0,
    borderBottomWidth: 3,
    borderColor: colours.primary,
    paddingVertical: 0,
  },
  unit: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colours.inkMuted, marginTop: -4 },
  message: { fontFamily: fonts.bodyMedium, fontSize: 15, textAlign: 'center' },
});
