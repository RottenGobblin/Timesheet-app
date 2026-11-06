import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { WAVE_AMPLITUDE as AMPLITUDE, wavePath } from '../lib/wave';
import { makeStyles, radius, useColours } from '../theme';

/**
 * Water in a little tank. The level (0 to 1) rises and settles with water health:
 * a short ease-out, no bounce, and no motion at all if Reduce Motion is on.
 */
export function Wave({ level, height = 120 }: { level: number; height?: number }) {
  const styles = useStyles();
  const colours = useColours();
  const [width, setWidth] = useState(0);
  const [offset] = useState(() => new Animated.Value(height));

  useEffect(() => {
    let cancelled = false;
    const target = height * (1 - level);
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          offset.setValue(target);
          return;
        }
        Animated.timing(offset, {
          toValue: target,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    return () => {
      cancelled = true;
    };
  }, [level, height, offset]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const svgHeight = height + AMPLITUDE * 2;

  return (
    <View
      style={[styles.tank, { height }]}
      onLayout={onLayout}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {width > 0 ? (
        <Animated.View style={[styles.water, { height: svgHeight, transform: [{ translateY: offset }] }]}>
          <Svg width={width} height={svgHeight}>
            <Path d={wavePath(width, svgHeight, Math.PI / 2, width / 1.1)} fill={colours.primary} opacity={0.3} />
            <Path d={wavePath(width, svgHeight, 0, width / 1.4)} fill={colours.primary} opacity={0.9} transform="translate(0 4)" />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colours) => ({
  tank: {
    overflow: 'hidden',
    borderRadius: radius.input,
    backgroundColor: colours.primarySoft,
  },
  water: { position: 'absolute', left: 0, right: 0, top: -AMPLITUDE },
}));
