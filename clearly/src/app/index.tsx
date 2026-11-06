import { Redirect, router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import { PillButton } from '../components/PillButton';
import { buildDosePlan, type WaterStatus } from '../engine';
import { formatTestDate } from '../lib/dates';
import { formatLitres } from '../lib/number';
import { formatReading, READING_CONFIG, READING_ORDER } from '../lib/readings';
import { usePool } from '../state/PoolProvider';
import { useTests } from '../state/TestsProvider';
import { fonts, makeStyles, radius, space, statusColours, useColours } from '../theme';

const SANITISER_LABEL = { liquid: 'Liquid chlorine', granular: 'Granular chlorine', salt: 'Salt chlorinator' } as const;

const HEADLINE: Record<WaterStatus, string> = {
  clear: 'Crystal clear, go jump in',
  tweak: 'Needs a tweak',
  act: 'Act now',
};

// Interim Home: shows the latest test result until the water health card is built.
export default function Home() {
  const styles = useStyles();
  const colours = useColours();
  const { pool, loading } = usePool();
  const { tests, loading: testsLoading } = useTests();

  if (loading || testsLoading) return null;
  if (!pool) return <Redirect href="/pool" />;

  const latest = tests[0];
  const plan = latest ? buildDosePlan(pool, latest.readings) : null;
  const status = plan ? { headline: HEADLINE[plan.status], ...statusColours(colours, plan.status) } : null;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title}>Clearly</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => router.push('/settings')}
            hitSlop={12}
            style={styles.settings}
          >
            <Text style={styles.settingsText}>Settings</Text>
          </Pressable>
        </View>

        {latest && plan && status ? (
          <Card>
            <View style={[styles.status, { backgroundColor: status.bg }]}>
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

const useStyles = makeStyles((colours) => ({
  screen: { flex: 1, backgroundColor: colours.background },
  content: { padding: space.md, gap: space.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md },
  title: { fontFamily: fonts.heading, fontSize: 36, color: colours.primary },
  settings: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.sm },
  settingsText: { fontFamily: fonts.bodySemi, fontSize: 17, color: colours.primaryDark },
  status: { borderRadius: radius.input, padding: space.md },
  headline: { fontFamily: fonts.heading, fontSize: 24 },
  sub: { fontFamily: fonts.body, fontSize: 16, color: colours.inkMuted, lineHeight: 22 },
  readings: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.md },
  reading: { width: '50%' },
  readingLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colours.inkMuted },
  readingValue: { fontFamily: fonts.bodySemi, fontSize: 24, color: colours.ink, fontVariant: ['tabular-nums'] },
}));
