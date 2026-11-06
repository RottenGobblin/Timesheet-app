import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { makeStyles, motion } from '../theme';

const DROPS = [
  { x: -46, y: -38, size: 12 },
  { x: -22, y: -58, size: 9 },
  { x: 0, y: -66, size: 14 },
  { x: 24, y: -56, size: 10 },
  { x: 46, y: -36, size: 12 },
];

/** A small splash of droplets that pops out and fades. Short, no bounce. */
export function Splash() {
  const styles = useStyles();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: motion.normal * 3,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress]);

  return (
    <View pointerEvents="none" style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {DROPS.map((d, i) => (
        <Animated.View
          key={i}
          style={[
            styles.drop,
            {
              width: d.size,
              height: d.size,
              borderRadius: d.size / 2,
              opacity: progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.8, 0] }),
              transform: [
                { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, d.x] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, d.y] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const useStyles = makeStyles((colours) => ({
  wrap: { position: 'absolute', top: 40, left: 0, right: 0, alignItems: 'center' },
  drop: { position: 'absolute', backgroundColor: colours.primary },
}));
