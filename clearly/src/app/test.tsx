import { Redirect, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PillButton } from '../components/PillButton';
import { ReadingRow } from '../components/ReadingRow';
import { Ripple } from '../components/Ripple';
import { getTargets, type ReadingKey, type Readings } from '../engine';
import { READING_ORDER, startingValue } from '../lib/readings';
import { usePool } from '../state/PoolProvider';
import { useTests } from '../state/TestsProvider';
import { TestValidationError } from '../storage';
import { colours, fonts, radius, space, TAP } from '../theme';

export default function TestScreen() {
  const { pool, loading: poolLoading } = usePool();
  const { tests, loading: testsLoading, add } = useTests();
  const insets = useSafeAreaInsets();

  const [readings, setReadings] = useState<Readings>({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [rippling, setRippling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const last = tests[0]?.readings;
  const targets = useMemo(() => (pool ? getTargets(pool, readings.cya) : null), [pool, readings.cya]);
  const entered = READING_ORDER.filter((k) => readings[k] !== undefined).length;

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);

  if (poolLoading || testsLoading) return null;
  if (!pool || !targets) return <Redirect href="/pool" />;

  function setReading(key: ReadingKey, value: number | undefined) {
    setError(null);
    setReadings((r) => {
      const next = { ...r };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  async function onSave() {
    if (entered === 0) return;
    setSaving(true);
    setError(null);
    try {
      await add({ readings, notes });
      setRippling(true);
    } catch (e) {
      setError(e instanceof TestValidationError ? e.message : 'Couldn’t save this test. Try again in a moment.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Test your water</Text>
            <Pressable accessibilityRole="button" onPress={leave} hitSlop={12} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
          <Text style={styles.intro}>
            Add each reading you tested. Hold − or + to move faster, or tap the number to type it.
          </Text>

          <View style={styles.scan} accessibilityState={{ disabled: true }} accessible accessibilityLabel="Scan strip, coming soon">
            <Text style={styles.scanText}>Scan strip</Text>
            <View style={styles.soon}>
              <Text style={styles.soonText}>Coming soon</Text>
            </View>
          </View>

          {READING_ORDER.map((key) => (
            <ReadingRow
              key={key}
              reading={key}
              value={readings[key]}
              onChange={(v) => setReading(key, v)}
              targets={targets}
              startValue={startingValue(key, targets, last)}
            />
          ))}

          <View style={styles.notes}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              accessibilityLabel="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Cloudy after the storm, lots of swimmers on the weekend…"
              placeholderTextColor={colours.inkMuted}
              multiline
              maxLength={280}
              style={styles.notesInput}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: space.md + insets.bottom }]}>
          <Text style={styles.count}>
            {entered === 0 ? 'Add at least one reading' : `${entered} of 4 readings`}
          </Text>
          <PillButton label="Save test" onPress={onSave} disabled={entered === 0 || saving} />
        </View>
      </KeyboardAvoidingView>
      {rippling ? <Ripple onDone={leave} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.background },
  flex: { flex: 1 },
  content: { padding: space.md, gap: space.md, paddingBottom: space.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  title: { fontFamily: fonts.heading, fontSize: 30, color: colours.ink, flexShrink: 1 },
  cancel: { minHeight: TAP, justifyContent: 'center', paddingHorizontal: space.sm },
  cancelText: { fontFamily: fonts.bodySemi, fontSize: 17, color: colours.primaryDark },
  intro: { fontFamily: fonts.body, fontSize: 16, color: colours.inkMuted, lineHeight: 22 },
  scan: {
    minHeight: TAP,
    borderRadius: radius.pill,
    backgroundColor: colours.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    opacity: 0.8,
  },
  scanText: { fontFamily: fonts.headingSemi, fontSize: 18, color: colours.inkMuted },
  soon: { backgroundColor: colours.surface, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  soonText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colours.inkMuted },
  notes: { gap: 8 },
  label: { fontFamily: fonts.bodySemi, fontSize: 16, color: colours.ink },
  notesInput: {
    minHeight: 96,
    borderRadius: radius.input,
    borderWidth: 2,
    borderColor: colours.border,
    backgroundColor: colours.surface,
    padding: 16,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colours.ink,
    textAlignVertical: 'top',
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colours.danger,
    backgroundColor: colours.dangerSoft,
    padding: space.md,
    borderRadius: radius.input,
  },
  footer: {
    padding: space.md,
    gap: space.sm,
    backgroundColor: colours.background,
    borderTopWidth: 1,
    borderTopColor: colours.border,
  },
  count: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colours.inkMuted, textAlign: 'center' },
});
