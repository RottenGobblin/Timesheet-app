import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { buildDosePlan, getTargets, type PoolProfile, type WaterStatus } from '../engine';
import { formatTestDate } from '../lib/dates';
import { formatReading, READING_CONFIG, READING_ORDER, verdict, type Severity } from '../lib/readings';
import type { TestRecord } from '../storage';
import { colours, fonts, radius, space, TAP } from '../theme';
import { PillButton } from './PillButton';

const STATUS: Record<WaterStatus, { label: string; bg: string; ink: string }> = {
  clear: { label: 'Crystal clear', bg: colours.success, ink: colours.successInk },
  tweak: { label: 'Needed a tweak', bg: colours.warningSoft, ink: colours.warningInk },
  act: { label: 'Act now', bg: colours.dangerSoft, ink: colours.danger },
};

const VALUE_COLOUR: Record<Severity, string> = {
  good: colours.ink,
  adjust: colours.warningInk,
  danger: colours.danger,
};

interface Props {
  test: TestRecord;
  pool: PoolProfile;
  isLatest: boolean;
  onOpenPlan(): void;
  onSaveNotes(notes: string): Promise<void>;
  onDelete(): Promise<void>;
}

export function TestRow({ test, pool, isLatest, onOpenPlan, onSaveNotes, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(test.notes);
  const [confirming, setConfirming] = useState(false);

  const targets = getTargets(pool, test.readings.cya);
  const status = STATUS[buildDosePlan(pool, test.readings).status];
  const summary = READING_ORDER.map((k) => {
    const v = test.readings[k];
    return v === undefined ? `${READING_CONFIG[k].label} not tested` : `${READING_CONFIG[k].label} ${formatReading(k, v)}`;
  }).join(', ');

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${formatTestDate(test.takenAt)}. ${status.label}. ${summary}.${test.notes ? ` Notes: ${test.notes}` : ''}`}
        onPress={() => {
          setOpen((o) => !o);
          setConfirming(false);
        }}
        style={styles.summary}
      >
        <View style={styles.top}>
          <Text style={styles.date}>{formatTestDate(test.takenAt)}</Text>
          <View style={[styles.pill, { backgroundColor: status.bg }]}>
            <Text style={[styles.pillText, { color: status.ink }]}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.values}>
          {READING_ORDER.map((k) => {
            const v = test.readings[k];
            const colour = v === undefined ? colours.inkMuted : VALUE_COLOUR[verdict(k, v, targets).severity];
            return (
              <View key={k} style={styles.value}>
                <Text style={styles.valueLabel}>{k === 'fc' ? 'FC' : k === 'ph' ? 'pH' : k === 'ta' ? 'TA' : 'CYA'}</Text>
                <Text style={[styles.valueText, { color: colour }]}>{v === undefined ? '–' : formatReading(k, v)}</Text>
              </View>
            );
          })}
        </View>
        {test.notes && !editing ? (
          <Text style={styles.notes} numberOfLines={open ? undefined : 1}>
            {test.notes}
          </Text>
        ) : null}
      </Pressable>

      {open ? (
        <View style={styles.actions}>
          {editing ? (
            <View style={styles.editWrap}>
              <TextInput
                accessibilityLabel="Notes"
                value={draft}
                onChangeText={setDraft}
                autoFocus
                multiline
                maxLength={280}
                placeholder="Add a note"
                placeholderTextColor={colours.inkMuted}
                style={styles.input}
              />
              <View style={styles.row}>
                <PillButton
                  label="Cancel"
                  variant="secondary"
                  style={styles.flex}
                  onPress={() => {
                    setDraft(test.notes);
                    setEditing(false);
                  }}
                />
                <PillButton
                  label="Save note"
                  style={styles.flex}
                  onPress={async () => {
                    await onSaveNotes(draft);
                    setEditing(false);
                  }}
                />
              </View>
            </View>
          ) : confirming ? (
            <View style={styles.editWrap}>
              <Text style={styles.confirmText}>Delete this test? This can’t be undone.</Text>
              <View style={styles.row}>
                <PillButton label="Keep it" variant="secondary" style={styles.flex} onPress={() => setConfirming(false)} />
                <Pressable
                  accessibilityRole="button"
                  onPress={onDelete}
                  style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.row}>
              {isLatest ? <TextAction label="See plan" onPress={onOpenPlan} /> : null}
              <TextAction label={test.notes ? 'Edit note' : 'Add note'} onPress={() => setEditing(true)} />
              <TextAction label="Delete" onPress={() => setConfirming(true)} danger />
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function TextAction({ label, onPress, danger }: { label: string; onPress(): void; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.textAction} hitSlop={4}>
      <Text style={[styles.textActionLabel, danger && { color: colours.danger }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colours.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: 'hidden',
  },
  summary: { padding: space.md, gap: space.sm },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  date: { fontFamily: fonts.bodySemi, fontSize: 16, color: colours.ink, flexShrink: 1 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 12 },
  values: { flexDirection: 'row' },
  value: { flex: 1 },
  valueLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colours.inkMuted },
  valueText: { fontFamily: fonts.bodySemi, fontSize: 20, fontVariant: ['tabular-nums'] },
  notes: { fontFamily: fonts.body, fontSize: 14, color: colours.inkMuted, fontStyle: 'italic' },
  actions: { borderTopWidth: 1, borderTopColor: colours.border, padding: space.sm },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  flex: { flex: 1 },
  textAction: { flex: 1, minHeight: TAP - 8, alignItems: 'center', justifyContent: 'center' },
  textActionLabel: { fontFamily: fonts.bodySemi, fontSize: 15, color: colours.primaryDark },
  editWrap: { gap: space.sm, padding: space.xs },
  input: {
    minHeight: 72,
    borderRadius: radius.input,
    borderWidth: 2,
    borderColor: colours.border,
    padding: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colours.ink,
    textAlignVertical: 'top',
  },
  confirmText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colours.ink, textAlign: 'center' },
  deleteButton: {
    flex: 1,
    minHeight: TAP,
    borderRadius: radius.pill,
    backgroundColor: colours.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: { fontFamily: fonts.headingSemi, fontSize: 18, color: colours.surface },
});
