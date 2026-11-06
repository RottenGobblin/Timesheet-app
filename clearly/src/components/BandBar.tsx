import { StyleSheet, View } from 'react-native';

import type { BandScale, Severity } from '../lib/readings';
import { colours, radius } from '../theme';

export const SEVERITY_COLOUR: Record<Severity, string> = {
  good: colours.success,
  adjust: colours.warning,
  danger: colours.danger,
};

/** Low / ideal / high bar with a marker at the current value. */
export function BandBar({ scale, position, severity }: { scale: BandScale; position: number; severity: Severity }) {
  const low = scale.idealStart;
  const ideal = scale.idealEnd - scale.idealStart;
  const high = 1 - scale.idealEnd;
  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.track}>
        {low > 0 ? <View style={[styles.zone, styles.adjustZone, { flex: low }]} /> : null}
        <View style={[styles.zone, styles.idealZone, { flex: ideal }]} />
        {high > 0 ? <View style={[styles.zone, styles.adjustZone, { flex: high }]} /> : null}
      </View>
      <View style={[styles.marker, { left: `${position * 100}%`, borderColor: SEVERITY_COLOUR[severity] }]} />
    </View>
  );
}

const MARKER = 22;

const styles = StyleSheet.create({
  wrap: { height: MARKER, justifyContent: 'center', marginHorizontal: MARKER / 2 },
  track: { flexDirection: 'row', height: 10, borderRadius: radius.pill, overflow: 'hidden', gap: 2 },
  zone: { height: '100%' },
  idealZone: { backgroundColor: colours.success },
  adjustZone: { backgroundColor: colours.warningSoft },
  marker: {
    position: 'absolute',
    width: MARKER,
    height: MARKER,
    marginLeft: -MARKER / 2,
    borderRadius: MARKER / 2,
    backgroundColor: colours.surface,
    borderWidth: 5,
  },
});
