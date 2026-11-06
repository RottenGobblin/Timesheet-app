import { Text, View } from 'react-native';

import type { Warning } from '../engine';
import { fonts, makeStyles, radius, space } from '../theme';

/** Safety warnings are deep red and plain. Info warnings are calm and neutral. */
export function WarningCard({ warning }: { warning: Warning }) {
  const styles = useStyles();
  const safety = warning.severity === 'safety';
  return (
    <View
      style={[styles.card, safety ? styles.safety : styles.info]}
      accessibilityRole={safety ? 'alert' : undefined}
    >
      {safety ? <Text style={styles.safetyLabel}>Safety</Text> : null}
      <Text style={[styles.text, safety && styles.safetyText]}>{warning.message}</Text>
    </View>
  );
}

const useStyles = makeStyles((colours) => ({
  card: { borderRadius: radius.input, padding: space.md, gap: 4, borderWidth: 2 },
  safety: { backgroundColor: colours.dangerSoft, borderColor: colours.danger },
  info: { backgroundColor: colours.primarySoft, borderColor: colours.primarySoft },
  safetyLabel: { fontFamily: fonts.heading, fontSize: 14, color: colours.danger, textTransform: 'uppercase', letterSpacing: 0.5 },
  text: { fontFamily: fonts.body, fontSize: 15, color: colours.ink, lineHeight: 21 },
  safetyText: { fontFamily: fonts.bodyMedium },
}));
