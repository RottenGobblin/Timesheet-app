import { useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { Range, ReadingKey } from '../engine';
import { layoutChart, yDomain, type Point } from '../lib/chart';
import { formatReading, READING_CONFIG } from '../lib/readings';
import { fonts, makeStyles, radius, space, useColours } from '../theme';

interface Props {
  reading: ReadingKey;
  points: Point[];
  band: Range;
  xRange: [number, number];
}

const HEIGHT = 150;
const BOX = { padLeft: 36, padRight: 12, padTop: 10, padBottom: 10 };

/** A small trend line for one reading, with the ideal zone shaded lime. */
export function TrendChart({ reading, points, band, xRange }: Props) {
  const styles = useStyles();
  const colours = useColours();
  const [width, setWidth] = useState(0);
  const cfg = READING_CONFIG[reading];
  const latest = points[points.length - 1];

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const layout =
    width > 0 ? layoutChart(points, band, yDomain(points, band, reading), xRange, { ...BOX, width, height: HEIGHT }) : null;

  const summary =
    points.length === 0
      ? `No ${cfg.label.toLowerCase()} readings in this period.`
      : `${cfg.label}: ${points.length} readings, latest ${formatReading(reading, latest!.v)}. Ideal ${band.min} to ${band.max}.`;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>{cfg.label}</Text>
        {latest ? (
          <Text style={styles.latest}>
            {formatReading(reading, latest.v)}
            {cfg.unit ? ` ${cfg.unit}` : ''}
          </Text>
        ) : null}
      </View>
      <View onLayout={onLayout} accessible accessibilityLabel={summary} style={{ height: HEIGHT }}>
        {layout ? (
          <Svg width={width} height={HEIGHT}>
            <Rect
              x={BOX.padLeft}
              y={layout.bandTop}
              width={width - BOX.padLeft - BOX.padRight}
              height={Math.max(layout.bandBottom - layout.bandTop, 1)}
              fill={colours.success}
              opacity={0.35}
              rx={6}
            />
            {layout.yTicks.map((t) => (
              <SvgText
                key={t.label}
                x={BOX.padLeft - 6}
                y={t.y + 4}
                fontSize={11}
                fill={colours.inkMuted}
                textAnchor="end"
                fontFamily={fonts.body}
              >
                {reading === 'ph' ? t.label.toFixed(1) : String(t.label)}
              </SvgText>
            ))}
            <Line
              x1={BOX.padLeft}
              x2={width - BOX.padRight}
              y1={HEIGHT - BOX.padBottom}
              y2={HEIGHT - BOX.padBottom}
              stroke={colours.border}
              strokeWidth={1}
            />
            {layout.path ? (
              <Path d={layout.path} stroke={colours.primary} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            ) : null}
            {layout.dots.map((d) => {
              const inBand = d.v >= band.min && d.v <= band.max;
              return (
                <Circle
                  key={d.t}
                  cx={d.x}
                  cy={d.y}
                  r={5}
                  fill={inBand ? colours.surface : colours.warning}
                  stroke={inBand ? colours.primary : colours.warning}
                  strokeWidth={2.5}
                />
              );
            })}
          </Svg>
        ) : null}
        {points.length === 0 ? <Text style={styles.empty}>No readings in this period</Text> : null}
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
    padding: space.md,
    gap: space.sm,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontFamily: fonts.heading, fontSize: 18, color: colours.ink },
  latest: { fontFamily: fonts.bodySemi, fontSize: 16, color: colours.ink, fontVariant: ['tabular-nums'] },
  empty: {
    position: 'absolute',
    top: HEIGHT / 2 - 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colours.inkMuted,
  },
}));
