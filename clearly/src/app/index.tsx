import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import { PillButton } from '../components/PillButton';
import { formatLitres } from '../lib/number';
import { usePool } from '../state/PoolProvider';
import { colours, fonts, space } from '../theme';

const SANITISER_LABEL = { liquid: 'Liquid chlorine', granular: 'Granular chlorine', salt: 'Salt chlorinator' } as const;

// Placeholder Home until the water health card is built.
export default function Home() {
  const { pool, loading } = usePool();

  if (loading) return null;
  if (!pool) return <Redirect href="/pool" />;

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Clearly</Text>
      <Card title={pool.name || 'Your pool'}>
        <Text style={styles.line}>{formatLitres(pool.volumeLitres)} L</Text>
        <Text style={styles.sub}>
          {SANITISER_LABEL[pool.sanitiser]}, {pool.location}
        </Text>
        <PillButton label="Edit pool" variant="secondary" onPress={() => router.push('/pool')} />
      </Card>
      <View style={styles.note}>
        <Text style={styles.sub}>Water testing is coming next.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: space.md, gap: space.lg, backgroundColor: colours.background },
  title: { fontFamily: fonts.heading, fontSize: 36, color: colours.primary, marginTop: space.md },
  line: { fontFamily: fonts.bodySemi, fontSize: 28, color: colours.ink },
  sub: { fontFamily: fonts.body, fontSize: 16, color: colours.inkMuted },
  note: { alignItems: 'center' },
});
