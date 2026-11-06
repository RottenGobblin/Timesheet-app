import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import { PillButton } from '../components/PillButton';
import { Segmented } from '../components/Segmented';
import { TestRow } from '../components/TestRow';
import { TrendChart } from '../components/TrendChart';
import { getTargets, type ReadingKey } from '../engine';
import { inPeriod, seriesFor, xRangeFor, type Period } from '../lib/chart';
import { READING_CONFIG, READING_ORDER } from '../lib/readings';
import { usePool } from '../state/PoolProvider';
import { useTests } from '../state/TestsProvider';
import { colours, fonts, radius, space, TAP } from '../theme';

const PERIODS: { value: Period; label: string }[] = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All' },
];

export default function HistoryScreen() {
  const { pool, loading: poolLoading } = usePool();
  const { tests, loading: testsLoading, updateNotes, remove } = useTests();
  const [period, setPeriod] = useState<Period>('30d');
  const [shown, setShown] = useState<ReadingKey[]>(['fc', 'ph']);
  const [now] = useState(() => new Date());

  // Chlorine's ideal zone depends on stabiliser, so use the most recent stabiliser reading.
  const latestCya = useMemo(() => tests.find((t) => t.readings.cya !== undefined)?.readings.cya, [tests]);

  if (poolLoading || testsLoading) return null;
  if (!pool) return <Redirect href="/pool" />;

  const targets = getTargets(pool, latestCya);

  function toggle(key: ReadingKey) {
    setShown((s) => (s.includes(key) ? s.filter((k) => k !== key) : READING_ORDER.filter((k) => k === key || s.includes(k))));
  }

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
          <Pressable accessibilityRole="button" onPress={leave} hitSlop={12} style={styles.close}>
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
        </View>

        {tests.length === 0 ? (
          <Card title="Nothing here yet">
            <Text style={styles.body}>Your tests will show up here, with trends once you have a few.</Text>
            <PillButton label="Test water" onPress={() => router.replace('/test')} />
          </Card>
        ) : (
          <>
            <Segmented options={PERIODS} value={period} onChange={(v) => setPeriod(v)} accessibilityLabel="Time period" />

            <View style={styles.chips} accessibilityLabel="Readings to chart">
              {READING_ORDER.map((k) => {
                const on = shown.includes(k);
                return (
                  <Pressable
                    key={k}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`Show ${READING_CONFIG[k].label}`}
                    onPress={() => toggle(k)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{READING_CONFIG[k].label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {shown.map((k) => {
              const points = inPeriod(seriesFor(tests, k), period, now);
              return (
                <TrendChart key={k} reading={k} points={points} band={targets[k]} xRange={xRangeFor(points, period, now)} />
              );
            })}
            {shown.length > 0 ? (
              <Text style={styles.legend}>Lime band is the ideal range. Coral dots were outside it.</Text>
            ) : null}

            <Text style={styles.section}>Past tests</Text>
            {tests.map((t, i) => (
              <TestRow
                key={t.id}
                test={t}
                pool={pool}
                isLatest={i === 0}
                onOpenPlan={() => router.push('/plan')}
                onSaveNotes={(notes) => updateNotes(t.id, notes)}
                onDelete={() => remove(t.id)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.background },
  content: { padding: space.md, gap: space.md, paddingBottom: space.xl * 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  title: { fontFamily: fonts.heading, fontSize: 30, color: colours.ink },
  close: { minHeight: TAP, justifyContent: 'center', paddingHorizontal: space.sm },
  closeText: { fontFamily: fonts.bodySemi, fontSize: 17, color: colours.primaryDark },
  body: { fontFamily: fonts.body, fontSize: 16, color: colours.ink, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colours.primary,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colours.primary },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colours.primaryDark },
  chipTextOn: { color: colours.surface },
  legend: { fontFamily: fonts.body, fontSize: 13, color: colours.inkMuted, textAlign: 'center' },
  section: { fontFamily: fonts.heading, fontSize: 22, color: colours.ink, marginTop: space.md },
});
