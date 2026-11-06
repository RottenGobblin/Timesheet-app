import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PillButton } from '../components/PillButton';
import { WaterHealthCard } from '../components/WaterHealthCard';
import { buildDosePlan } from '../engine';
import { homeSummary } from '../lib/homeSummary';
import type { Ticks } from '../lib/planProgress';
import { usePool } from '../state/PoolProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTests } from '../state/TestsProvider';
import { useNow } from '../state/useNow';
import { loadProgress } from '../storage';
import { asyncStore } from '../storage/asyncStore';
import { fonts, makeStyles, space } from '../theme';

export default function Home() {
  const styles = useStyles();
  const { pool, loading } = usePool();
  const { tests, loading: testsLoading } = useTests();
  const { settings } = useSettings();
  const now = useNow();
  const [ticks, setTicks] = useState<Ticks>({});

  const latest = tests[0];
  const plan = useMemo(() => (pool && latest ? buildDosePlan(pool, latest.readings) : null), [pool, latest]);

  // Plan progress changes on the Plan screen, so reload it whenever Home comes back into view.
  useFocusEffect(
    useCallback(() => {
      if (!latest) {
        setTicks({});
        return;
      }
      let cancelled = false;
      loadProgress(asyncStore, latest.id)
        .then((p) => !cancelled && setTicks(p.ticks))
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }, [latest]),
  );

  if (loading || testsLoading) return null;
  if (!pool) return <Redirect href="/pool" />;

  const summary = homeSummary({ latest, plan, ticks, settings, now });
  const actionIsTest = summary.action.route === '/test';

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title} accessibilityRole="header">
            Clearly
          </Text>
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

        <WaterHealthCard summary={summary} onAction={() => router.push(summary.action.route)} />

        <View style={styles.row}>
          {!actionIsTest ? (
            <PillButton label="Test water" variant="secondary" style={styles.flex} onPress={() => router.push('/test')} />
          ) : latest ? (
            <PillButton label="Plan" variant="secondary" style={styles.flex} onPress={() => router.push('/plan')} />
          ) : null}
          {latest ? (
            <PillButton label="History" variant="secondary" style={styles.flex} onPress={() => router.push('/history')} />
          ) : null}
        </View>
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
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
}));
