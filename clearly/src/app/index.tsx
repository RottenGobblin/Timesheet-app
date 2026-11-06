import { Redirect, router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import { PillButton } from '../components/PillButton';
import { buildDosePlan, type WaterStatus } from '../engine';
import { formatTestDate } from '../lib/dates';
import { formatLitres } from '../lib/number';
import { formatReading, READING_CONFIG, READING_ORDER } from '../lib/readings';
import { usePool } from '../state/PoolProvider';
import { useTests } from '../state/TestsProvider';
import { colours, fonts, radius, space } from '../theme';

const SANITISER_LABEL = { liquid: 'Liquid chlorine', granular: 'Granular chlorine', salt: 'Salt chlorinator' } as const;

const STATUS: Record<WaterStatus, { headline: string; colour: string; ink: string }> = {
  clear: { headline: 'Crystal clear, go jump in', colour: colours.success, ink: colours.successInk },
  tweak: { headline: 'Needs a tweak', colour: colours.warningSoft, ink: colours.warningInk },
  act: { headline: 'Act now', colour: colours.dangerSoft, ink: colours.danger },
};

// Interim Home: shows the latest test result until the water health card is built.
export default function Home() {
  const { pool, loading } = usePool();
  const { tests, loading: testsLoading } = useTests();

  if (loading || testsLoading) return null;
  if (!pool) return <Redirect href="/pool" />;

  const latest = tests[0];
  const plan = latest ? buildDosePlan(pool, latest.readings) : null;
  const status = plan ? STATUS[plan.status] : null;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Clearly</Text>

        {latest && plan && status ? (
          <Card>
            <View style={[styles.status, { backgroundColor: status.colour }]}>
              <Text style={[styles.headline, { color: status.ink }]}>{status.headline}</Text>
            </View>
            <Text style={styles.sub}>Last test: {formatTestDate(latest.takenAt)}</Text>
            <View style={styles.readings}>
              {READING_ORDER.map((k) => {
                const v = latest.readings[k];
                return (
                  <View key={k} style={styles.reading}>
                    <Text style={styles.readingLabel}>{READING_CONFIG[k].label}</Text>
                    <Text style={styles.readingValue}>{v === undefined ? '–' : formatReading(k, v)}</Text>
                  </View>
                );
              })}
            </View>
            <PillButton
              label={plan.steps.length > 0 ? 'See your plan' : 'See details'}
              variant="secondary"
              onPress={() => router.push('/plan')}
            />
          </Card>
        ) : (
          <Card title="No tests yet">
            <Text style={styles.sub}>Test your water and we’ll tell you exactly what it needs.</Text>
          </Card>
        )}

        <PillButton label="Test water" onPress={() => router.push('/test')} />
        {latest ? <PillButton label="History" variant="secondary" onPress={() => router.push('/history')} /> : null}

        <Card title={pool.name || 'Your pool'}>
          <Text style={styles.sub}>
            {formatLitres(pool.volumeLitres)} L, {SANITISER_LABEL[pool.sanitiser].toLowerCase()}, {pool.location}
          </Text>
          <PillButton label="Edit pool" variant="secondary" onPress={() => router.push('/pool')} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.background },
  content: { padding: space.md, gap: space.lg },
  title: { fontFamily: fonts.heading, fontSize: 36, color: colours.primary, marginTop: space.md },
  status: { borderRadius: radius.input, padding: space.md },
  headline: { fontFamily: fonts.heading, fontSize: 24 },
  sub: { fontFamily: fonts.body, fontSize: 16, color: colours.inkMuted, lineHeight: 22 },
  readings: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.md },
  reading: { width: '50%' },
  readingLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colours.inkMuted },
  readingValue: { fontFamily: fonts.bodySemi, fontSize: 24, color: colours.ink, fontVariant: ['tabular-nums'] },
});
