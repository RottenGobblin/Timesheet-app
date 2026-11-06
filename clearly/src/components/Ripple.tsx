import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';

import { colours, motion } from '../theme';

/**
 * One quick ripple spreading up from the bottom of the screen, used when a test is saved.
 * Short and calm: no bounce. Calls onDone when finished.
 */
export function Ripple({ onDone }: { onDone(): void }) {
  const [progress] = useState(() => new Animated.Value(0));
  const { width, height } = useWindowDimensions();
  const size = Math.hypot(width, height) * 2;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: motion.normal * 2,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => anim.stop();
  }, [progress, onDone]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left: width / 2 - size / 2,
          top: height - size / 2,
          opacity: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.35, 0.25, 0] }),
          transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.02, 1] }) }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  circle: { position: 'absolute', backgroundColor: colours.primary },
});
