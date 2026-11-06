import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colours, fonts, radius, space } from '../theme';

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colours.surface,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
    borderWidth: 1,
    borderColor: colours.border,
  },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colours.ink },
});
