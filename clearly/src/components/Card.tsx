import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { fonts, makeStyles, radius, space } from '../theme';

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

const useStyles = makeStyles((colours) => ({
  card: {
    backgroundColor: colours.surface,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
    borderWidth: 1,
    borderColor: colours.border,
  },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colours.ink },
}));
