import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { formatLitres, parseNumber } from '../lib/number';
import { poolVolumeLitres, type PoolShape } from '../lib/volume';
import { fonts, makeStyles, space } from '../theme';
import { NumberField } from './NumberField';
import { PillButton } from './PillButton';
import { Segmented, type SegmentOption } from './Segmented';

const SHAPES: SegmentOption<PoolShape>[] = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'round', label: 'Round' },
  { value: 'oval', label: 'Oval' },
];

/** Works out volume from the pool's size, for owners who don't know it. */
export function VolumeCalculator({ onUse }: { onUse(litres: number): void }) {
  const styles = useStyles();
  const [shape, setShape] = useState<PoolShape>('rectangle');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [shallow, setShallow] = useState('');
  const [deep, setDeep] = useState('');

  const litres = useMemo(
    () =>
      poolVolumeLitres(shape, {
        length: parseNumber(length) ?? 0,
        width: parseNumber(width),
        shallowDepth: parseNumber(shallow) ?? 0,
        deepDepth: parseNumber(deep),
      }),
    [shape, length, width, shallow, deep],
  );

  return (
    <View style={styles.wrap}>
      <Segmented options={SHAPES} value={shape} onChange={(v) => setShape(v)} accessibilityLabel="Pool shape" />
      <View style={styles.row}>
        <NumberField label={shape === 'round' ? 'Diameter' : 'Length'} value={length} onChangeText={setLength} unit="m" decimal />
        {shape !== 'round' ? <NumberField label="Width" value={width} onChangeText={setWidth} unit="m" decimal /> : null}
      </View>
      <View style={styles.row}>
        <NumberField label="Shallow end" value={shallow} onChangeText={setShallow} unit="m" decimal />
        <NumberField label="Deep end" value={deep} onChangeText={setDeep} unit="m" decimal placeholder="Same" />
      </View>
      <Text style={styles.hint}>Measure depth to the water line, not the top of the pool. Leave deep end blank if the floor is flat.</Text>
      {litres > 0 ? (
        <View style={styles.result}>
          <Text style={styles.resultText}>About {formatLitres(litres)} L</Text>
          <PillButton label="Use this" onPress={() => onUse(litres)} />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colours) => ({
  wrap: { gap: space.md },
  row: { flexDirection: 'row', gap: space.md },
  hint: { fontFamily: fonts.body, fontSize: 14, color: colours.inkMuted },
  result: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  resultText: { fontFamily: fonts.heading, fontSize: 24, color: colours.ink },
}));
