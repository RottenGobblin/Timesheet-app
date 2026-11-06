import { Text, View } from 'react-native';

import type { HomeSummary, Mood } from '../lib/homeSummary';
import { fonts, makeStyles, radius, space, useColours, type Colours } from '../theme';
import { PillButton } from './PillButton';
import { Wave } from './Wave';

function moodColour(c: Colours, mood: Mood): string {
  switch (mood) {
    case 'clear':
    case 'sorted':
      return c.success;
    case 'tweak':
    case 'stale':
      return c.warning;
    case 'act':
      return c.danger;
    case 'none':
      return c.primary;
  }
}

/** The one card on Home: big status, when you last tested, the water level and one next action. */
export function WaterHealthCard({ summary, onAction }: { summary: HomeSummary; onAction(): void }) {
  const styles = useStyles();
  const colours = useColours();
  return (
    <View style={styles.card}>
      <View accessible accessibilityRole="header" accessibilityLabel={`${summary.headline}. ${summary.subline}.`}>
        <Text style={styles.headline}>{summary.headline}</Text>
        <View style={styles.subRow}>
          <View style={[styles.dot, { backgroundColor: moodColour(colours, summary.mood) }]} />
          <Text style={styles.subline}>{summary.subline}</Text>
        </View>
      </View>

      {summary.alert ? (
        <View style={styles.alert} accessibilityRole="alert">
          <Text style={styles.alertText}>{summary.alert}</Text>
        </View>
      ) : null}

      <Wave level={summary.level} />

      <View style={styles.action}>
        {summary.action.detail ? <Text style={styles.detail}>{summary.action.detail}</Text> : null}
        <PillButton label={summary.action.label} onPress={onAction} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((colours) => ({
  card: {
    backgroundColor: colours.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colours.border,
    padding: space.lg,
    gap: space.md,
  },
  headline: { fontFamily: fonts.heading, fontSize: 32, lineHeight: 38, color: colours.ink },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  dot: { width: 12, height: 12, borderRadius: 6 },
  subline: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colours.inkMuted },
  alert: {
    backgroundColor: colours.dangerSoft,
    borderColor: colours.danger,
    borderWidth: 2,
    borderRadius: radius.input,
    padding: space.md,
  },
  alertText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colours.danger, lineHeight: 21 },
  action: { gap: space.sm },
  detail: { fontFamily: fonts.body, fontSize: 16, color: colours.ink, lineHeight: 22 },
}));
