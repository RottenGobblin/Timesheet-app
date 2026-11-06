import { Switch, Text, View } from 'react-native';

import { fonts, makeStyles, space, TAP, useColours } from '../theme';

interface Props {
  label: string;
  description?: string;
  value: boolean;
  onChange(value: boolean): void;
}

export function ToggleRow({ label, description, value, onChange }: Props) {
  const styles = useStyles();
  const colours = useColours();
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        accessibilityHint={description}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colours.border, true: colours.primary }}
        thumbColor={colours.surface}
        ios_backgroundColor={colours.border}
      />
    </View>
  );
}

const useStyles = makeStyles((colours) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: TAP },
  text: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.bodySemi, fontSize: 17, color: colours.ink },
  description: { fontFamily: fonts.body, fontSize: 14, color: colours.inkMuted, lineHeight: 20 },
}));

